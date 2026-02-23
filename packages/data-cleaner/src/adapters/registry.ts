import type { AdaptedPayload, DataAdapter } from "@insight-flow/protocol";

export interface AdaptOptions {
  adapterId?: string;
  includeRaw?: boolean;
}

export interface AdapterRegistry {
  register<TInput = unknown, TOutput = unknown>(adapter: DataAdapter<TInput, TOutput>): void;
  unregister(adapterId: string): void;
  list(): DataAdapter[];
  adapt<TOutput = unknown>(input: unknown, options?: AdaptOptions): Promise<AdaptedPayload<TOutput>>;
}

function pickAdapter(adapters: Map<string, DataAdapter>, input: unknown, adapterId?: string): DataAdapter {
  if (adapterId) {
    const adapter = adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`IF-ADAPTER-001: adapter not found (${adapterId})`);
    }
    return adapter;
  }

  for (const adapter of adapters.values()) {
    if (adapter.canAdapt(input)) {
      return adapter;
    }
  }

  throw new Error("IF-ADAPTER-002: no adapter can handle current input");
}

export function createAdapterRegistry(initialAdapters: DataAdapter[] = []): AdapterRegistry {
  const adapters = new Map<string, DataAdapter>();

  for (const adapter of initialAdapters) {
    adapters.set(adapter.id, adapter);
  }

  return {
    register<TInput = unknown, TOutput = unknown>(adapter: DataAdapter<TInput, TOutput>): void {
      adapters.set(adapter.id, adapter as DataAdapter);
    },
    unregister(adapterId: string): void {
      adapters.delete(adapterId);
    },
    list(): DataAdapter[] {
      return Array.from(adapters.values());
    },
    async adapt<TOutput = unknown>(input: unknown, options: AdaptOptions = {}): Promise<AdaptedPayload<TOutput>> {
      const adapter = pickAdapter(adapters, input, options.adapterId);
      const adapted = await adapter.adapt(input);
      return {
        adapterId: adapter.id,
        schema: adapter.schema,
        data: adapted as TOutput,
        raw: options.includeRaw ? input : undefined
      };
    }
  };
}
