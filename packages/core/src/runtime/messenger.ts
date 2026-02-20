import type { InsightEventName } from "@insight-flow/protocol";

type MessageHandler<T = unknown> = (payload: T) => void;

export class InsightMessenger {
  private readonly channels = new Map<string, Set<MessageHandler>>();

  subscribe<T>(eventName: InsightEventName | string, handler: MessageHandler<T>): () => void {
    const current = this.channels.get(eventName) ?? new Set<MessageHandler>();
    current.add(handler as MessageHandler);
    this.channels.set(eventName, current);
    return () => {
      const handlers = this.channels.get(eventName);
      handlers?.delete(handler as MessageHandler);
      if (handlers && handlers.size === 0) {
        this.channels.delete(eventName);
      }
    };
  }

  publish<T>(eventName: InsightEventName | string, payload: T): void {
    const handlers = this.channels.get(eventName);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }
}
