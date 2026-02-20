export interface EdgeStats {
  mean?: number;
  min?: number;
  max?: number;
  variance?: number;
  slope?: number;
  /**
   * 离群值索引（非原始值），避免敏感信息泄漏。
   */
  outliers?: number[];
}
