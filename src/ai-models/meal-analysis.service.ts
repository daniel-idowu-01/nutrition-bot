import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MealAnalysisInput,
  MealAnalysisProvider,
  MealAnalysisResult,
  NutritionTextInput,
} from './meal-analysis.types';
import { ClaudeService } from './claude/clause.service';
import { GeminiService } from './gemini/gemini.service';

@Injectable()
export class MealAnalysisService {
  private readonly logger = new Logger(MealAnalysisService.name);
  private readonly providers: Map<string, MealAnalysisProvider>;

  constructor(
    private readonly config: ConfigService,
    private readonly claudeService: ClaudeService,
    private readonly geminiService: GeminiService,
  ) {
    this.providers = new Map<string, MealAnalysisProvider>([
      [this.claudeService.providerName, this.claudeService],
      [this.geminiService.providerName, this.geminiService],
    ]);
  }

  async analyseMeal(input: MealAnalysisInput): Promise<MealAnalysisResult> {
    const provider = this.getProvider();
    this.logger.log(`Using ${provider.providerName} provider for meal analysis`);
    return provider.analyseMeal(input);
  }

  async generateTextResponse(input: NutritionTextInput): Promise<string> {
    const provider = this.getProvider();
    this.logger.log(`Using ${provider.providerName} provider for text response`);
    return provider.generateTextResponse(input);
  }

  private getProvider(): MealAnalysisProvider {
    const configuredProvider = (
      this.config.get<string>('AI_PROVIDER') ?? this.claudeService.providerName
    ).toLowerCase();

    const provider = this.providers.get(configuredProvider);

    if (!provider) {
      throw new Error(
        `Unsupported AI provider "${configuredProvider}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    return provider;
  }
}
