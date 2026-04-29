from __future__ import annotations

import logging
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.models import BillzAuth, BillzSyncState, Category, InventoryMovement, Product, ProductVariant


logger = logging.getLogger(__name__)
SYNC_STATE_ID = 1
DEFAULT_BATCH_SIZE = 200
_BILLZ_PRODUCT_DEBUG_PRINTED = False


@dataclass(frozen=True)
class NormalizedBillzVariant:
    size: str
    sku: str | None
    price: Decimal
    stock_quantity: int
    stock_by_store: tuple[dict[str, Any], ...] = ()
    movement_history: tuple[dict[str, Any], ...] = ()


@dataclass(frozen=True)
class NormalizedBillzProduct:
    billz_id: str | None
    sku: str | None
    title: str
    price: Decimal
    old_price: Decimal | None
    stock_quantity: int
    is_active: bool
    raw: dict[str, Any]
    parent_id: str | None = None
    variants: tuple[NormalizedBillzVariant, ...] = ()


@dataclass(frozen=True)
class BillzProductFetchResult:
    products: list[NormalizedBillzProduct]
    complete: bool
    expected_count: int | None
    raw_count: int = 0


@dataclass(frozen=True)
class NormalizedBillzMovement:
    billz_movement_id: str | None
    billz_product_id: str | None
    article: str | None
    title: str | None
    size: str | None
    store_name: str
    movement_type: str
    quantity: int
    signed_quantity: int
    movement_date: datetime | None
    raw: dict[str, Any]
    source_hash: str


def _ensure_billz_config() -> None:
    missing = []
    if not settings.billz_api_url:
        missing.append("BILLZ_API_URL")
    if not settings.billz_token and not settings.billz_secret_key:
        missing.append("BILLZ_TOKEN or BILLZ_SECRET")

    if missing:
        raise HTTPException(status_code=503, detail=f"BILLZ config missing: {', '.join(missing)}")


def _billz_url(endpoint: str) -> str:
    normalized_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
    return f"{settings.billz_api_url.rstrip('/')}{normalized_endpoint}"


def _preview_response_body(text: str, *, limit: int = 600) -> str:
    compact = " ".join((text or "").split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}..."


def _billz_http_error_message(status_code: int, body: str, *, auth: bool = False) -> str:
    body_preview = _preview_response_body(body, limit=300)
    if status_code in {401, 403}:
        return "BILLZ secret invalid" if auth else "BILLZ token invalid"
    if status_code == 404:
        return f"BILLZ endpoint not found. Check BILLZ_PRODUCTS_ENDPOINT. Response: {body_preview}"
    if status_code in {400, 422}:
        return f"BILLZ request rejected. Check endpoint, method, and pagination cursor. Response: {body_preview}"
    if 500 <= status_code:
        return f"BILLZ API server error {status_code}. Response: {body_preview}"
    return f"BILLZ HTTP error {status_code}. Response: {body_preview}"


def _pick(data: dict[str, Any], paths: tuple[tuple[str, ...], ...]) -> Any:
    for path in paths:
        current: Any = data
        for key in path:
            if not isinstance(current, dict) or key not in current:
                current = None
                break
            current = current[key]
        if current not in (None, ""):
            return current
    return None


def _to_decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    if value in (None, ""):
        return default
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return max(int(Decimal(str(value))), 0)
    except (InvalidOperation, ValueError):
        return default


