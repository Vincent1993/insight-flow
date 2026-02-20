export interface Identity {
  /**
   * 全局唯一组件标识。
   */
  id: string;
  /**
   * 组件类型，例如 metric-card / trend-chart / table。
   */
  type: string;
  /**
   * 可选页面标识，便于跨页面定位组件。
   */
  page?: string;
}
