from fastapi import APIRouter

from app.api.v1 import chats, models, projects, prompt_boost, rag

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(models.router)
api_router.include_router(chats.router)
api_router.include_router(projects.router)
api_router.include_router(prompt_boost.router)
api_router.include_router(rag.router)
