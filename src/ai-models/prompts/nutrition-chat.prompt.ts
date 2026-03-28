export function buildNutritionChatPrompt(
  userMessage: string,
  historySummary: string | null,
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    text: string;
  }>,
): string {
  const conversationBlock = conversationHistory.length
    ? `Recent conversation history:\n${conversationHistory
        .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.text}`)
        .join('\n')}\n`
    : '';

  return `You are a helpful nutrition assistant chatting with a user on WhatsApp.

Give practical, concise, friendly nutrition guidance.
Keep the answer short enough for a chat reply.
If the user asks something outside nutrition, health habits, meals, calories, or food choices, gently steer them back to nutrition support.
You have access to recent conversation history provided below. Use it when answering follow-up questions.
If recent conversation history is present, do not claim that you cannot remember previous messages.
Do not mention that you are following instructions.

${historySummary ? `User's eating history (last 7 days):\n${historySummary}\n` : ''}
${conversationBlock}

User message:
${userMessage}`;
}
