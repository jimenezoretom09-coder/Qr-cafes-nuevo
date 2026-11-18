import { GoogleGenAI, Type } from "@google/genai";
import type { Content, FunctionDeclaration, Part } from "@google/genai";
import type { LlmProvider, LlmToolSchema } from "./types.js";

const MAX_TOOL_ROUNDS = 5;
const FALLBACK_REPLY = "Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?";
// Free-tier model with confirmed function-calling support, no card required.
const MODEL = "gemini-3.1-flash-lite";
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAYS_MS = [1000, 2500, 5000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TYPE_MAP: Record<string, unknown> = {
  object: Type.OBJECT,
  string: Type.STRING,
  integer: Type.INTEGER,
  number: Type.NUMBER,
  array: Type.ARRAY,
  boolean: Type.BOOLEAN,
};

function convertSchema(schema: LlmToolSchema | Record<string, unknown>): Record<string, unknown> {
  const s = schema as Record<string, unknown>;
  const converted: Record<string, unknown> = { type: TYPE_MAP[s.type as string] ?? Type.STRING };
  if (s.description) converted.description = s.description;
  if (s.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(s.properties as Record<string, unknown>).map(([key, value]) => [
        key,
        convertSchema(value as Record<string, unknown>),
      ])
    );
  }
  if (s.required) converted.required = s.required;
  if (s.items) converted.items = convertSchema(s.items as Record<string, unknown>);
  return converted;
}

function extractText(response: { text?: string; candidates?: Array<{ content?: Content }> }): string {
  if (typeof response.text === "string" && response.text.trim()) return response.text.trim();
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("\n")
    .trim();
}

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // The free tier is prone to transient 503 ("high demand") and 429 (per-minute rate limit)
  // responses that Google's own error message explicitly says to retry — not a real outage.
  private async generateContentWithRetry(
    params: Parameters<GoogleGenAI["models"]["generateContent"]>[0]
  ): ReturnType<GoogleGenAI["models"]["generateContent"]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.client.models.generateContent(params);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status && RETRYABLE_STATUS.has(status) && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw err;
      }
    }
  }

  async generateReply({
    cacheableSystemPrompt,
    dynamicSystemPrompt,
    tools,
    history,
    userMessage,
    executeTool,
  }: Parameters<LlmProvider["generateReply"]>[0]): Promise<string> {
    // No context caching on the free tier — just concatenate.
    const systemInstruction = `${cacheableSystemPrompt}\n\n${dynamicSystemPrompt}`;

    const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: convertSchema(t.parameters) as FunctionDeclaration["parameters"],
    }));

    const contents: Content[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    contents.push({ role: "user", parts: [{ text: userMessage }] });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.generateContentWithRetry({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations }],
        },
      });

      const functionCalls = response.functionCalls ?? [];
      if (functionCalls.length === 0) {
        return extractText(response) || FALLBACK_REPLY;
      }

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);

      const responseParts: Part[] = await Promise.all(
        functionCalls.map(async (fc) => {
          let result: unknown;
          try {
            result = await executeTool(fc.name ?? "", (fc.args ?? {}) as Record<string, unknown>);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "Error ejecutando la herramienta." };
          }
          return { functionResponse: { name: fc.name, id: fc.id, response: { result } } };
        })
      );

      contents.push({ role: "user", parts: responseParts });
    }

    return FALLBACK_REPLY;
  }
}
