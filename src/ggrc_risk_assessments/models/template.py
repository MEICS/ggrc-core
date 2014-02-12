# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


from ggrc import db
from ggrc.models.mixins import deferred, Base, Described, Slugged


class Template(Base, db.Model):
  __tablename__ = 'templates'

  name = deferred(db.Column(db.String, nullable=True), 'Template')
  description = deferred(db.Column(db.Text, nullable=True), 'Template')

  _fulltext_attrs = [
    'name',
    'description',
    ]

  _publish_attrs = [
    'name',
    'description',
    ]
