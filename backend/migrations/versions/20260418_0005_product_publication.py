"""add product publication flag

Revision ID: 20260418_0005
Revises: 20260417_0004
Create Date: 2026-04-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260418_0005"
down_revision: str | None = "20260417_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_products_is_published", "products", ["is_published"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_products_is_published", table_name="products")
    op.drop_column("products", "is_published")
