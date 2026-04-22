from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db import get_db
from app.schemas import BillzBatchSyncResponse, BillzImportedProductRead, BillzSyncResponse, BillzSyncStatusResponse
from app.services.billz import (
    finalize_missing_products,
    get_billz_sync_status,
    list_imported_products,
    reset_billz_sync_cursor,
    run_full_sync,
    run_movement_sync,
    run_next_batch_sync,
    run_stock_sync,
    sync_products_from_billz,
    test_billz_auth,
)


router = APIRouter(
    prefix="/billz",
    tags=["billz"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/test-auth")
async def test_auth(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await test_billz_auth(db)


def _has_manual_description(product: Any) -> bool:
    return bool((product.description_uz or "").strip() or (product.description_ru or "").strip())


def _to_imported_product(product: Any) -> BillzImportedProductRead:
    return BillzImportedProductRead(
        id=product.id,
        imported_title=product.billz_title,
        website_title_uz=product.name_uz,
        website_title_ru=product.name_ru,
        billz_id=product.billz_id,
        billz_sku=product.billz_sku,
        stock_quantity=product.stock_quantity,
        price=product.price,
        old_price=product.old_price,
        is_active=product.is_active,
        is_published=product.is_published,
        in_stock=product.in_stock,
        sync_source=product.sync_source,
        last_synced_at=product.last_synced_at,
        has_manual_image=bool(product.cover_image or product.images),
        has_manual_description=_has_manual_description(product),
    )


@router.post("/sync/products", response_model=BillzSyncResponse)
async def sync_products(db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        return await sync_products_from_billz(db, mode="products")
    except Exception as exc:
        db.rollback()
        error_message = str(getattr(exc, "detail", exc))
        return {
            "success": False,
            "mode": "products",
            "message": "Products sync failed.",
            "error": error_message,
            "fetched": 0,
            "created": 0,
            "updated": 0,
            "attached_by_sku": 0,
            "marked_inactive": 0,
            "skipped": 0,
            "errors": [error_message],
        }


@router.post("/sync/stock", response_model=BillzSyncResponse)
async def sync_stock(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await run_stock_sync(db)


@router.post("/sync/movements", response_model=BillzSyncResponse)
async def sync_movements(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await run_movement_sync(db)


@router.post("/sync/full", response_model=BillzSyncResponse)
async def sync_full(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await run_full_sync(db)


@router.post("/sync/next-batch", response_model=BillzBatchSyncResponse)
async def sync_next_batch(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await run_next_batch_sync(db)


@router.post("/sync/reset-cursor", response_model=BillzSyncStatusResponse)
def sync_reset_cursor(db: Session = Depends(get_db)) -> dict[str, Any]:
    return reset_billz_sync_cursor(db)


@router.post("/sync/finalize-missing", response_model=BillzSyncResponse)
def sync_finalize_missing(db: Session = Depends(get_db)) -> dict[str, Any]:
    return finalize_missing_products(db)


@router.get("/sync/status", response_model=BillzSyncStatusResponse)
def sync_status(db: Session = Depends(get_db)) -> dict[str, Any]:
    return get_billz_sync_status(db)


@router.post("/products/sync", response_model=BillzSyncResponse, include_in_schema=False)
async def legacy_sync_products(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await sync_products(db)


@router.post("/categories/sync", include_in_schema=False)
async def legacy_sync_categories() -> dict[str, Any]:
    return {
        "success": True,
        "message": "BILLZ product sync is active. Category sync is managed manually in KED UZ admin.",
    }


@router.get("/imported-products", response_model=list[BillzImportedProductRead])
def imported_products(db: Session = Depends(get_db)) -> list[BillzImportedProductRead]:
    return [_to_imported_product(product) for product in list_imported_products(db)]
