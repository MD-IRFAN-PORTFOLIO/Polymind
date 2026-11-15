import asyncio
from collections.abc import AsyncIterator
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.chat import Conversation, Message, Turn, utc_now
from app.services.llm_gateway import StreamEvent, stream_model_completion
from app.services.model_catalog import resolve_provider_credentials
from app.services.rag.retriever import build_grounded_rag_prompt, hybrid_retrieve


MODEL_FAILOVER_CHAIN: dict[str, list[str]] = {
    "gemini/gemini-flash-lite-latest": [
        "openrouter/google/gemma-4-31b-it:free",
        "groq/qwen/qwen3.8-27b",
        "openrouter/nvidia/nemotron-3.5-lightning:free",
    ],
    "gemini/gemini-3.5-flash": [
        "gemini/gemini-flash-lite-latest",
        "openrouter/google/gemma-4-31b-it:free",
        "groq/qwen/qwen3.8-27b",
    ],
    "groq/qwen/qwen3.8-27b": [
        "groq/openai/gpt-oss-120b",
        "openrouter/nvidia/nemotron-3.5-lightning:free",
        "openrouter/google/gemma-4-31b-it:free",
    ],
    "groq/openai/gpt-oss-120b": [
        "groq/openai/gpt-oss-20b",
        "openrouter/google/gemma-4-26b-a4b-it:free",
        "groq/qwen/qwen3.8-27b",
    ],
    "groq/openai/gpt-oss-20b": [
        "groq/qwen/qwen3.8-27b",
        "openrouter/liquid/lfm-3-1.7b:free",
    ],
    "openrouter/nvidia/nemotron-3.5-lightning:free": [
        "openrouter/google/gemma-4-31b-it:free",
        "groq/qwen/qwen3.8-27b",
        "openrouter/liquid/lfm-3-1.7b:free",
    ],
    "openrouter/google/gemma-4-31b-it:free": [
        "openrouter/nvidia/nemotron-3.5-lightning:free",
        "groq/qwen/qwen3.8-27b",
    ],
}


def is_failover_candidate(error_msg: str | None) -> bool:
    """Determine whether an error (rate limit, quota, timeout, 5xx overload) justifies auto-failover."""
    if not error_msg:
        return False
    lower = error_msg.lower()
    return any(
        term in lower
        for term in [
            "429",
            "rate limit",
            "ratelimit",
            "quota",
            "resource_exhausted",
            "overloaded",
            "503",
            "502",
            "504",
            "not found",
            "404",
            "timeout",
            "timed out",
            "no longer available",
        ]
    )


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Format an SSE frame with explicit event name and JSON payload."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def build_context_messages(conversation: Conversation, current_prompt: str, system_override: str | None = None) -> list[dict[str, str]]:
    """Reconstruct linear chat history by walking turns and picking each turn's chosen winner."""
    history: list[dict[str, str]] = []
    effective_system = (system_override if system_override is not None else conversation.system_prompt).strip()
    if effective_system:
        history.append({"role": "system", "content": effective_system})

    for turn in sorted(conversation.turns, key=lambda t: t.turn_index):
        user_msg = next((m for m in turn.messages if m.role == "user"), None)
        if not user_msg:
            continue

        assistant_msgs = [m for m in turn.messages if m.role == "assistant" and m.status == "completed"]
        chosen_msg = None
        if turn.selected_response_id:
            chosen_msg = next((m for m in assistant_msgs if m.id == turn.selected_response_id), None)
        if chosen_msg is None and assistant_msgs:
            chosen_msg = assistant_msgs[0]

        history.append({"role": "user", "content": user_msg.content})
        if chosen_msg:
            history.append({"role": "assistant", "content": chosen_msg.content})

    history.append({"role": "user", "content": current_prompt})
    return history


