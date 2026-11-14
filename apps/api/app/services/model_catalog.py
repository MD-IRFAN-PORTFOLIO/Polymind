from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.chat import ProviderKey
from app.schemas.chat import ModelInfo, ProviderStatus


@dataclass(frozen=True)
class ProviderMeta:
    id: str
    label: str
    has_free_tier: bool
    signup_hint: str
    env_attr: str
    requires_key: bool = True


PROVIDERS: dict[str, ProviderMeta] = {
    "gemini": ProviderMeta(
        id="gemini",
        label="Google Gemini",
        has_free_tier=True,
        signup_hint="Free tier at aistudio.google.com/app/apikey (starts with AQ... or AIza...)",
        env_attr="gemini_api_key",
    ),
    "groq": ProviderMeta(
        id="groq",
        label="Groq",
        has_free_tier=True,
        signup_hint="Free high-speed tier at console.groq.com/keys (starts with gsk_...)",
        env_attr="groq_api_key",
    ),
    "openrouter": ProviderMeta(
        id="openrouter",
        label="OpenRouter",
        has_free_tier=True,
        signup_hint="Free-tier models at openrouter.ai/keys (starts with sk-or-...)",
        env_attr="openrouter_api_key",
    ),
    "ollama": ProviderMeta(
        id="ollama",
        label="Ollama (Local)",
        has_free_tier=True,
        signup_hint="Run open models locally for 100% free with ollama.com",
        env_attr="ollama_base_url",
        requires_key=False,
    ),
}


CURATED_MODELS: list[dict] = [
    {
        "id": "gemini/gemini-3.5-flash",
        "name": "Gemini 3.5 Flash (Google Free)",
        "provider": "gemini",
        "description": "Google's ultra-fast multimodal flagship model with free quota",
        "has_free_tier": True,
        "context_window": 1000000,
    },
    {
        "id": "gemini/gemini-flash-latest",
        "name": "Gemini Flash Latest (Google Free)",
        "provider": "gemini",
        "description": "Google's latest Flash reasoning model with free quota",
        "has_free_tier": True,
        "context_window": 1000000,
    },
    {
        "id": "groq/qwen/qwen3.8-27b",
        "name": "Qwen 3.8 27B (Groq Free)",
        "provider": "groq",
        "description": "Ultra-fast reasoning model on Groq free LPU hardware",
        "has_free_tier": True,
        "context_window": 128000,
    },
    {
        "id": "groq/openai/gpt-oss-120b",
        "name": "GPT-OSS 120B (Groq Free)",
        "provider": "groq",
        "description": "Flagship open architecture on Groq high-speed free tier",
        "has_free_tier": True,
        "context_window": 128000,
    },
    {
        "id": "groq/openai/gpt-oss-20b",
        "name": "GPT-OSS 20B (Groq Free)",
        "provider": "groq",
        "description": "Lightweight open model on Groq high-speed free tier",
        "has_free_tier": True,
        "context_window": 128000,
    },
    {
        "id": "openrouter/nvidia/nemotron-3.5-lightning:free",
        "name": "Nemotron 3.5 (OpenRouter Free)",
        "provider": "openrouter",
        "description": "NVIDIA high-speed reasoning model on OpenRouter free tier",
        "has_free_tier": True,
        "context_window": 128000,
    },
    {
        "id": "openrouter/google/gemma-4-31b-it:free",
        "name": "Gemma 4 31B (OpenRouter Free)",
        "provider": "openrouter",
        "description": "Google Gemma open instruction model on OpenRouter free tier",
        "has_free_tier": True,
        "context_window": 262144,
    },
    {
        "id": "openrouter/google/gemma-4-26b-a4b-it:free",
        "name": "Gemma 4 26B (OpenRouter Free)",
        "provider": "openrouter",
        "description": "Google Gemma multimodal model on OpenRouter free tier",
        "has_free_tier": True,
        "context_window": 262144,
    },
    {
        "id": "openrouter/liquid/lfm-3-1.7b:free",
        "name": "Liquid LFM (OpenRouter Free)",
        "provider": "openrouter",
        "description": "Efficient lightweight model on OpenRouter free tier",
        "has_free_tier": True,
        "context_window": 32000,
    },
    {
        "id": "openrouter/baidu/ernie-5.5-flash-preview:free",
        "name": "Ernie 5.5 Flash (OpenRouter Free)",
        "provider": "openrouter",
        "description": "Baidu fast preview reasoning model on OpenRouter free tier",
        "has_free_tier": True,
        "context_window": 128000,
    },
    {
        "id": "ollama/llama3.2",
        "name": "Llama 3.2 (Local Ollama)",
        "provider": "ollama",
        "description": "100% free offline local private inference (no API key needed)",
        "has_free_tier": True,
        "context_window": 128000,
    },
]


def infer_provider(model_id: str) -> str:
    """Extract provider prefix from a model identifier."""
    if "/" in model_id:
        return model_id.split("/", 1)[0].lower()
    return "openai"


def mask_secret(secret: str) -> str:
    if not secret:
        return ""
    if len(secret) <= 8:
        return "*" * len(secret)
    return f"{secret[:4]}...{secret[-4:]}"


async def resolve_provider_credentials(db: AsyncSession) -> dict[str, tuple[str, str | None]]:
    """Return mapping of provider_id -> (api_key, base_url), preferring DB keys over .env."""
    settings = get_settings()
    rows = (await db.execute(select(ProviderKey))).scalars().all()
    db_map = {row.provider: row for row in rows}

    resolved: dict[str, tuple[str, str | None]] = {}
    for pid, meta in PROVIDERS.items():
        env_val = getattr(settings, meta.env_attr, "") or ""
        db_row = db_map.get(pid)
        if pid == "ollama":
            base = (db_row.base_url if db_row and db_row.base_url else env_val) or "http://localhost:11434"
            resolved[pid] = ("ollama", base)
        else:
            key = db_row.api_key if db_row and db_row.api_key else env_val
            base = db_row.base_url if db_row else None
            resolved[pid] = (key, base)
    return resolved


async def list_provider_statuses(db: AsyncSession) -> list[ProviderStatus]:
    creds = await resolve_provider_credentials(db)
    statuses: list[ProviderStatus] = []
    for pid, meta in PROVIDERS.items():
        key, base_url = creds.get(pid, ("", None))
        is_configured = bool(base_url) if not meta.requires_key else bool(key.strip())
        statuses.append(
            ProviderStatus(
                provider=pid,
                label=meta.label,
                has_free_tier=meta.has_free_tier,
                signup_hint=meta.signup_hint,
                is_configured=is_configured,
                masked_key="" if not meta.requires_key else mask_secret(key),
                base_url=base_url,
            )
        )
    return statuses


async def list_models(db: AsyncSession) -> list[ModelInfo]:
    statuses = {s.provider: s.is_configured for s in await list_provider_statuses(db)}
    return [
        ModelInfo(**item, is_configured=statuses.get(item["provider"], False))
        for item in CURATED_MODELS
    ]
