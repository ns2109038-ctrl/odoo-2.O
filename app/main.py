from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.contacts import router as contacts_router
from app.api.products import router as products_router
from app.api.accounts import router as accounts_router
from app.api.journals import router as journals_router
from app.api.journal_entries import router as journal_entries_router


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


app.include_router(auth_router, prefix="/api/auth")
app.include_router(auth_router, prefix="/auth", include_in_schema=False)
app.include_router(users_router, prefix="/api/users")
app.include_router(users_router, prefix="/users", include_in_schema=False)
app.include_router(contacts_router, prefix="/api/contacts")
app.include_router(contacts_router, prefix="/contacts", include_in_schema=False)
app.include_router(products_router, prefix="/api/products")
app.include_router(products_router, prefix="/products", include_in_schema=False)
app.include_router(accounts_router, prefix="/api")
app.include_router(accounts_router, prefix="", include_in_schema=False)
app.include_router(journals_router, prefix="/api")
app.include_router(journals_router, prefix="", include_in_schema=False)
app.include_router(journal_entries_router, prefix="/api")
app.include_router(journal_entries_router, prefix="", include_in_schema=False)


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