async def stream_multi_model_turn(
    db: AsyncSession,
    conversation_id: str,
    prompt: str,
    models: list[str],
    temperature: float = 0.7,
    max_tokens: int | None = None,
    system_prompt: str | None = None,
    knowledge_base_ids: list[str] | None = None,
) -> AsyncIterator[str]:
    """Create a Turn, fan out prompt to N LLMs in parallel, multiplex SSE frames, and persist results."""
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(selectinload(Conversation.turns).selectinload(Turn.messages))
    )
    conversation = (await db.execute(stmt)).scalar_one_or_none()
    if not conversation:
        yield format_sse("error", {"message": "Conversation not found"})
        return

    # Deduplicate while preserving model selection order
    target_models = list(dict.fromkeys(models))
    credentials = await resolve_provider_credentials(db, user_id=conversation.user_id)

    # 1. RAG Retrieval Step (Runs once across all models)
    retrieved_chunks = await hybrid_retrieve(
        db=db,
        query=prompt,
        credentials=credentials,
        knowledge_base_ids=knowledge_base_ids,
        conversation_id=conversation.id,
        top_k=4,
    )
    grounded_prompt, citations = build_grounded_rag_prompt(prompt, retrieved_chunks)

    history_messages = build_context_messages(conversation, grounded_prompt, system_prompt)

    next_index = (max((t.turn_index for t in conversation.turns), default=-1)) + 1
    turn = Turn(conversation_id=conversation.id, turn_index=next_index)
    db.add(turn)
    await db.flush()

    user_msg = Message(
        conversation_id=conversation.id,
        turn_id=turn.id,
        role="user",
        content=prompt,
        status="completed",
        citations=citations,
    )
    db.add(user_msg)

    assistant_msgs: dict[str, Message] = {}
    for model_id in target_models:
        msg = Message(
            conversation_id=conversation.id,
            turn_id=turn.id,
            role="assistant",
            model_id=model_id,
            content="",
            status="streaming",
            citations=citations,
        )
        db.add(msg)
        assistant_msgs[model_id] = msg

    # Auto-title first turn and remember active model lineup
    if next_index == 0 and conversation.title == "New Multi-AI Chat":
        conversation.title = prompt[:60].strip() + ("..." if len(prompt) > 60 else "")
    conversation.active_models = target_models
    conversation.updated_at = utc_now()
    await db.commit()

    yield format_sse(
        "turn_created",
        {
            "turn_id": turn.id,
            "turn_index": turn.turn_index,
            "user_message_id": user_msg.id,
            "assistant_message_ids": {mid: m.id for mid, m in assistant_msgs.items()},
            "citations": citations,
        },
    )

    queue: asyncio.Queue[tuple[str, StreamEvent | None]] = asyncio.Queue()
    buffers: dict[str, list[str]] = {mid: [] for mid in target_models}
    final_events: dict[str, StreamEvent] = {}

    async def _run_single_model(model_id: str) -> None:
        current_model = model_id
        tried_models = {model_id}

        while True:
            has_emitted_delta = False
            last_error: StreamEvent | None = None

            async for ev in stream_model_completion(
                model_id=current_model,
                messages=history_messages,
                credentials=credentials,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                if ev.type == "delta":
                    has_emitted_delta = True
                    await queue.put((model_id, ev))
                elif ev.type == "done":
                    await queue.put((model_id, ev))
                    await queue.put((model_id, None))
                    return
                elif ev.type == "error":
                    last_error = ev
                    break

            if last_error:
                # If no chunks were emitted yet and error is a failover candidate, try fallback model
                if not has_emitted_delta and is_failover_candidate(last_error.error):
                    candidates = MODEL_FAILOVER_CHAIN.get(current_model, [])
                    fallback = next(
                        (
                            m for m in candidates
                            if m not in target_models and m not in tried_models
                        ),
                        None,
                    )
                    if fallback:
                        tried_models.add(fallback)
                        failover_ev = StreamEvent(
                            type="failover",
                            model_id=model_id,
                            extra={
                                "original_model_id": current_model,
                                "fallback_model_id": fallback,
                                "reason": last_error.error or "Rate limit / quota exceeded",
                            },
                        )
                        await queue.put((model_id, failover_ev))
                        current_model = fallback
                        continue

                # No fallback possible, forward the error
                await queue.put((model_id, last_error))
                await queue.put((model_id, None))
                return

            await queue.put((model_id, None))
            return

    tasks = [asyncio.create_task(_run_single_model(mid)) for mid in target_models]
    finished_count = 0

    try:
        while finished_count < len(target_models):
            model_id, ev = await queue.get()
            if ev is None:
                finished_count += 1
                continue

            msg_id = assistant_msgs[model_id].id
            if ev.type == "delta":
                buffers[model_id].append(ev.delta)
                yield format_sse(
                    "chunk",
                    {"turn_id": turn.id, "message_id": msg_id, "model_id": model_id, "delta": ev.delta},
                )
            elif ev.type == "failover":
                fallback_id = ev.extra["fallback_model_id"]
                original_id = ev.extra["original_model_id"]
                # Update model_id on stub so subsequent stream chunks & DB persistence use the fallback
                assistant_msgs[model_id].model_id = fallback_id
                yield format_sse(
                    "model_failover",
                    {
                        "turn_id": turn.id,
                        "message_id": msg_id,
                        "original_model_id": original_id,
                        "fallback_model_id": fallback_id,
                        "reason": ev.extra["reason"],
                    },
                )
            elif ev.type == "done":
                final_events[model_id] = ev
                yield format_sse(
                    "model_done",
                    {
                        "turn_id": turn.id,
                        "message_id": msg_id,
                        "model_id": assistant_msgs[model_id].model_id or model_id,
                        "input_tokens": ev.input_tokens,
                        "output_tokens": ev.output_tokens,
                        "cost_usd": ev.cost_usd,
                        "ttft_ms": ev.ttft_ms,
                        "total_ms": ev.total_ms,
                    },
                )
            elif ev.type == "error":
                final_events[model_id] = ev
                yield format_sse(
                    "model_error",
                    {
                        "turn_id": turn.id,
                        "message_id": msg_id,
                        "model_id": assistant_msgs[model_id].model_id or model_id,
                        "error": ev.error,
                    },
                )
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

        # Persist completed/errored model outputs using a dedicated session so disconnects still save cleanly
        async with AsyncSessionLocal() as save_db:
            for model_id, stub in assistant_msgs.items():
                db_msg = await save_db.get(Message, stub.id)
                if not db_msg:
                    continue
                db_msg.model_id = stub.model_id
                ev = final_events.get(model_id)
                db_msg.content = "".join(buffers[model_id])
                if ev and ev.type == "done":
                    db_msg.status = "completed"
                    db_msg.input_tokens = ev.input_tokens
                    db_msg.output_tokens = ev.output_tokens
                    db_msg.cost_usd = ev.cost_usd
                    db_msg.ttft_ms = ev.ttft_ms
                    db_msg.total_ms = ev.total_ms
                elif ev and ev.type == "error":
                    db_msg.status = "error"
                    db_msg.error_message = ev.error
                    db_msg.total_ms = ev.total_ms
                else:
                    db_msg.status = "error"
                    db_msg.error_message = "Stream interrupted"
            await save_db.commit()

    yield format_sse("stream_complete", {"turn_id": turn.id})
