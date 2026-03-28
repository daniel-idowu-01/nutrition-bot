export interface MealAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  historySummary: string | null;
}

export interface NutritionTextInput {
  message: string;
  historySummary: string | null;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    text: string;
  }>;
}

export interface MealAnalysisResult {
  productName?: string;
  productType?: string;
  ingredients: string[];
  labelClaims: string[];
  nutrients: {
    servingSize?: string;
    estimatedCalories?: number;
    proteinG?: number;
    carbsG?: number;
    sugarG?: number;
    fatG?: number;
    fibreG?: number;
    sodiumMg?: number;
    saturatedFatG?: number;
  };
  concerns: string[];
  patternAlerts: string[];
  medicalTips: string[];
  verdict: string;
  advice: string;
  uncertainties: string[];
}

export interface MealAnalysisProvider {
  readonly providerName: string;
  analyseMeal(input: MealAnalysisInput): Promise<MealAnalysisResult>;
  generateTextResponse(input: NutritionTextInput): Promise<string>;
}
