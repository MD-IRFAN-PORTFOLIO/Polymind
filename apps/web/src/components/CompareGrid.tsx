"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Cpu,
  Crown,
  Layers,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import React, { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppAuth } from "@/components/AuthProvider";
import type { Citation, LayoutMode, Message, ModelInfo, Turn } from "@/lib/types";

interface CompareGridProps {
  turns: Turn[];
  models: ModelInfo[];
  layoutMode?: LayoutMode;
  onSelectWinner: (turnId: string, messageId: string) => void;
  onOpenCitations: (citations: Citation[], activeId?: number) => void;
}

export function CompareGrid({
  turns,
  models,
  layoutMode = "columns",
  onSelectWinner,
  onOpenCitations,
}: CompareGridProps) {
  const { isSignedIn } = useAppAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

  const handleCopy = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  if (turns.length === 0) {
    if (!isSignedIn) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-y-auto">
          {/* Illustrative Guest Hero Container */}
          <div className="relative mx-auto w-full max-w-4xl flex flex-col items-center text-center">
            {/* Ambient glows behind hero */}
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-[500px] rounded-full bg-indigo-500/10 blur-[100px]" />
            <div className="pointer-events-none absolute top-40 left-1/4 h-56 w-56 rounded-full bg-cyan-500/10 blur-[90px]" />

            {/* Top pill badge */}
            <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 mb-5 shadow-sm shadow-indigo-500/10">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              <span>Multi-Model AI Intelligence Workspace</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Headline */}
            <h1 className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white max-w-2xl leading-tight mb-3">
              Compare frontier AI models <br />
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                side-by-side in real-time.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="relative z-10 text-xs sm:text-sm text-slate-400 max-w-xl mb-6 leading-relaxed">
              Query Google Gemini, Groq, and OpenRouter in parallel. Inspect token latency, 
              compare answer consensus, and cite grounded knowledge bases.
            </p>

            {/* Action buttons */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 mb-8">
              <Link
                href="/sign-in"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.03] hover:shadow-indigo-600/40"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In to Unlock Models</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl border border-slate-700 bg-surface-900/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 transition hover:bg-surface-800 hover:text-white"
              >
                Create Free Account
              </Link>
            </div>

            {/* Live Model Comparison Preview Card */}
            <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-slate-800 bg-surface-900/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-3.5 text-left mb-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">
                    Live Parallel Stream Preview
                  </span>
                </div>
                <span className="rounded-md border border-slate-700/60 bg-surface-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  3 Models Active &bull; Free Tier
                </span>
              </div>

              {/* 3 Model cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Gemini card */}
                <div className="rounded-xl border border-indigo-500/30 bg-surface-950/80 p-3 flex flex-col justify-between transition hover:border-indigo-500/60">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-1.5">
                      <span>Gemini Flash</span>
                      <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300">
                        2.4s
                      </span>
                    </div>
                    <div className="space-y-1.5 py-1">
                      <div className="h-2 w-full rounded bg-indigo-500/30 animate-pulse" />
                      <div className="h-2 w-4/5 rounded bg-indigo-500/25" />
                      <div className="h-2 w-3/5 rounded bg-indigo-500/20" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Zap className="h-3 w-3 text-indigo-400" />
                    <span>75% Faster Connection</span>
                  </div>
                </div>

                {/* Groq card */}
                <div className="rounded-xl border border-emerald-500/30 bg-surface-950/80 p-3 flex flex-col justify-between transition hover:border-emerald-500/60">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1.5">
                      <span>Qwen 3.8 (Groq)</span>
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300">
                        480 tps
                      </span>
                    </div>
                    <div className="space-y-1.5 py-1">
                      <div className="h-2 w-full rounded bg-emerald-500/30 animate-pulse" />
                      <div className="h-2 w-5/6 rounded bg-emerald-500/25" />
                      <div className="h-2 w-2/3 rounded bg-emerald-500/20" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Cpu className="h-3 w-3 text-emerald-400" />
                    <span>Groq LPU Acceleration</span>
                  </div>
                </div>

                {/* OpenRouter card */}
                <div className="rounded-xl border border-cyan-500/30 bg-surface-950/80 p-3 flex flex-col justify-between transition hover:border-cyan-500/60">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-cyan-300 mb-1.5">
                      <span>Nemotron 3.5</span>
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
                        Reasoning
                      </span>
                    </div>
                    <div className="space-y-1.5 py-1">
                      <div className="h-2 w-full rounded bg-cyan-500/30 animate-pulse" />
                      <div className="h-2 w-3/4 rounded bg-cyan-500/25" />
                      <div className="h-2 w-1/2 rounded bg-cyan-500/20" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Layers className="h-3 w-3 text-cyan-400" />
                    <span>Consensus Analysis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature row */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl text-left mb-6">
              <div className="rounded-xl border border-slate-800 bg-surface-900/50 p-2.5 transition hover:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Zap className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Parallel Stream</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Simultaneous multi-model output.</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-surface-900/50 p-2.5 transition hover:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Grounded RAG</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Interactive doc citations.</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-surface-900/50 p-2.5 transition hover:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Private Isolation</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tenant isolated database.</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-surface-900/50 p-2.5 transition hover:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Wand2 className="h-3.5 w-3.5 text-violet-400" />
                  <span>Prompt Boost</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">1-click prompt enhancement.</p>
              </div>
            </div>

            {/* Developer attribution */}
            <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-slate-800 bg-surface-950/70 px-3.5 py-1 text-[11px] text-slate-400">
              <span>Developed &amp; Maintained by</span>
              <span className="font-semibold text-indigo-300">Mohammed Irfan</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="flex max-w-lg flex-col items-center rounded-2xl border border-slate-800 bg-surface-900/70 p-6 sm:p-8 shadow-xl backdrop-blur">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-cyan-500/15 p-2.5 shadow-xl shadow-indigo-500/10">
            <Image
              src="/logo-icon.png"
              alt="PolyMind Logo"
              width={64}
              height={64}
              className="h-full w-full object-contain drop-shadow"
              priority
            />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>Welcome to</span>
            <span>Poly</span>
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Mind
            </span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Compare Gemini, Groq, OpenRouter &amp; Ollama side by side with grounded RAG document
            citations, one-click Prompt Boost, and multi-model streaming &mdash; 100% free tier.
          </p>
          <div className="mt-4 flex items-center gap-1.5 rounded-full border border-slate-800 bg-surface-950/70 px-3 py-1 text-[11px] text-slate-400">
            <span>Developed &amp; Maintained by</span>
            <span className="font-semibold text-indigo-300">Mohammed Irfan</span>
          </div>
        </div>
      </div>
    );
  }

