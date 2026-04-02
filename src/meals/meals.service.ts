import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MealLog, MealLogDocument } from './schemas/meal-log.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UserService } from 'src/users/user.service';
import { UserDocument } from 'src/users/schemas/user.schema';
import { WhatsAppMessage } from '../whatsapp/dto/incoming-message.dto';
import { MealAnalysisResult } from 'src/ai-models/meal-analysis.types';
import { MealAnalysisService } from 'src/ai-models/meal-analysis.service';
import { ConversationsService } from 'src/conversations/conversations.service';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    @InjectModel(MealLog.name) private readonly mealLogModel: Model<MealLogDocument>,
    private readonly config: ConfigService,
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

      const calorieProgress = await this.buildTodayCalorieProgress(user._id, user);
      const response = this.formatReply(normalizedAnalysis, calorieProgress);
      const reply = this.hasCustomCalorieTarget(user)
        ? response
        : `${response}\n\nTip: set your daily calorie target, e.g. "set calorie limit 1800".`;

      await this.whatsappService.sendMessage(
        from,
        reply,
      );
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

      const calorieTargetReply = await this.buildCalorieTargetWorkflowReply(
        user,
        message.text?.body ?? '',
      );

      if (calorieTargetReply) {
        await this.whatsappService.sendMessage(from, calorieTargetReply);
        return;
      }

      const calorieReply = await this.buildCalorieCounterReply(
        user._id,
        user,
        message.text?.body ?? '',
      );

      if (calorieReply) {
        await this.whatsappService.sendMessage(from, calorieReply);
        return;
      }

      const reply = await this.mealAnalysisService.generateTextResponse({
        message: message.text?.body ?? '',
        historySummary,
        conversationHistory,
      });

      await this.whatsappService.sendMessage(
        from,
        reply ||
          'Ask about a product, ingredients, calories, or send a clear product photo for review.\nTip: set your daily calorie target, e.g. "set calorie limit 1800".',
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

  private formatReply(
    analysis: MealAnalysisResult,
    calorieProgress?: { totalCalories: number; targetCalories: number; mealsCounted: number },
  ): string {
    const topConcerns = analysis.concerns.slice(0, 2);
    const shortAdvice = this.shortenText(analysis.advice, 180);
    const shortVerdict = this.shortenText(analysis.verdict, 160);
    const topUncertainties = analysis.uncertainties.slice(0, 2);

    const lines: string[] = [];

    lines.push(`*Product:* ${analysis.productName || 'Unknown product'}`);

    if (analysis.productType) {
      lines.push(`*Category:* ${analysis.productType}`);
    }

    lines.push('');

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

    if (topConcerns.length) {
      lines.push(`*Main concerns:* ${topConcerns.join('; ')}`);
      lines.push('');
    }

    if (shortVerdict) {
      lines.push(`*Health review:* ${shortVerdict}`);
      lines.push('');
    }

    if (shortAdvice) {
      lines.push(`*Advice:* ${shortAdvice}`);
    }

    if (calorieProgress) {
      lines.push('');
      lines.push(
        `*Calories today:* ${calorieProgress.totalCalories} / ${calorieProgress.targetCalories} kcal (${calorieProgress.mealsCounted} meals tracked)`,
      );
    }

    if (topUncertainties.length) {
      lines.push('');
      lines.push(`*Unclear from image:* ${topUncertainties.join('; ')}`);
    }

    return lines.join('\n');
  }

  private shortenText(value: string, maxLength: number): string {
    const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (normalized.length <= maxLength) return normalized;

    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
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

  private async buildCalorieCounterReply(
    userId: Types.ObjectId,
    user: UserDocument,
    messageText: string,
  ): Promise<string | null> {
    const normalizedMessage = messageText.trim().toLowerCase();

    const calorieIntentKeywords = [
      'calorie',
      'calories',
      'kcal',
      'intake',
      'how many calories',
      'calorie count',
    ];

    const isCalorieQuery = calorieIntentKeywords.some((keyword) =>
      normalizedMessage.includes(keyword),
    );

    if (!isCalorieQuery) {
      return null;
    }

    const targetCalories = this.resolveDailyCalorieTarget(user);

    if (normalizedMessage.includes('week') || normalizedMessage.includes('7 day')) {
      return this.buildSevenDayCalorieSummary(userId, targetCalories);
    }

    if (normalizedMessage.includes('yesterday')) {
      return this.buildYesterdayCalorieSummary(userId, targetCalories);
    }

    return this.buildTodayCalorieSummary(userId, targetCalories);
  }

  private async buildTodayCalorieSummary(
    userId: Types.ObjectId,
    targetCalories: number,
  ): Promise<string> {
    const now = new Date();
    const start = this.startOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const summary = await this.calculateCaloriesForRange(userId, start, end);
    const remaining = Math.max(targetCalories - summary.totalCalories, 0);
    const overBy = Math.max(summary.totalCalories - targetCalories, 0);

    const lines = [
      `*Calorie counter (today)*`,
      `Tracked meals: ${summary.mealsCounted}`,
      `Calories logged: ${summary.totalCalories} kcal`,
      `Target: ${targetCalories} kcal`,
    ];

    if (summary.mealsMissingCalories > 0) {
      lines.push(`Meals missing calorie estimate: ${summary.mealsMissingCalories}`);
    }

    if (summary.mealsCounted === 0) {
      lines.push('No meals tracked yet today. Send a meal photo to start tracking.');
    } else if (overBy > 0) {
      lines.push(`You are ${overBy} kcal above target today.`);
    } else {
      lines.push(`${remaining} kcal remaining for today.`);
    }
    lines.push('Tip: set your daily calorie target, e.g. "set calorie limit 1800".');

    return lines.join('\n');
  }

  private async buildYesterdayCalorieSummary(
    userId: Types.ObjectId,
    targetCalories: number,
  ): Promise<string> {
    const todayStart = this.startOfDay(new Date());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const summary = await this.calculateCaloriesForRange(userId, yesterdayStart, todayStart);
    const lines = [
      `*Calorie counter (yesterday)*`,
      `Tracked meals: ${summary.mealsCounted}`,
      `Calories logged: ${summary.totalCalories} kcal`,
      `Target: ${targetCalories} kcal`,
    ];

    if (summary.mealsMissingCalories > 0) {
      lines.push(`Meals missing calorie estimate: ${summary.mealsMissingCalories}`);
    }

    if (summary.mealsCounted === 0) {
      lines.push('No meals were tracked yesterday.');
    }
    lines.push('Tip: set your daily calorie target, e.g. "set calorie limit 1800".');

    return lines.join('\n');
  }

  private async buildSevenDayCalorieSummary(
    userId: Types.ObjectId,
    targetCalories: number,
  ): Promise<string> {
    const todayStart = this.startOfDay(new Date());
    const rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 6);
    const rangeEnd = new Date(todayStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const summary = await this.calculateCaloriesForRange(userId, rangeStart, rangeEnd);
    const periodTarget = targetCalories * 7;
    const averagePerDay = Math.round(summary.totalCalories / 7);

    const lines = [
      `*Calorie counter (last 7 days)*`,
      `Tracked meals: ${summary.mealsCounted}`,
      `Calories logged: ${summary.totalCalories} kcal`,
      `Daily average: ${averagePerDay} kcal/day`,
      `7-day target: ${periodTarget} kcal`,
    ];

    if (summary.mealsMissingCalories > 0) {
      lines.push(`Meals missing calorie estimate: ${summary.mealsMissingCalories}`);
    }

    if (summary.mealsCounted === 0) {
      lines.push('No meals tracked in the last 7 days.');
    }
    lines.push('Tip: set your daily calorie target, e.g. "set calorie limit 1800".');

    return lines.join('\n');
  }

  private async buildTodayCalorieProgress(
    userId: Types.ObjectId,
    user: UserDocument,
  ): Promise<{ totalCalories: number; targetCalories: number; mealsCounted: number }> {
    const start = this.startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const summary = await this.calculateCaloriesForRange(userId, start, end);

    return {
      totalCalories: summary.totalCalories,
      targetCalories: this.resolveDailyCalorieTarget(user),
      mealsCounted: summary.mealsCounted,
    };
  }

  private async buildCalorieTargetWorkflowReply(
    user: UserDocument,
    messageText: string,
  ): Promise<string | null> {
    const normalizedMessage = messageText.trim().toLowerCase();

    const resetTargetKeywords = [
      'reset calorie',
      'clear calorie',
      'remove calorie',
      'use default calorie',
      'default calorie',
    ];

    const shouldResetTarget = resetTargetKeywords.some((keyword) =>
      normalizedMessage.includes(keyword),
    );

    if (shouldResetTarget) {
      await this.usersService.updateDailyCalorieTarget(user._id.toString(), null);
      return `Done. Your daily calorie target is reset to the default ${this.getDefaultDailyCalorieTarget()} kcal.\nTip: send "set calorie limit 1800" any time to personalize it again.`;
    }

    const mentionsCalorieTarget =
      normalizedMessage.includes('calorie') &&
      (normalizedMessage.includes('target') ||
        normalizedMessage.includes('limit') ||
        normalizedMessage.includes('goal') ||
        normalizedMessage.includes('set'));

    const requestedTarget = this.extractRequestedCalorieTarget(normalizedMessage);

    if (requestedTarget !== null) {
      if (requestedTarget < 800 || requestedTarget > 6000) {
        return 'Please set a daily calorie target between 800 and 6000 kcal.';
      }

      await this.usersService.updateDailyCalorieTarget(
        user._id.toString(),
        requestedTarget,
      );
      return `Done. Your daily calorie target is now ${requestedTarget} kcal.\nYou can ask "calories today" to track progress.`;
    }

    if (mentionsCalorieTarget) {
      const currentTarget = this.resolveDailyCalorieTarget(user);
      const userHasCustomTarget =
        typeof user.dailyCalorieTarget === 'number' &&
        Number.isFinite(user.dailyCalorieTarget);

      return userHasCustomTarget
        ? `Your current daily calorie target is ${currentTarget} kcal.\nTo change it, send something like "set calorie limit 1900".`
        : `Your current daily calorie target is ${currentTarget} kcal (default).\nTo set yours, send something like "set calorie limit 1900".`;
    }

    return null;
  }

  private extractRequestedCalorieTarget(message: string): number | null {
    const pattern =
      /(set|change|update|make|adjust|use)\s+(my\s+)?(daily\s+)?(calorie|calories|kcal)\s*(target|goal|limit)?\s*(to)?\s*(\d{3,5})/i;
    const match = message.match(pattern);
    if (match?.[7]) {
      return Number(match[7]);
    }

    const fallbackPattern = /(calorie|calories|kcal).{0,20}(\d{3,5})/i;
    const fallbackMatch = message.match(fallbackPattern);
    if (fallbackMatch?.[2] && message.includes('set')) {
      return Number(fallbackMatch[2]);
    }

    return null;
  }

  private async calculateCaloriesForRange(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<{ totalCalories: number; mealsCounted: number; mealsMissingCalories: number }> {
    const meals = await this.mealLogModel
      .find({
        userId,
        mealTime: { $gte: from, $lt: to },
      })
      .select('nutrients.estimatedCalories')
      .lean();

    let totalCalories = 0;
    let mealsCounted = 0;
    let mealsMissingCalories = 0;

    for (const meal of meals) {
      const estimatedCalories = meal.nutrients?.estimatedCalories;
      if (typeof estimatedCalories === 'number' && Number.isFinite(estimatedCalories)) {
        totalCalories += estimatedCalories;
        mealsCounted += 1;
      } else {
        mealsMissingCalories += 1;
      }
    }

    return {
      totalCalories: Math.round(totalCalories),
      mealsCounted,
      mealsMissingCalories,
    };
  }

  private startOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private resolveDailyCalorieTarget(user?: UserDocument | null): number {
    const userTarget = Number(user?.dailyCalorieTarget);
    if (Number.isFinite(userTarget) && userTarget >= 800 && userTarget <= 6000) {
      return Math.round(userTarget);
    }

    return this.getDefaultDailyCalorieTarget();
  }

  private getDefaultDailyCalorieTarget(): number {
    const configured = Number(this.config.get('DAILY_CALORIE_TARGET'));
    if (Number.isFinite(configured) && configured > 0) {
      return Math.round(configured);
    }

    return 2000;
  }

  private hasCustomCalorieTarget(user?: UserDocument | null): boolean {
    const userTarget = Number(user?.dailyCalorieTarget);
    return Number.isFinite(userTarget) && userTarget >= 800 && userTarget <= 6000;
  }
}
