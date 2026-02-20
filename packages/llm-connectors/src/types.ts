import type { InsightRecord, PromptMode } from "@insight-flow/protocol";

export interface ChatRequest {
  identityId: string;
  records: InsightRecord[];
  userInput: string;
  promptMode?: PromptMode;
  overridePrompt?: string;
}

export interface ChatChunk {
  text: string;
  done?: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface InsightChatConnector {
  streamChat(req: ChatRequest): AsyncIterable<ChatChunk>;
}
