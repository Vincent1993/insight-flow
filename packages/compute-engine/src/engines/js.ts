import { summarizeMetric } from "../stats/metric.js";
import { detectOutliers } from "../stats/outlier.js";
import { calculateTrend } from "../stats/trend.js";
import type { ComputeEngine, OutlierResult, SummaryResult, TrendResult } from "../types.js";

export class JsComputeEngine implements Omit<ComputeEngine, "pickBackend"> {
  async summarize(series: number[]): Promise<SummaryResult> {
    return summarizeMetric(series);
  }

  async trend(series: number[]): Promise<TrendResult> {
    return calculateTrend(series);
  }

  async outliers(series: number[]): Promise<OutlierResult> {
    return detectOutliers(series);
  }
}
