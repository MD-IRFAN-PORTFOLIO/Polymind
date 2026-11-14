"use client";

import { FileText, Sparkles, X } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationDrawerProps {
  open: boolean;
  citations: Citation[];
  activeCitationId?: number | null;
  onClose: () => void;
  onSelectCitation: (id: number) => void;
}

export function CitationDrawer({
  open,
  citations,
  activeCitationId,
  onClose,
  onSelectCitation,
}: CitationDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex h-full h-[100dvh] w-full max-w-md flex-col border-l border-slate-800 bg-surface-900 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Grounded Sources ({citations.length})</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {citations.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500">No citations attached to this response.</p>
        ) : (
          citations.map((c) => {
            const isHighlight = activeCitationId === c.citation_id;
            return (
              <div
                key={c.chunk_id || c.citation_id}
                onClick={() => onSelectCitation(c.citation_id)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  isHighlight
                    ? "border-indigo-500/80 bg-indigo-500/10 ring-1 ring-indigo-500/40"
                    : "border-slate-800 bg-surface-950/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600/30 text-[11px] font-bold text-indigo-300">
                      [{c.citation_id}]
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-200">{c.filename}</span>
                  </div>
                  {c.score > 0 && (
                    <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      {(c.score * 100).toFixed(1)}% match
                    </span>
                  )}
                </div>

                <div className="mt-2.5 rounded-lg border border-slate-800/80 bg-surface-900/60 p-3 text-xs leading-relaxed text-slate-300">
                  <p className="whitespace-pre-wrap">{c.snippet}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </>
);
}
