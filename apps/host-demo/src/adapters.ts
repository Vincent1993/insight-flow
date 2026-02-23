import type { DataAdapter } from "@insight-flow/protocol";

export interface AdaptedModuleData {
  id: string;
  title: string;
  points: number[];
  filters: string[];
}

interface MetricSeriesInput {
  moduleId: string;
  moduleName: string;
  series: number[];
  filters?: string[];
}

interface TrendRowsInput {
  id: string;
  title: string;
  rows: Array<{ x: string; y: number }>;
  context?: {
    filters?: string[];
  };
}

const metricSeriesAdapter: DataAdapter<MetricSeriesInput, AdaptedModuleData> = {
  id: "metric-series-adapter",
  schema: {
    id: "metric-series",
    version: "1.0.0",
    description: "模块按 series 数组注入"
  },
  canAdapt(input: unknown): input is MetricSeriesInput {
    if (!input || typeof input !== "object") {
      return false;
    }
    const value = input as Partial<MetricSeriesInput>;
    return (
      typeof value.moduleId === "string" &&
      typeof value.moduleName === "string" &&
      Array.isArray(value.series)
    );
  },
  adapt(input: MetricSeriesInput): AdaptedModuleData {
    return {
      id: input.moduleId,
      title: input.moduleName,
      points: input.series,
      filters: input.filters ?? []
    };
  }
};

const trendRowsAdapter: DataAdapter<TrendRowsInput, AdaptedModuleData> = {
  id: "trend-rows-adapter",
  schema: {
    id: "trend-rows",
    version: "1.0.0",
    description: "模块按 rows[{x,y}] 注入"
  },
  canAdapt(input: unknown): input is TrendRowsInput {
    if (!input || typeof input !== "object") {
      return false;
    }
    const value = input as Partial<TrendRowsInput>;
    return typeof value.id === "string" && typeof value.title === "string" && Array.isArray(value.rows);
  },
  adapt(input: TrendRowsInput): AdaptedModuleData {
    return {
      id: input.id,
      title: input.title,
      points: input.rows.map((item) => item.y),
      filters: input.context?.filters ?? []
    };
  }
};

export function createDemoAdapters(): DataAdapter[] {
  return [metricSeriesAdapter, trendRowsAdapter];
}
