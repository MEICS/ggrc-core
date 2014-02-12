# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


from ggrc import db
from ggrc.models.mixins import deferred, Base


class RiskAssessmentMapping(Base, db.Model):
  __tablename__ = 'risk_assessment_mappings'

  name = deferred(
      db.Column(db.String, nullable=True), 'RiskAssessmentMapping')
  description = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  asset_class = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  asset_inventory = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  responsible_party = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  impact = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  impact_category = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  likelihood = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  inherent_risk = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  risk_treatment = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')
  remarks = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentMapping')

  risk_assessment_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('risk_assessments.id'), nullable=False),
      'RiskAssessmentMapping')
  risk_assessment = db.relationship(
      'RiskAssessment',
      foreign_keys='RiskAssessmentMapping.risk_assessment_id')

  threat_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('threats.id'), nullable=False),
      'RiskAssessmentMapping')
  threat = db.relationship(
      'Threat', foreign_keys='RiskAssessmentMapping.threat_id')

  vulnerability_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('vulnerabilities.id'), nullable=False),
      'RiskAssessmentMapping')
  vulnerability = db.relationship(
      'Vulnerability', foreign_keys='RiskAssessmentMapping.vulnerability_id')

  asset_id = deferred(
      db.Column(db.Integer, nullable=False), 'RiskAssessmentMapping')
  asset_type = deferred(
      db.Column(db.String, nullable=False), 'RiskAssessmentMapping')

  @property
  def asset_attr(self):
    return '{0}_asset'.format(self.asset_type)

  @property
  def asset(self):
    return getattr(self, self.asset_attr)

  @asset.setter
  def asset(self, value):
    self.asset_id = value.id if value is not None else None
    self.asset_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.asset_attr, value)

  _publish_attrs = [
    'name',
    'description',
    'asset_class',
    'asset_inventory',
    'responsible_party',
    'impact',
    'impact_category',
    'likelihood',
    'inherent_risk',
    'risk_treatment',
    'remarks',
    'risk_assessment',
    'threat',
    'vulnerability',
    'asset',
    ]
