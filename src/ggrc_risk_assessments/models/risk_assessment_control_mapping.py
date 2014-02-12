# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


from ggrc import db
from ggrc.models.mixins import deferred, Base


class RiskAssessmentControlMapping(Base, db.Model):
  __tablename__ = 'risk_assessment_control_mappings'

  control_strength = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentControlMapping')
  residual_risk = deferred(
      db.Column(db.Text, nullable=True), 'RiskAssessmentControlMapping')

  risk_assessment_mapping_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('risk_assessment_mappings.id'), nullable=False),
      'RiskAssessmentControlMapping')
  risk_assessment_mapping = db.relationship(
      'RiskAssessmentMapping',
      foreign_keys='RiskAssessmentControlMapping.risk_assessment_mapping_id')

  threat_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('threats.id'), nullable=False),
      'RiskAssessmentControlMapping')
  threat = db.relationship(
      'Threat', foreign_keys='RiskAssessmentControlMapping.threat_id')

  control_id = deferred(
      db.Column(
        db.Integer, db.ForeignKey('controls.id'), nullable=False),
      'RiskAssessmentControlMapping')
  control = db.relationship(
      'Control', foreign_keys='RiskAssessmentControlMapping.control_id')

  _publish_attrs = [
    'control_strength',
    'residual_risk',
    'risk_assessment_mapping',
    'threat',
    'control',
    ]

  def _display_name(self):
    return self.risk_assessment_mapping.display_name + \
        '<->' + self.control.display_name
