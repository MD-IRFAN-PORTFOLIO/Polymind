from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    knowledge_base_id: str | None
    conversation_id: str | None
    filename: str
    file_type: str
    file_size_bytes: int
    status: str
    total_chunks: int
    created_at: datetime


class KnowledgeBaseDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    created_at: datetime
    documents: list[DocumentSummary] = Field(default_factory=list)


class ChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    content: str
    meta_info: dict
    created_at: datetime


class DocumentDetail(DocumentSummary):
    chunks: list[ChunkOut] = Field(default_factory=list)


class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    knowledge_base_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=4, ge=1, le=20)


class RAGSearchResult(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    chunk_index: int
    content: str
    meta_info: dict
    score: float
