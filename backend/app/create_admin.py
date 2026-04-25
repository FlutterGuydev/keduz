from app.auth import get_password_hash
from app.db import Base, SessionLocal, engine
from app.models import Admin


ADMIN_EMAIL = "admin@keduz.uz"
LEGACY_ADMIN_USERNAME = "admin"


def upsert_admin() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        password_hash = get_password_hash("12345")
        admin = db.query(Admin).filter(Admin.username == ADMIN_EMAIL).first()
        legacy_admin = db.query(Admin).filter(Admin.username == LEGACY_ADMIN_USERNAME).first()

        if admin is None and legacy_admin is not None:
            admin = legacy_admin
            admin.username = ADMIN_EMAIL
        elif admin is None:
            admin = Admin(username=ADMIN_EMAIL, hashed_password=password_hash)
            db.add(admin)
        elif legacy_admin is not None and legacy_admin.id != admin.id:
            db.delete(legacy_admin)

        admin.hashed_password = password_hash
        db.commit()


if __name__ == "__main__":
    upsert_admin()
    print(f"Admin ready: {ADMIN_EMAIL}")
