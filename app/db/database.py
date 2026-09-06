from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


def _init_engine():
    db_url = getattr(settings, "DATABASE_URL", "sqlite:///./app.db")
    try:
        if db_url.startswith("postgresql"):
            # Strip invalid schema parameter if present
            clean_url = db_url.split("?schema=")[0].split("&schema=")[0]
            eng = create_engine(clean_url, pool_pre_ping=True)
            # Test connection
            with eng.connect() as conn:
                pass
            return eng
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False, "timeout": 30},
            pool_pre_ping=True,
        )
    except Exception as exc:
        print(f"[Database Warning] PostgreSQL connection failed ({exc}). Using fallback SQLite database: sqlite:///./app.db")
        return create_engine(
            "sqlite:///./app.db",
            connect_args={"check_same_thread": False, "timeout": 30},
            pool_pre_ping=True,
        )

engine = _init_engine()

# Enable WAL mode and 30-second busy timeout for SQLite to prevent locking
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in str(engine.url):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=30000")
        except Exception:
            pass
        finally:
            cursor.close()


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