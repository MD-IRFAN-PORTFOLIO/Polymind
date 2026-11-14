"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CitationDrawer } from "@/components/CitationDrawer";
import { CompareGrid } from "@/components/CompareGrid";
import { KnowledgeBaseModal } from "@/components/KnowledgeBaseModal";
import { ModelPickerBar } from "@/components/ModelPickerBar";
import { PromptComposer } from "@/components/PromptComposer";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar } from "@/components/Sidebar";
import { api, streamChatTurn } from "@/lib/api";
import type {
  Citation,
  ConversationDetail,
  ConversationSummary,
  KnowledgeBaseDetail,
  LayoutMode,
  Message,
  ModelInfo,
  ProviderStatus,
  StreamFrame,
  Turn,
} from "@/lib/types";

const FALLBACK_MODELS = [
  "gemini/gemini-3.5-flash",
  "groq/qwen/qwen3.8-27b",
  "openrouter/nvidia/nemotron-3.5-lightning:free",
];

export default function HomePage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ConversationDetail | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(FALLBACK_MODELS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("columns");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseDetail[]>([]);
  const [activeKbIds, setActiveKbIds] = useState<string[]>([]);
  const [drawerCitations, setDrawerCitations] = useState<Citation[]>([]);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadBootstrap = useCallback(async () => {
    try {
      const [modelList, providerList, chatList, kbList] = await Promise.all([
        api.listModels(),
        api.listProviders(),
        api.listChats(),
        api.listKnowledgeBases(),
      ]);
      setModels(modelList);
      setProviders(providerList);
      setChats(chatList);
      setKnowledgeBases(kbList);
      if (chatList.length > 0 && !activeChat) {
        const detail = await api.getChat(chatList[0].id);
        setActiveChat(detail);
        if (detail.active_models.length > 0) setSelectedModels(detail.active_models);
        setSystemPrompt(detail.system_prompt);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to connect to backend API");
    }
  }, [activeChat]);

  useEffect(() => {
    void loadBootstrap();
    if (typeof window !== "undefined") {
      const saved = (localStorage.getItem("polymind_layout_mode") ||
        localStorage.getItem("ai_fiesta_layout_mode")) as LayoutMode;
      if (saved === "columns" || saved === "grid" || saved === "tabs") {
        setLayoutMode(saved);
      }
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectLayoutMode = (mode: LayoutMode) => {
    setLayoutMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("polymind_layout_mode", mode);
    }
  };

  const refreshChats = async () => {
    setChats(await api.listChats());
  };

  const refreshKbs = async () => {
    setKnowledgeBases(await api.listKnowledgeBases());
  };

  const handleSelectChat = async (id: string) => {
    const detail = await api.getChat(id);
    setActiveChat(detail);
    setSystemPrompt(detail.system_prompt);
    if (detail.active_models.length > 0) {
      setSelectedModels(detail.active_models);
    }
  };

  const handleNewChat = async () => {
    const created = await api.createChat({ active_models: selectedModels, system_prompt: systemPrompt });
    setActiveChat(created);
    await refreshChats();
  };

  const handleDeleteChat = async (id: string) => {
    await api.deleteChat(id);
    if (activeChat?.id === id) {
      setActiveChat(null);
    }
    await refreshChats();
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.length > 1 ? prev.filter((id) => id !== modelId) : prev;
      }
      if (prev.length >= 6) return prev;
      return [...prev, modelId];
    });
  };

  const handleAddCustomModel = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId) || prev.length >= 6) return prev;
      return [...prev, modelId];
    });
  };

  const handleSaveProviderKey = async (provider: string, apiKey: string, baseUrl?: string) => {
    const updatedProviders = await api.saveProviderKey(provider, apiKey, baseUrl);
    setProviders(updatedProviders);
    setModels(await api.listModels());
  };

  const handleToggleKb = (kbId: string) => {
    setActiveKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]
    );
  };

  const handleCreateKb = async (name: string, description: string) => {
    const created = await api.createKnowledgeBase(name, description);
    await refreshKbs();
    setActiveKbIds((prev) => [...prev, created.id]);
  };

  const handleDeleteKb = async (kbId: string) => {
    await api.deleteKnowledgeBase(kbId);
    setActiveKbIds((prev) => prev.filter((id) => id !== kbId));
    await refreshKbs();
  };

  const handleUploadFile = async (kbId: string, file: File) => {
    await api.uploadDocument(file, kbId);
    await refreshKbs();
  };

  const handleDeleteDoc = async (docId: string) => {
    await api.deleteDocument(docId);
    await refreshKbs();
  };

  const handleOpenCitations = (citations: Citation[], activeId?: number) => {
    setDrawerCitations(citations);
    setActiveCitationId(activeId ?? (citations[0]?.citation_id || null));
  };

  const handleSelectWinner = async (turnId: string, messageId: string) => {
    if (!activeChat) return;
    const updatedTurn = await api.selectTurnWinner(activeChat.id, turnId, messageId);
    setActiveChat((prev) =>
      prev
        ? {
            ...prev,
            turns: prev.turns.map((t) => (t.id === turnId ? { ...t, selected_response_id: updatedTurn.selected_response_id } : t)),
          }
        : prev,
    );
  };

  const handleBoostPrompt = async () => {
    if (!promptInput.trim()) return;
    setIsBoosting(true);
    setErrorBanner(null);
    try {
      const res = await api.boostPrompt(promptInput, selectedModels[0]);
      setPromptInput(res.enhanced);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Prompt boost failed");
    } finally {
      setIsBoosting(false);
    }
  };

  const applyStreamFrame = (frame: StreamFrame, promptText: string, modelsSnapshot: string[]) => {
    setActiveChat((prev) => {
      if (!prev) return prev;

      if (frame.event === "turn_created") {
        const now = new Date().toISOString();
        const citations = frame.data.citations || [];
        const userMsg: Message = {
          id: frame.data.user_message_id,
          turn_id: frame.data.turn_id,
          role: "user",
          model_id: null,
          content: promptText,
          status: "completed",
          error_message: null,
          citations,
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          ttft_ms: null,
          total_ms: null,
          created_at: now,
        };
        const assistantStubs: Message[] = modelsSnapshot.map((mid) => ({
          id: frame.data.assistant_message_ids[mid],
          turn_id: frame.data.turn_id,
          role: "assistant",
          model_id: mid,
          content: "",
          status: "streaming",
          error_message: null,
          citations,
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
          ttft_ms: null,
          total_ms: null,
          created_at: now,
        }));
        const newTurn: Turn = {
          id: frame.data.turn_id,
          turn_index: frame.data.turn_index,
          selected_response_id: null,
          created_at: now,
          messages: [userMsg, ...assistantStubs],
        };
        return { ...prev, turns: [...prev.turns, newTurn] };
      }

      if (frame.event === "chunk") {
        return {
          ...prev,
          turns: prev.turns.map((t) =>
            t.id !== frame.data.turn_id
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === frame.data.message_id ? { ...m, content: m.content + frame.data.delta } : m,
                  ),
                },
          ),
        };
      }

      if (frame.event === "model_done") {
        return {
          ...prev,
          turns: prev.turns.map((t) =>
            t.id !== frame.data.turn_id
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === frame.data.message_id
                      ? {
                          ...m,
                          status: "completed",
                          input_tokens: frame.data.input_tokens,
                          output_tokens: frame.data.output_tokens,
                          cost_usd: frame.data.cost_usd,
                          ttft_ms: frame.data.ttft_ms,
                          total_ms: frame.data.total_ms,
                        }
                      : m,
                  ),
                },
          ),
        };
      }

      if (frame.event === "model_error") {
        return {
          ...prev,
          turns: prev.turns.map((t) =>
            t.id !== frame.data.turn_id
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === frame.data.message_id
                      ? { ...m, status: "error", error_message: frame.data.error }
                      : m,
                  ),
                },
          ),
        };
      }

      if (frame.event === "stream_complete") {
        return {
          ...prev,
          turns: prev.turns.map((t) =>
            t.id !== frame.data.turn_id
              ? t
              : {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.status === "streaming" ? { ...m, status: "completed" } : m
                  ),
                },
          ),
        };
      }

      return prev;
    });
  };

  const handleSend = async () => {
    const promptText = promptInput.trim();
    if (!promptText || selectedModels.length === 0) return;

    setErrorBanner(null);
    setPromptInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let chat = activeChat;
      if (!chat) {
        chat = await api.createChat({ active_models: selectedModels, system_prompt: systemPrompt });
        setActiveChat(chat);
      }

      const modelsSnapshot = [...selectedModels];
      await streamChatTurn(
        chat.id,
        {
          prompt: promptText,
          models: modelsSnapshot,
          system_prompt: systemPrompt,
          knowledge_base_ids: activeKbIds,
        },
        (frame) => applyStreamFrame(frame, promptText, modelsSnapshot),
        controller.signal,
      );
      // Synchronize with database to ensure tokens, latency and content are 100% up to date
      const freshChat = await api.getChat(chat.id);
      setActiveChat(freshChat);
      await refreshChats();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorBanner(err instanceof Error ? err.message : "Streaming error");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const configuredCount = providers.filter((p) => p.is_configured).length;

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-surface-950">
      <Sidebar
        chats={chats}
        activeChatId={activeChat?.id ?? null}
        configuredCount={configuredCount}
        isOpen={sidebarOpen}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <ModelPickerBar
          models={models}
          selectedModels={selectedModels}
          systemPrompt={systemPrompt}
          activeKbCount={activeKbIds.length}
          layoutMode={layoutMode}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onSelectLayoutMode={handleSelectLayoutMode}
          onToggleModel={handleToggleModel}
          onAddCustomModel={handleAddCustomModel}
          onUpdateSystemPrompt={setSystemPrompt}
          onOpenKnowledgeModal={() => setKbModalOpen(true)}
        />

        {errorBanner && (
          <div className="flex items-center justify-between border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}

        <CompareGrid
          turns={activeChat?.turns ?? []}
          models={models}
          layoutMode={layoutMode}
          onSelectWinner={handleSelectWinner}
          onOpenCitations={(citations) => handleOpenCitations(citations)}
        />

        <PromptComposer
          value={promptInput}
          isStreaming={isStreaming}
          isBoosting={isBoosting}
          selectedModelCount={selectedModels.length}
          onChange={setPromptInput}
          onSend={handleSend}
          onStop={handleStop}
          onBoost={handleBoostPrompt}
        />

        <CitationDrawer
          open={drawerCitations.length > 0}
          citations={drawerCitations}
          activeCitationId={activeCitationId}
          onClose={() => setDrawerCitations([])}
          onSelectCitation={(id) => setActiveCitationId(id)}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        providers={providers}
        onClose={() => setSettingsOpen(false)}
        onSaveKey={handleSaveProviderKey}
      />

      <KnowledgeBaseModal
        open={kbModalOpen}
        knowledgeBases={knowledgeBases}
        activeKbIds={activeKbIds}
        onClose={() => setKbModalOpen(false)}
        onToggleKb={handleToggleKb}
        onCreateKb={handleCreateKb}
        onDeleteKb={handleDeleteKb}
        onUploadFile={handleUploadFile}
        onDeleteDoc={handleDeleteDoc}
      />
    </div>
  );
}
