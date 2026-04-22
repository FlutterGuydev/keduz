"""add inventory movements

Revision ID: 20260419_0008
Revises: 20260419_0007
Create Date: 2026-04-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260419_0008"
down_revision: str | None = "20260419_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("billz_movement_id", sa.String(length=160), nullable=True),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("billz_product_id", sa.String(length=120), nullable=True),
        sa.Column("article", sa.String(length=160), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("size", sa.String(length=80), nullable=True),
        sa.Column("store_name", sa.String(length=160), nullable=True),
        sa.Column("movement_type", sa.String(length=60), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("signed_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("movement_date", sa.DateTime(), nullable=True),
        sa.Column("raw_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inventory_movements_id"), "inventory_movements", ["id"], unique=False)
    op.create_index(op.f("ix_inventory_movements_product_id"), "inventory_movements", ["product_id"], unique=False)
    op.create_index(op.f("ix_inventory_movements_billz_movement_id"), "inventory_movements", ["billz_movement_id"], unique=True)
    op.create_index(op.f("ix_inventory_movements_source_hash"), "inventory_movements", ["source_hash"], unique=True)
    op.create_index(op.f("ix_inventory_movements_billz_product_id"), "inventory_movements", ["billz_product_id"], unique=False)
    op.create_index(op.f("ix_inventory_movements_article"), "inventory_movements", ["article"], unique=False)
    op.create_index(op.f("ix_inventory_movements_size"), "inventory_movements", ["size"], unique=False)
    op.create_index(op.f("ix_inventory_movements_store_name"), "inventory_movements", ["store_name"], unique=False)
    op.create_index(op.f("ix_inventory_movements_movement_type"), "inventory_movements", ["movement_type"], unique=False)
    op.create_index(op.f("ix_inventory_movements_movement_date"), "inventory_movements", ["movement_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_movements_movement_date"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_movement_type"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_store_name"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_size"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_article"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_billz_product_id"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_source_hash"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_billz_movement_id"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_product_id"), table_name="inventory_movements")
    op.drop_index(op.f("ix_inventory_movements_id"), table_name="inventory_movements")
    op.drop_table("inventory_movements")
