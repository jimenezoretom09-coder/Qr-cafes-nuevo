import type { LlmProvider } from "./types.js";
import { ClaudeProvider } from "./claude-provider.js";
import { GeminiProvider } from "./gemini-provider.js";

export type { LlmProvider, LlmTool, LlmHistoryMessage, ToolExecutor } from "./types.js";

// Gemini is the default here (unlike the sibling project) — it has a genuinely free tier,
// which matters because this runs once per restaurant client with near-zero margin per
// instance. Set LLM_PROVIDER=claude + ANTHROPIC_API_KEY for a future "premium" tier.
export function createLlmProvider(): LlmProvider {
  const selected = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();

  if (selected === "claude") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está configurada (LLM_PROVIDER=claude).");
    return new ClaudeProvider(apiKey);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada (LLM_PROVIDER=gemini, o déjalo sin definir).");
  return new GeminiProvider(apiKey);
}
