
"""Remove Risk models

Revision ID: b58e88da095
Revises: 4db2d8962a62
Create Date: 2014-01-03 20:12:45.253372

"""

# revision identifiers, used by Alembic.
revision = 'b58e88da095'
down_revision = '4db2d8962a62'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.drop_table(u'risk_risky_attributes')
    op.drop_table(u'control_risks')
    op.drop_table(u'risks')
    op.drop_table(u'risky_attributes')


def downgrade():
    op.create_table(u'risky_attributes',
    sa.Column(u'id', sa.Integer(), nullable=False),
    sa.Column(u'modified_by_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DateTime(), nullable=True),
    sa.Column(u'updated_at', sa.DateTime(), nullable=True),
    sa.Column(u'description', sa.Text(), nullable=True),
    sa.Column(u'url', sa.String(length=250), nullable=True),
    sa.Column(u'start_date', sa.DATE(), nullable=True),
    sa.Column(u'end_date', sa.DATE(), nullable=True),
    sa.Column(u'slug', sa.String(length=250), nullable=False),
    sa.Column(u'title', sa.String(length=250), nullable=False),
    sa.Column(u'type_string', sa.String(length=250), nullable=True),
    sa.Column(u'context_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'contact_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'notes', sa.Text(), nullable=True),
    sa.Column(u'status', sa.String(length=250), nullable=True),
    sa.Column(u'reference_url', sa.String(length=250), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_risky_attributes_contexts'),
    sa.PrimaryKeyConstraint(u'id'),
    )
    op.create_unique_constraint('uq_risky_attributes', 'risky_attributes', ['slug',])

    op.create_table(u'risks',
    sa.Column(u'id', sa.Integer(), nullable=False),
    sa.Column(u'modified_by_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DateTime(), nullable=True),
    sa.Column(u'updated_at', sa.DateTime(), nullable=True),
    sa.Column(u'description', sa.Text(), nullable=True),
    sa.Column(u'url', sa.String(length=250), nullable=True),
    sa.Column(u'start_date', sa.DATE(), nullable=True),
    sa.Column(u'end_date', sa.DATE(), nullable=True),
    sa.Column(u'slug', sa.String(length=250), nullable=False),
    sa.Column(u'title', sa.String(length=250), nullable=False),
    sa.Column(u'kind', sa.String(length=250), nullable=True),
    sa.Column(u'likelihood', sa.Text(), nullable=True),
    sa.Column(u'threat_vector', sa.Text(), nullable=True),
    sa.Column(u'trigger', sa.Text(), nullable=True),
    sa.Column(u'preconditions', sa.Text(), nullable=True),
    sa.Column(u'likelihood_rating', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'financial_impact_rating', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'reputational_impact_rating', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'operational_impact_rating', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'inherent_risk', sa.Text(), nullable=True),
    sa.Column(u'risk_mitigation', sa.Text(), nullable=True),
    sa.Column(u'residual_risk', sa.Text(), nullable=True),
    sa.Column(u'impact', sa.Text(), nullable=True),
    sa.Column(u'context_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'contact_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'notes', sa.Text(), nullable=True),
    sa.Column(u'status', sa.String(length=250), nullable=True),
    sa.Column(u'reference_url', sa.String(length=250), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_risks_contexts'),
    sa.PrimaryKeyConstraint(u'id'),
    )
    op.create_unique_constraint('uq_risks', 'risks', ['slug',])

    op.create_table(u'control_risks',
    sa.Column(u'id', sa.Integer(), nullable=False),
    sa.Column(u'modified_by_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DateTime(), nullable=True),
    sa.Column(u'updated_at', sa.DateTime(), nullable=True),
    sa.Column(u'control_id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column(u'risk_id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column(u'context_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'status', sa.String(length=250), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_control_risks_contexts'),
    sa.ForeignKeyConstraint(['control_id'], [u'controls.id'], name=u'control_risks_ibfk_1'),
    sa.ForeignKeyConstraint(['risk_id'], [u'risks.id'], name=u'control_risks_ibfk_2'),
    sa.PrimaryKeyConstraint(u'id'),
    )
    op.create_table(u'risk_risky_attributes',
    sa.Column(u'id', sa.Integer(), nullable=False),
    sa.Column(u'modified_by_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DateTime(), nullable=True),
    sa.Column(u'updated_at', sa.DateTime(), nullable=True),
    sa.Column(u'risk_id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column(u'risky_attribute_id', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column(u'context_id', sa.Integer(), autoincrement=False, nullable=True),
    sa.Column(u'status', sa.String(length=250), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_risk_risky_attributes_contexts'),
    sa.ForeignKeyConstraint(['risk_id'], [u'risks.id'], name=u'risk_risky_attributes_ibfk_1'),
    sa.ForeignKeyConstraint(['risky_attribute_id'], [u'risky_attributes.id'], name=u'risk_risky_attributes_ibfk_2'),
    sa.PrimaryKeyConstraint(u'id'),
    )
