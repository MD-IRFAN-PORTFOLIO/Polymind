export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  has_free_tier: boolean;
  context_window: number;
  is_configured: boolean;
}

export interface ProviderStatus {
  provider: string;
  label: string;
  has_free_tier: boolean;
  signup_hint: string;
  is_configured: boolean;
  masked_key: string;
  base_url: string | null;
}

export interface Citation {
  citation_id: number;
  chunk_id: string;
  document_id: string;
  filename: string;
  snippet: string;
  score: number;
}

export interface DocumentSummary {
  id: string;
  knowledge_base_id: string | null;
  conversation_id: string | null;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  total_chunks: number;
  created_at: string;
}

export interface KnowledgeBaseDetail {
  id: string;
  name: string;
  description: string;
  created_at: string;
  documents: DocumentSummary[];
}

export interface Message {
  id: string;
  turn_id: string;
  role: "user" | "assistant" | "system";
  model_id: string | null;
  content: string;
  status: "streaming" | "completed" | "error";
  error_message: string | null;
  citations: Citation[];
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  ttft_ms: number | null;
  total_ms: number | null;
  created_at: string;
}

export interface Turn {
  id: string;
  turn_index: number;
  selected_response_id: string | null;
  created_at: string;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  project_id: string | null;
  active_models: string[];
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  system_prompt: string;
  turns: Turn[];
}

export type StreamFrame =
  | {
      event: "turn_created";
      data: {
        turn_id: string;
        turn_index: number;
        user_message_id: string;
        assistant_message_ids: Record<string, string>;
        citations?: Citation[];
      };
    }
  | {
      event: "chunk";
      data: {
        turn_id: string;
        message_id: string;
        model_id: string;
        delta: string;
      };
    }
  | {
      event: "model_done";
      data: {
        turn_id: string;
        message_id: string;
        model_id: string;
        input_tokens: number;
        output_tokens: number;
        cost_usd: number;
        ttft_ms: number | null;
        total_ms: number | null;
      };
    }
  | {
      event: "model_error";
      data: {
        turn_id: string;
        message_id: string;
        model_id: string;
        error: string;
      };
    }
  | {
      event: "stream_complete";
      data: { turn_id: string };
    };

export type LayoutMode = "columns" | "grid" | "tabs";

