from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.chat import Project
from app.schemas.chat import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectOut]:
    stmt = (
        select(Project)
        .where((Project.user_id == user_id) | (Project.user_id == "local-user"))
        .order_by(Project.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    data = payload.model_dump()
    project = Project(**data, user_id=user_id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    project = await db.get(Project, project_id)
    if not project or (project.user_id != user_id and project.user_id != "local-user"):
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
