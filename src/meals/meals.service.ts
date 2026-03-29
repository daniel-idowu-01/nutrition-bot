import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MealLog, MealLogDocument } from './schemas/meal-log.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UserService } from 'src/users/user.service';
import { WhatsAppMessage } from '../whatsapp/dto/incoming-message.dto';
import { MealAnalysisResult } from 'src/ai-models/meal-analysis.types';
import { MealAnalysisService } from 'src/ai-models/meal-analysis.service';
import { ConversationsService } from 'src/conversations/conversations.service';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    @InjectModel(MealLog.name) private readonly mealLogModel: Model<MealLogDocument>,
    private readonly mealAnalysisService: MealAnalysisService,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    private readonly usersService: UserService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async analyseImage(message: WhatsAppMessage): Promise<void> {
    const { from, image } = message;

    try {
      const user = await this.usersService.findOrCreate(from);
      const imageBuffer = await this.whatsappService.downloadMedia(image?.id ?? '');
      const { url, publicId } = await this.cloudinaryService.uploadImageBuffer(imageBuffer);
      const historySummary = await this.buildHistorySummary(user._id.toString());

      const analysis = await this.mealAnalysisService.analyseMeal({
        imageBuffer,
        mimeType: image?.mime_type ?? '',
        historySummary,
      });
      const normalizedAnalysis = this.normalizeAnalysisResult(analysis);

      await this.mealLogModel.create({
        userId: user._id,
        cloudinaryUrl: url,
        cloudinaryPublicId: publicId,
        productName: normalizedAnalysis.productName,
        productType: normalizedAnalysis.productType,
        detectedFoods: normalizedAnalysis.ingredients,
        labelClaims: normalizedAnalysis.labelClaims,
        nutrients: normalizedAnalysis.nutrients,
        concerns: normalizedAnalysis.concerns,
        medicalTips: normalizedAnalysis.medicalTips,
        verdict: normalizedAnalysis.verdict,
        aiAdvice: normalizedAnalysis.advice,
        mealTime: new Date(),
      });

      await this.whatsappService.sendMessage(from, this.formatReply(normalizedAnalysis));
    } catch (error) {
      this.logger.error(`Failed to review product image for ${from}`, error);
      await this.whatsappService.sendMessage(
        from,
        "Sorry, I couldn't review that product image. Please send a clearer photo showing the ingredients or nutrition label.",
      );
    }
  }

  async respondToText(message: WhatsAppMessage): Promise<void> {
    const { from } = message;

    try {
      const user = await this.usersService.findOrCreate(from);
      const historySummary = await this.buildHistorySummary(user._id.toString());
      const conversationHistory = await this.conversationsService.getRecentConversation(
        user._id.toString(),
      );

      const directReply = this.buildDirectConversationReply(
        message.text?.body ?? '',
        conversationHistory,
      );

      if (directReply) {
        await this.whatsappService.sendMessage(from, directReply);
        return;
      }

      const reply = await this.mealAnalysisService.generateTextResponse({
        message: message.text?.body ?? '',
        historySummary,
        conversationHistory,
      });

      await this.whatsappService.sendMessage(
        from,
        reply || 'Ask about a product, ingredients, calories, or send a clear product photo for review.',
      );
    } catch (error) {
      this.logger.error(`Failed to answer text message for ${from}`, error);
      await this.whatsappService.sendMessage(
        from,
        'Sorry, I could not answer that right now. Ask me about a product or send a clear label photo.',
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
      const productName = meal.productName || meal.detectedFoods.join(', ') || 'Unknown product';
      const cals = meal.nutrients?.estimatedCalories ?? 'unknown';
      return `Product ${i + 1}: ${productName} (~${cals} kcal)`;
    });

    return lines.join('\n');
  }

  private formatReply(analysis: MealAnalysisResult): string {
    const lines: string[] = [];

    lines.push(`*Product:* ${analysis.productName || 'Unknown product'}`);

    if (analysis.productType) {
      lines.push(`*Category:* ${analysis.productType}`);
    }

    lines.push('');

    if (analysis.ingredients.length) {
      lines.push(`*Ingredients:* ${analysis.ingredients.join(', ')}`);
      lines.push('');
    }

    if (analysis.labelClaims.length) {
      lines.push(`*Label claims:* ${analysis.labelClaims.join(', ')}`);
      lines.push('');
    }

    if (
      analysis.nutrients.servingSize ||
      analysis.nutrients.estimatedCalories !== undefined ||
      analysis.nutrients.sugarG !== undefined ||
      analysis.nutrients.sodiumMg !== undefined ||
      analysis.nutrients.saturatedFatG !== undefined
    ) {
      lines.push('*Nutrition snapshot:*');

      if (analysis.nutrients.servingSize) {
        lines.push(`- Serving size: ${analysis.nutrients.servingSize}`);
      }
      if (analysis.nutrients.estimatedCalories !== undefined) {
        lines.push(`- Calories: ${analysis.nutrients.estimatedCalories} kcal`);
      }
      if (analysis.nutrients.sugarG !== undefined) {
        lines.push(`- Sugar: ${analysis.nutrients.sugarG}g`);
      }
      if (analysis.nutrients.sodiumMg !== undefined) {
        lines.push(`- Sodium: ${analysis.nutrients.sodiumMg}mg`);
      }
      if (analysis.nutrients.saturatedFatG !== undefined) {
        lines.push(`- Saturated fat: ${analysis.nutrients.saturatedFatG}g`);
      }

      lines.push('');
    }

    if (analysis.patternAlerts.length) {
      lines.push(`*Pattern alert:* ${analysis.patternAlerts.join(' ')}`);
      lines.push('');
    }

    if (analysis.concerns.length) {
      lines.push(`*Health concerns:* ${analysis.concerns.join(', ')}`);
      lines.push('');
    }

    if (analysis.medicalTips.length) {
      lines.push(`*Medical tips:* ${analysis.medicalTips.join(' ')}`);
      lines.push('');
    }

    lines.push(`*Health review:* ${analysis.verdict}`);
    lines.push('');
    lines.push(`*Advice:* ${analysis.advice}`);

    if (analysis.uncertainties.length) {
      lines.push('');
      lines.push(`*Unclear from image:* ${analysis.uncertainties.join(', ')}`);
    }

    return lines.join('\n');
  }

  private normalizeAnalysisResult(analysis: MealAnalysisResult): MealAnalysisResult {
    return {
      productName: analysis?.productName?.trim() || 'Unknown product',
      productType: analysis?.productType?.trim() || undefined,
      ingredients: this.toStringArray(analysis?.ingredients),
      labelClaims: this.toStringArray(analysis?.labelClaims),
      nutrients: analysis?.nutrients ?? {},
      concerns: this.toStringArray(analysis?.concerns),
      patternAlerts: this.toStringArray(analysis?.patternAlerts),
      medicalTips: this.toStringArray(analysis?.medicalTips),
      verdict:
        analysis?.verdict?.trim() ||
        'The product could not be fully assessed from this image.',
      advice:
        analysis?.advice?.trim() ||
        'Please send a clearer photo of the ingredient list and nutrition facts panel.',
      uncertainties: this.toStringArray(analysis?.uncertainties),
    };
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildDirectConversationReply(
    messageText: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  ): string | null {
    const normalizedMessage = messageText.trim().toLowerCase();

    const isLastAssistantMessageQuery =
      normalizedMessage.includes('last message you sent') ||
      normalizedMessage.includes('previous message you sent') ||
      normalizedMessage.includes('what did you send') ||
      normalizedMessage.includes('what was the last thing you said');

    if (!isLastAssistantMessageQuery) {
      return null;
    }

    const previousAssistantMessage = [...conversationHistory]
      .reverse()
      .find((entry) => entry.role === 'assistant');

    if (!previousAssistantMessage) {
      return "I don't have any earlier message from this chat yet.";
    }

    return `The last message I sent was: "${previousAssistantMessage.text}"`;
  }
}
