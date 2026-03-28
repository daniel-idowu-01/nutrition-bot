import { Module } from '@nestjs/common';
import { ClaudeModule } from './claude/claude.module';
import { GeminiModule } from './gemini/gemini.module';
import { MealAnalysisService } from './meal-analysis.service';

@Module({
  imports: [ClaudeModule, GeminiModule],
  providers: [MealAnalysisService],
  exports: [MealAnalysisService],
})
export class AiModelsModule {}
