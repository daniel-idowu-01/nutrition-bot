export function buildMealAnalysisPrompt(historySummary: string | null): string {
  return `You are a clinical nutritionist AI reviewing a packaged food, drink, or supplement from an image.

Read the visible label, ingredients list, nutrition facts, and front-of-pack claims if they are present.
If the image is blurry or some text is unreadable, make conservative inferences and list uncertainties clearly.
Focus on health implications such as high sugar, high sodium, highly processed ingredients, additives, low fibre, and misleading health claims.
Give practical medical and dietary cautionary tips, but do not diagnose disease.

Return ONLY valid JSON - no markdown, no explanation outside the JSON.

${historySummary ? `User's eating history (last 7 days):\n${historySummary}\n` : ''}

Required JSON structure:
{
  "productName": "best guess product name",
  "productType": "snack, soda, cereal, supplement, etc",
  "ingredients": ["visible ingredients from the label"],
  "labelClaims": ["front-of-pack claims like low fat, no sugar added"],
  "nutrients": {
    "servingSize": "best visible serving size",
    "estimatedCalories": 0,
    "proteinG": 0,
    "carbsG": 0,
    "sugarG": 0,
    "fatG": 0,
    "fibreG": 0,
    "sodiumMg": 0,
    "saturatedFatG": 0
  },
  "concerns": ["health concerns about this product"],
  "patternAlerts": ["concerns based on history, empty array if no history"],
  "medicalTips": ["short practical health or caution tips"],
  "verdict": "1-2 sentence overall health review",
  "advice": "2-3 sentences of friendly, actionable advice for the user",
  "uncertainties": ["anything not clearly readable from the image"]
}`;
}
