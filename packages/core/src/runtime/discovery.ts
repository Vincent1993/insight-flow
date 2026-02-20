import type { InsightEventName } from "@insight-flow/protocol";
import type { CreateCoreOptions } from "../types.js";

export interface DiscoveryPayload<T = unknown> {
  name: InsightEventName | string;
  appId: string;
  timestamp: number;
  payload: T;
}

export class DiscoveryChannel {
  private readonly enabled: boolean;

  constructor(options: CreateCoreOptions["discovery"]) {
    this.enabled = Boolean(options?.enableBroadcast);
  }

  broadcast<T>(message: DiscoveryPayload<T>): void {
    if (!this.enabled || typeof window === "undefined") {
      return;
    }
    window.postMessage(message, "*");
  }
}
