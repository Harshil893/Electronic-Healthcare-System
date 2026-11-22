// Strips <think> blocks that some local models emit, and pulls clean text from an agent result.
export const cleanAgentText = (text: string) => {
  let out = text.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '');
  const unclosed = out.match(/<think\b[^>]*>([\s\S]*)$/i);
  if (unclosed) out = unclosed[1] ?? '';
  out = out.replace(/<\/?think\b[^>]*>/gi, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
};

// Prefer the model's answer; only fall back to reasoning text when the answer is empty.
export const textFromGenerateResult = (result: {
  text?: string;
  reasoning?: unknown;
  reasoningText?: string;
}) => {
  const answer = cleanAgentText(result.text ?? '');
  if (answer) return answer;
  const reasoning = typeof result.reasoning === 'string' ? result.reasoning : '';
  return cleanAgentText([result.reasoningText, reasoning].filter(Boolean).join('\n\n'));
};
