"""add product storefront section assignments"""

from alembic import op
import sqlalchemy as sa


revision = "20260422_0011"
down_revision = "20260421_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(sa.Column("section_slugs", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_column("section_slugs")
