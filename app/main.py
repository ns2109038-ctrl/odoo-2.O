from fastapi import FastAPI

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


app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(products_router)
app.include_router(accounts_router)
app.include_router(journals_router)
app.include_router(journal_entries_router)


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