def _to_signed_int(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return int(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return default


def _to_bool(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() not in {"false", "0", "inactive", "deleted", "archived", "no"}
    return default


def _sum_measurement_values(items: Any, keys: tuple[str, ...]) -> int:
    if not isinstance(items, list):
        return 0
    total = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in keys:
            if key in item:
                total += _to_int(item.get(key))
                break
    return total


def _store_name_from_stock_item(item: dict[str, Any], index: int) -> str:
    value = _pick(
        item,
        (
            ("store_name",),
            ("shop_name",),
            ("warehouse_name",),
            ("filial_name",),
            ("branch_name",),
            ("name",),
            ("store", "name"),
            ("shop", "name"),
            ("warehouse", "name"),
            ("filial", "name"),
            ("branch", "name"),
        ),
    )
    return str(value or f"Store {index + 1}").strip()


def _extract_stock_by_store(raw: dict[str, Any]) -> list[dict[str, Any]]:
    source = raw.get("product_supplier_stock")
    if not isinstance(source, list):
        source = raw.get("shop_measurement_values")
    if not isinstance(source, list):
        return []

    rows: list[dict[str, Any]] = []
    for index, item in enumerate(source):
        if not isinstance(item, dict):
            continue
        total = 0
        found_stock_key = False
        for key in ("measurement_value", "active_measurement_value", "stock_quantity", "quantity", "balance"):
            if key in item:
                total = _to_int(item.get(key))
                found_stock_key = True
                break
        if not found_stock_key:
            continue
        rows.append(
            {
                "store_name": _store_name_from_stock_item(item, index),
                "stock_quantity": total,
            }
        )
    return rows


def _extract_movement_history(raw: dict[str, Any]) -> list[dict[str, Any]]:
    for key in (
        "movement_history",
        "stock_movements",
        "movements",
        "product_movements",
        "inventory_movements",
        "product_supplier_movements",
    ):
        value = raw.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _first_decimal_from_list(items: Any, keys: tuple[str, ...]) -> Decimal | None:
    if not isinstance(items, list):
        return None
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in keys:
            value = item.get(key)
            decimal_value = _to_decimal(value, default=Decimal("-1"))
            if decimal_value >= 0:
                return decimal_value
    return None


def extract_price(product: dict[str, Any]) -> Decimal:
    direct_price = product.get("sale_price") or product.get("price")
    if direct_price not in (None, ""):
        parsed_direct_price = _to_decimal(direct_price)
        if parsed_direct_price > 0:
            return parsed_direct_price

    shop_prices = product.get("shop_prices")
    if isinstance(shop_prices, list) and shop_prices:
        first_shop_price = shop_prices[0]
        if isinstance(first_shop_price, dict):
            price = (
                first_shop_price.get("sale_price")
                or first_shop_price.get("promo_price")
                or first_shop_price.get("retail_price")
                or first_shop_price.get("price")
            )
            if price not in (None, ""):
                return _to_decimal(price)

    variants = product.get("variants")
    if isinstance(variants, list) and variants:
        first_variant = variants[0]
        if isinstance(first_variant, dict):
            variant_price = extract_price(first_variant)
            if variant_price > 0:
                return variant_price
            price = first_variant.get("price") or first_variant.get("sale_price") or first_variant.get("retail_price")
            if price not in (None, ""):
                return _to_decimal(price)

    return _to_decimal(
        _pick(
            product,
            (
                ("price",),
                ("sale_price",),
                ("retail_price",),
                ("selling_price",),
                ("prices", "price"),
            ),
        )
    )


def _extract_size(raw: dict[str, Any], title: str | None = None) -> str | None:
    attributes = raw.get("product_attributes")
    if isinstance(attributes, list):
        fallback_value: str | None = None
        for attribute in attributes:
            if not isinstance(attribute, dict):
                continue
            name = str(attribute.get("attribute_name") or "").strip().lower()
            value = attribute.get("attribute_value") or attribute.get("value") or attribute.get("name")
            if value in (None, ""):
                continue
            value = str(value).strip()
            if fallback_value is None:
                fallback_value = value
            if "size" in name or "размер" in name or "o'lcham" in name or "olcham" in name:
                return value
        if fallback_value:
            return fallback_value

    if title and "/" in title:
        maybe_size = title.rsplit("/", 1)[-1].strip()
        if maybe_size:
            return maybe_size
    return None


def _extract_variant(raw: dict[str, Any], *, fallback_title: str, fallback_price: Decimal, fallback_stock: int) -> NormalizedBillzVariant:
    price = (
        _first_decimal_from_list(raw.get("shop_prices"), ("sale_price", "promo_price", "retail_price", "price"))
        or _first_decimal_from_list(raw.get("product_supplier_stock"), ("retail_price", "price"))
        or extract_price(raw)
        or fallback_price
    )
    stock_by_store = _extract_stock_by_store(raw)
    if stock_by_store:
        stock = sum(item["stock_quantity"] for item in stock_by_store)
    else:
        stock = _sum_measurement_values(
            raw.get("product_supplier_stock"),
            ("measurement_value", "active_measurement_value", "stock_quantity", "quantity"),
        )
    if stock == 0 and not stock_by_store:
        stock = _sum_measurement_values(
            raw.get("shop_measurement_values"),
            ("active_measurement_value", "measurement_value", "stock_quantity", "quantity"),
        )
    if stock == 0 and not stock_by_store:
        stock = fallback_stock

    return NormalizedBillzVariant(
        size=_extract_size(raw, fallback_title) or "One size",
        sku=str(raw.get("sku") or raw.get("barcode") or "") or None,
        price=price,
        stock_quantity=stock,
        stock_by_store=tuple(stock_by_store),
        movement_history=tuple(_extract_movement_history(raw)),
    )


def _canonical_hash(value: dict[str, Any]) -> str:
    payload = json.dumps(value, sort_keys=True, default=str, ensure_ascii=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _normalize_movement_type(raw_type: Any, raw: dict[str, Any]) -> str:
    value = str(raw_type or "").strip().lower()
    direction = str(_pick(raw, (("direction",), ("operation_direction",), ("type_direction",))) or "").strip().lower()

    if "transfer" in value or "перемещ" in value:
        if "out" in value or "out" in direction or "from" in direction:
            return "transfer_out"
        if "in" in value or "in" in direction or "to" in direction:
            return "transfer_in"
        if _pick(raw, (("from_store",), ("from_shop",), ("source_store",))):
            return "transfer_out"
        return "transfer_in"
    if any(term in value for term in ("sale", "sell", "sold", "order", "realization", "реализац", "продаж")):
        return "sale"
    if any(term in value for term in ("return", "refund", "возврат")):
        return "return"
    if any(term in value for term in ("import", "income", "arrival", "purchase", "приход", "поступ")):
        return "import"
    if any(term in value for term in ("write_off", "writeoff", "loss", "спис")):
        return "adjustment"
    return value or "adjustment"


def _signed_quantity_for_movement(movement_type: str, quantity: int, raw: dict[str, Any]) -> int:
    explicit = _pick(raw, (("signed_quantity",), ("signed_qty",), ("delta",), ("quantity_delta",), ("stock_delta",)))
    if explicit not in (None, ""):
        return _to_signed_int(explicit)

    if movement_type in {"sale", "transfer_out"}:
        return -abs(quantity)
    if movement_type in {"import", "return", "transfer_in"}:
        return abs(quantity)
    if movement_type == "adjustment":
        raw_quantity = _to_signed_int(_pick(raw, (("quantity",), ("qty",), ("amount",), ("measurement_value",))), quantity)
        return raw_quantity
    return quantity


def normalize_billz_movement(raw: dict[str, Any]) -> NormalizedBillzMovement | None:
    billz_movement_id = _pick(raw, (("id",), ("movement_id",), ("event_id",), ("transaction_id",), ("guid",)))
    billz_product_id = _pick(
        raw,
        (
            ("product_id",),
            ("billz_product_id",),
            ("product", "id"),
            ("product", "product_id"),
            ("product", "guid"),
        ),
    )
    article = _pick(raw, (("article",), ("sku",), ("barcode",), ("vendor_code",), ("product", "sku"), ("product", "article")))
    title = _pick(raw, (("title",), ("product_name",), ("name",), ("product", "name"), ("product", "title")))
    size = _pick(raw, (("size",), ("product", "size"), ("variant", "size"), ("attribute_size",)))
    raw_type = _pick(raw, (("movement_type",), ("type",), ("operation",), ("operation_type",), ("reason",), ("status",)))
    movement_type = _normalize_movement_type(raw_type, raw)
    quantity = abs(
        _to_signed_int(
            _pick(raw, (("quantity",), ("qty",), ("amount",), ("measurement_value",), ("stock_quantity",))),
            default=0,
        )
    )
    signed_quantity = _signed_quantity_for_movement(movement_type, quantity, raw)
    movement_date = _parse_datetime(
        _pick(raw, (("movement_date",), ("date",), ("created_at",), ("updated_at",), ("time",), ("operation_date",)))
    )
    store_name = _store_name_from_stock_item(raw, 0)

    if not billz_product_id and not article:
        return None
    if quantity == 0 and signed_quantity == 0:
        return None

    hash_payload = {
        "billz_movement_id": str(billz_movement_id) if billz_movement_id else None,
        "billz_product_id": str(billz_product_id) if billz_product_id else None,
        "article": str(article) if article else None,
        "size": str(size) if size else None,
        "store_name": store_name,
        "movement_type": movement_type,
        "signed_quantity": signed_quantity,
        "movement_date": movement_date.isoformat() if movement_date else None,
        "raw": raw if not billz_movement_id else None,
    }

    return NormalizedBillzMovement(
        billz_movement_id=str(billz_movement_id) if billz_movement_id else None,
        billz_product_id=str(billz_product_id) if billz_product_id else None,
        article=str(article) if article else None,
        title=str(title) if title else None,
        size=str(size) if size else _extract_size(raw, str(title or "")),
        store_name=store_name,
        movement_type=movement_type,
        quantity=quantity,
        signed_quantity=signed_quantity,
        movement_date=movement_date,
        raw=raw,
        source_hash=_canonical_hash(hash_payload),
    )


def _extract_products(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []

    candidates = (
        ("data", "products"),
        ("data", "items"),
        ("data", "rows"),
        ("data", "result"),
        ("products",),
        ("items",),
        ("rows",),
        ("result",),
        ("data",),
    )
    for path in candidates:
        value = _pick(payload, (path,))
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _extract_movements(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []

    candidates = (
        ("data", "movements"),
        ("data", "inventory_movements"),
        ("data", "items"),
        ("data", "rows"),
        ("data", "result"),
        ("movements",),
        ("inventory_movements",),
        ("items",),
        ("rows",),
        ("result",),
        ("data",),
    )
    for path in candidates:
        value = _pick(payload, (path,))
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _extract_total_count(payload: Any) -> int | None:
    if not isinstance(payload, dict):
        return None
    value = _pick(
        payload,
        (
            ("count",),
            ("total",),
            ("total_count",),
            ("data", "count"),
            ("data", "total"),
            ("meta", "total"),
            ("pagination", "total"),
        ),
    )
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_token(payload: dict[str, Any]) -> str | None:
    value = _pick(
        payload,
        (
            ("data", "access_token"),
            ("data", "token"),
            ("access_token",),
            ("token",),
        ),
    )
    return str(value) if value else None


def _parse_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _extract_refresh_token(payload: dict[str, Any]) -> str | None:
    value = _pick(
        payload,
        (
            ("data", "refresh_token"),
            ("refresh_token",),
        ),
    )
    return str(value) if value else None


def _extract_expires_at(payload: dict[str, Any]) -> datetime | None:
    expires_at = _pick(
        payload,
        (
            ("data", "expires_at"),
            ("expires_at",),
        ),
    )
    if expires_at:
        try:
            return datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            logger.info("Could not parse BILLZ token expires_at=%s", expires_at)

    expires_in = _pick(
        payload,
        (
            ("data", "expires_in"),
            ("expires_in",),
        ),
    )
    if expires_in not in (None, ""):
        try:
            return datetime.utcnow() + timedelta(seconds=max(int(expires_in), 0))
        except (TypeError, ValueError):
            logger.info("Could not parse BILLZ token expires_in=%s", expires_in)
    return None


def _get_latest_billz_auth(db: Session) -> BillzAuth | None:
    auth = db.scalar(select(BillzAuth).order_by(BillzAuth.id.desc()).limit(1))
    if auth is None:
        logger.warning("BILLZ token missing: no billz_auth rows found")
    else:
        logger.info("BILLZ token loaded from DB: id=%s expires_at=%s", auth.id, auth.expires_at)
    return auth


def _store_billz_auth(db: Session, payload: dict[str, Any]) -> BillzAuth:
    token = _extract_token(payload)
    if not token:
        raise HTTPException(status_code=502, detail="BILLZ access token not found in auth response")

    auth = BillzAuth(
        access_token=token,
        refresh_token=_extract_refresh_token(payload),
        expires_at=_extract_expires_at(payload),
    )
    db.add(auth)
    db.commit()
    db.refresh(auth)
    logger.info("Stored BILLZ token in DB: id=%s expires_at=%s", auth.id, auth.expires_at)
    return auth


def _is_billz_token_expired(auth: BillzAuth) -> bool:
    if auth.expires_at is None:
        return False
    return auth.expires_at <= datetime.utcnow() + timedelta(seconds=30)


async def _request_billz_auth_token(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            request_url = _billz_url(settings.billz_auth_endpoint)
            logger.info("BILLZ auth request URL: %s", request_url)
            response = await client.post(
                request_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            logger.info("BILLZ auth response status: %s", response.status_code)
            logger.info("BILLZ auth response body preview: %s", _preview_response_body(response.text))
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        error_message = _billz_http_error_message(exc.response.status_code, exc.response.text, auth=True)
        logger.warning("BILLZ auth failed: status=%s detail=%s", exc.response.status_code, error_message)
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=error_message,
        ) from exc
    except httpx.RequestError as exc:
        logger.exception("BILLZ auth request failed")
        raise HTTPException(status_code=502, detail=f"BILLZ backend auth request failed: {str(exc)}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="BILLZ auth returned invalid JSON") from exc


async def _refresh_billz_auth(db: Session, auth: BillzAuth) -> BillzAuth:
    if not auth.refresh_token:
        raise HTTPException(status_code=401, detail="BILLZ token expired and refresh token is not available")

    logger.info("Refreshing expired BILLZ token: id=%s", auth.id)
    payload: dict[str, Any] = {"refresh_token": auth.refresh_token}
    if settings.billz_iss:
        payload["iss"] = settings.billz_iss
    if settings.billz_sub:
        payload["sub"] = settings.billz_sub
    data = await _request_billz_auth_token(payload)
    return _store_billz_auth(db, data)


def normalize_billz_product(raw: dict[str, Any]) -> NormalizedBillzProduct | None:
    global _BILLZ_PRODUCT_DEBUG_PRINTED
    if not _BILLZ_PRODUCT_DEBUG_PRINTED:
        print("BILLZ product debug sample:", raw)
        _BILLZ_PRODUCT_DEBUG_PRINTED = True

    billz_id = _pick(raw, (("id",), ("product_id",), ("billz_id",), ("external_id",), ("guid",)))
    sku = _pick(raw, (("sku",), ("barcode",), ("vendor_code",), ("article"), ("code",)))
    title = _pick(
        raw,
        (
            ("title",),
            ("name",),
            ("product_name",),
            ("name_uz",),
            ("name_ru",),
            ("attributes", "name"),
        ),
    )

    if not billz_id and not sku:
        return None

    price = extract_price(raw)
    old_price_value = _pick(raw, (("old_price",), ("compare_at_price",), ("original_price",), ("prices", "old_price")))
    old_price = _to_decimal(old_price_value) if old_price_value not in (None, "") else None
    stock_quantity = _to_int(_pick(raw, (("stock_quantity",), ("quantity",), ("qty",), ("stock",), ("balance",))))
    is_active = _to_bool(_pick(raw, (("is_active",), ("active",), ("status",), ("state",))), default=True)

    variant = _extract_variant(
        raw,
        fallback_title=str(title or sku or billz_id),
        fallback_price=price,
        fallback_stock=stock_quantity,
    )

    return NormalizedBillzProduct(
        billz_id=str(billz_id) if billz_id else None,
        sku=str(sku) if sku else None,
        title=str(title or sku or billz_id),
        price=price,
        old_price=old_price,
        stock_quantity=stock_quantity,
        is_active=is_active,
        raw=raw,
        parent_id=str(raw.get("parent_id")) if raw.get("parent_id") else None,
        variants=(variant,),
    )


async def get_billz_access_token(db: Session, *, authenticate: bool = False) -> str:
    _ensure_billz_config()

    if settings.billz_token:
        logger.info("Using BILLZ_TOKEN from environment for API Authorization header")
        return settings.billz_token

    if not authenticate:
        auth = _get_latest_billz_auth(db)
        if auth is None:
            raise HTTPException(status_code=401, detail="BILLZ token not found, please authenticate again")
        if _is_billz_token_expired(auth):
            auth = await _refresh_billz_auth(db, auth)
        return auth.access_token

    payload: dict[str, Any] = {"secret_token": settings.billz_secret_key}
    if settings.billz_iss:
        payload["iss"] = settings.billz_iss
    if settings.billz_sub:
        payload["sub"] = settings.billz_sub

    data = await _request_billz_auth_token(payload)
    auth = _store_billz_auth(db, data)
    return auth.access_token


async def build_headers(db: Session) -> dict[str, str]:
    token = await get_billz_access_token(db)
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


async def billz_request(
    db: Session,
    method: str,
    endpoint: str,
    payload: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _ensure_billz_config()
    method = method.upper()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            request = client.build_request(
                method=method,
                url=_billz_url(endpoint),
                json=payload if method != "GET" else None,
                params=params,
                headers=await build_headers(db),
            )
            logger.info("BILLZ request URL: %s", request.url)
            response = await client.send(request)
            logger.info("BILLZ response status: %s", response.status_code)
            logger.info("BILLZ response body preview: %s", _preview_response_body(response.text))
            response.raise_for_status()
            data = response.json()
            products_count = len(_extract_products(data))
            logger.info("BILLZ parsed products count: %s", products_count)
            return data
    except httpx.HTTPStatusError as exc:
        error_message = _billz_http_error_message(exc.response.status_code, exc.response.text)
        logger.warning(
            "BILLZ request failed: url=%s status=%s detail=%s",
            exc.request.url,
            exc.response.status_code,
            error_message,
        )
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=error_message,
        ) from exc
    except httpx.RequestError as exc:
        logger.exception("BILLZ request error for %s", endpoint)
        raise HTTPException(status_code=502, detail=f"BILLZ backend request failed: {str(exc)}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="BILLZ returned invalid JSON") from exc


def _mask_token(token: str) -> str:
    if len(token) < 20:
        return "***masked***"
    return f"{token[:12]}...{token[-12:]}"


async def test_billz_auth(db: Session) -> dict[str, Any]:
    token = await get_billz_access_token(db, authenticate=True)
    return {
        "success": True,
        "message": "BILLZ auth is working",
        "billz_api_url": settings.billz_api_url,
        "auth_endpoint": settings.billz_auth_endpoint,
        "token_preview": _mask_token(token),
    }


async def _fetch_billz_products_with_status(db: Session) -> BillzProductFetchResult:
    normalized: list[NormalizedBillzProduct] = []
    seen_keys: set[str] = set()
    limit = 1000
    max_pages = 1000
    complete = False
    total_count: int | None = None
    raw_seen = 0

    for page in range(1, max_pages + 1):
        try:
            response = await billz_request(
                db,
                settings.billz_products_method,
                settings.billz_products_endpoint,
                payload={"limit": limit, "page": page},
                params={"limit": limit, "page": page},
            )
        except HTTPException:
            if page == 1:
                raise
            logger.info("Stopping BILLZ page pagination after page %s failed", page)
            break
        if total_count is None:
            total_count = _extract_total_count(response)
        raw_products = _extract_products(response)
        if not raw_products:
            complete = total_count in (None, raw_seen)
            break
        raw_seen += len(raw_products)

        page_added = 0
        for raw in raw_products:
            product = normalize_billz_product(raw)
            if product is None:
                continue
            product_key = product.billz_id or product.sku
            if product_key in seen_keys:
                continue
            seen_keys.add(product_key)
            normalized.append(product)
            page_added += 1

        if total_count is not None and raw_seen >= total_count:
            complete = True
            break
        if len(raw_products) < limit:
            complete = True
            break
        if page_added == 0:
            raise HTTPException(
                status_code=502,
                detail="BILLZ response format changed: products were returned but no id/SKU fields could be mapped",
            )

    logger.info(
        "BILLZ product fetch complete: raw_seen=%s normalized=%s complete=%s expected_count=%s",
        raw_seen,
        len(normalized),
        complete,
        total_count,
    )
    return BillzProductFetchResult(
        products=_attach_grouped_variants(normalized),
        complete=complete,
        expected_count=total_count,
        raw_count=raw_seen,
    )


async def _fetch_billz_products_batch(db: Session, *, offset: int, limit: int) -> BillzProductFetchResult:
    _ensure_billz_config()
    method = settings.billz_products_method.upper()
    request_params = {"limit": limit, "offset": offset}
    request_payload = request_params if method != "GET" else None
    request_url = _billz_url(settings.billz_products_endpoint)

    logger.info(
        "BILLZ next-batch request: url=%s method=%s offset=%s limit=%s",
        request_url,
        method,
        offset,
        limit,
    )
    logger.info("BILLZ next-batch parameters: %s", request_params)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            request = client.build_request(
                method=method,
                url=request_url,
                params=request_params if method == "GET" else None,
                json=request_payload,
                headers=await build_headers(db),
            )
            logger.info("BILLZ next-batch request URL: %s", request.url)
            response = await client.send(request)
            logger.info("BILLZ next-batch response status: %s", response.status_code)
            logger.info("BILLZ next-batch response body preview: %s", _preview_response_body(response.text))
            response.raise_for_status()
            response_data = response.json()
    except httpx.HTTPStatusError as exc:
        error_message = _billz_http_error_message(exc.response.status_code, exc.response.text)
        logger.warning(
            "BILLZ next-batch HTTP error: url=%s status=%s detail=%s",
            exc.request.url,
            exc.response.status_code,
            error_message,
        )
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=error_message,
        ) from exc
    except httpx.RequestError as exc:
        logger.exception("BILLZ next-batch request failed: url=%s offset=%s limit=%s", request_url, offset, limit)
        raise HTTPException(status_code=502, detail=f"BILLZ backend request failed: {str(exc)}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="BILLZ batch request returned invalid JSON") from exc

    response = response_data
    total_count = _extract_total_count(response)
    raw_products = _extract_products(response)
    normalized: list[NormalizedBillzProduct] = []
    seen_keys: set[str] = set()

    for raw in raw_products:
        product = normalize_billz_product(raw)
        if product is None:
            continue
        product_key = product.billz_id or product.sku
        if product_key in seen_keys:
            continue
        seen_keys.add(product_key)
        normalized.append(product)

    raw_count = len(raw_products)
    logger.info(
        "BILLZ next-batch parsed products: raw=%s normalized=%s offset=%s limit=%s",
        raw_count,
        len(normalized),
        offset,
        limit,
    )
    if raw_count > 0 and not normalized:
        raise HTTPException(
            status_code=502,
            detail="BILLZ response format changed: products were returned but no id/SKU fields could be mapped",
        )
    if total_count is not None:
        complete = offset + raw_count >= total_count
    else:
        complete = raw_count < limit

    return BillzProductFetchResult(
        products=_attach_grouped_variants(normalized),
        complete=complete,
        expected_count=total_count,
        raw_count=raw_count,
    )


async def _fetch_billz_movements(db: Session, *, limit: int = 1000) -> tuple[list[NormalizedBillzMovement], int]:
    _ensure_billz_config()
    method = settings.billz_movements_method.upper()
    normalized: list[NormalizedBillzMovement] = []
    seen_hashes: set[str] = set()
    raw_seen = 0
    max_pages = 1000

    for offset in range(0, limit * max_pages, limit):
        params = {"limit": limit, "offset": offset}
        payload = params if method != "GET" else None
        response = await billz_request(
            db,
            method,
            settings.billz_movements_endpoint,
            payload=payload,
            params=params if method == "GET" else None,
        )
        raw_movements = _extract_movements(response)
        if not raw_movements:
            break

        raw_seen += len(raw_movements)
        for raw in raw_movements:
            movement = normalize_billz_movement(raw)
            if movement is None or movement.source_hash in seen_hashes:
                continue
            seen_hashes.add(movement.source_hash)
            normalized.append(movement)

        total_count = _extract_total_count(response)
        if total_count is not None and raw_seen >= total_count:
            break
        if len(raw_movements) < limit:
            break

    return normalized, raw_seen


def _attach_grouped_variants(products: list[NormalizedBillzProduct]) -> list[NormalizedBillzProduct]:
    groups: dict[str, list[NormalizedBillzVariant]] = {}
    for product in products:
        group_key = product.parent_id or product.billz_id or product.sku
        if not group_key:
            continue
        groups.setdefault(group_key, [])
        groups[group_key].extend(product.variants)

    normalized: list[NormalizedBillzProduct] = []
    for product in products:
        group_key = product.parent_id or product.billz_id or product.sku
        variants = tuple(_dedupe_variants(groups.get(group_key, list(product.variants))))
        normalized.append(
            NormalizedBillzProduct(
                billz_id=product.billz_id,
                sku=product.sku,
                title=product.title,
                price=product.price,
                old_price=product.old_price,
                stock_quantity=product.stock_quantity,
                is_active=product.is_active,
                raw=product.raw,
                parent_id=product.parent_id,
                variants=variants,
            )
        )
    return normalized


def _dedupe_variants(variants: list[NormalizedBillzVariant]) -> list[NormalizedBillzVariant]:
    by_key: dict[tuple[str, str | None], NormalizedBillzVariant] = {}
    for variant in variants:
        key = (variant.size, variant.sku)
        by_key[key] = variant
    return sorted(by_key.values(), key=lambda variant: variant.size)


async def fetch_billz_products(db: Session) -> list[NormalizedBillzProduct]:
    result = await _fetch_billz_products_with_status(db)
    return result.products


def _get_or_create_sync_state(db: Session) -> BillzSyncState:
    state = db.get(BillzSyncState, SYNC_STATE_ID)
    if state is not None:
        return state

    state = BillzSyncState(id=SYNC_STATE_ID)
    db.add(state)
    db.flush()
    return state


def get_billz_sync_status(db: Session) -> dict[str, Any]:
    state = _get_or_create_sync_state(db)
    return {
        "last_full_sync_at": state.last_full_sync_at,
        "last_stock_sync_at": state.last_stock_sync_at,
        "last_sync_status": state.last_sync_status,
        "last_sync_message": state.last_sync_message,
        "products_created": state.products_created,
        "products_updated": state.products_updated,
        "products_marked_inactive": state.products_marked_inactive,
        "last_offset": state.last_offset,
        "batch_size": state.batch_size,
        "has_more": state.has_more,
        "active_cycle_id": state.active_cycle_id,
    }


def _sync_failure_response(mode: str, error_message: str) -> dict[str, Any]:
    return {
        "success": False,
        "mode": mode,
        "message": f"{mode.replace('-', ' ').title()} failed.",
        "error": error_message,
        "fetched": 0,
        "created": 0,
        "updated": 0,
        "attached_by_sku": 0,
        "marked_inactive": 0,
        "skipped": 0,
        "errors": [error_message],
    }


def _record_sync_status(
    db: Session,
    *,
    mode: str,
    status: str,
    message: str,
    created: int = 0,
    updated: int = 0,
    marked_inactive: int = 0,
    synced_at: datetime | None = None,
    last_offset: int | None = None,
    batch_size: int | None = None,
    has_more: bool | None = None,
    active_cycle_id: str | None = None,
) -> None:
    state = _get_or_create_sync_state(db)
    now = synced_at or datetime.utcnow()
    if mode == "full":
        state.last_full_sync_at = now
    if mode == "stock":
        state.last_stock_sync_at = now
    state.last_sync_status = status
    state.last_sync_message = message
    state.products_created = created
    state.products_updated = updated
    state.products_marked_inactive = marked_inactive
    if last_offset is not None:
        state.last_offset = last_offset
    if batch_size is not None:
        state.batch_size = batch_size
    if has_more is not None:
        state.has_more = has_more
    if active_cycle_id is not None:
        state.active_cycle_id = active_cycle_id
    state.updated_at = now


def _find_product(db: Session, item: NormalizedBillzProduct) -> tuple[Product | None, bool]:
    if item.billz_id:
        product = db.scalar(select(Product).where(Product.billz_id == item.billz_id))
        if product:
            return product, False
    if item.sku:
        product = db.scalar(select(Product).where(Product.billz_sku == item.sku))
        if product:
            return product, bool(item.billz_id and not product.billz_id)
    return None, False


def _find_product_for_movement(db: Session, movement: NormalizedBillzMovement) -> Product | None:
    if movement.billz_product_id:
        product = db.scalar(select(Product).where(Product.billz_id == movement.billz_product_id))
        if product:
            return product
    if movement.article:
        return db.scalar(select(Product).where(Product.billz_sku == movement.article))
    return None


def _movement_query_for_product(product: Product):
    filters = [InventoryMovement.product_id == product.id]
    fallback_filters = []
    if product.billz_id:
        fallback_filters.append(InventoryMovement.billz_product_id == product.billz_id)
    if product.billz_sku:
        fallback_filters.append(InventoryMovement.article == product.billz_sku)
    if fallback_filters:
        from sqlalchemy import or_

        filters = [or_(*filters, *fallback_filters)]
    return select(InventoryMovement).where(*filters)


def calculate_product_stock_summary(db: Session, product: Product) -> dict[str, Any]:
    movements = list(db.scalars(_movement_query_for_product(product)).all())
    if not movements:
        return {
            "product_id": product.id,
            "article": product.billz_sku,
            "title": product.billz_title or product.name_ru or product.name_uz,
            "size": product.variants[0].size if len(product.variants) == 1 else None,
            "stores": [],
            "total_stock": product.stock_quantity,
        }

    by_store: dict[str, int] = {}
    for movement in movements:
        store_name = movement.store_name or "Unknown store"
        by_store[store_name] = by_store.get(store_name, 0) + movement.signed_quantity

    stores = [
        {"store_name": store_name, "stock_quantity": max(stock_quantity, 0)}
        for store_name, stock_quantity in sorted(by_store.items())
    ]
    total_stock = sum(item["stock_quantity"] for item in stores)
    sizes = sorted({movement.size for movement in movements if movement.size})

    return {
        "product_id": product.id,
        "article": product.billz_sku,
        "title": product.billz_title or product.name_ru or product.name_uz,
        "size": sizes[0] if len(sizes) == 1 else None,
        "stores": stores,
        "total_stock": total_stock,
    }


def apply_movement_stock_to_product(db: Session, product: Product) -> bool:
    movements = list(db.scalars(_movement_query_for_product(product).order_by(InventoryMovement.movement_date.desc().nullslast(), InventoryMovement.id.desc())).all())
    if not movements:
        return False

    by_size_store: dict[str, dict[str, int]] = {}
    history_by_size: dict[str, list[dict[str, Any]]] = {}
    for movement in movements:
        size = movement.size or (product.variants[0].size if len(product.variants) == 1 else "One size")
        store_name = movement.store_name or "Unknown store"
        by_size_store.setdefault(size, {})
        by_size_store[size][store_name] = by_size_store[size].get(store_name, 0) + movement.signed_quantity
        history_by_size.setdefault(size, [])
        if len(history_by_size[size]) < 20:
            history_by_size[size].append(
                {
                    "movement_date": movement.movement_date.isoformat() if movement.movement_date else None,
                    "movement_type": movement.movement_type,
                    "quantity": movement.quantity,
                    "signed_quantity": movement.signed_quantity,
                    "store_name": store_name,
                }
            )

    for variant in product.variants:
        store_values = by_size_store.get(variant.size)
        if not store_values and len(product.variants) == 1:
            store_values = by_size_store.get("One size")
        if not store_values:
            continue
        rows = [
            {"store_name": store_name, "stock_quantity": max(stock_quantity, 0)}
            for store_name, stock_quantity in sorted(store_values.items())
        ]
        variant.stock_by_store = rows
        variant.stock_quantity = sum(row["stock_quantity"] for row in rows)
        variant.movement_history = history_by_size.get(variant.size) or history_by_size.get("One size") or []

    if product.variants:
        product.stock_quantity = sum(variant.stock_quantity for variant in product.variants)
    else:
        by_store: dict[str, int] = {}
        for movement in movements:
            store_name = movement.store_name or "Unknown store"
            by_store[store_name] = by_store.get(store_name, 0) + movement.signed_quantity
        product.stock_quantity = sum(max(stock_quantity, 0) for stock_quantity in by_store.values())
    product.in_stock = product.stock_quantity > 0

    return True


def _apply_full_sync_fields(product: Product, item: NormalizedBillzProduct, synced_at: datetime) -> None:
    product.billz_id = item.billz_id or product.billz_id
    product.billz_sku = item.sku or product.billz_sku
    product.billz_title = item.title
    product.price = item.price
    product.old_price = item.old_price
    product.stock_quantity = item.stock_quantity
    product.in_stock = item.stock_quantity > 0
    product.is_active = item.is_active
    product.billz_raw_json = item.raw
    product.sync_source = "billz"
    product.last_synced_at = synced_at


def _apply_stock_sync_fields(product: Product, item: NormalizedBillzProduct, synced_at: datetime) -> None:
    product.price = item.price
    product.old_price = item.old_price
    product.stock_quantity = item.stock_quantity
    product.in_stock = item.stock_quantity > 0
    product.last_synced_at = synced_at


def _replace_product_variants(product: Product, item: NormalizedBillzProduct) -> None:
    variants = [
        ProductVariant(
            size=variant.size,
            sku=variant.sku,
            price=variant.price,
            stock_quantity=variant.stock_quantity,
            stock_by_store=list(variant.stock_by_store),
            movement_history=list(variant.movement_history),
        )
        for variant in item.variants
    ]
    product.variants = variants
    if variants:
        product.stock_quantity = sum(variant.stock_quantity for variant in variants)
        product.in_stock = product.stock_quantity > 0


def repair_zero_billz_prices(db: Session) -> int:
    products = db.scalars(
        select(Product).where(
            Product.sync_source == "billz",
            Product.billz_raw_json.is_not(None),
            Product.price <= 0,
        )
    ).all()
    updated = 0
    for product in products:
        if not isinstance(product.billz_raw_json, dict):
            continue
        price = extract_price(product.billz_raw_json)
        if price <= 0:
            continue
        product.price = price
        updated += 1
    if updated:
        db.commit()
        logger.info("Repaired zero BILLZ product prices from stored raw JSON: %s", updated)
    return updated


def _sync_imported_products(
    db: Session,
    imported: list[NormalizedBillzProduct],
    *,
    mode: str,
    synced_at: datetime,
    create_missing: bool,
    cycle_id: str | None = None,
) -> dict[str, Any]:
    created = updated = attached_by_sku = skipped = 0
    errors: list[str] = []

    for item in imported:
        if not item.billz_id and not item.sku:
            skipped += 1
            continue

        try:
            product, attached = _find_product(db, item)
            if product is None:
                if not create_missing:
                    skipped += 1
                    continue
                import_category = _get_or_create_import_category(db)
                product = Product(
                    category_id=import_category.id,
                    name_uz=item.title,
                    name_ru=item.title,
                    description_uz=None,
                    description_ru=None,
                    price=item.price,
                    old_price=item.old_price,
                    cover_image=None,
                    in_stock=item.stock_quantity > 0,
                    stock_quantity=item.stock_quantity,
                    is_active=item.is_active,
                    sync_source="billz",
                )
                db.add(product)
                created += 1
            else:
                updated += 1
                if attached:
                    attached_by_sku += 1

            if mode == "stock":
                _apply_stock_sync_fields(product, item, synced_at)
            else:
                _apply_full_sync_fields(product, item, synced_at)
            if cycle_id:
                product.billz_last_seen_cycle_id = cycle_id
            _replace_product_variants(product, item)
        except Exception as exc:  # pragma: no cover - keeps one bad BILLZ row from killing the batch
            logger.exception("Failed to sync BILLZ product id=%s sku=%s", item.billz_id, item.sku)
            errors.append(f"{item.billz_id or item.sku}: {exc}")
            skipped += 1

    logger.info(
        "BILLZ database save result: incoming=%s saved=%s created=%s updated=%s skipped=%s errors=%s",
        len(imported),
        created + updated,
        created,
        updated,
        skipped,
        len(errors),
    )
    return {
        "created": created,
        "updated": updated,
        "attached_by_sku": attached_by_sku,
        "skipped": skipped,
        "errors": errors,
    }


def _get_or_create_import_category(db: Session) -> Category:
    category = db.scalar(select(Category).where(Category.slug == "billz-imported"))
    if category is not None:
        return category

    category = Category(
        name_uz="BILLZ imported",
        name_ru="BILLZ imported",
        slug="billz-imported",
        sort_order=9999,
    )
    db.add(category)
    db.flush()
    return category


def _mark_missing_billz_products_inactive(
    db: Session,
    *,
    fetched_billz_ids: set[str],
    synced_at: datetime,
) -> int:
    marked_inactive = 0
    local_billz_products = db.scalars(
        select(Product).where(Product.sync_source == "billz", Product.billz_id.is_not(None))
    ).all()
    for product in local_billz_products:
        if product.billz_id not in fetched_billz_ids and product.is_active:
            product.is_active = False
            product.is_published = False
            product.in_stock = False
            product.last_synced_at = synced_at
            marked_inactive += 1
    return marked_inactive


async def sync_products_from_billz(db: Session, *, mode: str = "full") -> dict[str, Any]:
    await test_billz_auth(db)
    fetch_result = await _fetch_billz_products_with_status(db)
    imported = fetch_result.products
    if fetch_result.raw_count == 0:
        raise HTTPException(status_code=502, detail="API response empty: BILLZ returned 0 products")
    fetch_complete = fetch_result.complete
    if mode in {"products", "full"} and not fetch_complete:
        raise HTTPException(
            status_code=502,
            detail=(
                "BILLZ full sync could not fetch a complete product list; "
                "missing-product deactivation was not run."
            ),
        )
    synced_at = datetime.utcnow()
    cycle_id = f"full-{synced_at.strftime('%Y%m%d%H%M%S')}" if mode in {"products", "full"} else None
    result = _sync_imported_products(
        db,
        imported,
        mode=mode,
        synced_at=synced_at,
        create_missing=mode != "stock",
        cycle_id=cycle_id,
    )
    created = result["created"]
    updated = result["updated"]
    attached_by_sku = result["attached_by_sku"]
    skipped = result["skipped"]
    errors = result["errors"]

    marked_inactive = 0

    status_value = "success" if not errors else "partial_success"
    message = (
        f"Fetched {len(imported)} products, created {created}, updated {updated}, "
        f"marked inactive {marked_inactive}, skipped {skipped}."
    )
    if errors:
        message += f" {len(errors)} row errors."
    _record_sync_status(
        db,
        mode="full" if mode in {"products", "full"} else "stock",
        status=status_value,
        message=message,
        created=created,
        updated=updated,
        marked_inactive=marked_inactive,
        synced_at=synced_at,
        last_offset=len(imported) if mode in {"products", "full"} else None,
        has_more=False if mode in {"products", "full"} else None,
        active_cycle_id=cycle_id,
    )
    db.commit()
    logger.info(
        "BILLZ %s sync complete: fetched=%s saved=%s products_created=%s products_updated=%s products_marked_inactive=%s skipped=%s",
        mode,
        len(imported),
        created + updated,
        created,
        updated,
        marked_inactive,
        skipped,
    )
    return {
        "success": not errors,
        "mode": mode,
        "fetched": len(imported),
        "created": created,
        "updated": updated,
        "attached_by_sku": attached_by_sku,
        "marked_inactive": marked_inactive,
        "skipped": skipped,
        "errors": errors,
    }


async def run_full_sync(db: Session) -> dict[str, Any]:
    try:
        return await sync_products_from_billz(db, mode="full")
    except Exception as exc:
        db.rollback()
        if isinstance(exc, HTTPException):
            error_message = str(exc.detail)
        elif isinstance(exc, SQLAlchemyError):
            error_message = f"Database insert failed: {exc}"
        else:
            error_message = str(exc)
        _record_sync_status(
            db,
            mode="full",
            status="failed",
            message=f"Full sync failed: {error_message}",
        )
        db.commit()
        return _sync_failure_response("full", error_message)


def _new_batch_cycle_id() -> str:
    return f"batch-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"


async def run_next_batch_sync(db: Session, *, batch_size: int | None = None) -> dict[str, Any]:
    state = _get_or_create_sync_state(db)
    effective_batch_size = max(1, min(batch_size or state.batch_size or DEFAULT_BATCH_SIZE, 200))
    offset = state.last_offset or 0
    cycle_id = state.active_cycle_id or _new_batch_cycle_id()
    synced_at = datetime.utcnow()

    if not state.has_more and offset > 0:
        message = "All BILLZ batches are already synced. Reset cursor to start a new cycle."
        _record_sync_status(
            db,
            mode="full",
            status="complete",
            message=message,
            created=0,
            updated=0,
            marked_inactive=0,
            synced_at=synced_at,
            last_offset=offset,
            batch_size=effective_batch_size,
            has_more=False,
            active_cycle_id=cycle_id,
        )
        db.commit()
        return {
            "success": True,
            "mode": "next-batch",
            "message": message,
            "error": None,
            "fetched": 0,
            "fetched_count": 0,
            "created": 0,
            "created_count": 0,
            "updated": 0,
            "updated_count": 0,
            "attached_by_sku": 0,
            "marked_inactive": 0,
            "skipped": 0,
            "errors": [],
            "next_offset": offset,
            "has_more": False,
            "batch_size": effective_batch_size,
        }

    try:
        auth_result = await test_billz_auth(db)
        logger.info(
            "BILLZ next-batch auth check passed: api_url=%s auth_endpoint=%s token=%s",
            auth_result.get("billz_api_url"),
            auth_result.get("auth_endpoint"),
            auth_result.get("token_preview"),
        )
        fetch_result = await _fetch_billz_products_batch(db, offset=offset, limit=effective_batch_size)
        imported = fetch_result.products
        if fetch_result.raw_count == 0 and offset == 0:
            message = "API response empty: BILLZ returned 0 products at cursor 0."
            logger.warning(
                "BILLZ next-batch empty response: offset=%s limit=%s expected_count=%s",
                offset,
                effective_batch_size,
                fetch_result.expected_count,
            )
            _record_sync_status(
                db,
                mode="full",
                status="failed",
                message=message,
                last_offset=0,
                batch_size=effective_batch_size,
                has_more=True,
                active_cycle_id=cycle_id,
            )
            db.commit()
            return {
                "success": False,
                "mode": "next-batch",
                "message": message,
                "error": "API response empty",
                "fetched": 0,
                "fetched_count": 0,
                "created": 0,
                "created_count": 0,
                "updated": 0,
                "updated_count": 0,
                "attached_by_sku": 0,
                "marked_inactive": 0,
                "skipped": 0,
                "errors": ["API response empty"],
                "next_offset": 0,
                "has_more": True,
                "batch_size": effective_batch_size,
            }
        result = _sync_imported_products(
            db,
            imported,
            mode="batch",
            synced_at=synced_at,
            create_missing=True,
            cycle_id=cycle_id,
        )
        if fetch_result.raw_count > 0 and result["created"] + result["updated"] == 0:
            error_message = result["errors"][0] if result["errors"] else "Database insert failed"
            raise HTTPException(status_code=500, detail=f"Database insert failed: {error_message}")
        next_offset = offset if fetch_result.raw_count == 0 else offset + fetch_result.raw_count
        has_more = False if fetch_result.raw_count == 0 else not fetch_result.complete
        status_value = "success" if not result["errors"] else "partial_success"
        message = (
            f"Batch sync fetched {fetch_result.raw_count} products from offset {offset}. "
            f"Created {result['created']}, updated {result['updated']}, skipped {result['skipped']}."
        )
        if fetch_result.raw_count == 0:
            message += " BILLZ returned an empty batch; cursor is complete."
        if result["errors"]:
            message += f" {len(result['errors'])} row errors."

        _record_sync_status(
            db,
            mode="full",
            status=status_value,
            message=message,
            created=result["created"],
            updated=result["updated"],
            marked_inactive=0,
            synced_at=synced_at,
            last_offset=next_offset,
            batch_size=effective_batch_size,
            has_more=has_more,
            active_cycle_id=cycle_id,
        )
        db.commit()
        logger.info(
            "BILLZ batch sync complete: offset=%s next_offset=%s fetched=%s saved=%s created=%s updated=%s has_more=%s",
            offset,
            next_offset,
            fetch_result.raw_count,
            result["created"] + result["updated"],
            result["created"],
            result["updated"],
            has_more,
        )
        return {
            "success": not result["errors"],
            "mode": "next-batch",
            "message": message,
            "error": None if not result["errors"] else "; ".join(result["errors"][:3]),
            "fetched": fetch_result.raw_count,
            "fetched_count": fetch_result.raw_count,
            "created": result["created"],
            "created_count": result["created"],
            "updated": result["updated"],
            "updated_count": result["updated"],
            "attached_by_sku": result["attached_by_sku"],
            "marked_inactive": 0,
            "skipped": result["skipped"],
            "errors": result["errors"],
            "next_offset": next_offset,
            "has_more": has_more,
            "batch_size": effective_batch_size,
        }
    except Exception as exc:
        db.rollback()
        if isinstance(exc, HTTPException):
            error_message = str(exc.detail)
        elif isinstance(exc, SQLAlchemyError):
            error_message = f"Database insert failed: {exc}"
        else:
            error_message = str(exc)
        logger.exception(
            "BILLZ batch sync failed: url=%s offset=%s limit=%s error=%s",
            _billz_url(settings.billz_products_endpoint) if settings.billz_api_url else settings.billz_products_endpoint,
            offset,
            effective_batch_size,
            error_message,
        )
        _record_sync_status(
            db,
            mode="full",
            status="failed",
            message=f"Batch sync failed: {error_message}",
            last_offset=offset,
            batch_size=effective_batch_size,
            has_more=state.has_more,
            active_cycle_id=cycle_id,
        )
        db.commit()
        return {
            "success": False,
            "mode": "next-batch",
            "message": "Next batch failed. See backend logs for BILLZ request URL, status, and error body.",
            "error": error_message,
            "fetched": 0,
            "fetched_count": 0,
            "created": 0,
            "created_count": 0,
            "updated": 0,
            "updated_count": 0,
            "attached_by_sku": 0,
            "marked_inactive": 0,
            "skipped": 0,
            "errors": [error_message],
            "next_offset": offset,
            "has_more": state.has_more,
            "batch_size": effective_batch_size,
        }


def reset_billz_sync_cursor(db: Session) -> dict[str, Any]:
    state = _get_or_create_sync_state(db)
    now = datetime.utcnow()
    state.last_offset = 0
    state.batch_size = DEFAULT_BATCH_SIZE
    state.has_more = True
    state.active_cycle_id = _new_batch_cycle_id()
    state.last_sync_status = "cursor_reset"
    state.last_sync_message = "BILLZ incremental sync cursor reset to 0."
    state.products_created = 0
    state.products_updated = 0
    state.products_marked_inactive = 0
    state.updated_at = now
    db.commit()
    return get_billz_sync_status(db)


def finalize_missing_products(db: Session) -> dict[str, Any]:
    state = _get_or_create_sync_state(db)
    if state.has_more:
        raise HTTPException(
            status_code=400,
            detail="Cannot finalize missing products until all BILLZ batches have been synced.",
        )
    if not state.active_cycle_id:
        raise HTTPException(status_code=400, detail="No completed BILLZ batch cycle is available to finalize.")

    synced_at = datetime.utcnow()
    marked_inactive = 0
    local_billz_products = db.scalars(
        select(Product).where(Product.sync_source == "billz", Product.billz_id.is_not(None))
    ).all()
    for product in local_billz_products:
        if product.billz_last_seen_cycle_id != state.active_cycle_id and (
            product.is_active or product.is_published or product.in_stock
        ):
            product.is_active = False
            product.is_published = False
            product.in_stock = False
            product.last_synced_at = synced_at
            marked_inactive += 1

    state.products_marked_inactive = marked_inactive
    state.last_sync_status = "success"
    state.last_sync_message = f"Finalize missing complete. Marked inactive {marked_inactive} products."
    state.updated_at = synced_at
    db.commit()
    logger.info(
        "BILLZ finalize missing complete: cycle_id=%s products_marked_inactive=%s",
        state.active_cycle_id,
        marked_inactive,
    )
    return {
        "success": True,
        "mode": "finalize-missing",
        "fetched": 0,
        "created": 0,
        "updated": 0,
        "attached_by_sku": 0,
        "marked_inactive": marked_inactive,
        "skipped": 0,
        "errors": [],
    }


async def run_stock_sync(db: Session) -> dict[str, Any]:
    try:
        return await sync_products_from_billz(db, mode="stock")
    except Exception as exc:
        db.rollback()
        if isinstance(exc, HTTPException):
            error_message = str(exc.detail)
        elif isinstance(exc, SQLAlchemyError):
            error_message = f"Database insert failed: {exc}"
        else:
            error_message = str(exc)
        _record_sync_status(
            db,
            mode="stock",
            status="failed",
            message=f"Stock sync failed: {error_message}",
        )
        db.commit()
        return _sync_failure_response("stock", error_message)


async def run_movement_sync(db: Session) -> dict[str, Any]:
    mode = "movements"
    try:
        await test_billz_auth(db)
        movements, raw_count = await _fetch_billz_movements(db)
        created = skipped = 0
        affected_product_ids: set[int] = set()

        for movement in movements:
            existing = None
            if movement.billz_movement_id:
                existing = db.scalar(
                    select(InventoryMovement).where(InventoryMovement.billz_movement_id == movement.billz_movement_id)
                )
            if existing is None:
                existing = db.scalar(select(InventoryMovement).where(InventoryMovement.source_hash == movement.source_hash))
            if existing is not None:
                skipped += 1
                if existing.product_id:
                    affected_product_ids.add(existing.product_id)
                continue

            product = _find_product_for_movement(db, movement)
            row = InventoryMovement(
                product_id=product.id if product else None,
                billz_movement_id=movement.billz_movement_id,
                source_hash=movement.source_hash,
                billz_product_id=movement.billz_product_id,
                article=movement.article,
                title=movement.title,
                size=movement.size,
                store_name=movement.store_name,
                movement_type=movement.movement_type,
                quantity=movement.quantity,
                signed_quantity=movement.signed_quantity,
                movement_date=movement.movement_date,
                raw_json=movement.raw,
            )
            db.add(row)
            created += 1
            if product:
                affected_product_ids.add(product.id)

        for product_id in affected_product_ids:
            product = db.scalar(
                select(Product)
                .where(Product.id == product_id)
                .options(selectinload(Product.variants))
            )
            if product:
                apply_movement_stock_to_product(db, product)

        message = f"Movement sync fetched {raw_count} rows, created {created}, skipped {skipped} duplicates."
        _record_sync_status(
            db,
            mode="stock",
            status="success",
            message=message,
            created=created,
            updated=len(affected_product_ids),
            synced_at=datetime.utcnow(),
        )
        db.commit()
        return {
            "success": True,
            "mode": mode,
            "message": message,
            "error": None,
            "fetched": raw_count,
            "created": created,
            "updated": len(affected_product_ids),
            "attached_by_sku": 0,
            "marked_inactive": 0,
            "skipped": skipped,
            "errors": [],
        }
    except Exception as exc:
        db.rollback()
        if isinstance(exc, HTTPException):
            error_message = str(exc.detail)
        elif isinstance(exc, SQLAlchemyError):
            error_message = f"Database insert failed: {exc}"
        else:
            error_message = str(exc)
        _record_sync_status(
            db,
            mode="stock",
            status="failed",
            message=f"Movement sync failed: {error_message}",
        )
        db.commit()
        return _sync_failure_response(mode, error_message)


def list_imported_products(db: Session) -> list[Product]:
    return list(
        db.scalars(
            select(Product)
            .where(Product.sync_source == "billz")
            .options(selectinload(Product.images), selectinload(Product.category))
            .order_by(Product.last_synced_at.desc().nullslast(), Product.id.desc())
        ).all()
    )
