from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KED UZ Admin API"
    environment: str = "development"

    # Database
    database_url: str = "sqlite:///./keduz_admin.db"

    # JWT
    jwt_secret_key: str = Field(
        default="change-this-secret-key",
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"),
    )
    jwt_algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices("ALGORITHM", "JWT_ALGORITHM"),
    )
    access_token_expire_minutes: int = 60 * 8

    # CORS
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "CORS_ORIGINS"),
    )

    # BILLZ
    billz_api_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("BILLZ_API_URL", "billz_api_url"),
    )
    billz_secret_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("BILLZ_SECRET_KEY", "billz_secret_key"),
    )
    billz_iss: str | None = Field(
        default=None,
        validation_alias=AliasChoices("BILLZ_ISS", "billz_iss"),
    )
    billz_sub: str | None = Field(
        default=None,
        validation_alias=AliasChoices("BILLZ_SUB", "billz_sub"),
    )
    billz_auth_endpoint: str = Field(
        default="/v1/auth/login",
        validation_alias=AliasChoices("BILLZ_AUTH_ENDPOINT", "billz_auth_endpoint"),
    )
    billz_products_endpoint: str = Field(
        default="/v2/products",
        validation_alias=AliasChoices("BILLZ_PRODUCTS_ENDPOINT", "billz_products_endpoint"),
    )
    billz_products_method: str = Field(
        default="GET",
        validation_alias=AliasChoices("BILLZ_PRODUCTS_METHOD", "billz_products_method"),
    )
    billz_movements_endpoint: str = Field(
        default="/v1/inventory-movements",
        validation_alias=AliasChoices("BILLZ_MOVEMENTS_ENDPOINT", "billz_movements_endpoint"),
    )
    billz_movements_method: str = Field(
        default="GET",
        validation_alias=AliasChoices("BILLZ_MOVEMENTS_METHOD", "billz_movements_method"),
    )

    # Telegram order notifications
    telegram_bot_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("TELEGRAM_BOT_TOKEN", "telegram_bot_token"),
    )
    telegram_chat_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("TELEGRAM_CHAT_ID", "telegram_chat_id"),
    )

    # ENV FILE
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


# 🔥 ENG MUHIM QATOR (XATONI TUZATADI)
settings = get_settings()
