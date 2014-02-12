
"""Add PublicProgramEditor role

Revision ID: 3ee919a0daf
Revises: 496256981937
Create Date: 2014-01-29 11:07:24.758222

"""

# revision identifiers, used by Alembic.
revision = '3ee919a0daf'
down_revision = '496256981937'

from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column, select
import sqlalchemy as sa

roles_table = table('roles',
    column('id', sa.Integer),
    column('name', sa.String),
    column('permissions_json', sa.String),
    column('description', sa.Text),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    column('context_id', sa.Integer),
    column('scope', sa.String),
    )

def upgrade():
  current_datetime = datetime.now()
  op.execute(
      roles_table.insert()\
          .values(
            name='ProgramMappingEditor',
            permissions_json='CODE DECLARED ROLE',
            description="""
              This role grants a user permission to edit program mappings.
              """,
            modified_by_id=1,
            created_at=current_datetime,
            updated_at=current_datetime,
            context_id=None,
            scope='Private Program Implied',
            ))

def downgrade():
  op.execute(
      roles_table.delete()\
          .where(roles_table.c.name=='ProgramMappingEditor'))
