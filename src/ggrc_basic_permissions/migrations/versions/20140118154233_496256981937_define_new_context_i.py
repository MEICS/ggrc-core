
"""Define new context implications.

Revision ID: 496256981937
Revises: 41270fab9540
Create Date: 2014-01-18 15:42:33.350667

"""

# revision identifiers, used by Alembic.
revision = '496256981937'
down_revision = '41270fab9540'

import sqlalchemy as sa
from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column, select

role_implications_table = table('role_implications',
    column('id', sa.Integer),
    column('context_id', sa.Integer),
    column('source_context_id', sa.Integer),
    column('role_id', sa.Integer),
    column('source_role_id', sa.Integer),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    )

context_implications_table = table('context_implications',
    column('id', sa.Integer),
    column('context_id', sa.Integer),
    column('source_context_id', sa.Integer),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    )

def upgrade():
  op.create_table('context_implications',
      sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
      sa.Column('context_id', sa.Integer()),
      sa.Column('source_context_id', sa.Integer()),
      sa.Column('modified_by_id', sa.Integer()),
      sa.Column(
        'created_at', sa.DateTime(), default=sa.text('current_timestamp')),
      sa.Column(
        'updated_at',
        sa.DateTime(),
        default=sa.text('current_timestamp'),
        onupdate=sa.text('current_timestamp'),
        ),
      )
  # FIXME convert all existing role implications into context implications?
  # sure... but leave the old ones in place because... there is no way to
  # recover them. Leave it to another migration to *completely* deprecate them
  # through deletion
  select_role_implications = \
      select(
          [ role_implications_table.c.context_id,
            role_implications_table.c.source_context_id,
            ])\
      .distinct()
  connection = op.get_bind()
  implications = connection.execute(select_role_implications).fetchall()
  current_datetime = datetime.now()
  for implication in implications:
    op.execute(context_implications_table.insert().values(
      context_id=implication.context_id,
      source_context_id=implication.source_context_id,
      created_at=current_datetime,
      updated_at=current_datetime,
      ))

def downgrade():
  op.drop_table('context_implications')
