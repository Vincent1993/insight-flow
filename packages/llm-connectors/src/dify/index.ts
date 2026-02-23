import { buildEffectivePrompt } from "../prompt.js";
import type { ChatChunk, ChatRequest, InsightChatConnector } from "../types.js";

export interface DifyConnectorConfig {
  baseUrl: string;
  apiKey: string;
  appId: string;
  timeoutMs?: number;
}

interface DifyStreamEvent {
  event?: string;
  answer?: string;
  conversation_id?: string;
  metadata?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function createAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function parseSSE(buffer: string): { events: string[]; remain: string } {
  const chunks = buffer.split("\n\n");
  const remain = chunks.pop() ?? "";
  return { events: chunks, remain };
}

function parseDifyEvent(rawEvent: string): DifyStreamEvent | null {
  const line = rawEvent
    .split("\n")
    .find((item) => item.startsWith("data:"));
  if (!line) {
    return null;
  }
  const jsonText = line.replace(/^data:\s*/, "").trim();
  if (!jsonText || jsonText === "[DONE]") {
    return null;
  }
  return JSON.parse(jsonText) as DifyStreamEvent;
}

async function* streamFromResponse(response: Response): AsyncGenerator<ChatChunk> {
  if (!response.body) {
    const payload = (await response.json()) as { answer?: string };
    yield {
      text: payload.answer ?? "",
      done: true
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sessionId: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSSE(buffer);
    buffer = parsed.remain;

    for (const rawEvent of parsed.events) {
      const event = parseDifyEvent(rawEvent);
      if (!event) {
        continue;
      }
      if (event.answer) {
        if (event.conversation_id) {
          sessionId = event.conversation_id;
        }
        yield { text: event.answer, sessionId };
      }
      if (event.event === "message_end") {
        if (event.conversation_id) {
          sessionId = event.conversation_id;
        }
        yield {
          text: "",
          done: true,
          sessionId,
          usage: {
            promptTokens: event.metadata?.usage?.prompt_tokens,
            completionTokens: event.metadata?.usage?.completion_tokens
          }
        };
      }
    }
  }
}

export function createDifyConnector(config: DifyConnectorConfig): InsightChatConnector {
  if (!config.baseUrl?.trim()) {
    throw new Error("IF-CHAT-001: baseUrl is required");
  }
  if (!config.apiKey?.trim()) {
    throw new Error("IF-CHAT-001: apiKey is required");
  }
  if (!config.appId?.trim()) {
    throw new Error("IF-CHAT-001: appId is required");
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const timeoutMs = config.timeoutMs ?? 60_000;

  return {
    async *streamChat(req: ChatRequest): AsyncIterable<ChatChunk> {
      const query = buildEffectivePrompt(req);

      const response = await fetch(`${baseUrl}/chat-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        signal: createAbortSignal(timeoutMs),
        body: JSON.stringify({
          inputs: {
            app_id: config.appId,
            identity_id: req.identityId
          },
          query,
          user: req.identityId,
          response_mode: "streaming"
        })
      });

      if (!response.ok) {
        throw new Error(`IF-CHAT-001: Dify request failed (${response.status})`);
      }

      yield* streamFromResponse(response);
    }
  };
}
