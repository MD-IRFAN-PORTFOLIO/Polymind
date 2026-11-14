from dataclasses import dataclass
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rag import Document, DocumentChunk
from app.services.rag.embeddings import cosine_similarity, generate_embeddings


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    filename: str
    chunk_index: int
    content: str
    meta_info: dict[str, Any]
    score: float


async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    credentials: dict[str, tuple[str, str | None]],
    knowledge_base_ids: list[str] | None = None,
    document_ids: list[str] | None = None,
    conversation_id: str | None = None,
    top_k: int = 4,
) -> list[RetrievedChunk]:
    """Retrieve top-K chunks using hybrid dense vector search + keyword matching via RRF."""
    # Build document query filter
    doc_filter = []
    if knowledge_base_ids:
        doc_filter.append(Document.knowledge_base_id.in_(knowledge_base_ids))
    if document_ids:
        doc_filter.append(Document.id.in_(document_ids))
    if conversation_id:
        doc_filter.append(Document.conversation_id == conversation_id)

    from sqlalchemy import or_

    stmt = select(DocumentChunk, Document.filename).join(Document, DocumentChunk.document_id == Document.id)
    if doc_filter:
        stmt = stmt.where(or_(*doc_filter))

    rows = (await db.execute(stmt)).all()
    if not rows:
        return []

    # Generate query embedding
    query_vectors = await generate_embeddings([query], credentials)
    query_vector = query_vectors[0] if query_vectors else []
    query_tokens = set(re.findall(r"\w+", query.lower()))

    # Score chunks with dense vector and sparse keyword matching
    scored_items: list[tuple[DocumentChunk, str, float, float]] = []
    for chunk, filename in rows:
        # 1. Dense vector score
        dense_score = cosine_similarity(query_vector, chunk.embedding) if query_vector else 0.0

        # 2. Sparse keyword score
        chunk_tokens = set(re.findall(r"\w+", chunk.content.lower()))
        overlap = len(query_tokens.intersection(chunk_tokens))
        sparse_score = overlap / max(1, len(query_tokens))

        scored_items.append((chunk, filename, dense_score, sparse_score))

    # Reciprocal Rank Fusion (RRF with k=60)
    dense_ranked = sorted(scored_items, key=lambda x: x[2], reverse=True)
    sparse_ranked = sorted(scored_items, key=lambda x: x[3], reverse=True)

    dense_ranks = {item[0].id: rank for rank, item in enumerate(dense_ranked, start=1)}
    sparse_ranks = {item[0].id: rank for rank, item in enumerate(sparse_ranked, start=1)}

    rrf_k = 60
    fused: list[RetrievedChunk] = []
    for chunk, filename, d_score, s_score in scored_items:
        r_dense = dense_ranks[chunk.id]
        r_sparse = sparse_ranks[chunk.id]
        rrf_score = (1.0 / (rrf_k + r_dense)) + (1.0 / (rrf_k + r_sparse))
        fused.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                filename=filename,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                meta_info=chunk.meta_info or {},
                score=round(rrf_score, 6),
            )
        )

    fused.sort(key=lambda x: x.score, reverse=True)
    return fused[:top_k]


def build_grounded_rag_prompt(
    base_prompt: str,
    chunks: list[RetrievedChunk],
) -> tuple[str, list[dict[str, Any]]]:
    """Format numbered sources and inject grounding instructions into user prompt."""
    if not chunks:
        return base_prompt, []

    sources_block_lines = ["[SOURCES]"]
    citations_data: list[dict[str, Any]] = []

    for idx, c in enumerate(chunks, start=1):
        sources_block_lines.append(f"[{idx}] (Source: {c.filename})\n{c.content}\n")
        citations_data.append(
            {
                "citation_id": idx,
                "chunk_id": c.chunk_id,
                "document_id": c.document_id,
                "filename": c.filename,
                "snippet": c.content[:240] + ("..." if len(c.content) > 240 else ""),
                "score": c.score,
            }
        )

    sources_block_lines.append("[/SOURCES]")
    sources_text = "\n".join(sources_block_lines)

    augmented_prompt = (
        f"{sources_text}\n\n"
        f"Instructions: Answer the user's question accurately using ONLY the sources provided above whenever relevant. "
        f"When making claims based on the sources, add citation brackets like [1] or [2] referring to the source number. "
        f"If the information is not contained in the sources, state that clearly.\n\n"
        f"User Question: {base_prompt}"
    )

    return augmented_prompt, citations_data
