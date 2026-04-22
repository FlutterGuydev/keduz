from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_admin
from app.db import get_db
from app.models import Category, InventoryMovement, Product, ProductImage
from app.schemas import (
    AdminImportedProductSummary,
    BillzImportedData,
    InventoryMovementRead,
    PaginatedInventoryMovementsResponse,
    PaginatedAdminImportedProductsResponse,
    ProductAdminContentUpdate,
    ProductAdminDetail,
    ProductAdminImagesUpdate,
    ProductStockSummary,
    ProductAdminStatusUpdate,
    ProductImageRead,
    ProductWebsiteContent,
)
from app.services.billz import calculate_product_stock_summary


router = APIRouter(
    prefix="/admin/products",
    tags=["admin products"],
    dependencies=[Depends(get_current_admin)],
)


load_options = (
    selectinload(Product.category),
    selectinload(Product.images),
    selectinload(Product.variants),
)


def get_admin_product_or_404(db: Session, product_id: int) -> Product:
    product = db.scalar(select(Product).where(Product.id == product_id).options(*load_options))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def ensure_category_exists(db: Session, category_id: int | None) -> None:
    if category_id is not None and db.get(Category, category_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")


def has_manual_description(product: Product) -> bool:
    return bool((product.description_uz or "").strip() or (product.description_ru or "").strip())


def to_admin_detail(product: Product) -> ProductAdminDetail:
    return ProductAdminDetail(
        id=product.id,
        imported=BillzImportedData(
            billz_id=product.billz_id,
            billz_sku=product.billz_sku,
            billz_title=product.billz_title,
            price=product.price,
            old_price=product.old_price,
            stock_quantity=product.stock_quantity,
            is_active=product.is_active,
            sync_source=product.sync_source,
            last_synced_at=product.last_synced_at,
        ),
        website=ProductWebsiteContent(
            category_id=product.category_id,
            name_uz=product.name_uz,
            name_ru=product.name_ru,
            description_uz=product.description_uz,
            description_ru=product.description_ru,
            cover_image=product.cover_image,
            featured=product.featured,
            show_in_banner=product.show_in_banner,
            is_published=product.is_published,
            slug=product.slug,
            images=[ProductImageRead.model_validate(image) for image in product.images],
        ),
        in_stock=product.in_stock,
        has_manual_image=bool(product.cover_image or product.images),
        has_manual_description=has_manual_description(product),
        category=product.category,
        variants=product.variants,
        created_at=product.created_at,
    )


def commit_or_400(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product content conflicts with an existing record",
        ) from exc


def _manual_image_expression():
    image_exists = exists(select(ProductImage.id).where(ProductImage.product_id == Product.id))
    has_cover = and_(Product.cover_image.is_not(None), func.trim(Product.cover_image) != "")
    return or_(has_cover, image_exists)


def _manual_description_expression():
    uz_description = func.trim(func.coalesce(Product.description_uz, ""))
    ru_description = func.trim(func.coalesce(Product.description_ru, ""))
    return or_(uz_description != "", ru_description != "")


@router.get("/imported", response_model=PaginatedAdminImportedProductsResponse)
def list_imported_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    only_active: bool | None = Query(default=None),
    only_published: bool | None = Query(default=None),
    only_missing_image: bool | None = Query(default=None),
    only_missing_description: bool | None = Query(default=None),
    only_in_stock: bool | None = Query(default=None),
    category_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PaginatedAdminImportedProductsResponse:
    has_manual_image = _manual_image_expression()
    has_manual_description = _manual_description_expression()
    filters = [Product.sync_source == "billz"]

    if search:
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Product.name_uz).like(term),
                func.lower(Product.name_ru).like(term),
                func.lower(func.coalesce(Product.billz_id, "")).like(term),
                func.lower(func.coalesce(Product.billz_title, "")).like(term),
                func.lower(func.coalesce(Product.billz_sku, "")).like(term),
                func.lower(func.coalesce(Product.slug, "")).like(term),
            )
        )
    if only_active is not None:
        filters.append(Product.is_active.is_(only_active))
    if only_published is not None:
        filters.append(Product.is_published.is_(only_published))
    if only_missing_image:
        filters.append(~has_manual_image)
    if only_missing_description:
        filters.append(~has_manual_description)
    if only_in_stock:
        filters.append(Product.stock_quantity > 0)
    if category_id is not None:
        filters.append(Product.category_id == category_id)

    total = db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    total_pages = ceil(total / page_size) if total else 0
    offset = (page - 1) * page_size

    rows = db.execute(
        select(
            Product.id,
            Product.billz_id,
            Product.billz_sku,
            Product.billz_title,
            Product.name_uz.label("website_title_uz"),
            Product.name_ru.label("website_title_ru"),
            Product.stock_quantity,
            Product.price,
            Product.old_price,
            Product.is_active,
            Product.is_published,
            Product.in_stock,
            has_manual_image.label("has_manual_image"),
            has_manual_description.label("has_manual_description"),
            Product.cover_image,
            Product.category_id,
            Category.name_uz.label("category_name_uz"),
            Product.featured,
            Product.show_in_banner,
            Product.last_synced_at,
        )
        .outerjoin(Category, Product.category_id == Category.id)
        .where(*filters)
        .order_by(Product.last_synced_at.desc().nullslast(), Product.id.desc())
        .offset(offset)
        .limit(page_size)
    ).mappings()

    return PaginatedAdminImportedProductsResponse(
        items=[AdminImportedProductSummary.model_validate(dict(row)) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{product_id}", response_model=ProductAdminDetail)
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductAdminDetail:
    return to_admin_detail(get_admin_product_or_404(db, product_id))


@router.get("/{product_id}/stock-summary", response_model=ProductStockSummary)
def get_product_stock_summary(product_id: int, db: Session = Depends(get_db)) -> dict:
    product = get_admin_product_or_404(db, product_id)
    return calculate_product_stock_summary(db, product)


@router.get("/{product_id}/movements", response_model=PaginatedInventoryMovementsResponse)
def list_product_movements(
    product_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> PaginatedInventoryMovementsResponse:
    product = get_admin_product_or_404(db, product_id)
    filters = [InventoryMovement.product_id == product.id]
    if product.billz_id:
        filters.append(InventoryMovement.billz_product_id == product.billz_id)
    if product.billz_sku:
        filters.append(InventoryMovement.article == product.billz_sku)

    query_filter = or_(*filters)
    total = db.scalar(select(func.count()).select_from(InventoryMovement).where(query_filter)) or 0
    total_pages = ceil(total / page_size) if total else 0
    rows = db.scalars(
        select(InventoryMovement)
        .where(query_filter)
        .order_by(InventoryMovement.movement_date.desc().nullslast(), InventoryMovement.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PaginatedInventoryMovementsResponse(
        items=[InventoryMovementRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.put("/{product_id}/content", response_model=ProductAdminDetail)
def update_product_content(
    product_id: int,
    payload: ProductAdminContentUpdate,
    db: Session = Depends(get_db),
) -> ProductAdminDetail:
    product = get_admin_product_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    ensure_category_exists(db, data.get("category_id"))

    for field, value in data.items():
        setattr(product, field, value)

    commit_or_400(db)
    db.refresh(product)
    return to_admin_detail(get_admin_product_or_404(db, product.id))


@router.put("/{product_id}/images", response_model=ProductAdminDetail)
def update_product_images(
    product_id: int,
    payload: ProductAdminImagesUpdate,
    db: Session = Depends(get_db),
) -> ProductAdminDetail:
    product = get_admin_product_or_404(db, product_id)
    if "cover_image" in payload.model_fields_set:
        product.cover_image = payload.cover_image
    product.images = [ProductImage(image_url=image.image_url) for image in payload.images]

    commit_or_400(db)
    db.refresh(product)
    return to_admin_detail(get_admin_product_or_404(db, product.id))


@router.put("/{product_id}/status", response_model=ProductAdminDetail)
def update_product_status(
    product_id: int,
    payload: ProductAdminStatusUpdate,
    db: Session = Depends(get_db),
) -> ProductAdminDetail:
    product = get_admin_product_or_404(db, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    commit_or_400(db)
    db.refresh(product)
    return to_admin_detail(get_admin_product_or_404(db, product.id))
