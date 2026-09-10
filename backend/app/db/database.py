from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import DATABASE_URL

# Create engine with NullPool for serverless Neon
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args={"sslmode": "require"},
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
