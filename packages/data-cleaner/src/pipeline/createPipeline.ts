import type { CleanerContext, CleanerPipeline, CleanerPlugin } from "../types.js";

export function createPipeline(initialPlugins: CleanerPlugin[] = []): CleanerPipeline {
  const plugins: CleanerPlugin[] = [...initialPlugins];

  return {
    async run(input: unknown, ctx: CleanerContext = {}): Promise<unknown> {
      let current: unknown = input;
      for (const plugin of plugins) {
        current = await plugin(current, ctx);
      }
      return current;
    },
    use(plugin: CleanerPlugin): CleanerPipeline {
      plugins.push(plugin);
      return this;
    }
  };
}
