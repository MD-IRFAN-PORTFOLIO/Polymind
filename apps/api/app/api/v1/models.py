from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.chat import ProviderKey
from app.schemas.chat import ModelInfo, ProviderKeyUpdate, ProviderStatus
from app.services.model_catalog import PROVIDERS, list_models, list_provider_statuses

router = APIRouter(tags=["models"])


@router.get("/models", response_model=list[ModelInfo])
async def get_models(db: AsyncSession = Depends(get_db)) -> list[ModelInfo]:
    """List curated models with live configuration status."""
    return await list_models(db)


@router.get("/providers", response_model=list[ProviderStatus])
async def get_providers(db: AsyncSession = Depends(get_db)) -> list[ProviderStatus]:
    """List all supported LLM providers and whether an API key is configured."""
    return await list_provider_statuses(db)


@router.put("/providers/keys", response_model=list[ProviderStatus])
async def upsert_provider_key(
    payload: ProviderKeyUpdate,
    db: AsyncSession = Depends(get_db),
) -> list[ProviderStatus]:
    """Save or clear a provider API key or custom base URL."""
    pid = payload.provider.lower().strip()
    if pid not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {pid}")

    existing = await db.get(ProviderKey, pid)
    if existing:
        existing.api_key = payload.api_key.strip()
        existing.base_url = payload.base_url.strip() if payload.base_url else None
    else:
        db.add(
            ProviderKey(
                provider=pid,
                api_key=payload.api_key.strip(),
                base_url=payload.base_url.strip() if payload.base_url else None,
            )
        )
    await db.commit()
    return await list_provider_statuses(db)
