import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { buildMealAnalysisPrompt } from './prompts/meal-analysis.prompt';

export interface MealAnalysisResult {
  detectedFoods: string[];
  nutrients: {
    estimatedCalories?: number;
    proteinG?: number;
    carbsG?: number;
    sugarG?: number;
    fatG?: number;
    fibreG?: number;
  };
  concerns: string[];
  patternAlerts: string[];
  advice: string;
}

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  async analyseMeal(
    imageBuffer: Buffer,
    mimeType: string,
    historySummary: string | null,
  ): Promise<MealAnalysisResult> {
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
}