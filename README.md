# PolyMind — Multi-AI Comparison & Grounded RAG Platform

> **Vision:** Bring the world's top free-tier LLMs (Google Gemini, Groq, OpenRouter, and local Ollama) into one unified workspace with side-by-side comparison, grounded RAG citations, and one-click Prompt Boost.

---

## 🌟 Key Features

1. **Simultaneous Multi-Model Broadcasting:**
   - Select 2 to 6 models from a single selector bar.
   - Dispatch one prompt concurrently across all selected LLMs.
   - Streaming responses render side by side in parallel columns.

2. **Grounded RAG (Retrieval-Augmented Generation) Engine:**
   - Create Knowledge Bases and upload documents (PDF, Markdown, TXT, CSV, Code).
   - Recursive chunker + Hybrid retrieval (dense cosine vector similarity + BM25 keyword matching fused via **Reciprocal Rank Fusion**).
   - Retrieval runs **once per query** and broadcasts the exact same grounded context to all models for a fair, low-latency comparison.
   - Every claim links to `[1]`, `[2]` citation badges that open an interactive source drawer with the exact snippet, filename, and relevance score.

3. **Context Selection & Thread Branching:**
   - Click **"Use Context"** on any model's reply to select it as the winning context for follow-up turns.
   - Context is reconstructed linearly, preserving seamless chat history across providers.

4. **Prompt Boost (One-Click Prompt Enhancer):**
   - Refines and expands brief user prompts into structured, high-signal prompts before dispatch.

5. **Bring Your Own Key (BYOK):**
   - Enter your own API keys in **Settings -> API Keys & Providers** (stored locally in SQLite).
   - Test free tiers immediately with **Google Gemini**, **Groq**, **OpenRouter**, or local **Ollama**.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | TypeScript, Next.js 15 (App Router), Tailwind CSS, Lucide Icons, React Markdown |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2 (Async), SQLite (`app.db`), HTTPX async client |
| **RAG** | Hybrid Dense Vectors (128-d cosine / OpenAI / Gemini) + BM25 Sparse Search + RRF |
| **Streaming** | Multiplexed Server-Sent Events (SSE) interleaving concurrent token streams |

---

## 🚀 Running the Project

### Both servers are currently running:
- **Frontend UI:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8000](http://localhost:8000) (Interactive OpenAPI docs at [http://localhost:8000/docs](http://localhost:8000/docs))

### Manual Start Commands:

#### 1. Backend (`apps/api`)
```powershell
apps/api/.venv/Scripts/python -m uvicorn app.main:app --app-dir apps/api --reload --port 8000
```
Run tests:
```powershell
Set-Location apps/api; .venv/Scripts/python -m pytest -v
```

#### 2. Frontend (`apps/web`)
```powershell
Set-Location apps/web; node node_modules/next/dist/bin/next dev --port 3000
```
Production build:
```powershell
Set-Location apps/web; node node_modules/next/dist/bin/next build
```
