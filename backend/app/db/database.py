from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool
from app.core.config import DATABASE_URL

# Neon Serverless connection configuration:
# When connecting to Neon's PgBouncer pooler endpoint (*-pooler*),
# Neon manages server-side pooling and terminates idle client connections
# when the compute scales to zero.
# To prevent "server closed the connection unexpectedly" caused by double-pooling
# stale connections, use NullPool for pooler endpoints, or short pool_recycle for direct endpoints.
is_pooler = "-pooler" in DATABASE_URL

if is_pooler:
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 15,
        },
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=60,  # Recycle every 60s to prevent stale serverless connections
        pool_size=5,
        max_overflow=10,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 15,
        },
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection():
    """Verify DB connectivity on startup."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.fetchone()[0] == 1
