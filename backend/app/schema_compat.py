from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


SQLITE_PRODUCT_COLUMNS: dict[str, str] = {
    "stock_quantity": "INTEGER NOT NULL DEFAULT 0",
    "is_active": "BOOLEAN NOT NULL DEFAULT 1",
    "is_published": "BOOLEAN NOT NULL DEFAULT 0",
    "featured": "BOOLEAN NOT NULL DEFAULT 0",
    "show_in_banner": "BOOLEAN NOT NULL DEFAULT 0",
    "section_slugs": "JSON",
    "slug": "VARCHAR(220)",
    "billz_id": "VARCHAR(120)",
    "billz_sku": "VARCHAR(160)",
    "billz_title": "VARCHAR(500)",
    "billz_raw_json": "JSON",
    "billz_last_seen_cycle_id": "VARCHAR(80)",
    "sync_source": "VARCHAR(40) NOT NULL DEFAULT 'manual'",
    "last_synced_at": "DATETIME",
}


SQLITE_PRODUCT_INDEXES: tuple[str, ...] = (
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_billz_id ON products (billz_id)",
    "CREATE INDEX IF NOT EXISTS ix_products_billz_sku ON products (billz_sku)",
    "CREATE INDEX IF NOT EXISTS ix_products_billz_last_seen_cycle_id ON products (billz_last_seen_cycle_id)",
    "CREATE INDEX IF NOT EXISTS ix_products_is_active ON products (is_active)",
    "CREATE INDEX IF NOT EXISTS ix_products_is_published ON products (is_published)",
    "CREATE INDEX IF NOT EXISTS ix_products_sync_source ON products (sync_source)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_slug ON products (slug)",
)


SQLITE_ORDER_COLUMNS: tuple[tuple[str, str], ...] = (
    ("id", "INTEGER NOT NULL"),
    ("full_name", "VARCHAR(180) NOT NULL"),
    ("phone", "VARCHAR(40) NOT NULL"),
    ("product_id", "INTEGER"),
    ("product_title", "VARCHAR(500)"),
    ("selected_size", "VARCHAR(30)"),
    ("selected_color", "VARCHAR(80)"),
    ("price", "NUMERIC(12, 2)"),
    ("quantity", "INTEGER NOT NULL DEFAULT 1"),
    ("status", "VARCHAR(30) NOT NULL DEFAULT 'new'"),
    ("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"),
)


