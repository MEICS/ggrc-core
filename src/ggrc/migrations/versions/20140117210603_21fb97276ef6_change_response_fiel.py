
"""Change response field

Revision ID: 21fb97276ef6
Revises: b58e88da095
Create Date: 2014-01-17 21:06:03.625256

"""

# revision identifiers, used by Alembic.
revision = '21fb97276ef6'
down_revision = 'b58e88da095'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    op.alter_column('responses', u'status',
               type_ = sa.VARCHAR(length=250),
               existing_type = sa.Enum(u'Assigned', u'Accepted', u'Completed'),
               nullable=False)


def downgrade():
    op.alter_column('responses', u'status',
               type_ = sa.Enum(u'Assigned', u'Accepted', u'Completed'),
               existing_type = sa.VARCHAR(length=250),
               nullable=False)
