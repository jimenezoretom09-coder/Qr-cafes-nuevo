// Provider-agnostic shapes so the rest of the app (tools, system prompt, chat service) never
// has to know whether Claude or Gemini is answering. Each LlmProvider implementation owns its
// own tool-use loop internally and returns only the final text reply.

export interface LlmToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface LlmTool {
  name: string;
  description: string;
  parameters: LlmToolSchema;
}

export interface LlmHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<unknown>;

export interface LlmProvider {
  generateReply(params: {
    cacheableSystemPrompt: string;
    dynamicSystemPrompt: string;
    tools: LlmTool[];
    history: LlmHistoryMessage[];
    userMessage: string;
    executeTool: ToolExecutor;
  }): Promise<string>;
}
