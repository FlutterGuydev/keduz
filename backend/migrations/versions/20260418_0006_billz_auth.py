"""add billz auth token storage

Revision ID: 20260418_0006
Revises: 20260418_0005
Create Date: 2026-04-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260418_0006"
down_revision: str | None = "20260418_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "billz_auth",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_billz_auth_id", "billz_auth", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_billz_auth_id", table_name="billz_auth")
    op.drop_table("billz_auth")
