"""hybrid billz products

Revision ID: 20260414_0001
Revises:
Create Date: 2026-04-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260414_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.alter_column("category_id", existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column("price", existing_type=sa.Numeric(12, 2), server_default="0")
        batch_op.add_column(sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("show_in_banner", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("slug", sa.String(length=220), nullable=True))
        batch_op.add_column(sa.Column("billz_id", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("billz_sku", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("billz_title", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("billz_raw_json", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("sync_source", sa.String(length=40), nullable=False, server_default="manual"))
        batch_op.add_column(sa.Column("last_synced_at", sa.DateTime(), nullable=True))

    op.create_index("ix_products_billz_id", "products", ["billz_id"], unique=True)
    op.create_index("ix_products_billz_sku", "products", ["billz_sku"], unique=False)
    op.create_index("ix_products_is_active", "products", ["is_active"], unique=False)
    op.create_index("ix_products_sync_source", "products", ["sync_source"], unique=False)
    op.create_index("ix_products_slug", "products", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_products_slug", table_name="products")
    op.drop_index("ix_products_sync_source", table_name="products")
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_index("ix_products_billz_sku", table_name="products")
    op.drop_index("ix_products_billz_id", table_name="products")

    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_column("last_synced_at")
        batch_op.drop_column("sync_source")
        batch_op.drop_column("billz_raw_json")
        batch_op.drop_column("billz_title")
        batch_op.drop_column("billz_sku")
        batch_op.drop_column("billz_id")
        batch_op.drop_column("slug")
        batch_op.drop_column("show_in_banner")
        batch_op.drop_column("featured")
        batch_op.drop_column("is_active")
        batch_op.drop_column("stock_quantity")
        batch_op.alter_column("price", existing_type=sa.Numeric(12, 2), server_default=None)
        batch_op.alter_column("category_id", existing_type=sa.Integer(), nullable=False)
