export interface InterpretationCacheEntry {
  moduleId: string;
  fingerprint: string;
  sessionId?: string;
  reply: string;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}

export type InterpretationCacheStatus = "hit" | "miss" | "stale";

export interface InterpretationCacheLookup {
  status: InterpretationCacheStatus;
  currentFingerprint: string;
  latestFingerprint?: string;
  entry?: InterpretationCacheEntry;
}

export interface AsyncKVStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface InterpretationCacheOptions {
  ttlMs?: number;
}
