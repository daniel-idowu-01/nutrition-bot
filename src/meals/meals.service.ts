import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MealLog, MealLogDocument } from './schemas/meal-log.schema';
import { ClaudeService } from 'src/ai-models/claude/clause.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UserService } from 'src/users/user.service';
import { WhatsAppMessage } from '../whatsapp/dto/incoming-message.dto';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    @InjectModel(MealLog.name) private readonly mealLogModel: Model<MealLogDocument>,
    private readonly claudeService: ClaudeService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly whatsappService: WhatsAppService,
    private readonly usersService: UserService,
  ) {}

  async analyseImage(message: WhatsAppMessage): Promise<void> {
    const { from, image } = message;

    try {
      const user = await this.usersService.findOrCreate(from);

      const imageBuffer = await this.whatsappService.downloadMedia(image?.id ?? '');

      const { url, publicId } = await this.cloudinaryService.uploadImageBuffer(imageBuffer);

      const historySummary = await this.buildHistorySummary(user._id.toString());

      const analysis = await this.claudeService.analyseMeal(
        imageBuffer,
        image?.mime_type ?? '',
        historySummary,
      );

      await this.mealLogModel.create({
        userId: user._id,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId,
        detectedFoods: analysis.detectedFoods,
        nutrients: analysis.nutrients,
        concerns: analysis.concerns,
        aiAdvice: analysis.advice,
        mealTime: new Date(),
      });

      const reply = this.formatReply(analysis);
      await this.whatsappService.sendMessage(from, reply);

    } catch (error) {
      this.logger.error(`Failed to analyse meal for ${from}`, error);
      await this.whatsappService.sendMessage(
        from,
        "Sorry, I couldn't analyse that image. Please try sending a clearer photo of your meal."
      );
    }
  }

  private async buildHistorySummary(userId: string): Promise<string | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMeals = await this.mealLogModel
      .find({ userId, mealTime: { $gte: sevenDaysAgo } })
      .sort({ mealTime: -1 })
      .limit(15)
      .lean();

    if (!recentMeals.length) return null;

    const lines = recentMeals.map((meal, i) => {
      const foods = meal.detectedFoods.join(', ');
      const cals = meal.nutrients?.estimatedCalories ?? 'unknown';
      return `Meal ${i + 1}: ${foods} (~${cals} kcal)`;
    });

    return lines.join('\n');
  }

  private formatReply(analysis: Awaited<ReturnType<ClaudeService['analyseMeal']>>): string {
    const lines: string[] = [];

    lines.push(`*Meal detected:* ${analysis.detectedFoods.join(', ')}`);
    lines.push('');

    if (analysis.nutrients.estimatedCalories) {
      lines.push(`*Estimated calories:* ${analysis.nutrients.estimatedCalories} kcal`);
      lines.push(`• Protein: ${analysis.nutrients.proteinG}g`);
      lines.push(`• Carbs: ${analysis.nutrients.carbsG}g  |  Sugar: ${analysis.nutrients.sugarG}g`);
      lines.push(`• Fat: ${analysis.nutrients.fatG}g  |  Fibre: ${analysis.nutrients.fibreG}g`);
      lines.push('');
    }

    if (analysis.concerns.length) {
      lines.push(`*Concerns:* ${analysis.concerns.join(', ')}`);
      lines.push('');
    }

    if (analysis.patternAlerts.length) {
      lines.push(`*Pattern alert:* ${analysis.patternAlerts.join(' ')}`);
      lines.push('');
    }

    lines.push(`*Advice:* ${analysis.advice}`);

    return lines.join('\n');
  }
}