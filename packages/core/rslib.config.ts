import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      "prompt/index": "./src/prompt/index.ts",
      "wrappers/react/index": "./src/wrappers/react/index.ts",
      "wrappers/vanilla/index": "./src/wrappers/vanilla/index.ts"
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
