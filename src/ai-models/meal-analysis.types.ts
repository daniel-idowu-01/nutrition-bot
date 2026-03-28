export interface MealAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  historySummary: string | null;
}

export interface NutritionTextInput {
  message: string;
  historySummary: string | null;
}

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

export interface MealAnalysisProvider {
  readonly providerName: string;
  analyseMeal(input: MealAnalysisInput): Promise<MealAnalysisResult>;
  generateTextResponse(input: NutritionTextInput): Promise<string>;
}
