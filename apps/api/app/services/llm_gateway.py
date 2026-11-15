from collections.abc import AsyncIterator
from dataclasses import dataclass, field
import json
import time
from typing import Any

import httpx

from app.services.model_catalog import infer_provider

OPENAI_COMPATIBLE_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "groq": "https://api.groq.com/openai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
    "openrouter": "https://openrouter.ai/api/v1",
    "deepseek": "https://api.deepseek.com",
    "xai": "https://api.x.ai/v1",
    "ollama": "http://localhost:11434/v1",
}

ESTIMATED_COST_PER_1M_TOKENS: dict[str, tuple[float, float]] = {
    # model_prefix: (input_cost_per_1M, output_cost_per_1M)
    "gemini/gemini-flash-lite-latest": (0.0375, 0.15),
    "gemini/gemini-3.5-flash-lite": (0.0375, 0.15),
    "gemini/gemini-3.5-flash": (0.075, 0.30),
    "gemini/gemini-2.5-flash": (0.075, 0.30),
    "gemini/gemini-2.5-pro": (1.25, 5.00),
    "groq/": (0.0, 0.0),
    "openrouter/": (0.0, 0.0),
    "openai/gpt-4o": (2.50, 10.00),
    "openai/gpt-4o-mini": (0.15, 0.60),
    "anthropic/claude-3-7-sonnet": (3.00, 15.00),
    "deepseek/": (0.14, 0.28),
    "xai/": (2.00, 10.00),
    "ollama/": (0.0, 0.0),
}


@dataclass
class StreamEvent:
    """Normalized streaming event yielded by any LLM provider."""

    type: str  # "delta" | "done" | "error"
    model_id: str
    delta: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    ttft_ms: int | None = None
    total_ms: int | None = None
    error: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


def clean_model_name(model_id: str) -> str:
    """Strip local prefix when calling the provider endpoint directly."""
    if "/" in model_id:
        return model_id.split("/", 1)[1]
    return model_id


