import hashlib
import math
import re
from typing import Any

import httpx

_rag_client: httpx.AsyncClient | None = None
_embedding_cache: dict[str, list[float]] = {}
MAX_CACHE_SIZE = 1000


def get_rag_client() -> httpx.AsyncClient:
    """Return persistent, pooled HTTP client for embedding API requests."""
    global _rag_client
    if _rag_client is None or _rag_client.is_closed:
        limits = httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=60.0)
        _rag_client = httpx.AsyncClient(timeout=10.0, limits=limits)
    return _rag_client


async def generate_embeddings(
    texts: list[str],
    credentials: dict[str, tuple[str, str | None]],
) -> list[list[float]]:
    """Generate dense embedding vectors for texts, falling back to local semantic vectorizer."""
    if not texts:
        return []

    # Check cache for any cached texts
    uncached_indices: list[int] = []
    uncached_texts: list[str] = []
    results: list[list[float] | None] = [None] * len(texts)

    for i, t in enumerate(texts):
        key = hashlib.md5(t.encode("utf-8")).hexdigest()
        if key in _embedding_cache:
            results[i] = _embedding_cache[key]
        else:
            uncached_indices.append(i)
            uncached_texts.append(t)

    if not uncached_texts:
        return [r for r in results if r is not None]

    # Generate embeddings for uncached texts
    generated_vectors: list[list[float]] | None = None

    # 1. Try OpenAI text-embedding-3-small if configured
    openai_key, _ = credentials.get("openai", ("", None))
    if openai_key and len(openai_key) > 10:
        try:
            generated_vectors = await _get_openai_embeddings(uncached_texts, openai_key)
        except Exception:
            generated_vectors = None

    # 2. Try Gemini text-embedding-004 if configured
    if generated_vectors is None:
        gemini_key, _ = credentials.get("gemini", ("", None))
        if gemini_key and len(gemini_key) > 10:
            try:
                generated_vectors = await _get_gemini_embeddings(uncached_texts, gemini_key)
            except Exception:
                generated_vectors = None

    # 3. Deterministic Local Hashing Vectorizer (100% offline, zero external latency)
    if generated_vectors is None or len(generated_vectors) != len(uncached_texts):
        generated_vectors = [_local_text_vector(t) for t in uncached_texts]

    # Populate cache and merge into results
    for idx, vec in zip(uncached_indices, generated_vectors):
        results[idx] = vec
        key = hashlib.md5(texts[idx].encode("utf-8")).hexdigest()
        if len(_embedding_cache) < MAX_CACHE_SIZE:
            _embedding_cache[key] = vec

    return [r for r in results if r is not None]


async def _get_openai_embeddings(texts: list[str], api_key: str) -> list[list[float]]:
    url = "https://api.openai.com/v1/embeddings"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"input": texts, "model": "text-embedding-3-small"}
    client = get_rag_client()
    res = await client.post(url, headers=headers, json=payload)
    res.raise_for_status()
    data = res.json().get("data", [])
    return [item["embedding"] for item in sorted(data, key=lambda x: x["index"])]


async def _get_gemini_embeddings(texts: list[str], api_key: str) -> list[list[float]]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={api_key}"
    requests_payload = [
        {"model": "models/text-embedding-004", "content": {"parts": [{"text": t}]}}
        for t in texts
    ]
    client = get_rag_client()
    res = await client.post(url, json={"requests": requests_payload})
    res.raise_for_status()
    embeddings = res.json().get("embeddings", [])
    return [item["values"] for item in embeddings]


def _local_text_vector(text: str, dim: int = 128) -> list[float]:
    """Generate a normalized 128-d dense vector using n-gram subword hashing and term frequency."""
    vec = [0.0] * dim
    words = re.findall(r"\w+", text.lower())
    if not words:
        return vec

    for word in words:
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0

        if len(word) >= 3:
            for i in range(len(word) - 2):
                tri = word[i : i + 3]
                th = int(hashlib.md5(tri.encode("utf-8")).hexdigest(), 16)
                vec[th % dim] += 0.5

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0.0:
        vec = [v / norm for v in vec]
    return [round(v, 6) for v in vec]


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two dense vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)
