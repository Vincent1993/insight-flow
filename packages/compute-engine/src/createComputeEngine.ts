import { JsComputeEngine } from "./engines/js.js";
import { WasmComputeEngine } from "./engines/wasm.js";
import { WorkerComputeEngine } from "./engines/worker.js";
import type { ComputeBackend, ComputeConfig, ComputeEngine } from "./types.js";

const DEFAULT_JS_THRESHOLD = 5_000;
const DEFAULT_WORKER_THRESHOLD = 100_000;

export function createComputeEngine(config: ComputeConfig = {}): ComputeEngine {
  const jsEngine = new JsComputeEngine();
  const workerEngine = new WorkerComputeEngine();
  const wasmEngine = new WasmComputeEngine();

  const jsMaxPoints = config.thresholds?.jsMaxPoints ?? DEFAULT_JS_THRESHOLD;
  const workerMaxPoints = config.thresholds?.workerMaxPoints ?? DEFAULT_WORKER_THRESHOLD;

  const pickBackend = (points: number): ComputeBackend => {
    if (config.mode && config.mode !== "auto") {
      return config.mode;
    }
    if (points <= jsMaxPoints) {
      return "js";
    }
    if (points <= workerMaxPoints) {
      return "worker";
    }
    return "wasm";
  };

  const pickEngine = (points: number) => {
    const backend = pickBackend(points);
    if (backend === "js") {
      return jsEngine;
    }
    if (backend === "worker") {
      return workerEngine;
    }
    return wasmEngine;
  };

  return {
    async summarize(series: number[]) {
      return pickEngine(series.length).summarize(series);
    },
    async trend(series: number[]) {
      return pickEngine(series.length).trend(series);
    },
    async outliers(series: number[]) {
      return pickEngine(series.length).outliers(series);
    },
    pickBackend
  };
}
