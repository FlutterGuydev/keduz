from decimal import Decimal
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Category, Product
from app.schemas import (
    PaginatedStorefrontProductsResponse,
    ProductColorRead,
    ProductImageRead,
    ProductSizeRead,
    StorefrontCategorySummary,
    StorefrontCategoryInfo,
    StorefrontProductDetail,
    StorefrontProductSummary,
    StorefrontProductVariantRead,
)


router = APIRouter(prefix="/store/products", tags=["store products"])


def _display_name(value: str | None, fallback: str | None) -> str:
    cleaned = (value or "").strip()
    if cleaned:
        return cleaned
    return (fallback or "").strip()


def _storefront_filters(
    *,
    search: str | None,
    category_id: int | None,
    gender: str | None,
    product_type: str | None,
    featured: bool | None,
    only_new: bool | None,
    only_in_stock: bool | None,
    min_price: Decimal | None,
    max_price: Decimal | None,
) -> list:
    filters = [Product.is_active.is_(True), Product.is_published.is_(True)]

    if search:
        term = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Product.name_uz).like(term),
                func.lower(Product.name_ru).like(term),
                func.lower(func.coalesce(Product.slug, "")).like(term),
                func.lower(func.coalesce(Product.billz_title, "")).like(term),
            )
        )
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if gender:
        filters.append(func.lower(func.coalesce(Product.gender, "")) == gender.strip().lower())
    if product_type:
        filters.append(func.lower(func.coalesce(Product.type, "")) == product_type.strip().lower())
    if featured is not None:
        filters.append(Product.featured.is_(featured))
    if only_new is not None:
        filters.append(Product.is_new.is_(only_new))
    if only_in_stock:
        filters.append(Product.stock_quantity > 0)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)

    return filters


def _order_by(sort: str | None):
    if sort in (None, "", "popular"):
        return (Product.id.desc(),)
    if sort == "newest":
        return (Product.created_at.desc(), Product.id.desc())
    if sort == "price_asc":
        return (Product.price.asc(), Product.id.desc())
    if sort == "price_desc":
        return (Product.price.desc(), Product.id.desc())
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid sort. Use newest, price_asc, price_desc, or popular.",
    )


@router.get("/categories", response_model=list[StorefrontCategorySummary])
def list_storefront_categories(db: Session = Depends(get_db)) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all())


@router.get("", response_model=PaginatedStorefrontProductsResponse)
def list_storefront_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    category_id: int | None = Query(default=None),
    gender: str | None = Query(default=None),
    type: str | None = Query(default=None),
    featured: bool | None = Query(default=None),
    only_new: bool | None = Query(default=None),
    only_in_stock: bool | None = Query(default=None),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    sort: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PaginatedStorefrontProductsResponse:
    filters = _storefront_filters(
        search=search,
        category_id=category_id,
        gender=gender,
        product_type=type,
        featured=featured,
        only_new=only_new,
        only_in_stock=only_in_stock,
        min_price=min_price,
        max_price=max_price,
    )

    total = db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    total_pages = ceil(total / page_size) if total else 0
    offset = (page - 1) * page_size

    rows = db.execute(
        select(
            Product.id,
            Product.name_uz,
            Product.name_ru,
            Product.billz_title,
            Product.billz_sku,
            Product.slug,
            Product.cover_image,
            Product.price,
            Product.old_price,
            Product.discount_percent,
            Product.stock_quantity,
            (Product.stock_quantity > 0).label("in_stock"),
            Product.is_new,
            Product.featured,
            Product.gender,
            Product.type,
            Product.category_id,
            Category.name_uz.label("category_name_uz"),
            Category.name_ru.label("category_name_ru"),
        )
        .outerjoin(Category, Product.category_id == Category.id)
        .where(*filters)
        .order_by(*_order_by(sort))
        .offset(offset)
        .limit(page_size)
    ).mappings()

    items = []
    for row in rows:
        data = dict(row)
        fallback = data.pop("billz_title")
        data["billz_title"] = fallback
        data["name_uz"] = _display_name(data.get("name_uz"), fallback)
        data["name_ru"] = _display_name(data.get("name_ru"), fallback)
        data["image"] = data.get("cover_image")
        items.append(StorefrontProductSummary.model_validate(data))

    return PaginatedStorefrontProductsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _to_storefront_detail(product: Product) -> StorefrontProductDetail:
    category = None
    if product.category is not None:
        category = StorefrontCategoryInfo(
            id=product.category.id,
            name_uz=product.category.name_uz,
            name_ru=product.category.name_ru,
            slug=product.category.slug,
        )

    return StorefrontProductDetail(
        id=product.id,
        name_uz=_display_name(product.name_uz, product.billz_title),
        name_ru=_display_name(product.name_ru, product.billz_title),
        billz_title=product.billz_title,
        billz_sku=product.billz_sku,
        slug=product.slug,
        image=product.cover_image,
        description_uz=product.description_uz,
        description_ru=product.description_ru,
        cover_image=product.cover_image,
        images=[ProductImageRead.model_validate(image) for image in product.images],
        price=product.price,
        old_price=product.old_price,
        discount_percent=product.discount_percent,
        stock_quantity=product.stock_quantity,
        in_stock=product.stock_quantity > 0,
        is_new=product.is_new,
        featured=product.featured,
        gender=product.gender,
        type=product.type,
        category=category,
        sizes=[ProductSizeRead.model_validate(size) for size in product.sizes],
        colors=[ProductColorRead.model_validate(color) for color in product.colors],
        variants=[StorefrontProductVariantRead.model_validate(variant) for variant in product.variants],
    )


def _storefront_product_query():
    return select(Product).where(Product.is_active.is_(True), Product.is_published.is_(True)).options(
        selectinload(Product.category),
        selectinload(Product.images),
        selectinload(Product.sizes),
        selectinload(Product.colors),
        selectinload(Product.variants),
    )


@router.get("/slug/{slug}", response_model=StorefrontProductDetail)
def get_storefront_product_by_slug(slug: str, db: Session = Depends(get_db)) -> StorefrontProductDetail:
    product = db.scalar(_storefront_product_query().where(Product.slug == slug))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _to_storefront_detail(product)


@router.get("/{product_id}", response_model=StorefrontProductDetail)
def get_storefront_product(product_id: int, db: Session = Depends(get_db)) -> StorefrontProductDetail:
    product = db.scalar(_storefront_product_query().where(Product.id == product_id))
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _to_storefront_detail(product)
