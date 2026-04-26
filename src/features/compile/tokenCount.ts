/**
 * Fast, dependency-free token count estimator.
 *
 * We avoid bundling a full tokenizer (gpt-tokenizer, tiktoken) because:
 *  - they weigh 400-1000KB gzipped
 *  - the exact count still differs per model (cl100k vs o200k vs sentencepiece)
 *  - for UX ("is this too big for the context window?"), ±10% is fine
 *
 * The chars/4 ratio is the commonly-cited GPT-family approximation (~0.75 tokens
 * per word, ~4 chars per token in English). Code and CJK skew it, but we bias
 * slightly upward for safety so users don't hit hard context limits unexpectedly.
 */

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const len = text.length;
  // Whitespace-dense content (code, JSON) packs slightly more tokens per char;
  // biased upward 5% to stay conservative.
  return Math.ceil((len / 4) * 1.05);
}
