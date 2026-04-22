"""add per-store variant stock

Revision ID: 20260419_0007
Revises: 20260418_0006
Create Date: 2026-04-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260419_0007"
down_revision: str | None = "20260418_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("product_variants", sa.Column("stock_by_store", sa.JSON(), nullable=True))
    op.add_column("product_variants", sa.Column("movement_history", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("product_variants", "movement_history")
    op.drop_column("product_variants", "stock_by_store")
