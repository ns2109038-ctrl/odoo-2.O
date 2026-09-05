from app.db.database import engine, Base
from app.models.user import User  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.account import Account  # noqa: F401
from app.models.journal import Journal  # noqa: F401
from app.models.journal_entry import JournalEntry, JournalItem  # noqa: F401


def init_db():
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")


if __name__ == "__main__":
    init_db()
