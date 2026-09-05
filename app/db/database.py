from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


def _init_engine():
    db_url = getattr(settings, "DATABASE_URL", "sqlite:///./app.db")
    try:
        if db_url.startswith("postgresql"):
            eng = create_engine(db_url, pool_pre_ping=True)
            # Test connection
            with eng.connect() as conn:
                pass
            return eng
        return create_engine(db_url, connect_args={"check_same_thread": False})
    except Exception as exc:
        print(f"[Database Warning] PostgreSQL connection failed ({exc}). Using fallback SQLite database: sqlite:///./app.db")
        return create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})

engine = _init_engine()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()