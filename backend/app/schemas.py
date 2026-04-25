from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field


OrderStatus = Literal["new", "contacted", "completed", "cancelled"]


class AdminLogin(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=72)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoryBase(BaseModel):
    name_uz: str = Field(min_length=1, max_length=160)
    name_ru: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180)
    image: str | None = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name_uz: str | None = Field(default=None, min_length=1, max_length=160)
    name_ru: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    image: str | None = None
    sort_order: int | None = None


class CategoryRead(CategoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductImageBase(BaseModel):
    image_url: str = Field(min_length=1, max_length=500)


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageRead(ProductImageBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProductSizeBase(BaseModel):
    size: str = Field(min_length=1, max_length=30)
    in_stock: bool = True


class ProductSizeCreate(ProductSizeBase):
    pass


class ProductSizeRead(ProductSizeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProductColorBase(BaseModel):
    color_name: str = Field(min_length=1, max_length=80)
    color_hex: str | None = Field(default=None, max_length=20)


class ProductColorCreate(ProductColorBase):
    pass


class ProductColorRead(ProductColorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProductVariantRead(BaseModel):
    id: int
    size: str
    sku: str | None = None
    price: Decimal
    stock_quantity: int
    stock_by_store: list[dict] | None = Field(default_factory=list)
    movement_history: list[dict] | None = Field(default_factory=list)
    created_at: datetime

    @computed_field
    @property
    def total_stock(self) -> int:
        return self.stock_quantity

    @computed_field
    @property
    def in_stock(self) -> bool:
        return self.stock_quantity > 0

    model_config = ConfigDict(from_attributes=True)


class StorefrontProductVariantRead(BaseModel):
    id: int
    size: str
    sku: str | None = None
    price: Decimal
    stock_quantity: int
    created_at: datetime

    @computed_field
    @property
    def total_stock(self) -> int:
        return self.stock_quantity

    @computed_field
    @property
    def in_stock(self) -> bool:
        return self.stock_quantity > 0

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    category_id: int | None = None
    name_uz: str = Field(min_length=1, max_length=220)
    name_ru: str = Field(min_length=1, max_length=220)
    description_uz: str | None = None
    description_ru: str | None = None
    price: Decimal = Field(ge=0)
    old_price: Decimal | None = Field(default=None, ge=0)
    discount_percent: int | None = Field(default=None, ge=0, le=100)
    gender: str | None = Field(default=None, max_length=40)
    type: str | None = Field(default=None, max_length=60)
    is_new: bool = False
    section_slugs: list[str] | None = Field(default_factory=list)
    cover_image: str | None = None
    in_stock: bool = True
    stock_quantity: int = Field(default=0, ge=0)
    is_active: bool = True
    is_published: bool = False
    featured: bool = False
    show_in_banner: bool = False
    slug: str | None = Field(default=None, max_length=220)
    billz_id: str | None = None
    billz_sku: str | None = None
    billz_title: str | None = None
    sync_source: str = "manual"
    last_synced_at: datetime | None = None


class ProductCreate(ProductBase):
    images: list[ProductImageCreate] = Field(default_factory=list)
    sizes: list[ProductSizeCreate] = Field(default_factory=list)
    colors: list[ProductColorCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    category_id: int | None = None
    name_uz: str | None = Field(default=None, min_length=1, max_length=220)
    name_ru: str | None = Field(default=None, min_length=1, max_length=220)
    description_uz: str | None = None
    description_ru: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    old_price: Decimal | None = Field(default=None, ge=0)
    discount_percent: int | None = Field(default=None, ge=0, le=100)
    gender: str | None = Field(default=None, max_length=40)
    type: str | None = Field(default=None, max_length=60)
    is_new: bool | None = None
    section_slugs: list[str] | None = None
    cover_image: str | None = None
    in_stock: bool | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_published: bool | None = None
    featured: bool | None = None
    show_in_banner: bool | None = None
    slug: str | None = Field(default=None, max_length=220)
    images: list[ProductImageCreate] | None = None
    sizes: list[ProductSizeCreate] | None = None
    colors: list[ProductColorCreate] | None = None


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    images: list[ProductImageRead] = Field(default_factory=list)
    sizes: list[ProductSizeRead] = Field(default_factory=list)
    colors: list[ProductColorRead] = Field(default_factory=list)
    category: CategoryRead | None = None

    model_config = ConfigDict(from_attributes=True)


class OrderRead(BaseModel):
    id: int
    full_name: str
    phone: str
    product_id: int | None = None
    product_title: str | None = None
    selected_size: str | None
    selected_color: str | None
    price: Decimal | None = None
    quantity: int
    status: OrderStatus
    created_at: datetime
    product: ProductRead | None = None

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=180)
    phone: str = Field(min_length=5, max_length=40)
    product_id: int | None = None
    product_title: str | None = Field(default=None, max_length=500)
    selected_size: str | None = Field(default=None, max_length=30)
    selected_color: str | None = Field(default=None, max_length=80)
    price: Decimal | None = Field(default=None, ge=0)
    quantity: int = Field(default=1, ge=1, le=20)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class BillzImportedData(BaseModel):
    billz_id: str | None = None
    billz_sku: str | None = None
    billz_title: str | None = None
    price: Decimal = Field(ge=0)
    old_price: Decimal | None = Field(default=None, ge=0)
    stock_quantity: int = Field(ge=0)
    is_active: bool
    sync_source: str
    last_synced_at: datetime | None = None


class ProductWebsiteContent(BaseModel):
    category_id: int | None = None
    name_uz: str
    name_ru: str
    description_uz: str | None = None
    description_ru: str | None = None
    cover_image: str | None = None
    featured: bool
    show_in_banner: bool
    is_published: bool
    slug: str | None = None
    section_slugs: list[str] = Field(default_factory=list)
    images: list[ProductImageRead] = Field(default_factory=list)


class ProductAdminDetail(BaseModel):
    id: int
    imported: BillzImportedData
    website: ProductWebsiteContent
    in_stock: bool
    has_manual_image: bool
    has_manual_description: bool
    category: CategoryRead | None = None
    variants: list[ProductVariantRead] = Field(default_factory=list)
    created_at: datetime


class AdminImportedProductSummary(BaseModel):
    id: int
    billz_id: str | None = None
    billz_sku: str | None = None
    billz_title: str | None = None
    website_title_uz: str
    website_title_ru: str
    stock_quantity: int
    price: Decimal
    old_price: Decimal | None = None
    is_active: bool
    is_published: bool
    in_stock: bool
    has_manual_image: bool
    has_manual_description: bool
    cover_image: str | None = None
    category_id: int | None = None
    category_name_uz: str | None = None
    featured: bool
    show_in_banner: bool
    last_synced_at: datetime | None = None
    section_slugs: list[str] = Field(default_factory=list)


class InventoryMovementRead(BaseModel):
    id: int
    product_id: int | None = None
    billz_product_id: str | None = None
    article: str | None = None
    title: str | None = None
    size: str | None = None
    store_name: str | None = None
    movement_type: str
    quantity: int
    signed_quantity: int
    movement_date: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductStockStoreSummary(BaseModel):
    store_name: str
    stock_quantity: int


class ProductStockSummary(BaseModel):
    product_id: int
    article: str | None = None
    title: str | None = None
    size: str | None = None
    stores: list[ProductStockStoreSummary] = Field(default_factory=list)
    total_stock: int = 0


class PaginatedInventoryMovementsResponse(BaseModel):
    items: list[InventoryMovementRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedAdminImportedProductsResponse(BaseModel):
    items: list[AdminImportedProductSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


ProductAdminListItem = AdminImportedProductSummary
ProductAdminListPage = PaginatedAdminImportedProductsResponse


class ProductAdminContentUpdate(BaseModel):
    category_id: int | None = None
    name_uz: str | None = Field(default=None, min_length=1, max_length=220)
    name_ru: str | None = Field(default=None, min_length=1, max_length=220)
    description_uz: str | None = None
    description_ru: str | None = None
    cover_image: str | None = Field(default=None, max_length=500)
    featured: bool | None = None
    show_in_banner: bool | None = None
    is_published: bool | None = None
    slug: str | None = Field(default=None, max_length=220)
    section_slugs: list[str] | None = None


class ProductAdminImagesUpdate(BaseModel):
    cover_image: str | None = Field(default=None, max_length=500)
    images: list[ProductImageCreate] = Field(default_factory=list)


class ProductAdminStatusUpdate(BaseModel):
    is_active: bool | None = None
    featured: bool | None = None
    show_in_banner: bool | None = None
    is_published: bool | None = None


class BillzSyncResponse(BaseModel):
    success: bool
    mode: str
    message: str | None = None
    error: str | None = None
    fetched: int = 0
    created: int = 0
    updated: int = 0
    attached_by_sku: int = 0
    marked_inactive: int = 0
    skipped: int = 0
    errors: list[str] = Field(default_factory=list)


class BillzBatchSyncResponse(BillzSyncResponse):
    fetched_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    next_offset: int = 0
    has_more: bool = True
    batch_size: int = 200


class BillzSyncStatusResponse(BaseModel):
    last_full_sync_at: datetime | None = None
    last_stock_sync_at: datetime | None = None
    last_sync_status: str | None = None
    last_sync_message: str | None = None
    products_created: int = 0
    products_updated: int = 0
    products_marked_inactive: int = 0
    last_offset: int = 0
    batch_size: int = 200
    has_more: bool = True
    active_cycle_id: str | None = None


class BillzImportedProductRead(BaseModel):
    id: int
    imported_title: str | None = None
    website_title_uz: str
    website_title_ru: str
    billz_id: str | None = None
    billz_sku: str | None = None
    stock_quantity: int
    price: Decimal
    old_price: Decimal | None = None
    is_active: bool
    is_published: bool = False
    in_stock: bool
    sync_source: str
    last_synced_at: datetime | None = None
    has_manual_image: bool
    has_manual_description: bool


class StorefrontCategoryInfo(BaseModel):
    id: int
    name_uz: str
    name_ru: str
    slug: str


class StorefrontCategorySummary(StorefrontCategoryInfo):
    image: str | None = None
    sort_order: int = 0


class StorefrontProductSummary(BaseModel):
    id: int
    name_uz: str
    name_ru: str
    billz_title: str | None = None
    billz_sku: str | None = None
    slug: str | None = None
    image: str | None = None
    cover_image: str | None = None
    price: Decimal
    old_price: Decimal | None = None
    discount_percent: int | None = None
    stock_quantity: int
    in_stock: bool
    is_new: bool
    featured: bool
    gender: str | None = None
    type: str | None = None
    section_slugs: list[str] = Field(default_factory=list)
    category_id: int | None = None
    category_name_uz: str | None = None
    category_name_ru: str | None = None


class PaginatedStorefrontProductsResponse(BaseModel):
    items: list[StorefrontProductSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class StorefrontProductDetail(BaseModel):
    id: int
    name_uz: str
    name_ru: str
    billz_title: str | None = None
    billz_sku: str | None = None
    slug: str | None = None
    image: str | None = None
    description_uz: str | None = None
    description_ru: str | None = None
    cover_image: str | None = None
    images: list[ProductImageRead] = Field(default_factory=list)
    price: Decimal
    old_price: Decimal | None = None
    discount_percent: int | None = None
    stock_quantity: int
    in_stock: bool
    is_new: bool
    featured: bool
    gender: str | None = None
    type: str | None = None
    section_slugs: list[str] = Field(default_factory=list)
    category: StorefrontCategoryInfo | None = None
    sizes: list[ProductSizeRead] = Field(default_factory=list)
    colors: list[ProductColorRead] = Field(default_factory=list)
    variants: list[StorefrontProductVariantRead] = Field(default_factory=list)
