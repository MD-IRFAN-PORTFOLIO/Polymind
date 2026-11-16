"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, LogIn, Mic, MicOff, Send, Square, Wand2 } from "lucide-react";
import { useAppAuth } from "@/components/AuthProvider";

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
  const { isSignedIn } = useAppAuth();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          }
        }
        if (finalChunk.trim()) {
          const textToAdd = finalChunk.trim();
          onChange(value ? `${value} ${textToAdd}` : textToAdd);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) {
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
          setIsListening(false);
        }
        onSend();
      }
    }
  };

  if (!isSignedIn) {
    return (
      <div className="shrink-0 z-20 border-t border-slate-800/80 bg-surface-900/95 px-3 py-3 sm:px-4 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto max-w-5xl rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-surface-950 via-surface-900 to-[#070b16] p-3 sm:p-4 shadow-xl shadow-indigo-950/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-600/20 text-indigo-400 shadow-sm shadow-indigo-500/20">
                <Lock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-semibold text-slate-100">Guest Preview Mode</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    Sign-in Required
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Sign in or register to broadcast prompts simultaneously across Google Gemini, Groq &amp; OpenRouter.
                </p>
              </div>
            </div>

            <Link
              href="/sign-in"
              className="group flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] hover:shadow-indigo-600/40"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In to Access Models</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isStreaming}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                isListening
                  ? "border-red-500 bg-red-500/20 text-red-300 animate-pulse"
                  : "border-slate-700 bg-surface-800 text-slate-300 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title={isListening ? "Listening... Click to stop" : "Speak prompt (Speech-to-Text)"}
            >
              {isListening ? (
                <MicOff className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              <span>{isListening ? "Listening..." : "Voice"}</span>
            </button>
          </div>

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
