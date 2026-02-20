import type { ChatChunk } from "./types.js";

export interface ChatFinalResult {
  sessionId?: string;
  reply: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export async function collectStreamResult(stream: AsyncIterable<ChatChunk>): Promise<ChatFinalResult> {
  let reply = "";
  let sessionId: string | undefined;
  let usage: ChatFinalResult["usage"];

  for await (const chunk of stream) {
    if (chunk.sessionId) {
      sessionId = chunk.sessionId;
    }
    if (chunk.usage) {
      usage = chunk.usage;
    }
    if (chunk.text) {
      reply += chunk.text;
    }
  }

  return {
    sessionId,
    reply,
    usage
  };
}
