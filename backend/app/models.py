from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name_uz: Mapped[str] = mapped_column(String(160), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    products: Mapped[list["Product"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    name_uz: Mapped[str] = mapped_column(String(220), nullable=False)
    name_ru: Mapped[str] = mapped_column(String(220), nullable=False)
    description_uz: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(40), nullable=True)
    type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    section_slugs: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_in_banner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    slug: Mapped[str | None] = mapped_column(String(220), unique=True, index=True, nullable=True)
    billz_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    billz_sku: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    billz_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    billz_raw_json: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    billz_last_seen_cycle_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    sync_source: Mapped[str] = mapped_column(String(40), default="manual", nullable=False, index=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    category: Mapped[Category | None] = relationship(back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
    sizes: Mapped[list["ProductSize"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
    colors: Mapped[list["ProductColor"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
    inventory_movements: Mapped[list["InventoryMovement"]] = relationship(back_populates="product")
    orders: Mapped[list["Order"]] = relationship(back_populates="product")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True, index=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)

    product: Mapped[Product] = relationship(back_populates="images")


class ProductSize(Base):
    __tablename__ = "product_sizes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    size: Mapped[str] = mapped_column(String(30), nullable=False)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped[Product] = relationship(back_populates="sizes")


class ProductColor(Base):
    __tablename__ = "product_colors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    color_name: Mapped[str] = mapped_column(String(80), nullable=False)
    color_hex: Mapped[str | None] = mapped_column(String(20), nullable=True)

    product: Mapped[Product] = relationship(back_populates="colors")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    size: Mapped[str] = mapped_column(String(80), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_by_store: Mapped[list | None] = mapped_column(JSON, nullable=True)
    movement_history: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped[Product] = relationship(back_populates="variants")


class BillzSyncState(Base):
    __tablename__ = "billz_sync_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    last_full_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_stock_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_sync_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    products_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    products_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    products_marked_inactive: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    batch_size: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    has_more: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    active_cycle_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class BillzAuth(Base):
    __tablename__ = "billz_auth"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True, index=True)
    billz_movement_id: Mapped[str | None] = mapped_column(String(160), nullable=True, unique=True, index=True)
    source_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    billz_product_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    article: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    size: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    store_name: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    movement_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    signed_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    movement_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    raw_json: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped[Product | None] = relationship(back_populates="inventory_movements")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(180), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True, index=True)
    product_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    selected_size: Mapped[str | None] = mapped_column(String(30), nullable=True)
    selected_color: Mapped[str | None] = mapped_column(String(80), nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped[Product | None] = relationship(back_populates="orders")
