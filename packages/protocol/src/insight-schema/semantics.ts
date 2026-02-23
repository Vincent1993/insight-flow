export interface Semantics {
  /**
   * 业务域，例如 sales / finance / ops。
   */
  domain?: string;
  /**
   * 指标名，例如 revenue / order_count。
   */
  metric?: string;
  /**
   * 维度列表，例如 region / channel。
   */
  dimensions?: string[];
  /**
   * 可选语义标签。
   */
  tags?: string[];
}
