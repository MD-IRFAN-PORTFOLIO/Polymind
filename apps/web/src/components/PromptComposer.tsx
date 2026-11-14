"use client";

import { Send, Square, Wand2 } from "lucide-react";

interface PromptComposerProps {
  value: string;
  isStreaming: boolean;
  isBoosting: boolean;
  selectedModelCount: number;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onBoost: () => void;
}

export function PromptComposer({
  value,
  isStreaming,
  isBoosting,
  selectedModelCount,
  onChange,
  onSend,
  onStop,
  onBoost,
}: PromptComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="shrink-0 z-20 border-t border-slate-800/80 bg-surface-900/90 px-3 py-2.5 sm:px-4 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-700/80 bg-surface-950 p-2 sm:p-2.5 shadow-lg focus-within:border-indigo-500/70">
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${selectedModelCount} AI model${selectedModelCount === 1 ? "" : "s"} simultaneously...`}
          className="w-full resize-none bg-transparent px-2 py-1 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={onBoost}
            disabled={isBoosting || isStreaming || !value.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            title="Expand & refine your prompt before broadcasting"
          >
            <Wand2 className={`h-3.5 w-3.5 ${isBoosting ? "animate-pulse" : ""}`} />
            <span>{isBoosting ? "Boosting..." : "Prompt Boost"}</span>
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || selectedModelCount === 0}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
