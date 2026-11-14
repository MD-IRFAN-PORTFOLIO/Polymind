from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import DATA_DIR
from app.core.database import get_db
from app.models.chat import new_uuid
from app.models.rag import Document, DocumentChunk, KnowledgeBase
from app.schemas.rag import (
    DocumentDetail,
    DocumentSummary,
    KnowledgeBaseCreate,
    KnowledgeBaseDetail,
    RAGSearchRequest,
    RAGSearchResult,
)
from app.services.model_catalog import resolve_provider_credentials
from app.services.rag.embeddings import generate_embeddings
from app.services.rag.parser import parse_and_chunk_file
from app.services.rag.retriever import hybrid_retrieve

router = APIRouter(tags=["rag"])
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/knowledge-bases", response_model=list[KnowledgeBaseDetail])
async def list_knowledge_bases(db: AsyncSession = Depends(get_db)) -> list[KnowledgeBaseDetail]:
    stmt = select(KnowledgeBase).options(selectinload(KnowledgeBase.documents)).order_by(KnowledgeBase.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.post("/knowledge-bases", response_model=KnowledgeBaseDetail, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    payload: KnowledgeBaseCreate,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseDetail:
    kb = KnowledgeBase(name=payload.name, description=payload.description)
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return KnowledgeBaseDetail(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_at=kb.created_at,
        documents=[],
    )


@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseDetail)
async def get_knowledge_base(kb_id: str, db: AsyncSession = Depends(get_db)) -> KnowledgeBaseDetail:
    stmt = select(KnowledgeBase).where(KnowledgeBase.id == kb_id).options(selectinload(KnowledgeBase.documents))
    kb = (await db.execute(stmt)).scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.delete("/knowledge-bases/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(kb_id: str, db: AsyncSession = Depends(get_db)) -> None:
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    await db.delete(kb)
    await db.commit()


@router.post("/documents/upload", response_model=DocumentSummary, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    knowledge_base_id: str | None = Form(None),
    conversation_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
) -> DocumentSummary:
    """Upload a file, extract content, chunk it, generate embeddings, and index for RAG."""
    contents = await file.read()
    filename = file.filename or "uploaded_file"
    ext = Path(filename).suffix.lower()

    # Save raw file on disk
    doc_id = new_uuid()
    saved_path = UPLOADS_DIR / f"{doc_id}_{filename}"
    saved_path.write_bytes(contents)

    # 1. Parse and chunk
    chunks_meta = parse_and_chunk_file(contents, filename)
    chunk_texts = [c["content"] for c in chunks_meta]

    # 2. Embed
    credentials = await resolve_provider_credentials(db)
    embeddings = await generate_embeddings(chunk_texts, credentials)

    # 3. Persist Document & DocumentChunks
    doc = Document(
        id=doc_id,
        knowledge_base_id=knowledge_base_id,
        conversation_id=conversation_id,
        filename=filename,
        file_type=ext.replace(".", ""),
        file_path=str(saved_path),
        file_size_bytes=len(contents),
        status="ready",
        total_chunks=len(chunks_meta),
    )
    db.add(doc)
    await db.flush()

    for idx, (c_meta, emb) in enumerate(zip(chunks_meta, embeddings)):
        chunk_obj = DocumentChunk(
            document_id=doc.id,
            chunk_index=idx,
            content=c_meta["content"],
            meta_info=c_meta["meta_info"],
            embedding=emb,
        )
        db.add(chunk_obj)

    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/documents/{doc_id}", response_model=DocumentDetail)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)) -> DocumentDetail:
    stmt = select(Document).where(Document.id == doc_id).options(selectinload(Document.chunks))
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)) -> None:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()


@router.post("/rag/search", response_model=list[RAGSearchResult])
async def search_rag(
    payload: RAGSearchRequest,
    db: AsyncSession = Depends(get_db),
) -> list[RAGSearchResult]:
    """Inspect top-K retrieved chunks for a test query."""
    credentials = await resolve_provider_credentials(db)
    results = await hybrid_retrieve(
        db=db,
        query=payload.query,
        credentials=credentials,
        knowledge_base_ids=payload.knowledge_base_ids,
        top_k=payload.top_k,
    )
    return [
        RAGSearchResult(
            chunk_id=r.chunk_id,
            document_id=r.document_id,
            filename=r.filename,
            chunk_index=r.chunk_index,
            content=r.content,
            meta_info=r.meta_info,
            score=r.score,
        )
        for r in results
    ]
