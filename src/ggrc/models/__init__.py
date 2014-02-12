# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from .all_models import *

"""All gGRC model objects and associated utilities."""

def create_db_with_create_all():
  from ggrc.app import db
  import ggrc.models.all_models
  db.create_all()

def create_db_with_migrations(quiet=False):
  from ggrc.app import db
  from ggrc.migrate import upgradeall
  import logging
  if quiet:
    logging.disable(logging.INFO)
  upgradeall()
  if quiet:
    logging.disable(logging.NOTSET)

def drop_db_with_drop_all():
  from ggrc.app import db
  import ggrc.models.all_models
  db.drop_all()

def drop_db_with_migrations(quiet=False):
  from ggrc.app import db
  from ggrc.migrate import downgradeall
  import ggrc.models.all_models
  import logging
  from ggrc import settings
  if quiet:
    logging.disable(logging.INFO)
  if 'mysql' in settings.SQLALCHEMY_DATABASE_URI:
    db.engine.execute('SET FOREIGN_KEY_CHECKS = 0')
  downgradeall(drop_versions_table=True)
  if quiet:
    logging.disable(logging.NOTSET)
  if 'mysql' in settings.SQLALCHEMY_DATABASE_URI:
    db.engine.execute('SET FOREIGN_KEY_CHECKS = 1')

def create_db(use_migrations=False, quiet=False):
  if use_migrations:
    create_db_with_migrations(quiet)
  else:
    create_db_with_create_all()

def drop_db(use_migrations=False, quiet=False):
  if use_migrations:
    drop_db_with_migrations(quiet)
  else:
    drop_db_with_drop_all()

def init_app(app):
  from .all_models import all_models
  [model._inflector for model in all_models]

  from sqlalchemy.orm.session import Session
  from sqlalchemy import event
  from .cache import Cache
  from ggrc.services.common import get_cache

  def update_cache_before_flush(session, flush_context, objects):
    cache = get_cache(create = True)
    if cache:
      cache.update_before_flush(session, flush_context)

  def update_cache_after_flush(session, flush_context):
    cache = get_cache(create = False)
    if cache:
      cache.update_after_flush(session, flush_context)

  def clear_cache(session):
    cache = get_cache()
    if cache:
      cache.clear()

  event.listen(Session, 'before_flush', update_cache_before_flush)
  event.listen(Session, 'after_flush', update_cache_after_flush)
  event.listen(Session, 'after_commit', clear_cache)
  event.listen(Session, 'after_rollback', clear_cache)

  # Register event listener on all String and Text attributes to sanitize them.
  import bleach
  import sqlalchemy as sa
  from ggrc.models.reflection import SanitizeHtmlInfo

  # Set up custom tags/attributes for bleach
  bleach_tags = [
      'caption', 'strong', 'em', 'b', 'i', 'p', 'code', 'pre', 'tt', 'samp',
      'kbd', 'var', 'sub', 'sup', 'dfn', 'cite', 'big', 'small', 'address',
      'hr', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul',
      'ol', 'li', 'dl', 'dt', 'dd', 'abbr', 'acronym', 'a', 'img',
      'blockquote', 'del', 'ins', 'table', 'tbody', 'tr', 'td', 'th',
      ] + bleach.ALLOWED_TAGS
  bleach_attrs = {}
  attrs = [
      'href', 'src', 'width', 'height', 'alt', 'cite', 'datetime',
      'title', 'class', 'name', 'xml:lang', 'abbr'
      ]
  for tag in bleach_tags:
    bleach_attrs[tag] = attrs
  def cleaner(target, value, oldvalue, initiator):
    ret = bleach.clean(value, bleach_tags, bleach_attrs)
    return ret

  for model in all_models:
    attr_info = SanitizeHtmlInfo(model)
    for attr_name in attr_info._sanitize_html:
      attr = getattr(model, attr_name)
      sa.event.listen(attr, 'set', cleaner, retval=True)

from .inflector import get_model