def _ensure_sqlite_orders_product_nullable(connection) -> None:
    order_columns = connection.execute(text("PRAGMA table_info(orders)")).mappings().all()
    product_id_column = next((column for column in order_columns if column["name"] == "product_id"), None)
    if not product_id_column or not product_id_column["notnull"]:
        return

    connection.execute(text("PRAGMA foreign_keys=OFF"))
    try:
        connection.execute(
            text(
                """
                CREATE TABLE orders_compat (
                    id INTEGER NOT NULL,
                    full_name VARCHAR(180) NOT NULL,
                    phone VARCHAR(40) NOT NULL,
                    product_id INTEGER,
                    product_title VARCHAR(500),
                    selected_size VARCHAR(30),
                    selected_color VARCHAR(80),
                    price NUMERIC(12, 2),
                    quantity INTEGER NOT NULL DEFAULT 1,
                    status VARCHAR(30) NOT NULL DEFAULT 'new',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY(product_id) REFERENCES products (id)
                )
                """
            )
        )
        existing_columns = {column["name"] for column in order_columns}
        copy_columns = [name for name, _ in SQLITE_ORDER_COLUMNS if name in existing_columns]
        column_csv = ", ".join(copy_columns)
        connection.execute(text(f"INSERT INTO orders_compat ({column_csv}) SELECT {column_csv} FROM orders"))
        connection.execute(text("DROP TABLE orders"))
        connection.execute(text("ALTER TABLE orders_compat RENAME TO orders"))
    finally:
        connection.execute(text("PRAGMA foreign_keys=ON"))

    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_id ON orders (id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_product_id ON orders (product_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_status ON orders (status)"))


def ensure_sqlite_schema_compat(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "products" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("products")}
    with engine.begin() as connection:
        for column_name, ddl in SQLITE_PRODUCT_COLUMNS.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE products ADD COLUMN {column_name} {ddl}"))
        for index_ddl in SQLITE_PRODUCT_INDEXES:
            connection.execute(text(index_ddl))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS billz_sync_state (
                    id INTEGER NOT NULL,
                    last_full_sync_at DATETIME,
                    last_stock_sync_at DATETIME,
                    last_sync_status VARCHAR(40),
                    last_sync_message TEXT,
                    products_created INTEGER NOT NULL DEFAULT 0,
                    products_updated INTEGER NOT NULL DEFAULT 0,
                    products_marked_inactive INTEGER NOT NULL DEFAULT 0,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                )
                """
            )
        )
        existing_sync_columns = {column["name"] for column in inspector.get_columns("billz_sync_state")} if "billz_sync_state" in table_names else set()
        sync_columns = {
            "last_offset": "INTEGER NOT NULL DEFAULT 0",
            "batch_size": "INTEGER NOT NULL DEFAULT 200",
            "has_more": "BOOLEAN NOT NULL DEFAULT 1",
            "active_cycle_id": "VARCHAR(80)",
        }
        for column_name, ddl in sync_columns.items():
            if column_name not in existing_sync_columns:
                connection.execute(text(f"ALTER TABLE billz_sync_state ADD COLUMN {column_name} {ddl}"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    size VARCHAR(80) NOT NULL,
                    sku VARCHAR(160),
                    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    stock_quantity INTEGER NOT NULL DEFAULT 0,
                    stock_by_store JSON,
                    movement_history JSON,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY(product_id) REFERENCES products (id)
                )
                """
            )
        )
        existing_variant_columns = {column["name"] for column in inspector.get_columns("product_variants")}
        variant_columns = {
            "stock_by_store": "JSON",
            "movement_history": "JSON",
        }
        for column_name, ddl in variant_columns.items():
            if column_name not in existing_variant_columns:
                connection.execute(text(f"ALTER TABLE product_variants ADD COLUMN {column_name} {ddl}"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_product_variants_product_id ON product_variants (product_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_product_variants_sku ON product_variants (sku)"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS billz_auth (
                    id INTEGER NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT,
                    expires_at DATETIME,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_billz_auth_id ON billz_auth (id)"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS inventory_movements (
                    id INTEGER NOT NULL,
                    product_id INTEGER,
                    billz_movement_id VARCHAR(160),
                    source_hash VARCHAR(64) NOT NULL,
                    billz_product_id VARCHAR(120),
                    article VARCHAR(160),
                    title VARCHAR(500),
                    size VARCHAR(80),
                    store_name VARCHAR(160),
                    movement_type VARCHAR(60) NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 0,
                    signed_quantity INTEGER NOT NULL DEFAULT 0,
                    movement_date DATETIME,
                    raw_json JSON,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    FOREIGN KEY(product_id) REFERENCES products (id)
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_id ON inventory_movements (id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_id ON inventory_movements (product_id)"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_movements_billz_movement_id ON inventory_movements (billz_movement_id)"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_movements_source_hash ON inventory_movements (source_hash)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_billz_product_id ON inventory_movements (billz_product_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_article ON inventory_movements (article)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_size ON inventory_movements (size)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_store_name ON inventory_movements (store_name)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_movement_type ON inventory_movements (movement_type)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_inventory_movements_movement_date ON inventory_movements (movement_date)"))
        if "orders" in table_names:
            existing_order_columns = {column["name"] for column in inspector.get_columns("orders")}
            order_columns = {
                "product_title": "VARCHAR(500)",
                "price": "NUMERIC(12, 2)",
            }
            for column_name, ddl in order_columns.items():
                if column_name not in existing_order_columns:
                    connection.execute(text(f"ALTER TABLE orders ADD COLUMN {column_name} {ddl}"))
            _ensure_sqlite_orders_product_nullable(connection)
