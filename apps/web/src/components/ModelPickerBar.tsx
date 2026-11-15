"use client";

import {
  Check,
  ChevronDown,
  Columns,
  Database,
  Download,
  LayoutGrid,
  Layers,
  PanelLeft,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import type { LayoutMode, ModelInfo } from "@/lib/types";

interface ModelPickerBarProps {
  models: ModelInfo[];
  selectedModels: string[];
  systemPrompt: string;
  activeKbCount: number;
  layoutMode: LayoutMode;
  sidebarOpen?: boolean;
  hasTurns?: boolean;
  onToggleSidebar?: () => void;
  onSelectLayoutMode: (mode: LayoutMode) => void;
  onToggleModel: (modelId: string) => void;
  onAddCustomModel: (modelId: string) => void;
  onUpdateSystemPrompt: (value: string) => void;
  onOpenKnowledgeModal: () => void;
  onExportChat?: (format: "markdown" | "json") => void;
}

export function ModelPickerBar({
  models,
  selectedModels,
  systemPrompt,
  activeKbCount,
  layoutMode,
  sidebarOpen,
  hasTurns,
  onToggleSidebar,
  onSelectLayoutMode,
  onToggleModel,
  onAddCustomModel,
  onUpdateSystemPrompt,
  onOpenKnowledgeModal,
  onExportChat,
}: ModelPickerBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sysOpen, setSysOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customId, setCustomId] = useState("");

  const handleAddCustom = () => {
    const trimmed = customId.trim();
    if (!trimmed) return;
    onAddCustomModel(trimmed);
    setCustomId("");
  };

  return (
    <div className="shrink-0 border-b border-slate-800/80 bg-surface-900/90 px-4 py-2.5 backdrop-blur z-20">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left side: Sidebar toggle + Models selector + Selected model pills */}
        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`rounded-lg border border-slate-700 bg-surface-800 p-1.5 text-slate-300 transition hover:border-indigo-500/60 hover:text-white ${
                !sidebarOpen ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300" : ""
              }`}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}

          {/* Model picker trigger with self-contained dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-surface-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:border-indigo-500/60"
            >
              <span>Models ({selectedModels.length}/6)</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <>
                {/* Click outside backdrop */}
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
                  onClick={() => setDropdownOpen(false)}
                />

                {/* Popover Card */}
                <div className="fixed inset-x-3 top-14 z-50 flex max-h-[80vh] flex-col rounded-xl border border-slate-700 bg-surface-900 shadow-2xl sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-[calc(100vw-2rem)]">
                  {/* Sticky Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 bg-surface-950 px-4 py-3">
                    <span className="text-xs font-semibold text-white">Select Models to Compare (max 6)</span>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(false)}
                      className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-surface-800 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  {/* Scrollable Model List */}
                  <div className="max-h-80 space-y-1.5 overflow-y-auto p-2.5 pr-3">
                    {models.map((m) => {
                      const selected = selectedModels.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onToggleModel(m.id)}
                          className={`flex w-full items-start justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                            selected
                              ? "border-indigo-500/50 bg-indigo-600/15 text-white"
                              : "border-transparent text-slate-300 hover:bg-surface-800/80 hover:text-white"
                          }`}
                        >
                          <div className="pr-3 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 font-medium">
                              <span className="truncate">{m.name}</span>
                              {m.has_free_tier && (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                                  Free tier
                                </span>
                              )}
                              {!m.is_configured && (
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                                  Key needed
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{m.description}</p>
                          </div>
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              selected
                                ? "border-indigo-500 bg-indigo-500 text-white"
                                : "border-slate-600 bg-surface-950"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Model Input */}
                  <div className="flex gap-1.5 border-t border-slate-800 bg-surface-950/70 p-2.5">
                    <input
                      value={customId}
                      onChange={(e) => setCustomId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                      placeholder="Custom model ID (e.g. openrouter/...)"
                      className="flex-1 rounded-lg border border-slate-700 bg-surface-900 px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active Model Pills Container - scrolls smoothly without vertical wrapping on mobile */}
          <div className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 sm:flex-wrap">
            {selectedModels.map((mid) => {
              const info = models.find((m) => m.id === mid);
              return (
                <button
                  key={mid}
                  type="button"
                  onClick={() => onToggleModel(mid)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-200 transition hover:bg-indigo-500/20"
                  title="Click to remove from comparison"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      info?.is_configured ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="max-w-[110px] sm:max-w-[140px] truncate">{info?.name ?? mid}</span>
                  <span className="text-indigo-400">×</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side controls: Layout switcher, RAG toggle, System Instructions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Layout Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-surface-800 p-0.5 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => onSelectLayoutMode("columns")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                layoutMode === "columns"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "hover:text-slate-200"
              }`}
              title="Side-by-Side Columns: all models stay in 1 horizontal line"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectLayoutMode("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                layoutMode === "grid"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "hover:text-slate-200"
              }`}
              title="Grid View: multi-row with compact equal-height cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectLayoutMode("tabs")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                layoutMode === "tabs"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "hover:text-slate-200"
              }`}
              title="Tabbed Focus View: inspect one model at full width"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabs</span>
            </button>
          </div>

          {/* RAG Docs button */}
          <button
            type="button"
            onClick={onOpenKnowledgeModal}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              activeKbCount > 0
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                : "border-slate-700 bg-surface-800 text-slate-300 hover:text-white"
            }`}
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">
              RAG: {activeKbCount > 0 ? `${activeKbCount} KB active` : "Attach Docs"}
            </span>
            <span className="md:hidden">RAG</span>
          </button>

          {/* System Instructions toggle */}
          <button
            type="button"
            onClick={() => setSysOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              systemPrompt
                ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                : "border-slate-700 bg-surface-800 text-slate-300 hover:text-white"
            }`}
            title="System Instructions"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">System Instructions</span>
          </button>

          {/* Export Chat dropdown */}
          {hasTurns && onExportChat && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
                title="Export Conversation"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-700 bg-surface-900 p-1.5 shadow-2xl z-50">
                  <button
                    type="button"
                    onClick={() => {
                      onExportChat("markdown");
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-surface-800 hover:text-white transition"
                  >
                    <span>📄</span>
                    <span>Export Markdown (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onExportChat("json");
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-surface-800 hover:text-white transition"
                  >
                    <span>📦</span>
                    <span>Export JSON (.json)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {sysOpen && (
        <div className="mt-2.5">
          <textarea
            rows={2}
            value={systemPrompt}
            onChange={(e) => onUpdateSystemPrompt(e.target.value)}
            placeholder="Optional persona / project mode instructions applied to all models in this chat..."
            className="w-full rounded-lg border border-slate-700 bg-surface-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
