import { defineConfig } from "@rspress/core";

export default defineConfig({
  title: "InsightFlow Docs",
  description: "InsightFlow SDK and POC V2 documentation",
  root: "docs",
  themeConfig: {
    nav: [
      {
        text: "指南",
        link: "/"
      }
    ]
  }
});
