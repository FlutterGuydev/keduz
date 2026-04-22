from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import Category, Product, ProductColor, ProductImage, ProductSize


DEMO_CATEGORIES = [
    {
        "name_uz": "Krossovkalar",
        "name_ru": "Кроссовки",
        "slug": "krossovkalar",
        "image": "/demo/categories/krossovkalar.jpg",
        "sort_order": 10,
    },
    {
        "name_uz": "Futbolkalar",
        "name_ru": "Футболки",
        "slug": "futbolkalar",
        "image": "/demo/categories/futbolkalar.jpg",
        "sort_order": 20,
    },
    {
        "name_uz": "Jinslar",
        "name_ru": "Джинсы",
        "slug": "jinslar",
        "image": "/demo/categories/jinslar.jpg",
        "sort_order": 30,
    },
]


DEMO_PRODUCTS = [
    {
        "slug": "krossovkalar",
        "name_uz": "AeroRun Pro",
        "name_ru": "AeroRun Pro",
        "description_uz": "Yengil yugurish va kundalik kiyish uchun premium krossovka.",
        "description_ru": "Премиальные кроссовки для бега и повседневной носки.",
        "price": Decimal("899000"),
        "old_price": Decimal("1099000"),
        "discount_percent": 18,
        "gender": "unisex",
        "type": "shoe",
        "is_new": True,
        "cover_image": "/demo/products/aerorun-pro-cover.jpg",
        "in_stock": True,
        "sizes": [
            {"size": "40", "in_stock": True},
            {"size": "41", "in_stock": True},
            {"size": "42", "in_stock": True},
        ],
        "colors": [
            {"color_name": "Black / Red", "color_hex": "#111111"},
            {"color_name": "White", "color_hex": "#f7f7f7"},
        ],
        "images": [
            {"image_url": "/demo/products/aerorun-pro-1.jpg"},
            {"image_url": "/demo/products/aerorun-pro-2.jpg"},
        ],
    },
    {
        "slug": "futbolkalar",
        "name_uz": "CloudMotion LT",
        "name_ru": "CloudMotion LT",
        "description_uz": "Nafas oluvchi matodan tikilgan yengil lifestyle futbolka.",
        "description_ru": "Легкая lifestyle-футболка из дышащей ткани.",
        "price": Decimal("249000"),
        "old_price": Decimal("299000"),
        "discount_percent": 17,
        "gender": "men",
        "type": "clothing",
        "is_new": False,
        "cover_image": "/demo/products/cloudmotion-lt-cover.jpg",
        "in_stock": True,
        "sizes": [
            {"size": "M", "in_stock": True},
            {"size": "L", "in_stock": True},
            {"size": "XL", "in_stock": False},
        ],
        "colors": [
            {"color_name": "White", "color_hex": "#ffffff"},
            {"color_name": "Graphite", "color_hex": "#343434"},
        ],
        "images": [
            {"image_url": "/demo/products/cloudmotion-lt-1.jpg"},
            {"image_url": "/demo/products/cloudmotion-lt-2.jpg"},
        ],
    },
    {
        "slug": "krossovkalar",
        "name_uz": "SprintCore Pro",
        "name_ru": "SprintCore Pro",
        "description_uz": "Faol mashg'ulotlar uchun bardoshli va qulay sport modeli.",
        "description_ru": "Прочная и удобная спортивная модель для активных тренировок.",
        "price": Decimal("749000"),
        "old_price": Decimal("899000"),
        "discount_percent": 16,
        "gender": "women",
        "type": "shoe",
        "is_new": True,
        "cover_image": "/demo/products/sprintcore-pro-cover.jpg",
        "in_stock": True,
        "sizes": [
            {"size": "37", "in_stock": True},
            {"size": "38", "in_stock": True},
            {"size": "39", "in_stock": True},
        ],
        "colors": [
            {"color_name": "Ivory / Red", "color_hex": "#f4f0e8"},
            {"color_name": "Black", "color_hex": "#050505"},
        ],
        "images": [
            {"image_url": "/demo/products/sprintcore-pro-1.jpg"},
            {"image_url": "/demo/products/sprintcore-pro-2.jpg"},
        ],
    },
]


def get_or_create_category(db: Session, category_data: dict) -> Category:
    category = db.scalar(
        select(Category).where(Category.slug == category_data["slug"]),
    )
    if category:
        print(f"Category already exists: {category.name_uz}")
        return category

    category = Category(**category_data)
    db.add(category)
    db.flush()
    print(f"Category created: {category.name_uz}")
    return category


def create_product_if_missing(
    db: Session,
    product_data: dict,
    categories_by_slug: dict[str, Category],
) -> None:
    existing_product = db.scalar(
        select(Product).where(Product.name_uz == product_data["name_uz"]),
    )
    if existing_product:
        print(f"Product already exists: {product_data['name_uz']}")
        return

    category = categories_by_slug[product_data["slug"]]
    product = Product(
        category_id=category.id,
        name_uz=product_data["name_uz"],
        name_ru=product_data["name_ru"],
        description_uz=product_data["description_uz"],
        description_ru=product_data["description_ru"],
        price=product_data["price"],
        old_price=product_data["old_price"],
        discount_percent=product_data["discount_percent"],
        gender=product_data["gender"],
        type=product_data["type"],
        is_new=product_data["is_new"],
        cover_image=product_data["cover_image"],
        in_stock=product_data["in_stock"],
        sizes=[ProductSize(**size) for size in product_data["sizes"]],
        colors=[ProductColor(**color) for color in product_data["colors"]],
        images=[ProductImage(**image) for image in product_data["images"]],
    )
    db.add(product)
    print(f"Product created: {product.name_uz}")


def seed_demo_data() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        categories_by_slug = {
            category_data["slug"]: get_or_create_category(db, category_data)
            for category_data in DEMO_CATEGORIES
        }

        for product_data in DEMO_PRODUCTS:
            create_product_if_missing(db, product_data, categories_by_slug)

        db.commit()
        print("Demo data seed completed")


if __name__ == "__main__":
    seed_demo_data()
