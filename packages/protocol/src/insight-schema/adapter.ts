export interface DataSchemaDescriptor {
  /**
   * Schema 唯一标识，例如 metric-series / trend-rows。
   */
  id: string;
  /**
   * Schema 版本，建议使用语义化版本。
   */
  version: string;
  /**
   * 可读描述，便于调试和治理。
   */
  description?: string;
}

export interface AdaptedPayload<TData = unknown> {
  adapterId: string;
  schema: DataSchemaDescriptor;
  data: TData;
  raw?: unknown;
}

export interface DataAdapter<TInput = unknown, TOutput = unknown> {
  /**
   * 适配器标识。
   */
  id: string;
  /**
   * 输出数据对应的 Schema 描述。
   */
  schema: DataSchemaDescriptor;
  /**
   * 判断当前输入是否可由该适配器处理。
   */
  canAdapt(input: unknown): input is TInput;
  /**
   * 将异构输入转换为统一结构。
   */
  adapt(input: TInput): TOutput | Promise<TOutput>;
}
