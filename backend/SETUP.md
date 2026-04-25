# KED UZ Admin Backend Setup

Run these commands from `c:\keduz\backend` in Windows PowerShell.

## 1. Create a virtual environment

```powershell
python -m venv .venv
```

## 2. Activate the virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, allow scripts for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 3. Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 4. Create `.env`

For quick local testing, this repo includes a development `.env` using SQLite:

```powershell
Get-Content .env
```

To reset it from the example:

```powershell
Copy-Item .env.example .env
```

For PostgreSQL, edit `.env` and set:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/keduz_admin
```

For immediate local testing, use:

```env
DATABASE_URL=sqlite:///./keduz_admin.db
```

## 5. Create the default admin

```powershell
python -m app.create_admin
```

Default login:

```text
username: admin@keduz.uz
password: 12345
```

## 6. Seed demo categories and products

```powershell
python -m app.seed_demo_data
```

The seed is safe to run more than once. It will not duplicate existing categories or products.

## 7. Start the API server

```powershell
python -m uvicorn app.main:app --reload
```

Open Swagger:

```text
http://127.0.0.1:8000/docs
```

## 8. Test admin login

In Swagger, open:

```text
POST /auth/login
```

Use:

```json
{
  "username": "admin@keduz.uz",
  "password": "12345"
}
```

Copy the returned `access_token`.

Click `Authorize` in Swagger and paste:

```text
Bearer <access_token>
```

Then test protected endpoints:

```text
GET /categories
GET /products
GET /products/{product_id}
GET /orders
```

## 9. Configure BILLZ integration

The BILLZ routes are protected by the same admin JWT.

Edit `.env` and fill in the real BILLZ values:

```env
BILLZ_API_URL=https://api.billz.uz
BILLZ_SECRET_KEY=your-billz-secret
BILLZ_ISS=your-billz-issuer
BILLZ_SUB=your-billz-subject
BILLZ_AUTH_ENDPOINT=/v1/auth/login
BILLZ_PRODUCTS_ENDPOINT=/v2/products
BILLZ_PRODUCTS_METHOD=GET
```

Then restart the API server and test:

```text
GET /billz/test-auth
POST /billz/sync/products
POST /billz/sync/stock
POST /billz/sync/full
GET /billz/imported-products
GET /admin/products/imported
PUT /admin/products/{id}/content
PUT /admin/products/{id}/images
PUT /admin/products/{id}/status
```

`/billz/test-auth` returns `503` until real BILLZ credentials are configured.

## Notes

Tables are created on startup for now through SQLAlchemy `create_all()`. Alembic scaffolding is already present for future migrations.
