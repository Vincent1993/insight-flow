import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/main.tsx"
    }
  },
  html: {
    title: "InsightFlow Host Demo"
  },
  server: {
    port: 3000,
    open: false
  }
});
