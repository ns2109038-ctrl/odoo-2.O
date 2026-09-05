from app.db.database import engine, Base
from app.models.user import User  # noqa: F401
from app.models.contact import Contact  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.account import Account  # noqa: F401
from app.models.journal import Journal  # noqa: F401
from app.models.journal_entry import JournalEntry, JournalItem  # noqa: F401
from app.models.invoice import Invoice, InvoiceLine  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.sales_order import SalesOrder, SalesOrderLine  # noqa: F401
from app.models.purchase_order import PurchaseOrder, PurchaseOrderLine  # noqa: F401
from app.models.analytic_account import AnalyticAccount  # noqa: F401
from app.models.budget import Budget, BudgetLine  # noqa: F401



def init_db():
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")


if __name__ == "__main__":
    init_db()
