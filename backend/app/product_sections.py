from app.models import Product


SECTION_SLUGS = ("men", "women", "unisex", "clothing", "shoe", "new")
GENDER_SECTION_SLUGS = {"men", "women", "unisex"}
TYPE_SECTION_SLUGS = {"clothing", "shoe"}

_SECTION_ALIASES = {
    "erkaklar": "men",
    "male": "men",
    "mens": "men",
    "men": "men",
    "ayollar": "women",
    "female": "women",
    "womens": "women",
    "women": "women",
    "unisex": "unisex",
    "kiyim": "clothing",
    "kiyimlar": "clothing",
    "clothes": "clothing",
    "clothing": "clothing",
    "poyabzal": "shoe",
    "shoes": "shoe",
    "shoe": "shoe",
    "yangi": "new",
    "new": "new",
}


def normalize_section_slugs(values: list[str] | tuple[str, ...] | None) -> list[str]:
    if not values:
        return []

    normalized: list[str] = []
    for value in values:
        slug = _SECTION_ALIASES.get(str(value).strip().lower())
        if slug and slug not in normalized:
            normalized.append(slug)
    return normalized


def derive_section_slugs(product: Product) -> list[str]:
    slugs = normalize_section_slugs(getattr(product, "section_slugs", None))

    for value in (getattr(product, "gender", None) or "").replace(",", " ").split():
        slug = _SECTION_ALIASES.get(value.strip().lower())
        if slug in GENDER_SECTION_SLUGS and slug not in slugs:
            slugs.append(slug)

    product_type = _SECTION_ALIASES.get((getattr(product, "type", None) or "").strip().lower())
    if product_type in TYPE_SECTION_SLUGS and product_type not in slugs:
        slugs.append(product_type)

    if getattr(product, "is_new", False) and "new" not in slugs:
        slugs.append("new")

    return slugs


def apply_section_slugs(product: Product, values: list[str] | tuple[str, ...] | None) -> None:
    slugs = normalize_section_slugs(values)
    product.section_slugs = slugs
    product.is_new = "new" in slugs

    selected_genders = [slug for slug in slugs if slug in GENDER_SECTION_SLUGS]
    if selected_genders:
        product.gender = selected_genders[0]

    selected_types = [slug for slug in slugs if slug in TYPE_SECTION_SLUGS]
    if selected_types:
        product.type = selected_types[0]
