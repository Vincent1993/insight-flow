import type {
  AsyncKVStore,
  InterpretationCacheEntry,
  InterpretationCacheLookup,
  InterpretationCacheOptions
} from "../types.js";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function latestKey(moduleId: string): string {
  return `if:latest:${moduleId}`;
}

function entryKey(moduleId: string, fingerprint: string): string {
  return `if:entry:${moduleId}:${fingerprint}`;
}

export class InterpretationCache {
  private readonly store: AsyncKVStore;
  private readonly ttlMs: number;

  constructor(store: AsyncKVStore, options: InterpretationCacheOptions = {}) {
    this.store = store;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  async getStatus(moduleId: string, currentFingerprint: string): Promise<InterpretationCacheLookup> {
    const latest = await this.store.get<string>(latestKey(moduleId));
    if (!latest) {
      return {
        status: "miss",
        currentFingerprint
      };
    }
    if (latest !== currentFingerprint) {
      return {
        status: "stale",
        currentFingerprint,
        latestFingerprint: latest
      };
    }

    const entry = await this.store.get<InterpretationCacheEntry>(entryKey(moduleId, currentFingerprint));
    if (!entry) {
      return {
        status: "miss",
        currentFingerprint,
        latestFingerprint: latest
      };
    }

    if (entry.expiresAt <= Date.now()) {
      return {
        status: "stale",
        currentFingerprint,
        latestFingerprint: latest,
        entry
      };
    }

    return {
      status: "hit",
      currentFingerprint,
      latestFingerprint: latest,
      entry
    };
  }

  async set(
    moduleId: string,
    fingerprint: string,
    payload: { reply: string; sessionId?: string; metadata?: Record<string, unknown> }
  ): Promise<InterpretationCacheEntry> {
    const now = Date.now();
    const entry: InterpretationCacheEntry = {
      moduleId,
      fingerprint,
      sessionId: payload.sessionId,
      reply: payload.reply,
      metadata: payload.metadata,
      createdAt: now,
      expiresAt: now + this.ttlMs
    };
    await this.store.set(entryKey(moduleId, fingerprint), entry);
    await this.store.set(latestKey(moduleId), fingerprint);
    return entry;
  }

  async clearModule(moduleId: string): Promise<void> {
    const latest = await this.store.get<string>(latestKey(moduleId));
    await this.store.delete(latestKey(moduleId));
    if (latest) {
      await this.store.delete(entryKey(moduleId, latest));
    }
  }
}

export function createInterpretationCache(
  store: AsyncKVStore,
  options?: InterpretationCacheOptions
): InterpretationCache {
  return new InterpretationCache(store, options);
}
