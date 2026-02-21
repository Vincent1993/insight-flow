import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: [
    "apps/**/*.test.ts",
    "packages/**/*.test.ts"
  ],
  testEnvironment: "node"
});
