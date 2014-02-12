
"""Add RiskAssessment.template_id

Revision ID: 160cd75171ac
Revises: 236bd544d592
Create Date: 2014-01-16 23:03:02.385367

"""

# revision identifiers, used by Alembic.
revision = '160cd75171ac'
down_revision = '236bd544d592'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column('risk_assessments', sa.Column('template_id', sa.Integer(), nullable=False))


def downgrade():
    op.drop_column('risk_assessments', 'template_id')
