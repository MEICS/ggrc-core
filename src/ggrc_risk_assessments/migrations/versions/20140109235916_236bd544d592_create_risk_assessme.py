
"""Create Risk Assessment tables

Revision ID: 236bd544d592
Revises: None
Create Date: 2014-01-09 23:59:16.449353

"""

# revision identifiers, used by Alembic.
revision = '236bd544d592'
down_revision = None


from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table('risk_assessments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('category', sa.Text(), nullable=True),
    sa.Column('subcategory', sa.Text(), nullable=True),
    sa.Column('product', sa.Text(), nullable=True),
    sa.Column('process', sa.Text(), nullable=True),
    sa.Column('ra_manager', sa.Text(), nullable=True),
    sa.Column('code', sa.Text(), nullable=True),
    sa.Column('region', sa.Text(), nullable=True),
    sa.Column('country', sa.Text(), nullable=True),
    sa.Column('custom1', sa.Text(), nullable=True),
    sa.Column('custom2', sa.Text(), nullable=True),
    sa.Column('custom3', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('vulnerabilities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=250), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('url', sa.String(length=250), nullable=True),
    sa.Column('reference_url', sa.String(length=250), nullable=True),
    sa.Column('contact_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('slug', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['contact_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('threats',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('status', sa.String(length=250), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('url', sa.String(length=250), nullable=True),
    sa.Column('reference_url', sa.String(length=250), nullable=True),
    sa.Column('contact_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('slug', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['contact_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('risk_assessment_mappings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('asset_class', sa.Text(), nullable=True),
    sa.Column('asset_inventory', sa.Text(), nullable=True),
    sa.Column('responsible_party', sa.Text(), nullable=True),
    sa.Column('impact', sa.Text(), nullable=True),
    sa.Column('impact_category', sa.Text(), nullable=True),
    sa.Column('likelihood', sa.Text(), nullable=True),
    sa.Column('inherent_risk', sa.Text(), nullable=True),
    sa.Column('control_strength', sa.Text(), nullable=True),
    sa.Column('residual_risk', sa.Text(), nullable=True),
    sa.Column('risk_treatment', sa.Text(), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('risk_assessment_id', sa.Integer(), nullable=False),
    sa.Column('threat_id', sa.Integer(), nullable=False),
    sa.Column('vulnerability_id', sa.Integer(), nullable=False),
    sa.Column('control_id', sa.Integer(), nullable=False),
    sa.Column('asset_id', sa.Integer(), nullable=False),
    sa.Column('asset_type', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['control_id'], ['controls.id'], ),
    sa.ForeignKeyConstraint(['risk_assessment_id'], ['risk_assessments.id'], ),
    sa.ForeignKeyConstraint(['threat_id'], ['threats.id'], ),
    sa.ForeignKeyConstraint(['vulnerability_id'], ['vulnerabilities.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('risk_assessment_mappings')
    op.drop_table('threats')
    op.drop_table('vulnerabilities')
    op.drop_table('templates')
    op.drop_table('risk_assessments')
