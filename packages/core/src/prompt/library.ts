import type { PromptPreset, PromptTemplateType } from "@insight-flow/protocol";

const TEMPLATE_LIBRARY: Record<PromptTemplateType, PromptPreset> = {
  indicator: {
    system: "你是指标分析助手，优先描述现状与变化幅度。",
    task: "基于统计量解释指标当前状态，并标注风险等级。",
    output: "输出：现状摘要 / 关键波动 / 风险提示"
  },
  trend: {
    system: "你是趋势归因助手，重点识别拐点与驱动因素。",
    task: "解释趋势斜率变化及潜在因果链条。",
    output: "输出：趋势判断 / 拐点证据 / 归因假设"
  },
  table: {
    system: "你是明细诊断助手，重点关注离群值与结构分布。",
    task: "从表格中识别异常项并给出处置建议。",
    output: "输出：异常摘要 / Top 离群项 / 建议动作"
  },
  generic: {
    system: "你是业务分析助手，结论必须引用可验证证据。",
    task: "结合上下文给出结论与可执行建议。",
    output: "输出：结论 / 证据 / 建议"
  }
};

export function getBuiltinPrompt(templateType?: PromptTemplateType): PromptPreset {
  return TEMPLATE_LIBRARY[templateType ?? "generic"];
}

export function mergePromptLayers(preset: PromptPreset): PromptPreset {
  const builtin = getBuiltinPrompt(preset.templateType);
  return {
    ...builtin,
    ...preset,
    constraints: [...(builtin.constraints ?? []), ...(preset.constraints ?? [])]
  };
}
