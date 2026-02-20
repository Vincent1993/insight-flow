export interface StateTrace {
  /**
   * 当前组件筛选条件快照。
   */
  filters?: string[];
  /**
   * 时间范围标识，例如 last_7_days。
   */
  dateRange?: string;
  /**
   * 粒度，例如 day / week / month。
   */
  granularity?: string;
  /**
   * 扩展字段，保留给业务方。
   */
  ext?: Record<string, unknown>;
}
