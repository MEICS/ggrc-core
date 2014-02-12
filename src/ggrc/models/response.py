# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .mixins import (
    deferred, Noted, Described, Hyperlinked, WithContact, Slugged,
    )
from .relationship import Relatable
from .object_document import Documentable
from .object_person import Personable
from .object_control import Controllable

class Response(Noted, Described, Hyperlinked, WithContact, Slugged, db.Model):
  __tablename__ = 'responses'
  __mapper_args__ = {
      'polymorphic_on': 'response_type',
      }

  VALID_STATES = (u'Assigned', u'Submitted', u'Accepted', u'Rejected')
  VALID_TYPES = (u'documentation', u'interview', u'population sample')
  request_id = deferred(
      db.Column(db.Integer, db.ForeignKey('requests.id'), nullable=False),
      'Response')
  response_type = db.Column(db.Enum(*VALID_TYPES), nullable=False)
  status = deferred(db.Column(db.String, nullable=False),
    'Response')

  _publish_attrs = [
      'request',
      'status',
      'response_type',
      ]
  _sanitize_html = [
      ]

  def _display_name(self):
    return u'Response with id={0} for Audit "{1}"'.format(
        self.id, self.request.audit.display_name)

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Response, cls).eager_query()
    return query.options(
        orm.joinedload('request'))

class DocumentationResponse(
    Relatable, Documentable, Personable, Controllable, Response):

  __mapper_args__ = {
      'polymorphic_identity': 'documentation'
      }
  _table_plural = 'documentation_responses'

  _publish_attrs = [
      ]
  _sanitize_html = [
      ]


  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(DocumentationResponse, cls).eager_query()
    return query.options()

class InterviewResponse(
    Relatable, Documentable, Personable, Controllable, Response):

  __mapper_args__ = {
      'polymorphic_identity': 'interview'
      }
  _table_plural = 'interview_responses'

  meetings = db.relationship('Meeting', backref='response')
  _publish_attrs = [
    'meetings',
      ]
  _sanitize_html = [
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(InterviewResponse, cls).eager_query()
    return query.options(
      orm.subqueryload('meetings'))

class PopulationSampleResponse(
    Relatable, Documentable, Personable, Controllable, Response):

  __mapper_args__ = {
      'polymorphic_identity': 'population sample'
      }
  _table_plural = 'population_sample_responses'

  population_worksheet_id = deferred(
      db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False),
      'Response')
  population_count = deferred(db.Column(db.Integer, nullable=True),
    'Response')
  sample_worksheet_id = deferred(
      db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False),
      'Response')
  sample_count = deferred(db.Column(db.Integer, nullable=True), 'Response')
  sample_evidence_id = deferred(
      db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False),
      'Response')

  population_worksheet = db.relationship(
    "Document",
    foreign_keys="PopulationSampleResponse.population_worksheet_id"
    )
  sample_worksheet = db.relationship(
    "Document",
    foreign_keys="PopulationSampleResponse.sample_worksheet_id"
    )
  sample_evidence = db.relationship(
    "Document",
    foreign_keys="PopulationSampleResponse.sample_evidence_id"
    )

  _publish_attrs = [
      'population_worksheet',
      'population_count',
      'sample_worksheet',
      'sample_count',
      'sample_evidence',
      ]
  _sanitize_html = [
      'population_count',
      'sample_count',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(PopulationSampleResponse, cls).eager_query()
    return query.options(
      orm.joinedload('population_worksheet'),
      orm.joinedload('sample_worksheet'),
      orm.joinedload('sample_evidence'))
