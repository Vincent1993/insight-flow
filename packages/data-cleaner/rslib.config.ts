import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      "adapters/index": "./src/adapters/index.ts",
      "plugins/index": "./src/plugins/index.ts"
    }
  },
  lib: [
    {
      format: "esm",
      dts: true,
      syntax: "es2021"
    }
  ]
});