interface ModelResponseCardProps {
  msg: Message;
  info?: ModelInfo;
  turnId: string;
  isWinner: boolean;
  assistantMsgsCount: number;
  isCopied: boolean;
  onCopy: (id: string, text: string) => void;
  onSelectWinner: (turnId: string, messageId: string) => void;
  onOpenCitations: (citations: Citation[], activeId?: number) => void;
}

const ModelResponseCard = memo(function ModelResponseCard({
  msg,
  info,
  turnId,
  isWinner,
  assistantMsgsCount,
  isCopied,
  onCopy,
  onSelectWinner,
  onOpenCitations,
}: ModelResponseCardProps) {
  const isStreaming = msg.status === "streaming";
  const isError = msg.status === "error";

  return (
    <article
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface-900 transition shadow-lg ${
        isWinner
          ? "border-emerald-500/70 ring-1 ring-emerald-500/30"
          : isError
            ? "border-red-500/40"
            : "border-slate-800"
      }`}
    >
      <header className="sticky top-0 z-10 flex min-w-0 items-center justify-between border-b border-slate-800/80 bg-surface-900/95 px-3.5 py-2.5 backdrop-blur rounded-t-xl">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <span className="truncate text-xs font-semibold text-white">
            {info?.name ?? msg.model_id}
          </span>
          {isStreaming && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              Streaming
            </span>
          )}
          {msg.failover && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300"
              title={`Auto-swapped from ${msg.failover.original_model_id}: ${msg.failover.reason}`}
            >
              <span>⚡ Auto-Swapped</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {msg.citations && msg.citations.length > 0 && (
            <button
              onClick={() => onOpenCitations(msg.citations)}
              className="flex items-center gap-1 rounded-md bg-surface-800 px-2 py-1 text-[10px] font-medium text-indigo-300 hover:bg-surface-700"
              title="Inspect grounded source excerpts"
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden sm:inline">Sources</span> ({msg.citations.length})
            </button>
          )}

          {msg.status === "completed" && (
            <>
              <button
                onClick={() => onCopy(msg.id, msg.content)}
                className="rounded p-1 text-slate-400 hover:bg-surface-800 hover:text-white"
                title="Copy response"
              >
                {isCopied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              {assistantMsgsCount > 1 && (
                <button
                  onClick={() => onSelectWinner(turnId, msg.id)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    isWinner
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-surface-800 text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-300"
                  }`}
                  title="Use this response as conversation context for follow-ups"
                >
                  <Crown className="h-3 w-3" />
                  <span>{isWinner ? "Selected" : "Use Context"}</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-w-0 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto overflow-x-hidden px-3 sm:px-3.5 py-3 text-xs sm:text-sm leading-relaxed text-slate-200">
        {isError ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">{msg.error_message || "Model failed to respond."}</span>
          </div>
        ) : msg.content ? (
          <div className="markdown-body min-w-0 break-words [word-break:break-word]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs italic text-slate-500">Waiting for first token...</p>
        )}
      </div>

      {msg.status === "completed" && (
        <footer className="mt-auto flex flex-wrap items-center gap-2 sm:gap-3 border-t border-slate-800/70 bg-surface-900/90 px-3 sm:px-3.5 py-2 text-[10px] sm:text-[11px] text-slate-400 rounded-b-xl">
          {msg.ttft_ms !== null && <span>TTFT: {msg.ttft_ms}ms</span>}
          {msg.total_ms !== null && <span>Total: {(msg.total_ms / 1000).toFixed(2)}s</span>}
          {(msg.input_tokens > 0 || msg.output_tokens > 0) && (
            <span>
              Tokens: {msg.input_tokens} in / {msg.output_tokens} out
            </span>
          )}
          <span className="text-emerald-400 font-medium">Free Tier</span>
        </footer>
      )}
    </article>
  );
});

  return (
    <div className="flex-1 space-y-6 sm:space-y-8 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      {turns.map((turn) => {
        const userMsg = turn.messages.find((m) => m.role === "user");
        const assistantMsgs = turn.messages.filter((m) => m.role === "assistant");
        const gridCols =
          assistantMsgs.length === 1
            ? "grid-cols-1"
            : assistantMsgs.length === 2
              ? "grid-cols-1 lg:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

        return (
          <section key={turn.id} className="space-y-3 sm:space-y-4">
            {userMsg && (
              <div className="flex flex-col items-end gap-1.5 max-w-full">
                <div className="max-w-3xl rounded-2xl border border-indigo-500/30 bg-indigo-600/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-white break-words">
                  <p className="whitespace-pre-wrap">{userMsg.content}</p>
                </div>
                {userMsg.citations && userMsg.citations.length > 0 && (
                  <button
                    onClick={() => onOpenCitations(userMsg.citations)}
                    className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-surface-900 px-3 py-1 text-[11px] font-medium text-indigo-300 hover:border-indigo-500/60"
                  >
                    <BookOpen className="h-3 w-3 text-indigo-400" />
                    <span>{userMsg.citations.length} Grounded Sources attached</span>
                  </button>
                )}
              </div>
            )}

            {/* Layout Mode: Columns (Horizontal Side-by-Side Canvas / Swipeable Carousel on Mobile) */}
            {layoutMode === "columns" && (
              <div className="flex flex-row items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth">
                {assistantMsgs.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col shrink-0 min-w-0 snap-center ${
                      assistantMsgs.length === 1
                        ? "w-full max-w-4xl"
                        : assistantMsgs.length === 2
                          ? "w-[88vw] sm:w-auto sm:flex-1 sm:min-w-[340px]"
                          : "w-[88vw] sm:w-auto sm:flex-1 sm:min-w-[340px] sm:max-w-[560px]"
                    }`}
                  >
                    <ModelResponseCard
                      msg={msg}
                      info={models.find((m) => m.id === msg.model_id)}
                      turnId={turn.id}
                      isWinner={turn.selected_response_id === msg.id}
                      assistantMsgsCount={assistantMsgs.length}
                      isCopied={copiedId === msg.id}
                      onCopy={handleCopy}
                      onSelectWinner={onSelectWinner}
                      onOpenCitations={onOpenCitations}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Layout Mode: Grid (Bounded Compact Grid) */}
            {layoutMode === "grid" && (
              <div className={`grid gap-4 ${gridCols}`}>
                {assistantMsgs.map((msg) => (
                  <div key={msg.id} className="flex flex-col min-w-0">
                    <ModelResponseCard
                      msg={msg}
                      info={models.find((m) => m.id === msg.model_id)}
                      turnId={turn.id}
                      isWinner={turn.selected_response_id === msg.id}
                      assistantMsgsCount={assistantMsgs.length}
                      isCopied={copiedId === msg.id}
                      onCopy={handleCopy}
                      onSelectWinner={onSelectWinner}
                      onOpenCitations={onOpenCitations}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Layout Mode: Tabs (Single-Model Focus View) */}
            {layoutMode === "tabs" && (
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2">
                  {assistantMsgs.map((m) => {
                    const info = models.find((mod) => mod.id === m.model_id);
                    const isActive = (activeTabs[turn.id] ?? assistantMsgs[0]?.id) === m.id;
                    const isStreaming = m.status === "streaming";
                    const isWinner = turn.selected_response_id === m.id;

                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveTabs((prev) => ({ ...prev, [turn.id]: m.id }))}
                        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-surface-800 text-slate-300 hover:bg-surface-700 hover:text-white"
                        }`}
                      >
                        <span className="truncate max-w-[180px]">{info?.name ?? m.model_id}</span>
                        {isWinner && <Crown className="h-3 w-3 text-emerald-400" />}
                        {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-indigo-300" />}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeMsgId = activeTabs[turn.id] ?? assistantMsgs[0]?.id;
                  const activeMsg = assistantMsgs.find((m) => m.id === activeMsgId) ?? assistantMsgs[0];
                  if (!activeMsg) return null;
                  return (
                    <div className="w-full max-w-4xl min-w-0">
                      <ModelResponseCard
                        msg={activeMsg}
                        info={models.find((m) => m.id === activeMsg.model_id)}
                        turnId={turn.id}
                        isWinner={turn.selected_response_id === activeMsg.id}
                        assistantMsgsCount={assistantMsgs.length}
                        isCopied={copiedId === activeMsg.id}
                        onCopy={handleCopy}
                        onSelectWinner={onSelectWinner}
                        onOpenCitations={onOpenCitations}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