def estimate_tokens(text: str) -> int:
    """Fast approximation of token count (~4 characters per token)."""
    return max(1, len(text) // 4)


def estimate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    if ":free" in model_id or model_id.startswith("ollama/"):
        return 0.0
    for prefix, (in_price, out_price) in ESTIMATED_COST_PER_1M_TOKENS.items():
        if model_id.startswith(prefix):
            return round((input_tokens * in_price + output_tokens * out_price) / 1_000_000, 6)
    return 0.0


async def stream_model_completion(
    model_id: str,
    messages: list[dict[str, str]],
    credentials: dict[str, tuple[str, str | None]],
    temperature: float = 0.7,
    max_tokens: int | None = None,
) -> AsyncIterator[StreamEvent]:
    """Stream normalized chat completion chunks from OpenAI-compatible APIs or Anthropic."""
    provider = infer_provider(model_id)
    api_key, base_url = credentials.get(provider, ("", None))

    if provider != "ollama" and not api_key:
        yield StreamEvent(
            type="error",
            model_id=model_id,
            error=f"Missing API key for provider '{provider}'. Add it in Settings -> API Keys.",
        )
        return

    clean_name = clean_model_name(model_id)
    start_ns = time.perf_counter_ns()
    ttft_ms: int | None = None
    full_text_chunks: list[str] = []
    input_tokens = 0
    output_tokens = 0

    try:
        if provider == "anthropic":
            async for ev in _stream_anthropic(
                model_id=model_id,
                clean_name=clean_name,
                messages=messages,
                api_key=api_key,
                temperature=temperature,
                max_tokens=max_tokens or 4096,
                start_ns=start_ns,
            ):
                if ev.type == "delta" and ttft_ms is None:
                    ttft_ms = ev.ttft_ms
                if ev.type == "delta":
                    full_text_chunks.append(ev.delta)
                yield ev
        else:
            async for ev in _stream_openai_compatible(
                model_id=model_id,
                provider=provider,
                clean_name=clean_name,
                messages=messages,
                api_key=api_key,
                base_url=base_url,
                temperature=temperature,
                max_tokens=max_tokens,
                start_ns=start_ns,
            ):
                if ev.type == "delta" and ttft_ms is None:
                    ttft_ms = ev.ttft_ms
                if ev.type == "delta":
                    full_text_chunks.append(ev.delta)
                if ev.type == "done":
                    input_tokens = ev.input_tokens
                    output_tokens = ev.output_tokens
                yield ev

    except Exception as exc:  # noqa: BLE001
        total_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
        yield StreamEvent(
            type="error",
            model_id=model_id,
            error=str(exc) or exc.__class__.__name__,
            total_ms=total_ms,
        )


_shared_client: httpx.AsyncClient | None = None


def get_shared_client() -> httpx.AsyncClient:
    """Return persistent, connection-pooled AsyncClient to eliminate SSL/TLS handshake latency."""
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        limits = httpx.Limits(max_keepalive_connections=50, max_connections=100, keepalive_expiry=60.0)
        timeout = httpx.Timeout(90.0, connect=10.0, read=90.0)
        _shared_client = httpx.AsyncClient(limits=limits, timeout=timeout)
    return _shared_client


async def _stream_openai_compatible(
    model_id: str,
    provider: str,
    clean_name: str,
    messages: list[dict[str, str]],
    api_key: str,
    base_url: str | None,
    temperature: float,
    max_tokens: int | None,
    start_ns: int,
) -> AsyncIterator[StreamEvent]:
    endpoint_base = (base_url or OPENAI_COMPATIBLE_BASE_URLS.get(provider, "https://api.openai.com/v1")).rstrip("/")
    url = f"{endpoint_base}/chat/completions"

    headers = {"Content-Type": "application/json"}
    if api_key and api_key != "ollama":
        headers["Authorization"] = f"Bearer {api_key}"
        if provider == "gemini":
            headers["x-goog-api-key"] = api_key
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://polymind.ai"
        headers["X-Title"] = "PolyMind"

    payload: dict[str, Any] = {
        "model": clean_name if provider != "openrouter" else f"{clean_name}",
        "messages": messages,
        "temperature": temperature,
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    client = get_shared_client()
    async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                err_bytes = await response.aread()
                err_msg = err_bytes.decode(errors="replace")
                yield StreamEvent(type="error", model_id=model_id, error=f"HTTP {response.status_code}: {err_msg[:240]}")
                return

            ttft_ms: int | None = None
            input_tokens = 0
            output_tokens = 0
            full_text = ""

            async for line in response.aiter_lines():
                line = line.strip()
                if not line or not line.startswith("data:"):
                    continue

                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break

                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                choices = chunk.get("choices") or []
                if choices:
                    delta_obj = choices[0].get("delta") or {}
                    text = delta_obj.get("content") or ""
                    if text:
                        if ttft_ms is None:
                            ttft_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
                        full_text += text
                        yield StreamEvent(type="delta", model_id=model_id, delta=text, ttft_ms=ttft_ms)

                usage = chunk.get("usage")
                if usage:
                    input_tokens = int(usage.get("prompt_tokens") or 0)
                    output_tokens = int(usage.get("completion_tokens") or 0)

            total_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
            if input_tokens == 0:
                input_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)
            if output_tokens == 0:
                output_tokens = estimate_tokens(full_text)

            cost_usd = estimate_cost(model_id, input_tokens, output_tokens)
            yield StreamEvent(
                type="done",
                model_id=model_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
                ttft_ms=ttft_ms,
                total_ms=total_ms,
            )


async def _stream_anthropic(
    model_id: str,
    clean_name: str,
    messages: list[dict[str, str]],
    api_key: str,
    temperature: float,
    max_tokens: int,
    start_ns: int,
) -> AsyncIterator[StreamEvent]:
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    # Anthropic expects top-level system parameter and user/assistant messages
    system_text = ""
    anthropic_msgs: list[dict[str, str]] = []
    for m in messages:
        if m.get("role") == "system":
            system_text = m.get("content", "")
        else:
            anthropic_msgs.append({"role": m["role"], "content": m["content"]})

    payload: dict[str, Any] = {
        "model": clean_name,
        "messages": anthropic_msgs,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }
    if system_text:
        payload["system"] = system_text

    client = get_shared_client()
    async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                err_bytes = await response.aread()
                yield StreamEvent(type="error", model_id=model_id, error=f"HTTP {response.status_code}: {err_bytes.decode()[:240]}")
                return

            ttft_ms: int | None = None
            input_tokens = 0
            output_tokens = 0
            full_text = ""

            async for line in response.aiter_lines():
                line = line.strip()
                if not line.startswith("data:"):
                    continue

                data_str = line[5:].strip()
                try:
                    event_data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                ev_type = event_data.get("type")
                if ev_type == "content_block_delta":
                    delta_text = (event_data.get("delta") or {}).get("text") or ""
                    if delta_text:
                        if ttft_ms is None:
                            ttft_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
                        full_text += delta_text
                        yield StreamEvent(type="delta", model_id=model_id, delta=delta_text, ttft_ms=ttft_ms)
                elif ev_type == "message_start":
                    msg_obj = event_data.get("message") or {}
                    usage = msg_obj.get("usage") or {}
                    input_tokens = usage.get("input_tokens") or 0
                elif ev_type == "message_delta":
                    usage = event_data.get("usage") or {}
                    output_tokens = usage.get("output_tokens") or 0

            total_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
            if input_tokens == 0:
                input_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)
            if output_tokens == 0:
                output_tokens = estimate_tokens(full_text)

            cost_usd = estimate_cost(model_id, input_tokens, output_tokens)
            yield StreamEvent(
                type="done",
                model_id=model_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
                ttft_ms=ttft_ms,
                total_ms=total_ms,
            )
