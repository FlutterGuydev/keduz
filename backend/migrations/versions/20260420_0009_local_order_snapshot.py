"""add local order snapshot fields

Revision ID: 20260420_0009
Revises: 20260419_0008
Create Date: 2026-04-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260420_0009"
down_revision: str | None = "20260419_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("product_title", sa.String(length=500), nullable=True))
    op.add_column("orders", sa.Column("price", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "price")
    op.drop_column("orders", "product_title")
