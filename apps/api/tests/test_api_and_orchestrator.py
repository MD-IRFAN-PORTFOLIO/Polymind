import json
from collections.abc import AsyncIterator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app
from app.services.llm_gateway import StreamEvent


@pytest_asyncio.fixture
async def client(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file.as_posix()}", future=True)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    # Patch AsyncSessionLocal used inside orchestrator save block
    import app.services.orchestrator as orch_mod

    orig_session_local = orch_mod.AsyncSessionLocal
    orch_mod.AsyncSessionLocal = session_factory
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    orch_mod.AsyncSessionLocal = orig_session_local
    await engine.dispose()


@pytest.mark.asyncio
async def test_health_and_models_catalog(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    models_res = await client.get("/api/v1/models")
    assert models_res.status_code == 200
    models = models_res.json()
    assert len(models) >= 6
    assert any(m["has_free_tier"] for m in models)


@pytest.mark.asyncio
async def test_provider_key_upsert_masks_secret(client: AsyncClient):
    put_res = await client.put(
        "/api/v1/providers/keys",
        json={"provider": "gemini", "api_key": "AIzaSyTestSecretKey1234"},
    )
    assert put_res.status_code == 200
    providers = {p["provider"]: p for p in put_res.json()}
    assert providers["gemini"]["is_configured"] is True
    assert providers["gemini"]["masked_key"] == "AIza...1234"


@pytest.mark.asyncio
async def test_multi_model_streaming_and_winner_selection(client: AsyncClient, monkeypatch):
    async def fake_stream(model_id, messages, credentials, temperature=0.7, max_tokens=None):
        if model_id == "groq/llama-3.3-70b-versatile":
            yield StreamEvent(type="error", model_id=model_id, error="Rate limit reached")
            return
        yield StreamEvent(type="delta", model_id=model_id, delta="Hello ")
        yield StreamEvent(type="delta", model_id=model_id, delta=f"from {model_id} (turns={len(messages)})")
        yield StreamEvent(
            type="done",
            model_id=model_id,
            input_tokens=10,
            output_tokens=15,
            cost_usd=0.0,
            ttft_ms=25,
            total_ms=80,
        )

    import app.services.orchestrator as orch_mod

    monkeypatch.setattr(orch_mod, "stream_model_completion", fake_stream)

    create_res = await client.post("/api/v1/chats", json={"title": "New Multi-AI Chat"})
    assert create_res.status_code == 201
    chat_id = create_res.json()["id"]

    # Turn 1: broadcast to two models where one succeeds and one errors cleanly
    stream_res = await client.post(
        f"/api/v1/chats/{chat_id}/stream",
        json={
            "prompt": "Compare React and Vue",
            "models": ["gemini/gemini-2.5-flash", "groq/llama-3.3-70b-versatile"],
        },
    )
    assert stream_res.status_code == 200
    body = stream_res.text
    assert "event: turn_created" in body
    assert "event: model_done" in body
    assert "event: model_error" in body
    assert "event: stream_complete" in body

    chat_detail = (await client.get(f"/api/v1/chats/{chat_id}")).json()
    assert chat_detail["title"] == "Compare React and Vue"
    assert len(chat_detail["turns"]) == 1
    turn = chat_detail["turns"][0]
    gemini_msg = next(m for m in turn["messages"] if m["model_id"] == "gemini/gemini-2.5-flash")
    groq_msg = next(m for m in turn["messages"] if m["model_id"] == "groq/llama-3.3-70b-versatile")
    assert gemini_msg["status"] == "completed"
    assert "Hello from gemini/gemini-2.5-flash" in gemini_msg["content"]
    assert groq_msg["status"] == "error"
    assert groq_msg["error_message"] == "Rate limit reached"

    # Select winning response for follow-up context
    sel_res = await client.post(
        f"/api/v1/chats/{chat_id}/turns/{turn['id']}/select",
        json={"message_id": gemini_msg["id"]},
    )
    assert sel_res.status_code == 200
    assert sel_res.json()["selected_response_id"] == gemini_msg["id"]

    # Turn 2: verify context includes Turn 1 user + selected winner (1 user + 1 assistant + 1 current user = 3)
    stream_res_2 = await client.post(
        f"/api/v1/chats/{chat_id}/stream",
        json={
            "prompt": "Which is faster to learn?",
            "models": ["gemini/gemini-2.5-flash"],
        },
    )
    assert "turns=3" in stream_res_2.text
