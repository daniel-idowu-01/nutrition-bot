import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  MealAnalysisInput,
  MealAnalysisProvider,
  MealAnalysisResult,
  NutritionTextInput,
} from '../meal-analysis.types';
import { buildMealAnalysisPrompt } from '../prompts/meal-analysis.prompt';
import { buildNutritionChatPrompt } from '../prompts/nutrition-chat.prompt';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

@Injectable()
export class GeminiService implements MealAnalysisProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly config: ConfigService) {}

  async analyseMeal({
    imageBuffer,
    mimeType,
    historySummary,
  }: MealAnalysisInput): Promise<MealAnalysisResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = buildMealAnalysisPrompt(historySummary);
    const response = await axios.post<GeminiGenerateContentResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBuffer.toString('base64'),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      return JSON.parse(text) as MealAnalysisResult;
    } catch {
      this.logger.error('Failed to parse Gemini response', text);
      throw new Error('AI returned an unexpected response format');
    }
  }

  async generateTextResponse({
    message,
    historySummary,
  }: NutritionTextInput): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const prompt = buildNutritionChatPrompt(message, historySummary);
    const response = await axios.post<GeminiGenerateContentResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
        },
      },
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
}
