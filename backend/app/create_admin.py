from app.db import SessionLocal
from app.models import Admin
from app.auth import get_password_hash

db = SessionLocal()

admin = Admin(
    username="admin",
    hashed_password=get_password_hash("admin123")
)

db.add(admin)
db.commit()
db.close()

print("Admin created!")