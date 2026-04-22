import logging
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_admin
from app.config import settings
from app.db import get_db
from app.models import Order, Product, ProductVariant
from app.schemas import OrderCreate, OrderRead, OrderStatusUpdate


logger = logging.getLogger(__name__)
BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = BACKEND_ROOT / "uploads"

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
)


order_load_options = (
    selectinload(Order.product).selectinload(Product.category),
    selectinload(Order.product).selectinload(Product.images),
    selectinload(Order.product).selectinload(Product.sizes),
    selectinload(Order.product).selectinload(Product.colors),
    selectinload(Order.product).selectinload(Product.variants),
)


def get_order_or_404(db: Session, order_id: int) -> Order:
    order = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(*order_load_options)
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def get_selected_variant(product: Product | None, selected_size: str | None) -> ProductVariant | None:
    if product is None or not selected_size:
        return None

    selected = selected_size.strip().lower()
    return next(
        (
            variant
            for variant in product.variants
            if variant.size and variant.size.strip().lower() == selected
        ),
        None,
    )


def get_product_article(product: Product | None, selected_size: str | None = None) -> str:
    if product is None:
        return "-"
    selected_variant = get_selected_variant(product, selected_size)
    if selected_variant and selected_variant.sku:
        return selected_variant.sku
    return product.billz_sku or product.billz_id or "-"


def get_product_image(product: Product | None) -> str | None:
    if product is None:
        return None
    if product.cover_image:
        return product.cover_image
    if product.images:
        return product.images[0].image_url
    return None


def resolve_local_upload_path(image_url: str | None) -> Path | None:
    if not image_url:
        return None
    normalized = image_url.strip()
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return None
    if normalized.startswith("/uploads/"):
        relative_path = normalized.removeprefix("/uploads/")
        path = UPLOAD_ROOT.joinpath(*Path(relative_path).parts)
    elif normalized.startswith("uploads/"):
        relative_path = normalized.removeprefix("uploads/")
        path = UPLOAD_ROOT.joinpath(*Path(relative_path).parts)
    else:
        return None
    try:
        resolved_path = path.resolve()
        upload_root = UPLOAD_ROOT.resolve()
    except OSError:
        return None
    if upload_root not in resolved_path.parents and resolved_path != upload_root:
        return None
    return resolved_path if resolved_path.is_file() else None


async def send_to_telegram(text: str, image_url: str | None = None) -> None:
    token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    if not token or not chat_id:
        logger.info("Telegram order notification skipped: missing token or chat id")
        return

    message_url = f"https://api.telegram.org/bot{token}/sendMessage"
    photo_url = f"https://api.telegram.org/bot{token}/sendPhoto"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if image_url:
                try:
                    local_path = resolve_local_upload_path(image_url)
                    if local_path:
                        with local_path.open("rb") as image_file:
                            response = await client.post(
                                photo_url,
                                data={"chat_id": chat_id, "caption": text},
                                files={"photo": (local_path.name, image_file, "application/octet-stream")},
                            )
                    else:
                        response = await client.post(
                            photo_url,
                            json={"chat_id": chat_id, "photo": image_url, "caption": text},
                        )
                    response.raise_for_status()
                    logger.info("Telegram order photo notification sent to chat_id=%s", chat_id)
                    return
                except httpx.HTTPError as exc:
                    logger.warning("Telegram photo send failed, falling back to text: %s", exc)

            response = await client.post(message_url, json={"chat_id": chat_id, "text": text})
            response.raise_for_status()
            logger.info("Telegram order notification sent to chat_id=%s", chat_id)
    except httpx.HTTPError as exc:
        logger.warning("Telegram order notification failed: %s", exc)
    except Exception:
        logger.exception("Unexpected Telegram order notification error")


def format_order_message(order: Order, product: Product | None = None) -> str:
    size = order.selected_size or "-"
    color = order.selected_color or "-"
    price = order.price if order.price is not None else 0
    article = get_product_article(product, order.selected_size)
    billz_id = product.billz_id if product and product.billz_id else "-"
    local_id = order.product_id or "-"
    return (
        "🆕 YANGI BUYURTMA\n\n"
        f"🆔 Product ID: {local_id}\n"
        f"🏷 Artikul ID: {article}\n"
        f"🔗 BILLZ ID: {billz_id}\n\n"
        f"👟 Mahsulot: {order.product_title}\n"
        f"📏 Razmer: {size}\n"
        f"🎨 Rang: {color}\n"
        f"📦 Soni: {order.quantity}\n"
        f"💰 Narx: {price} UZS\n\n"
        f"👤 Ism: {order.full_name}\n"
        f"📞 Telefon: {order.phone}"
    )


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Order:
    product = (
        db.scalar(
            select(Product)
            .where(Product.id == payload.product_id)
            .options(
                selectinload(Product.images),
                selectinload(Product.variants),
            )
        )
        if payload.product_id is not None
        else None
    )
    if payload.product_id is not None and (
        product is None or not product.is_active or not product.is_published
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product_title = payload.product_title.strip() if payload.product_title else None
    if not product_title and product:
        product_title = product.name_ru or product.name_uz or product.billz_title
    if not product_title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="product_title is required")
    price = payload.price if payload.price is not None else (product.price if product else None)

    order = Order(
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        product_id=product.id if product else None,
        product_title=product_title,
        selected_size=payload.selected_size,
        selected_color=payload.selected_color,
        price=price,
        quantity=payload.quantity,
        status="new",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    background_tasks.add_task(send_to_telegram, format_order_message(order, product), get_product_image(product))
    return get_order_or_404(db, order.id)


@router.get("", response_model=list[OrderRead])
def list_orders(
    _: object = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Order]:
    return list(
        db.scalars(
            select(Order)
            .options(*order_load_options)
            .order_by(Order.created_at.desc(), Order.id.desc())
        ).all()
    )


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    _: object = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Order:
    return get_order_or_404(db, order_id)


@router.put("/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    _: object = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Order:
    order = get_order_or_404(db, order_id)
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return get_order_or_404(db, order.id)
