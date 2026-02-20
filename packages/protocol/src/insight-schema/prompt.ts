export type PromptMode = "append" | "replace";

export interface PromptPreset {
  /**
   * 角色与风格设定。
   */
  system: string;
  /**
   * 模块默认分析任务。
   */
  task: string;
  /**
   * 输出格式要求。
   */
  output?: string;
  /**
   * 约束与边界条件。
   */
  constraints?: string[];
  /**
   * 可注入模板变量。
   */
  variables?: Record<string, string>;
  /**
   * 未指定时默认采用 append。
   */
  defaultMode?: PromptMode;
}

export interface PromptOverride {
  mode: PromptMode;
  /**
   * 用户在当前会话中追加或替换的提示词。
   */
  text: string;
}
