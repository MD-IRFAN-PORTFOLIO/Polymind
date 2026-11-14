from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_gateway import stream_model_completion
from app.services.model_catalog import CURATED_MODELS, resolve_provider_credentials

BOOST_SYSTEM_PROMPT = (
    "You are an expert prompt engineer. Rewrite the user's draft prompt into a clear, "
    "well-structured, high-signal prompt that maximizes accuracy and usefulness across LLMs. "
    "Preserve the user's exact intent, add helpful constraints/output format where obvious, "
    "and return ONLY the improved prompt text without preamble or explanation."
)


async def boost_prompt(
    db: AsyncSession,
    raw_prompt: str,
    preferred_model_id: str | None = None,
    goal: str = "general",
) -> tuple[str, str]:
    """Enhance a user's prompt using the preferred or first configured LLM."""
    creds = await resolve_provider_credentials(db)
    target_model = preferred_model_id

    if not target_model:
        for item in CURATED_MODELS:
            pid = item["provider"]
            key, base = creds.get(pid, ("", None))
            if (pid == "ollama" and base) or (pid != "ollama" and key):
                target_model = item["id"]
                break

    if not target_model:
        raise ValueError("No configured LLM provider found. Add at least one API key in Settings first.")

    messages = [
        {"role": "system", "content": f"{BOOST_SYSTEM_PROMPT} Focus mode: {goal}."},
        {"role": "user", "content": raw_prompt},
    ]

    chunks: list[str] = []
    error_msg: str | None = None

    async for ev in stream_model_completion(
        model_id=target_model,
        messages=messages,
        credentials=creds,
        temperature=0.4,
        max_tokens=2048,
    ):
        if ev.type == "delta":
            chunks.append(ev.delta)
        elif ev.type == "error":
            error_msg = ev.error

    if error_msg and not chunks:
        raise RuntimeError(f"Prompt boost failed: {error_msg}")

    enhanced = "".join(chunks).strip()
    return enhanced or raw_prompt, target_model
