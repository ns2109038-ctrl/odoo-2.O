from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.contacts import router as contacts_router
from app.api.products import router as products_router
from app.api.accounts import router as accounts_router
from app.api.journals import router as journals_router
from app.api.journal_entries import router as journal_entries_router
from app.api.sales import router as sales_router
from app.api.purchases import router as purchases_router
from app.api.invoices import router as invoices_router
from app.api.payments import router as payments_router
from app.api.analytic_accounts import router as analytic_accounts_router
from app.api.budgets import router as budgets_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router
from app.api.ai import router as ai_router


from app.db.database import Base, engine, SessionLocal
import app.models  # Ensures all models register with Base.metadata
from app.models.user import User
from app.core.security import hash_password

# Automatically create all SQL tables if they don't exist
try:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default admin user if empty
        if not db.query(User).filter(User.login_id == "admin").first():
            db.add(User(
                name="System Administrator",
                login_id="admin",
                email="admin@urbanfurniture.com",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True
            ))
        if not db.query(User).filter(User.login_id == "vishal01").first():
            db.add(User(
                name="Vishal Kumar",
                login_id="vishal01",
                email="vishal01@gmail.com",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True
            ))
        db.commit()
    except Exception as seed_err:
        db.rollback()
        print(f"[Seed Warning] {seed_err}")
    finally:
        db.close()
except Exception as init_err:
    print(f"[Database Init Warning] {init_err}")

app = FastAPI(
    title="Urban Furniture Accounting System",
    description="Accounting backend for Urban Furniture",
    version="1.0.0"
)


# Enable CORS for frontend API testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi import APIRouter

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(contacts_router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(products_router, prefix="/products", tags=["Products"])
api_router.include_router(accounts_router)
api_router.include_router(journals_router)
api_router.include_router(journal_entries_router)
api_router.include_router(sales_router)
api_router.include_router(purchases_router)
api_router.include_router(invoices_router)
api_router.include_router(payments_router)
api_router.include_router(analytic_accounts_router)
api_router.include_router(budgets_router)
api_router.include_router(reports_router)
api_router.include_router(dashboard_router)
api_router.include_router(ai_router)

app.include_router(api_router)

root_compat_router = APIRouter()
root_compat_router.include_router(auth_router, prefix="/auth", include_in_schema=False)
root_compat_router.include_router(users_router, prefix="/users", include_in_schema=False)
root_compat_router.include_router(contacts_router, prefix="/contacts", include_in_schema=False)
root_compat_router.include_router(products_router, prefix="/products", include_in_schema=False)
root_compat_router.include_router(accounts_router, include_in_schema=False)
root_compat_router.include_router(journals_router, include_in_schema=False)
root_compat_router.include_router(journal_entries_router, include_in_schema=False)
root_compat_router.include_router(sales_router, include_in_schema=False)
root_compat_router.include_router(purchases_router, include_in_schema=False)
root_compat_router.include_router(invoices_router, include_in_schema=False)
root_compat_router.include_router(payments_router, include_in_schema=False)
root_compat_router.include_router(analytic_accounts_router, include_in_schema=False)
root_compat_router.include_router(budgets_router, include_in_schema=False)
root_compat_router.include_router(reports_router, include_in_schema=False)
root_compat_router.include_router(dashboard_router, include_in_schema=False)
root_compat_router.include_router(ai_router, include_in_schema=False)

app.include_router(root_compat_router)



@app.get("/")
def root():

    return {
        "message": "Urban Furniture Accounting System API is running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }