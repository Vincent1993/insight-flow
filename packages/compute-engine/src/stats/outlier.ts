import type { OutlierResult } from "../types.js";

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function detectOutliers(series: number[]): OutlierResult {
  if (series.length < 4) {
    return {
      indexes: [],
      lowerFence: Number.NEGATIVE_INFINITY,
      upperFence: Number.POSITIVE_INFINITY
    };
  }

  const sorted = [...series].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const indexes: number[] = [];
  for (let i = 0; i < series.length; i += 1) {
    const value = series[i];
    if (value < lowerFence || value > upperFence) {
      indexes.push(i);
    }
  }

  return { indexes, lowerFence, upperFence };
}
