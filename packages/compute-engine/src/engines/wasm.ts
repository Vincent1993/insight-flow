import { JsComputeEngine } from "./js.js";
import type { OutlierResult, SummaryResult, TrendResult } from "../types.js";

/**
 * 预留 WASM 引擎。
 * 当前骨架阶段先复用 JS 引擎，后续可替换为真实 WASM 调用。
 */
export class WasmComputeEngine {
  private readonly fallback = new JsComputeEngine();

  async summarize(series: number[]): Promise<SummaryResult> {
    return this.fallback.summarize(series);
  }

  async trend(series: number[]): Promise<TrendResult> {
    return this.fallback.trend(series);
  }

  async outliers(series: number[]): Promise<OutlierResult> {
    return this.fallback.outliers(series);
  }
}
