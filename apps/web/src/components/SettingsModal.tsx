"use client";

import { CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import type { ProviderStatus } from "@/lib/types";

interface SettingsModalProps {
  open: boolean;
  providers: ProviderStatus[];
  onClose: () => void;
  onSaveKey: (provider: string, apiKey: string, baseUrl?: string) => Promise<void>;
}

export function SettingsModal({ open, providers, onClose, onSaveKey }: SettingsModalProps) {
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async (provider: string) => {
    setSaving(provider);
    try {
      await onSaveKey(provider, draftKeys[provider] ?? "", draftUrls[provider]);
      setDraftKeys((prev) => ({ ...prev, [provider]: "" }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Bring Your Own API Keys (BYOK)</h2>
            <p className="text-xs text-slate-400">
              Stored locally in your SQLite database. Start free with Google Gemini, Groq, OpenRouter, or Ollama.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {providers.map((p) => {
            const isOllama = p.provider === "ollama";
            return (
              <div key={p.provider} className="rounded-xl border border-slate-800 bg-surface-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{p.label}</span>
                    {p.has_free_tier && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Free Tier Available
                      </span>
                    )}
                    {p.is_configured && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Configured {p.masked_key ? `(${p.masked_key})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">{p.signup_hint}</p>

                <div className="mt-3 flex gap-2">
                  {isOllama ? (
                    <input
                      type="text"
                      value={draftUrls[p.provider] ?? p.base_url ?? "http://localhost:11434"}
                      onChange={(e) => setDraftUrls((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                      placeholder="http://localhost:11434"
                      className="flex-1 rounded-lg border border-slate-700 bg-surface-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      type="password"
                      value={draftKeys[p.provider] ?? ""}
                      onChange={(e) => setDraftKeys((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                      placeholder={p.is_configured ? "Enter new key to replace or leave blank to clear" : `Paste ${p.label} API key`}
                      className="flex-1 rounded-lg border border-slate-700 bg-surface-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                  <button
                    onClick={() => handleSave(p.provider)}
                    disabled={saving === p.provider}
                    className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving === p.provider ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
