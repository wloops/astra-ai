import { SlidersHorizontal } from "lucide-react";

import type { ModelProfile, ScenarioTemplate } from "../../api/types";

const STAGE_LABELS: Record<string, string> = {
  clarify_topic: "澄清议题",
  independent_review: "独立评审",
  detect_conflict: "识别争议",
  debate: "交叉辩论",
  judge_and_summarize: "裁决总结",
  generate_actions: "生成行动项",
};

interface ModelSelectorProps {
  profiles: ModelProfile[];
  scenario: ScenarioTemplate | undefined;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

export function ModelSelector({ profiles, scenario, value, onChange }: ModelSelectorProps) {
  if (profiles.length <= 1) return null;

  const defaultProfile = profiles.find((profile) => profile.name === "default") ?? profiles[0];
  const stages = scenario?.stages.filter((stage) => stage in STAGE_LABELS) ?? Object.keys(STAGE_LABELS);

  const updateStage = (stage: string, profileName: string) => {
    const next = { ...value };
    if (profileName) {
      next[stage] = profileName;
    } else {
      delete next[stage];
    }
    onChange(next);
  };

  return (
    <section className="px-8 py-6 border-b border-slate-100">
      <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold text-lg">
        <SlidersHorizontal className="w-5 h-5 text-slate-500" />
        <span>模型配置</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.2fr_1fr_1.1fr] bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
          <span>阶段</span>
          <span>当前模型</span>
          <span>覆盖</span>
        </div>
        {stages.map((stage) => {
          const selected = profiles.find((profile) => profile.name === value[stage]);
          const effective = selected ?? defaultProfile;
          return (
            <div key={stage} className="grid grid-cols-[1.2fr_1fr_1.1fr] items-center gap-3 border-t border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{STAGE_LABELS[stage] ?? stage}</div>
                <div className="text-xs text-slate-400">{stage}</div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-700">{effective.model}</div>
                <div className="text-xs text-slate-400">{selected ? "session 覆盖" : "default"}</div>
              </div>
              <select
                value={value[stage] ?? ""}
                onChange={(event) => updateStage(stage, event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">使用默认</option>
                {profiles.map((profile) => (
                  <option key={profile.name} value={profile.name}>
                    {profile.name} · {profile.model}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
