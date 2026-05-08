import React, { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { PromoteResponse } from "../../api/types";

function actionTitle(action: Record<string, unknown>, index: number) {
  return typeof action.title === "string" && action.title ? action.title : `行动项 ${index + 1}`;
}

interface PromoteDialogProps {
  open: boolean;
  actions: Record<string, unknown>[];
  onClose: () => void;
  onPromote: (indices?: number[]) => Promise<PromoteResponse>;
}

export function PromoteDialog({ open, actions, onClose, onPromote }: PromoteDialogProps) {
  const [selected, setSelected] = useState<number[]>(actions.map((_, index) => index));
  const [result, setResult] = useState<PromoteResponse | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function toggle(index: number) {
    setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  async function handlePromote() {
    setSaving(true);
    try {
      const response = await onPromote(selected);
      setResult(response);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">转为任务</h2>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                已创建 {result.created} 个任务，跳过 {result.skipped} 个。
              </div>
              <a href="/task-board" className="mt-3 inline-flex text-blue-700 hover:underline">查看任务看板</a>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action, index) => (
                <label key={index} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(index)}
                    onChange={() => toggle(index)}
                    className="mt-1"
                  />
                  <span className="font-medium text-slate-800">{actionTitle(action, index)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700">
            关闭
          </button>
          {!result && (
            <button
              onClick={handlePromote}
              disabled={saving || selected.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "转换中" : "转换所选"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
