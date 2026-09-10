from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import DATABASE_URL

# QueuePool with pre_ping for Neon serverless — automatically reconnects
# if the server drops an idle connection between queries.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Test connection before use; reconnect if dropped
    pool_recycle=300,         # Recycle connections every 5 min (Neon drops idle after ~5 min)
    pool_size=5,              # Keep up to 5 connections in the pool
    max_overflow=10,          # Allow up to 10 extra connections under load
    connect_args={
        "sslmode": "require",
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
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
