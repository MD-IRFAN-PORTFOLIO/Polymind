from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ModelInfo(BaseModel):
    """Catalog metadata for an available LLM."""

    id: str
    name: str
    provider: str
    description: str
    has_free_tier: bool = False
    context_window: int = 128000
    is_configured: bool = False


class ProviderStatus(BaseModel):
    """Configuration status of an LLM provider (never exposes the raw secret)."""

    provider: str
    label: str
    has_free_tier: bool
    signup_hint: str
    is_configured: bool
    masked_key: str = ""
    base_url: str | None = None


class ProviderKeyUpdate(BaseModel):
    provider: str
    api_key: str = ""
    base_url: str | None = None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    system_prompt: str = ""
    default_models: list[str] = Field(default_factory=list)


class ProjectOut(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class ConversationCreate(BaseModel):
    title: str = "New Multi-AI Chat"
    system_prompt: str = ""
    project_id: str | None = None
    active_models: list[str] = Field(default_factory=list)


class ConversationUpdate(BaseModel):
    title: str | None = None
    system_prompt: str | None = None
    active_models: list[str] | None = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    turn_id: str
    role: str
    model_id: str | None
    content: str
    status: str
    error_message: str | None
    citations: list[dict]
    input_tokens: int
    output_tokens: int
    cost_usd: float
    ttft_ms: int | None
    total_ms: int | None
    created_at: datetime


class TurnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    turn_index: int
    selected_response_id: str | None
    created_at: datetime
    messages: list[MessageOut] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    project_id: str | None
    active_models: list[str]
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationSummary):
    system_prompt: str
    turns: list[TurnOut] = Field(default_factory=list)


class ChatStreamRequest(BaseModel):
    prompt: str = Field(min_length=1)
    models: list[str] = Field(min_length=1, max_length=6)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1, le=32768)
    system_prompt: str | None = None
    knowledge_base_ids: list[str] = Field(default_factory=list)


class SelectWinnerRequest(BaseModel):
    message_id: str


class PromptBoostRequest(BaseModel):
    prompt: str = Field(min_length=1)
    model_id: str | None = None
    goal: str = "general"


class PromptBoostResponse(BaseModel):
    original: str
    enhanced: str
    model_used: str
