
"""Slugged Requests

Revision ID: 4db2d8962a62
Revises: 3fa5cf4f8ae6
Create Date: 2014-01-07 23:37:49.323766

"""

# revision identifiers, used by Alembic.
revision = '4db2d8962a62'
down_revision = '3fa5cf4f8ae6'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, func

def upgrade():
  op.add_column(
      'requests',
      sa.Column(u'slug', sa.String(length=250), nullable=False))
  op.add_column(
      'requests',
      sa.Column(u'title', sa.String(length=250), nullable=True))
  
  requests_table = table('requests',
      column('id', sa.Integer),
      column('slug', sa.Integer)
      )

  op.execute(requests_table.update().values(
    slug=func.concat(
      op.inline_literal("REQUEST-"),
      requests_table.c.id,
      ),
    ))

def downgrade():
  op.drop_column(
    'requests',
    u'slug'
    )
  op.drop_column(
    'requests',
    u'title'
    )
