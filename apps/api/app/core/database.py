from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base ORM class for all SQLAlchemy models."""


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield an async database session per request."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create database tables if they do not exist and ensure schema consistency."""
    from sqlalchemy import text
    from app import models  # noqa: F401 - ensures models are registered on Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        if engine.dialect.name == "postgresql":
            try:
                await conn.execute(text("ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) DEFAULT 'local-user'"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE provider_keys ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) DEFAULT 'local-user'"))
                await conn.execute(text("""
                    DO $$ 
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM pg_constraint 
                            WHERE conname = 'provider_keys_pkey' AND contype = 'p'
                        ) THEN
                            IF (SELECT count(*) FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) WHERE c.conname = 'provider_keys_pkey') = 1 THEN
                                ALTER TABLE provider_keys DROP CONSTRAINT provider_keys_pkey;
                                ALTER TABLE provider_keys ADD CONSTRAINT provider_keys_pkey PRIMARY KEY (user_id, provider);
                            END IF;
                        END IF;
                    END $$;
                """))
            except Exception:
                pass
