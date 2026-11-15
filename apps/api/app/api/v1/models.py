from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.chat import ProviderKey
from app.schemas.chat import ModelInfo, ProviderKeyUpdate, ProviderStatus
from app.services.model_catalog import PROVIDERS, list_models, list_provider_statuses

router = APIRouter(tags=["models"])


@router.get("/models", response_model=list[ModelInfo])
async def get_models(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ModelInfo]:
    """List curated models with live configuration status for current user."""
    return await list_models(db, user_id=user_id)


@router.get("/providers", response_model=list[ProviderStatus])
async def get_providers(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ProviderStatus]:
    """List all supported LLM providers and whether an API key is configured for current user."""
    return await list_provider_statuses(db, user_id=user_id)


@router.put("/providers/keys", response_model=list[ProviderStatus])
async def upsert_provider_key(
    payload: ProviderKeyUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ProviderStatus]:
    """Save or clear a provider API key or custom base URL for current user."""
    pid = payload.provider.lower().strip()
    if pid not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {pid}")

    existing = await db.get(ProviderKey, (user_id, pid))
    if existing:
        existing.api_key = payload.api_key.strip()
        existing.base_url = payload.base_url.strip() if payload.base_url else None
    else:
        db.add(
            ProviderKey(
                user_id=user_id,
                provider=pid,
                api_key=payload.api_key.strip(),
                base_url=payload.base_url.strip() if payload.base_url else None,
            )
        )
    await db.commit()
    return await list_provider_statuses(db, user_id=user_id)
