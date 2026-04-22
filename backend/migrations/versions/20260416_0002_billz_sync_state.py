"""add billz sync state

Revision ID: 20260416_0002
Revises: 20260414_0001
Create Date: 2026-04-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260416_0002"
down_revision: str | None = "20260414_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "billz_sync_state",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("last_full_sync_at", sa.DateTime(), nullable=True),
        sa.Column("last_stock_sync_at", sa.DateTime(), nullable=True),
        sa.Column("last_sync_status", sa.String(length=40), nullable=True),
        sa.Column("last_sync_message", sa.Text(), nullable=True),
        sa.Column("products_created", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("products_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("products_marked_inactive", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("billz_sync_state")
