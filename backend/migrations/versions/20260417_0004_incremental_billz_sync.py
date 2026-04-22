"""add incremental billz sync state

Revision ID: 20260417_0004
Revises: 20260417_0003
Create Date: 2026-04-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260417_0004"
down_revision: str | None = "20260417_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("billz_last_seen_cycle_id", sa.String(length=80), nullable=True))
    op.create_index(
        "ix_products_billz_last_seen_cycle_id",
        "products",
        ["billz_last_seen_cycle_id"],
        unique=False,
    )
    op.add_column("billz_sync_state", sa.Column("last_offset", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("billz_sync_state", sa.Column("batch_size", sa.Integer(), nullable=False, server_default="200"))
    op.add_column("billz_sync_state", sa.Column("has_more", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("billz_sync_state", sa.Column("active_cycle_id", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("billz_sync_state", "active_cycle_id")
    op.drop_column("billz_sync_state", "has_more")
    op.drop_column("billz_sync_state", "batch_size")
    op.drop_column("billz_sync_state", "last_offset")
    op.drop_index("ix_products_billz_last_seen_cycle_id", table_name="products")
    op.drop_column("products", "billz_last_seen_cycle_id")
