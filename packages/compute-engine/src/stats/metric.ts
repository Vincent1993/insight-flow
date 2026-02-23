import type { SummaryResult } from "../types.js";

export function summarizeMetric(series: number[]): SummaryResult {
  if (series.length === 0) {
    return { mean: 0, min: 0, max: 0, variance: 0 };
  }

  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const point of series) {
    sum += point;
    if (point < min) {
      min = point;
    }
    if (point > max) {
      max = point;
    }
  }

  const mean = sum / series.length;
  let varianceSum = 0;
  for (const point of series) {
    varianceSum += (point - mean) ** 2;
  }

  return {
    mean,
    min,
    max,
    variance: varianceSum / series.length
  };
}
