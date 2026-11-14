"use client";

import Image from "next/image";
import { KeyRound, MessageSquarePlus, Trash2, X } from "lucide-react";
import type { ConversationSummary } from "@/lib/types";
import { UserAccountNav } from "@/components/UserAccountNav";

interface SidebarProps {
  chats: ConversationSummary[];
  activeChatId: string | null;
  configuredCount: number;
  isOpen?: boolean;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings: () => void;
  onClose?: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  configuredCount,
  isOpen = true,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
  onClose,
}: SidebarProps) {
  const handleSelectChat = (id: string) => {
    onSelectChat(id);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onClose?.();
    }
  };

  const handleNewChat = () => {
    onNewChat();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onClose?.();
    }
  };

  const handleOpenSettings = () => {
    onOpenSettings();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full h-[100dvh] w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-800/80 bg-surface-900 transition-all duration-200 ease-in-out md:static md:h-screen md:h-[100dvh] md:w-64 md:translate-x-0 ${
          isOpen
            ? "translate-x-0 shadow-2xl md:shadow-none"
            : "-translate-x-full md:w-0 md:-translate-x-full md:border-r-0 md:overflow-hidden md:opacity-0 md:pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-cyan-500/15 p-1 shadow-lg shadow-indigo-500/10">
              <Image
                src="/logo-icon.png"
                alt="PolyMind Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain drop-shadow"
                priority
              />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center">
                <span>Poly</span>
                <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  Mind
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Multi-LLM Workspace</p>
            </div>
          </div>

          {/* Close button on mobile phones / tablets */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-800 hover:text-white md:hidden"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Multi-AI Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Conversations
          </p>
          <div className="space-y-1">
            {chats.length === 0 ? (
              <p className="px-2 py-4 text-xs text-slate-500">No chats yet. Send a prompt to begin.</p>
            ) : (
              chats.map((chat) => {
                const active = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                      active
                        ? "bg-surface-700 text-white"
                        : "text-slate-300 hover:bg-surface-800/80 hover:text-white"
                    }`}
                  >
                    <button
                      onClick={() => handleSelectChat(chat.id)}
                      className="flex-1 truncate text-left font-medium"
                      title={chat.title}
                    >
                      {chat.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="ml-2 hidden rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-400 group-hover:block"
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-800/80 p-3">
          <UserAccountNav />
          <button
            onClick={handleOpenSettings}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700/80 bg-surface-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-indigo-500/60 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              API Keys & Providers
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                configuredCount > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {configuredCount} ready
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
