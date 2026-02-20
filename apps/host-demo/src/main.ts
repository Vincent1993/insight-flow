import { mountHostDemo } from "./browser-demo.js";

if (typeof document !== "undefined") {
  const container = document.getElementById("app");
  if (container) {
    void mountHostDemo(container);
  }
}
