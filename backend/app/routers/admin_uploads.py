from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth import get_current_admin


BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = BACKEND_ROOT / "uploads"
PRODUCT_UPLOAD_DIR = UPLOAD_ROOT / "products"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


router = APIRouter(
    prefix="/admin/uploads",
    tags=["admin uploads"],
    dependencies=[Depends(get_current_admin)],
)


def _has_valid_image_signature(extension: str, chunk: bytes) -> bool:
    if extension in {".jpg", ".jpeg"}:
        return chunk.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return chunk.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".webp":
        return len(chunk) >= 12 and chunk[:4] == b"RIFF" and chunk[8:12] == b"WEBP"
    return False


@router.post("/image")
async def upload_product_image(file: UploadFile = File(...)) -> dict[str, str | bool]:
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, and WEBP images are allowed",
        )

    PRODUCT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    destination = PRODUCT_UPLOAD_DIR / filename

    try:
        first_chunk = await file.read(1024 * 1024)
        if not first_chunk or not _has_valid_image_signature(extension, first_chunk):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is not a valid image",
            )
        with destination.open("wb") as output:
            output.write(first_chunk)
            while chunk := await file.read(1024 * 1024):
                output.write(chunk)
    finally:
        await file.close()

    return {
        "success": True,
        "file_url": f"/uploads/products/{filename}",
        "filename": filename,
    }
