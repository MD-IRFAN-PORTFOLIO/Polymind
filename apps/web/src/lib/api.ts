import type {
  Citation,
  ConversationDetail,
  ConversationSummary,
  DocumentSummary,
  KnowledgeBaseDetail,
  ModelInfo,
  ProviderStatus,
  StreamFrame,
  Turn,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (tokenGetter && !headers["Authorization"]) {
    try {
      const token = await tokenGetter();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Request failed (${res.status})`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  listModels: () => request<ModelInfo[]>("/models"),
  listProviders: () => request<ProviderStatus[]>("/providers"),
  saveProviderKey: (provider: string, api_key: string, base_url?: string | null) =>
    request<ProviderStatus[]>("/providers/keys", {
      method: "PUT",
      body: JSON.stringify({ provider, api_key, base_url: base_url || null }),
    }),
  listChats: () => request<ConversationSummary[]>("/chats"),
  createChat: (body?: { title?: string; active_models?: string[]; system_prompt?: string }) =>
    request<ConversationDetail>("/chats", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  getChat: (id: string) => request<ConversationDetail>(`/chats/${id}`),
  updateChat: (id: string, body: { title?: string; active_models?: string[]; system_prompt?: string }) =>
    request<ConversationSummary>(`/chats/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChat: (id: string) => request<void>(`/chats/${id}`, { method: "DELETE" }),
  selectTurnWinner: (chatId: string, turnId: string, messageId: string) =>
    request<Turn>(`/chats/${chatId}/turns/${turnId}/select`, {
      method: "POST",
      body: JSON.stringify({ message_id: messageId }),
    }),
  boostPrompt: (prompt: string, modelId?: string) =>
    request<{ original: string; enhanced: string; model_used: string }>("/prompt-boost", {
      method: "POST",
      body: JSON.stringify({ prompt, model_id: modelId ?? null }),
    }),
  listKnowledgeBases: () => request<KnowledgeBaseDetail[]>("/knowledge-bases"),
  createKnowledgeBase: (name: string, description: string = "") =>
    request<KnowledgeBaseDetail>("/knowledge-bases", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  deleteKnowledgeBase: (id: string) => request<void>(`/knowledge-bases/${id}`, { method: "DELETE" }),
  uploadDocument: (file: File, knowledgeBaseId?: string, conversationId?: string) => {
    const data = new FormData();
    data.append("file", file);
    if (knowledgeBaseId) data.append("knowledge_base_id", knowledgeBaseId);
    if (conversationId) data.append("conversation_id", conversationId);
    return request<DocumentSummary>("/documents/upload", {
      method: "POST",
      body: data,
    });
  },
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),
};

export async function streamChatTurn(
  chatId: string,
  payload: { prompt: string; models: string[]; system_prompt?: string; knowledge_base_ids?: string[] },
  onFrame: (frame: StreamFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }

  const res = await fetch(`${API_BASE}/chats/${chatId}/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error((await res.text()) || `Stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // Normalize CRLF to LF so SSE splitting is robust across Windows, proxy, and all browsers
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      let eventName = "message";
      let dataStr = "";
      for (const line of trimmed.split("\n")) {
        const clean = line.trim();
        if (clean.startsWith("event:")) {
          eventName = clean.slice(6).trim();
        } else if (clean.startsWith("data:")) {
          dataStr += clean.slice(5).trim();
        }
      }
      if (dataStr) {
        try {
          onFrame({ event: eventName, data: JSON.parse(dataStr) } as StreamFrame);
        } catch (e) {
          console.error("Failed to parse SSE frame:", dataStr, e);
        }
      }
    }
  }

  // Parse any trailing block in the buffer
  if (buffer.trim()) {
    let eventName = "message";
    let dataStr = "";
    for (const line of buffer.trim().split("\n")) {
      const clean = line.trim();
      if (clean.startsWith("event:")) {
        eventName = clean.slice(6).trim();
      } else if (clean.startsWith("data:")) {
        dataStr += clean.slice(5).trim();
      }
    }
    if (dataStr) {
      try {
        onFrame({ event: eventName, data: JSON.parse(dataStr) } as StreamFrame);
      } catch (e) {
        console.error("Failed to parse final SSE frame:", dataStr, e);
      }
    }
  }
}
