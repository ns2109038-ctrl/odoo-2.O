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

        # Seed wireframe master contacts (Open Wood & Joey Wills)
        from app.models.contact import Contact
        if not db.query(Contact).filter(Contact.name == "Open Wood").first():
            db.add(Contact(
                name="Open Wood",
                email="Openwood21@example.com",
                phone="+91 9090090909",
                address="12 Woodcraft Plaza, Timber Road",
                city="Mumbai",
                state="Maharashtra",
                country="India",
                pincode="400001",
                contact_type="customer",
                type="Customer",
                is_active=True,
                profile_image="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='16' fill='%2315803d'/><path d='M50 18 L68 45 L58 45 L74 70 L26 70 L42 45 L32 45 Z' fill='%23ffffff'/><rect x='46' y='70' width='8' height='14' rx='2' fill='%2386efac'/></svg>",
                tax_id="27AAACW1234F1Z1"
            ))
        if not db.query(Contact).filter(Contact.name == "Joey Wills").first():
            db.add(Contact(
                name="Joey Wills",
                email="Joey.wills@example.com",
                phone="+91 8080080808",
                address="45 Silicon Avenue, Tech Park",
                city="Bangalore",
                state="Karnataka",
                country="India",
                pincode="560001",
                contact_type="customer",
                type="Customer",
                is_active=True,
                profile_image="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='16' fill='%230284c7'/><circle cx='50' cy='40' r='22' fill='%23fed7aa'/><path d='M30 32 Q50 18 70 32 Q65 24 50 24 Q35 24 30 32 Z' fill='%2378350f'/><circle cx='42' cy='38' r='3' fill='%231e293b'/><circle cx='58' cy='38' r='3' fill='%231e293b'/><path d='M42 48 Q50 55 58 48' stroke='%23ea580c' stroke-width='2.5' fill='none' stroke-linecap='round'/><path d='M22 88 C25 66 40 64 50 64 C60 64 75 66 78 88 Z' fill='%23f8fafc'/></svg>",
                tax_id="29AAAPW5678K1Z5"
            ))

        # Seed wireframe master products (Air Conditioner & Refrigerator)
        from app.models.product import Product
        from decimal import Decimal
        ac_img = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='16' fill='%230284c7'/><rect x='15' y='30' width='70' height='36' rx='8' fill='%23ffffff'/><rect x='22' y='52' width='56' height='8' rx='4' fill='%23e0f2fe'/><circle cx='76' cy='40' r='3' fill='%2338bdf8'/><path d='M25 72 Q35 80 45 72 Q55 64 65 72 Q75 80 85 72' stroke='%23bae6fd' stroke-width='3' fill='none' stroke-linecap='round'/></svg>"
        fridge_img = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='16' fill='%23475569'/><rect x='28' y='16' width='44' height='68' rx='6' fill='%23f8fafc'/><line x1='28' y1='44' x2='72' y2='44' stroke='%23cbd5e1' stroke-width='2'/><rect x='32' y='30' width='3' height='10' rx='1.5' fill='%2394a3b8'/><rect x='32' y='52' width='3' height='16' rx='1.5' fill='%2394a3b8'/></svg>"

        ac = db.query(Product).filter(Product.name == "Air Conditioner").first()
        if not ac:
            db.add(Product(
                name="Air Conditioner",
                sku="PRD-AC-01",
                category="Electronics",
                type="Goods",
                unit="Unit",
                sale_price=Decimal("25000.00"),
                purchase_price=Decimal("15000.00"),
                image_url=ac_img,
                is_active=True
            ))
        else:
            ac.category = "Electronics"
            ac.type = "Goods"
            ac.sale_price = Decimal("25000.00")
            ac.purchase_price = Decimal("15000.00")
            ac.image_url = ac_img

        fridge = db.query(Product).filter(Product.name == "Refrigerator").first()
        if not fridge:
            db.add(Product(
                name="Refrigerator",
                sku="PRD-FRIDGE-01",
                category="Electronics",
                type="Goods",
                unit="Unit",
                sale_price=Decimal("10000.00"),
                purchase_price=Decimal("7000.00"),
                image_url=fridge_img,
                is_active=True
            ))
        else:
            fridge.category = "Electronics"
            fridge.type = "Goods"
            fridge.sale_price = Decimal("10000.00")
            fridge.purchase_price = Decimal("7000.00")
            fridge.image_url = fridge_img

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