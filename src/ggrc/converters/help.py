# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: anze@reciprocitylabs.com
# Maintained By: anze@reciprocitylabs.com

from .base import *

from ggrc.models import Help
from .base_row import *
from collections import OrderedDict

class HelpRowConverter(BaseRowConverter):
  modal_class = Help

  def setup_object(self):
    slug = self.attrs.get('slug')
    if slug:
      self.obj = self.modal_class.query.filter_by(slug = slug).first()
      self.obj = self.obj or self.importer.find_object(self.modal_class, slug)
      self.obj = self.obj or self.modal_class()
      self.importer.add_object(self.modal_class, slug, self.obj)
      if self.obj.id:
        self.add_warning('slug', "{} already exists and will be updated.".format(slug))
      return self.obj
    else:
      self.obj = self.modal_class()
      return self.obj

  def reify(self):
    self.handle('slug', SlugColumnHandler, is_required=True)
    self.handle_text_or_html('title', is_required=True)
    self.handle_text_or_html('content')

  def save_object(self, db_session, **options):
    db_session.add(self.obj)

class HelpConverter(BaseConverter):

  metadata_map = OrderedDict([
    ('Type','type'),
  ])

  object_map = OrderedDict([
    ('Code', 'slug'),
    ('Title', 'title'),
    ('Content', 'content')
    #('Company', 'company')
  ])

  row_converter = HelpRowConverter

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield ['Help']
    yield []
    yield []
    yield self.object_map.keys()

