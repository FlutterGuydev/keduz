from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.routers import admin_products, admin_uploads, auth, billz, categories, orders, products, store
from app.schema_compat import ensure_sqlite_schema_compat
from app.services.billz import repair_zero_billz_prices


settings = get_settings()

app = FastAPI(title=settings.app_name)
admin_uploads.UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=admin_uploads.UPLOAD_ROOT), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema_compat(engine)
    with SessionLocal() as db:
        repair_zero_billz_prices(db)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(billz.router)
app.include_router(admin_uploads.router)
app.include_router(admin_products.router)
app.include_router(store.router)
