import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { LlmProvider } from "./types.js";

const MAX_TOOL_ROUNDS = 5;
const FALLBACK_REPLY = "Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo?";

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateReply({
    cacheableSystemPrompt,
    dynamicSystemPrompt,
    tools,
    history,
    userMessage,
    executeTool,
  }: Parameters<LlmProvider["generateReply"]>[0]): Promise<string> {
    const system = [
      {
        type: "text" as const,
        text: cacheableSystemPrompt,
        cache_control: { type: "ephemeral" as const, ttl: "1h" as const },
      },
      { type: "text" as const, text: dynamicSystemPrompt },
    ];

    const claudeTools: Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Tool["input_schema"],
    }));

    const messages: MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    messages.push({ role: "user", content: userMessage });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        thinking: { type: "disabled" },
        system,
        tools: claudeTools,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        return response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          let result: unknown;
          try {
            result = await executeTool(block.name, block.input as Record<string, unknown>);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "Error ejecutando la herramienta." };
          }
          return { type: "tool_result" as const, tool_use_id: block.id, content: JSON.stringify(result) };
        })
      );

      messages.push({ role: "user", content: toolResults });
    }

    return FALLBACK_REPLY;
  }
}
