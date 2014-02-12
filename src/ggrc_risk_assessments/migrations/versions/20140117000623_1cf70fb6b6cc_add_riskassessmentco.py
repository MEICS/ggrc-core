
"""Add RiskAssessmentControlMapping model and table

Revision ID: 1cf70fb6b6cc
Revises: 160cd75171ac
Create Date: 2014-01-17 00:06:23.625975

"""

# revision identifiers, used by Alembic.
revision = '1cf70fb6b6cc'
down_revision = '160cd75171ac'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table('risk_assessment_control_mappings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('control_strength', sa.Text(), nullable=True),
    sa.Column('residual_risk', sa.Text(), nullable=True),
    sa.Column('risk_assessment_mapping_id', sa.Integer(), nullable=False),
    sa.Column('threat_id', sa.Integer(), nullable=False),
    sa.Column('control_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['control_id'], ['controls.id'], ),
    sa.ForeignKeyConstraint(['risk_assessment_mapping_id'], ['risk_assessment_mappings.id'], ),
    sa.ForeignKeyConstraint(['threat_id'], ['threats.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.drop_constraint(
        'risk_assessment_mappings_ibfk_2',
        'risk_assessment_mappings',
        type_='foreignkey')
    op.drop_column('risk_assessment_mappings', u'control_id')
    op.drop_column('risk_assessment_mappings', u'residual_risk')
    op.drop_column('risk_assessment_mappings', u'control_strength')


def downgrade():
    op.add_column('risk_assessment_mappings', sa.Column(u'control_strength', sa.Text(), nullable=True))
    op.add_column('risk_assessment_mappings', sa.Column(u'residual_risk', sa.Text(), nullable=True))
    op.add_column('risk_assessment_mappings', sa.Column(u'control_id', sa.Integer(), nullable=False))
    op.create_foreign_key(
        'risk_assessment_mappings_ibfk_2',
        'risk_assessment_mappings',
        'controls',
        ['control_id'],
        ['id'])
    op.drop_table('risk_assessment_control_mappings')
