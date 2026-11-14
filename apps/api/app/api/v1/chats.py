from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.chat import Conversation, Message, Project, Turn, utc_now
from app.schemas.chat import (
    ChatStreamRequest,
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationUpdate,
    SelectWinnerRequest,
    TurnOut,
)
from app.services.orchestrator import stream_multi_model_turn

router = APIRouter(prefix="/chats", tags=["chats"])

DEFAULT_MODELS = [
    "groq/qwen/qwen3.8-27b",
    "openrouter/nvidia/nemotron-3.5-lightning:free",
]


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationSummary]:
    stmt = (
        select(Conversation)
        .where((Conversation.user_id == user_id) | (Conversation.user_id == "local-user"))
        .order_by(Conversation.updated_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    system_prompt = payload.system_prompt
    active_models = payload.active_models or list(DEFAULT_MODELS)

    if payload.project_id:
        project = await db.get(Project, payload.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if not system_prompt:
            system_prompt = project.system_prompt
        if not payload.active_models and project.default_models:
            active_models = list(project.default_models)

    conv = Conversation(
        title=payload.title,
        system_prompt=system_prompt,
        project_id=payload.project_id,
        user_id=user_id,
        active_models=active_models,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        project_id=conv.project_id,
        active_models=conv.active_models,
        system_prompt=conv.system_prompt,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        turns=[],
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.turns).selectinload(Turn.messages))
    )
    conv = (await db.execute(stmt)).scalar_one_or_none()
    if not conv or (conv.user_id != user_id and conv.user_id != "local-user"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummary:
    conv = await db.get(Conversation, conversation_id)
    if not conv or (conv.user_id != user_id and conv.user_id != "local-user"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    if payload.title is not None:
        conv.title = payload.title
    if payload.system_prompt is not None:
        conv.system_prompt = payload.system_prompt
    if payload.active_models is not None:
        conv.active_models = payload.active_models
    conv.updated_at = utc_now()
    await db.commit()
    await db.refresh(conv)
    return conv


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    conv = await db.get(Conversation, conversation_id)
    if not conv or (conv.user_id != user_id and conv.user_id != "local-user"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()


@router.post("/{conversation_id}/stream")
async def stream_chat(
    conversation_id: str,
    payload: ChatStreamRequest,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    generator = stream_multi_model_turn(
        db=db,
        conversation_id=conversation_id,
        prompt=payload.prompt,
        models=payload.models,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        system_prompt=payload.system_prompt,
        knowledge_base_ids=payload.knowledge_base_ids,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{conversation_id}/turns/{turn_id}/select", response_model=TurnOut)
async def select_turn_winner(
    conversation_id: str,
    turn_id: str,
    payload: SelectWinnerRequest,
    db: AsyncSession = Depends(get_db),
) -> TurnOut:
    stmt = (
        select(Turn)
        .where(Turn.id == turn_id, Turn.conversation_id == conversation_id)
        .options(selectinload(Turn.messages))
    )
    turn = (await db.execute(stmt)).scalar_one_or_none()
    if not turn:
        raise HTTPException(status_code=404, detail="Turn not found")

    target_msg: Message | None = next(
        (m for m in turn.messages if m.id == payload.message_id and m.role == "assistant"),
        None,
    )
    if not target_msg:
        raise HTTPException(status_code=400, detail="Selected message is not an assistant response in this turn")

    turn.selected_response_id = target_msg.id
    await db.commit()
    await db.refresh(turn)
    return turn
