export type ComputeMode = "js" | "worker" | "wasm" | "auto";
export type ComputeBackend = "js" | "worker" | "wasm";

export interface ComputeThresholds {
  jsMaxPoints?: number;
  workerMaxPoints?: number;
}

export interface ComputeConfig {
  mode?: ComputeMode;
  thresholds?: ComputeThresholds;
}

export interface SummaryResult {
  mean: number;
  min: number;
  max: number;
  variance: number;
}

export interface TrendResult {
  slope: number;
  intercept: number;
}

export interface OutlierResult {
  indexes: number[];
  lowerFence: number;
  upperFence: number;
}

export interface ComputeEngine {
  summarize(series: number[]): Promise<SummaryResult>;
  trend(series: number[]): Promise<TrendResult>;
  outliers(series: number[]): Promise<OutlierResult>;
  pickBackend(points: number): ComputeBackend;
}
