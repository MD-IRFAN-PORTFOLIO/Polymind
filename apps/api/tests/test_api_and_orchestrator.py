import json
from collections.abc import AsyncIterator
import jwt
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


@pytest.mark.asyncio
async def test_multi_user_isolation(client: AsyncClient):
    auth_a = {"Authorization": f"Bearer {jwt.encode({'sub': 'user_alpha'}, 'secret', algorithm='HS256')}"}
    auth_b = {"Authorization": f"Bearer {jwt.encode({'sub': 'user_beta'}, 'secret', algorithm='HS256')}"}

    # 1. Projects isolation
    proj_a = (
        await client.post(
            "/api/v1/projects",
            json={"name": "Alpha Private Project", "system_prompt": "Alpha instructions"},
            headers=auth_a,
        )
    ).json()

    projs_b = (await client.get("/api/v1/projects", headers=auth_b)).json()
    assert not any(p["id"] == proj_a["id"] for p in projs_b)

    del_res = await client.delete(f"/api/v1/projects/{proj_a['id']}", headers=auth_b)
    assert del_res.status_code == 404

    # 2. Per-user cloud provider keys isolation
    await client.put(
        "/api/v1/providers/keys",
        json={"provider": "groq", "api_key": "gsk_alpha_111122223333"},
        headers=auth_a,
    )
    await client.put(
        "/api/v1/providers/keys",
        json={"provider": "groq", "api_key": "gsk_beta_888899990000"},
        headers=auth_b,
    )

    provs_a = (await client.get("/api/v1/providers", headers=auth_a)).json()
    provs_b = (await client.get("/api/v1/providers", headers=auth_b)).json()

    groq_a = next(p for p in provs_a if p["provider"] == "groq")
    groq_b = next(p for p in provs_b if p["provider"] == "groq")

    assert groq_a["masked_key"] == "gsk_...3333"
    assert groq_b["masked_key"] == "gsk_...0000"

    # 3. Knowledge base isolation
    kb_a = (
        await client.post(
            "/api/v1/knowledge-bases",
            json={"name": "Alpha Private KB", "description": "Confidential files"},
            headers=auth_a,
        )
    ).json()

    kbs_b = (await client.get("/api/v1/knowledge-bases", headers=auth_b)).json()
    assert not any(k["id"] == kb_a["id"] for k in kbs_b)

    del_kb_res = await client.delete(f"/api/v1/knowledge-bases/{kb_a['id']}", headers=auth_b)
    assert del_kb_res.status_code == 404


@pytest.mark.asyncio
async def test_model_auto_failover_on_rate_limit(client: AsyncClient, monkeypatch):
    import app.services.orchestrator as orch_mod

    async def fake_stream_with_failover(model_id, messages, credentials, temperature=0.7, max_tokens=None):
        if model_id == "groq/qwen/qwen3.8-27b":
            yield StreamEvent(type="error", model_id=model_id, error="HTTP 429: Rate limit reached. Please retry later.")
            return
        yield StreamEvent(type="delta", model_id=model_id, delta="Recovered response from backup model!")
        yield StreamEvent(type="done", model_id=model_id, input_tokens=10, output_tokens=20, cost_usd=0.0, ttft_ms=50, total_ms=100)

    monkeypatch.setattr(orch_mod, "stream_model_completion", fake_stream_with_failover)

    chat = (await client.post("/api/v1/chats", json={"title": "Test Failover"})).json()
    chat_id = chat["id"]

    stream_res = await client.post(
        f"/api/v1/chats/{chat_id}/stream",
        json={"prompt": "Explain Quantum Computing", "models": ["groq/qwen/qwen3.8-27b"]},
    )
    assert stream_res.status_code == 200
    body = stream_res.text
    assert "event: model_failover" in body
    assert "groq/openai/gpt-oss-120b" in body
    assert "event: model_done" in body
    assert "event: stream_complete" in body

    chat_detail = (await client.get(f"/api/v1/chats/{chat_id}")).json()
    turn = chat_detail["turns"][0]
    assert turn["messages"][1]["model_id"] == "groq/openai/gpt-oss-120b"
    assert turn["messages"][1]["status"] == "completed"
    assert "Recovered response from backup model!" in turn["messages"][1]["content"]

