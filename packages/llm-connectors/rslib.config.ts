import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      "dify/index": "./src/dify/index.ts"
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
