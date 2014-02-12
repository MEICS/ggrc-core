# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


from ggrc import db
from ggrc.models.mixins import deferred, Base


class RiskAssessment(Base, db.Model):
  __tablename__ = 'risk_assessments'

  name = deferred(db.Column(db.String, nullable=True), 'RiskAssessment')
  description = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  note = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  category = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  subcategory = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  product = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  process = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  ra_manager = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  code = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  region = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  country = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  custom1 = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  custom2 = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')
  custom3 = deferred(db.Column(db.Text, nullable=True), 'RiskAssessment')

  template_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('templates.id'), nullable=False),
      'RiskAssessment')
  template = db.relationship(
      'Template',
      foreign_keys='RiskAssessment.template_id')

  _fulltext_attrs = [
    'name',
    'description',
    'note',
    'category',
    'subcategory',
    ]

  _publish_attrs = [
    'name',
    'description',
    'note',
    'category',
    'subcategory',
    'product',
    'process',
    'ra_manager',
    'code',
    'region',
    'country',
    'custom1',
    'custom2',
    'custom3',
    'template',
    ]
