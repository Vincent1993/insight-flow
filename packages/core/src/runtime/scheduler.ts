export type ComputeBackend = "js" | "worker" | "wasm";

export interface SchedulerThresholds {
  jsMaxPoints: number;
  workerMaxPoints: number;
}

const DEFAULT_THRESHOLDS: SchedulerThresholds = {
  jsMaxPoints: 5_000,
  workerMaxPoints: 100_000
};

export class ComputeScheduler {
  private readonly thresholds: SchedulerThresholds;

  constructor(thresholds?: Partial<SchedulerThresholds>) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds
    };
  }

  pickBackend(dataPoints: number): ComputeBackend {
    if (dataPoints <= this.thresholds.jsMaxPoints) {
      return "js";
    }
    if (dataPoints <= this.thresholds.workerMaxPoints) {
      return "worker";
    }
    return "wasm";
  }
}
