import type { Identity, Semantics } from "@insight-flow/protocol";

export interface CleanerContext {
  identity?: Identity;
  semantics?: Semantics;
}

export type CleanerPlugin = (
  input: unknown,
  ctx: CleanerContext
) => unknown | Promise<unknown>;

export interface CleanerPipeline {
  run(input: unknown, ctx?: CleanerContext): Promise<unknown>;
  use(plugin: CleanerPlugin): CleanerPipeline;
}
