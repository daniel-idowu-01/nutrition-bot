export function buildMealAnalysisPrompt(historySummary: string | null): string {
    return `You are a clinical nutritionist AI. Analyse the meal in this image.
  
  Return ONLY valid JSON — no markdown, no explanation outside the JSON.
  
  ${historySummary ? `User's eating history (last 7 days):\n${historySummary}\n` : ''}
  
  Required JSON structure:
  {
    "detectedFoods": ["list", "of", "foods"],
    "nutrients": {
      "estimatedCalories": 0,
      "proteinG": 0,
      "carbsG": 0,
      "sugarG": 0,
      "fatG": 0,
      "fibreG": 0
    },
    "concerns": ["any nutritional concerns for this meal"],
    "patternAlerts": ["concerns based on history, empty array if no history"],
    "advice": "2-3 sentences of friendly, actionable advice for the user"
  }`;
  }