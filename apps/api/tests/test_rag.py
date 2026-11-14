import io
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
    db_file = tmp_path / "test_rag.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_file.as_posix()}", future=True)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

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
async def test_knowledge_base_upload_and_retrieval(client: AsyncClient):
    # 1. Create Knowledge Base
    kb_res = await client.post(
        "/api/v1/knowledge-bases",
        json={"name": "Engineering Docs", "description": "Architecture reference guides"},
    )
    assert kb_res.status_code == 201
    kb_id = kb_res.json()["id"]

    # 2. Upload sample document
    doc_content = (
        "# Antigravity Hybrid RAG Architecture\n\n"
        "PolyMind integrates Gemini, Groq, OpenRouter, and Ollama side by side.\n"
        "The RAG engine uses reciprocal rank fusion between vector cosine and BM25 keywords.\n"
        "Chunk sizes default to 800 characters with 100 character overlap.\n"
    )
    files = {"file": ("architecture.md", io.BytesIO(doc_content.encode("utf-8")), "text/markdown")}
    upload_res = await client.post(
        "/api/v1/documents/upload",
        data={"knowledge_base_id": kb_id},
        files=files,
    )
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["filename"] == "architecture.md"
    assert doc_data["total_chunks"] >= 1
    doc_id = doc_data["id"]

    # 3. Retrieve chunks directly via search
    search_res = await client.post(
        "/api/v1/rag/search",
        json={"query": "reciprocal rank fusion chunk sizes", "knowledge_base_ids": [kb_id]},
    )
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert "reciprocal rank fusion" in results[0]["content"]
    assert results[0]["score"] > 0


@pytest.mark.asyncio
async def test_grounded_multi_model_chat_with_rag(client: AsyncClient, monkeypatch):
    # Create KB and document
    kb_res = await client.post(
        "/api/v1/knowledge-bases",
        json={"name": "Company Policies", "description": "HR and remote work handbook"},
    )
    kb_id = kb_res.json()["id"]

    policy_doc = (
        "Policy Alpha: Employees receive 25 days of paid annual vacation.\n"
        "Remote work reimbursement budget is $1200 per calendar year.\n"
    )
    files = {"file": ("handbook.txt", io.BytesIO(policy_doc.encode("utf-8")), "text/plain")}
    await client.post("/api/v1/documents/upload", data={"knowledge_base_id": kb_id}, files=files)

    # Mock stream to capture received prompt and verify source injection
    received_prompts: dict[str, str] = {}

    async def fake_stream(model_id, messages, credentials, temperature=0.7, max_tokens=None):
        user_prompt = messages[-1]["content"]
        received_prompts[model_id] = user_prompt
        yield StreamEvent(type="delta", model_id=model_id, delta=f"Based on [1], annual vacation is 25 days.")
        yield StreamEvent(
            type="done",
            model_id=model_id,
            input_tokens=20,
            output_tokens=15,
            cost_usd=0.0,
            ttft_ms=18,
            total_ms=45,
        )

    import app.services.orchestrator as orch_mod

    monkeypatch.setattr(orch_mod, "stream_model_completion", fake_stream)

    chat_res = await client.post("/api/v1/chats", json={"title": "Policy Chat"})
    chat_id = chat_res.json()["id"]

    stream_res = await client.post(
        f"/api/v1/chats/{chat_id}/stream",
        json={
            "prompt": "How many days of annual vacation do we get?",
            "models": ["gemini/gemini-2.5-flash", "openai/gpt-4o"],
            "knowledge_base_ids": [kb_id],
        },
    )
    assert stream_res.status_code == 200
    body = stream_res.text
    assert "event: turn_created" in body
    assert "event: model_done" in body
    assert "citations" in body

    # Verify that BOTH models received the exact same grounded source context
    assert "gemini/gemini-2.5-flash" in received_prompts
    assert "openai/gpt-4o" in received_prompts
    prompt_sent = received_prompts["gemini/gemini-2.5-flash"]
    assert "[SOURCES]" in prompt_sent
    assert "[1] (Source: handbook.txt)" in prompt_sent
    assert "Policy Alpha: Employees receive 25 days" in prompt_sent

    # Verify persisted message citations in DB
    chat_detail = (await client.get(f"/api/v1/chats/{chat_id}")).json()
    turn = chat_detail["turns"][0]
    assistant_msg = turn["messages"][1]
    assert len(assistant_msg["citations"]) >= 1
    assert assistant_msg["citations"][0]["filename"] == "handbook.txt"
