from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import PromptBoostRequest, PromptBoostResponse
from app.services.prompt_boost import boost_prompt

router = APIRouter(tags=["prompt-boost"])


@router.post("/prompt-boost", response_model=PromptBoostResponse)
async def enhance_prompt(
    payload: PromptBoostRequest,
    db: AsyncSession = Depends(get_db),
) -> PromptBoostResponse:
    try:
        enhanced, model_used = await boost_prompt(
            db=db,
            raw_prompt=payload.prompt,
            preferred_model_id=payload.model_id,
            goal=payload.goal,
        )
        return PromptBoostResponse(
            original=payload.prompt,
            enhanced=enhanced,
            model_used=model_used,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Prompt boost failed: {exc}") from exc
