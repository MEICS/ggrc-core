
"""Convert all roles to code declared roles.

Revision ID: 41270fab9540
Revises: 4ab49eafe820
Create Date: 2014-01-18 14:22:25.419593

"""

# revision identifiers, used by Alembic.
revision = '41270fab9540'
down_revision = '4ab49eafe820'

import sqlalchemy as sa
from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column, select
import json

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

ROLES = [
    'AuditorReader', 'Reader', 'ProgramCreator', 'ObjectEditor',
    'ProgramBasicReader', 'ProgramOwner', 'ProgramEditor', 'ProgramReader',
    'AuditorProgramReader', 'ProgramAuditOwner', 'ProgramAuditEditor',
    'ProgramAuditReader', 'Auditor',
    ]

def upgrade():
  op.execute(
      roles_table.update()\
          .where(roles_table.c.name.in_(ROLES))\
          .values(permissions_json="CODE DECLARED ROLE"))

def downgrade():
  from ggrc_basic_permissions.roles import (
      Auditor, AuditorProgramReader, AuditorReader, ObjectEditor,
      ProgramAuditEditor, ProgramAuditOwner, ProgramAuditReader,
      ProgramBasicReader, ProgramCreator, ProgramEditor, ProgramOwner,
      ProgramReader, Reader, gGRC_Admin,
      )

  roles = [
      Auditor, AuditorProgramReader, AuditorReader, ObjectEditor,
      ProgramAuditEditor, ProgramAuditOwner, ProgramAuditReader,
      ProgramBasicReader, ProgramCreator, ProgramEditor, ProgramOwner,
      ProgramReader, Reader, gGRC_Admin,
      ]

  for role in roles:
    op.execute(
        roles_table.update()\
            .where(roles_table.c.name == role.__name__)\
            .values(permissions_json=json.dumps(role.permissions)))
