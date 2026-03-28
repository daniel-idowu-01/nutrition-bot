import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  MealAnalysisInput,
  MealAnalysisProvider,
  MealAnalysisResult,
  NutritionTextInput,
} from '../meal-analysis.types';
import { buildMealAnalysisPrompt } from '../prompts/meal-analysis.prompt';
import { buildNutritionChatPrompt } from '../prompts/nutrition-chat.prompt';

@Injectable()
export class ClaudeService implements MealAnalysisProvider {
  readonly providerName = 'claude';
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  async analyseMeal({
    imageBuffer,
    mimeType,
    historySummary,
  }: MealAnalysisInput): Promise<MealAnalysisResult> {
    const base64Image = imageBuffer.toString('base64');
    const prompt = buildMealAnalysisPrompt(historySummary);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64Image,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      return JSON.parse(text) as MealAnalysisResult;
    } catch {
      this.logger.error('Failed to parse Claude response', text);
      throw new Error('AI returned an unexpected response format');
    }
  }

  async generateTextResponse({
    message,
    historySummary,
    conversationHistory,
  }: NutritionTextInput): Promise<string> {
    const prompt = buildNutritionChatPrompt(
      message,
      historySummary,
      conversationHistory,
    );

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text.trim();
  }
}
