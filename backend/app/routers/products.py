from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_admin
from app.db import get_db
from app.models import Category, Product, ProductColor, ProductImage, ProductSize
from app.product_sections import apply_section_slugs
from app.schemas import ProductCreate, ProductRead, ProductUpdate


router = APIRouter(
    prefix="/products",
    tags=["products"],
    dependencies=[Depends(get_current_admin)],
)


product_load_options = (
    selectinload(Product.category),
    selectinload(Product.images),
    selectinload(Product.sizes),
    selectinload(Product.colors),
)


def get_product_or_404(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(*product_load_options)
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def ensure_category_exists(db: Session, category_id: int | None) -> None:
    if category_id is not None and db.get(Category, category_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")


def apply_product_children(product: Product, payload: ProductCreate | ProductUpdate) -> None:
    data = payload.model_dump(exclude_unset=True)
    if "images" in data and data["images"] is not None:
        product.images = [ProductImage(**image) for image in data["images"]]
    if "sizes" in data and data["sizes"] is not None:
        product.sizes = [ProductSize(**size) for size in data["sizes"]]
    if "colors" in data and data["colors"] is not None:
        product.colors = [ProductColor(**color) for color in data["colors"]]


@router.get("", response_model=list[ProductRead])
def list_products(db: Session = Depends(get_db)) -> list[Product]:
    return list(
        db.scalars(
            select(Product)
            .options(*product_load_options)
            .order_by(Product.created_at.desc(), Product.id.desc())
        ).all()
    )


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    return get_product_or_404(db, product_id)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    ensure_category_exists(db, payload.category_id)
    data = payload.model_dump(exclude={"images", "sizes", "colors"})
    section_slugs = data.pop("section_slugs", None)
    product = Product(**data)
    if section_slugs is not None:
        apply_section_slugs(product, section_slugs)
    apply_product_children(product, payload)

    db.add(product)
    db.commit()
    db.refresh(product)
    return get_product_or_404(db, product.id)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
) -> Product:
    product = get_product_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True, exclude={"images", "sizes", "colors"})
    section_slugs = data.pop("section_slugs", None)

    if "category_id" in data and data["category_id"] is not None:
        ensure_category_exists(db, data["category_id"])

    for field, value in data.items():
        setattr(product, field, value)
    if section_slugs is not None:
        apply_section_slugs(product, section_slugs)

    apply_product_children(product, payload)
    db.commit()
    db.refresh(product)
    return get_product_or_404(db, product.id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> None:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()
