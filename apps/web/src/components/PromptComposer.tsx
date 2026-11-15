"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Square, Wand2 } from "lucide-react";

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
