from fastapi import FastAPI

from app.api.users import router as users_router
from app.api.contacts import router as contacts_router


app = FastAPI(
    title="Urban Furniture Accounting System",
    description="Backend API for Urban Furniture accounting, sales, purchases, payments and reports.",
    version="1.0.0",
)


# Register API routes
app.include_router(users_router)
app.include_router(contacts_router)


@app.get("/")
def root():
    return {
        "message": "Urban Furniture Accounting System API is running",
        "version": "1.0.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }