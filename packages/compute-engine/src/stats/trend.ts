import type { TrendResult } from "../types.js";

export function calculateTrend(series: number[]): TrendResult {
  const n = series.length;
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }
  if (n === 1) {
    return { slope: 0, intercept: series[0] };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = series[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
