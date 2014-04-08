# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
import ggrc.builder.json
import hashlib
import logging
import time
from blinker import Namespace
from exceptions import TypeError
from flask import url_for, request, current_app, g, has_request_context
from flask.ext.sqlalchemy import Pagination
from flask.views import View
from ggrc import db
from ggrc.utils import as_json, UnicodeSafeJsonWrapper, benchmark
from ggrc.fulltext import get_indexer
from ggrc.fulltext.recordbuilder import fts_record_for
from ggrc.login import get_current_user_id
from ggrc.models.cache import Cache
from ggrc.models.context import Context
from ggrc.models.event import Event
from ggrc.models.revision import Revision
from ggrc.models.exceptions import ValidationError, translate_message
from ggrc.rbac import permissions, context_query_filter
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
import sqlalchemy.orm.exc
from werkzeug.exceptions import BadRequest, Forbidden
from wsgiref.handlers import format_date_time
from urllib import urlencode
from .attribute_query import AttributeQueryBuilder

from ggrc import settings
from copy import deepcopy
from sqlalchemy.orm.session import Session
from sqlalchemy import event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.associationproxy import AssociationProxy
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.orm.properties import RelationshipProperty

CACHE_EXPIRY_COLLECTION=60
POLYMORPH_NONE=0
POLYMORPH_DEST_ONLY=1
POLYMORPH_SRCDEST=2

"""gGRC Collection REST services implementation. Common to all gGRC collection
resources.
"""

def _get_cache_manager():
  from ggrc.cache import CacheManager, MemCache
  cache_manager = CacheManager()
  cache_manager.initialize(MemCache())
  return cache_manager

def update_memcache_before_commit(context, modified_objects, expiry_time):
  """
  Preparing the memccache entries to be updated before DB commit
  Also update the memcache to indicate the status cache operation 'InProgress' waiting for DB commit
  Raises Exception on failures, cannot proceed with DB commit

  Args:
    context: POST/PUT/DELETE HTTP request or import Converter contextual object
    modified_objects:  objects in cache maintained prior to commiting to DB
    expiry_time: Expiry time specified for memcache ADD and DELETE
  Returns:
    None 

  """
  if getattr(settings, 'MEMCACHE_MECHANISM', False) is False:
    return

  context.cache_manager = _get_cache_manager()

  if len(modified_objects.new) > 0:
    items_to_add = modified_objects.new.items()
    for o, json_obj in items_to_add:
      json_obj = o.log_json()
      cls = o.__class__.__name__
      if context.cache_manager.supported_classes.has_key(cls):
        model_plural = context.cache_manager.supported_classes[cls]
        key = 'collection:' + model_plural + ':' + str(json_obj['id'])
        context.cache_manager.marked_for_add[key]=json_obj

        # Marking mapping links to be deleted from cache
        if context.cache_manager.supported_mappings.has_key(cls):
          (model, cls, srctype, srcname, dsttype, dstname, polymorph, cachetype) = \
              context.cache_manager.supported_mappings[cls]
          obj = getattr(o, srcname.replace('_id', ''), None)
          if obj:
            obj_key = 'collection:{}:{}'.format(
                obj._inflector.table_plural, obj.id)
            context.cache_manager.marked_for_delete.append(obj_key)
          obj = getattr(o, dstname.replace('_id', ''), None)
          if obj:
            obj_key = 'collection:{}:{}'.format(
                obj._inflector.table_plural, obj.id)
            context.cache_manager.marked_for_delete.append(obj_key)

  if len(modified_objects.dirty) > 0:
    items_to_update = modified_objects.dirty.items()
    for o, json_obj in items_to_update:
      json_obj = o.log_json()
      cls = o.__class__.__name__
      if context.cache_manager.supported_classes.has_key(cls):
        model_plural = context.cache_manager.supported_classes[cls]
        key = 'collection:' + model_plural + ':' + str(json_obj['id'])
        context.cache_manager.marked_for_update[key]=json_obj

  if len(modified_objects.deleted) > 0:
    items_to_delete=modified_objects.deleted.items()
    for o, json_obj in items_to_delete:
      cls = o.__class__.__name__
      if context.cache_manager.supported_classes.has_key(cls):
        model_plural = context.cache_manager.supported_classes[cls]
        object_key = 'collection:' + model_plural + ':' + str(json_obj['id'])
        context.cache_manager.marked_for_delete.append(object_key)
        # Marking mapping links to be deleted from cache
        if context.cache_manager.supported_mappings.has_key(cls):
          (model, cls, srctype, srcname, dsttype, dstname, polymorph, cachetype) = \
              context.cache_manager.supported_mappings[cls]
          obj = getattr(o, srcname.replace('_id', ''), None)
          if obj:
            obj_key = 'collection:{}:{}'.format(
                obj._inflector.table_plural, obj.id)
            context.cache_manager.marked_for_delete.append(obj_key)
          obj = getattr(o, dstname.replace('_id', ''), None)
          if obj:
            obj_key = 'collection:{}:{}'.format(
                obj._inflector.table_plural, obj.id)
            context.cache_manager.marked_for_delete.append(obj_key)

  status_entries ={}
  for key in context.cache_manager.marked_for_add.keys():
    build_cache_status(status_entries, 'CreateOp:' + key, expiry_time, 'InProgress')
  for key in context.cache_manager.marked_for_update.keys():
    build_cache_status(status_entries, 'UpdateOp:' + key, expiry_time, 'InProgress')
  for key in context.cache_manager.marked_for_delete:
    build_cache_status(status_entries, 'DeleteOp:' + key, expiry_time, 'InProgress')
  if len(status_entries) > 0:
    current_app.logger.info("CACHE: status entries: " + str(status_entries))
    ret = context.cache_manager.bulk_add(status_entries, expiry_time)
    if ret is not None and len(ret) == 0:
      pass
    else:
      current_app.logger.error('CACHE: Unable to add status for newly created entries in memcache ' + str(ret))


def update_memcache_after_commit(context, expiry_time):
  """
  The memccache entries is updated after DB commit
  Logs error if there are errors in updating entries in cache

  Args:
    context: POST/PUT/DELETE HTTP request or import Converter contextual object
    modified_objects:  objects in cache maintained prior to commiting to DB
    expiry_time: Expiry time specified for memcache ADD and DELETE
  Returns:
    None 

  """
  if getattr(settings, 'MEMCACHE_MECHANISM', False) is False:
    return

  if context.cache_manager is None:
    current_app.logger.error("CACHE: Error in initiaizing cache manager")
    return

  cache_manager = context.cache_manager

  if len(cache_manager.marked_for_add) > 0:
    #current_app.logger.info("CACHE: Bulk add: " + str(cache_manager.marked_for_add))
    result = cache_manager.bulk_delete(cache_manager.marked_for_add.keys(), 0)
    #add_result = cache_manager.bulk_add(cache_manager.marked_for_add)
    # result is empty on success, non-empty on failure
    # TODO(dan): handling failure including network errors, currently we log errors
    #if len(add_result) > 0: 
    #  current_app.logger.error("CACHE: Failed to add collection to cache: " + str(add_result))

  if len(cache_manager.marked_for_update) > 0:
    #current_app.logger.info("CACHE: Bulk Update : " + str(cache_manager.marked_for_update))
    result = cache_manager.bulk_delete(cache_manager.marked_for_update.keys(), 0)
    if result is not True:
      current_app.logger.error("CACHE: Failed to remove updated cache entries")

    #update_result = cache_manager.bulk_update(cache_manager.marked_for_update)
    # result is empty on success, non-empty on failure returns list of keys including network failures
    # TODO(dan): handling failure including network errors, currently we log errors
    #if len(update_result) > 0: 
    #  current_app.logger.error("CACHE: Failed to update collection in cache: " + str(update_result))

  # TODO(dan): check for duplicates in marked_for_delete
  if len(cache_manager.marked_for_delete) > 0:
    #current_app.logger.info("CACHE: Bulk Delete: " + str(cache_manager.marked_for_delete))
    delete_result = cache_manager.bulk_delete(cache_manager.marked_for_delete, 0)
    # TODO(dan): handling failure including network errors, currently we log errors
    if delete_result is not True:
      current_app.logger.error("CACHE: Failed to remoe collection from cache")

  status_entries =[]
  for key in cache_manager.marked_for_add.keys():
    status_entries.append('CreateOp:' + str(key))
  for key in cache_manager.marked_for_update.keys():
    status_entries.append('UpdateOp:' + str(key))
  for key in cache_manager.marked_for_delete:
    status_entries.append('DeleteOp:' + str(key))
  if len(status_entries) > 0:
    delete_result = cache_manager.bulk_delete(status_entries, 0)
    # TODO(dan): handling failure including network errors, currently we log errors
    if delete_result is not True:
      current_app.logger.error("CACHE: Failed to remove status entries from cache")

  cache_manager.clear_cache()

def build_cache_status(data, key, expiry_timeout, status):
  """
  Build the dictionary for storing operational status of cache

  Args:
    data: dictionary to update
    key: key to dictionary
    expiry_timeout: timeout for expiry cache
    status: Update status entry, e.g.InProgress
  Returns:
    None 
  """
  data[key] = {'expiry': expiry_timeout, 'status': status}

def inclusion_filter(obj):
  return permissions.is_allowed_read(obj.__class__.__name__, obj.context_id)

def get_cache(create=False):
  """
  Retrieves the cache from the Flask global object. The create arg
  indicates if a new cache should be created if none exists. If we
  are not in a request context, no cache is created (return None).
  """
  if has_request_context():
    cache = getattr(g, 'cache', None)
    if cache is None and create:
      cache = g.cache = Cache()
    return cache
  else:
    logging.warning("No request context - no cache created")
    return None

def get_modified_objects(session):
  session.flush()
  cache = get_cache()
  if cache:
    return cache.copy()
  else:
    return None

def update_index(session, cache):
  if cache:
    indexer = get_indexer()
    for obj in cache.new:
      indexer.create_record(fts_record_for(obj), commit=False)
    for obj in cache.dirty:
      indexer.update_record(fts_record_for(obj), commit=False)
    for obj in cache.deleted:
      indexer.delete_record(obj.id, obj.__class__.__name__, commit=False)
    session.commit()

def log_event(session, obj=None, current_user_id=None):
  revisions = []
  session.flush()
  if current_user_id is None:
    current_user_id = get_current_user_id()
  cache = get_cache()
  for o, log_json in cache.dirty.items():
    revision = Revision(o, current_user_id, 'modified', log_json)
    revisions.append(revision)
  for o, log_json in cache.deleted.items():
    revision = Revision(o, current_user_id, 'deleted', log_json)
    revisions.append(revision)
  for o, log_json in cache.new.items():
    revision = Revision(o, current_user_id, 'created', log_json)
    revisions.append(revision)
  if obj is None:
    resource_id = 0
    resource_type = None
    action = 'IMPORT'
  else:
    resource_id = obj.id
    resource_type = str(obj.__class__.__name__)
    action = request.method
  if revisions:
    event = Event(
      modified_by_id=current_user_id,
      action=action,
      resource_id=resource_id,
      resource_type=resource_type)
    event.revisions = revisions
    session.add(event)

class ModelView(View):
  DEFAULT_PAGE_SIZE = 20
  MAX_PAGE_SIZE = 100
  pk = 'id'
  pk_type = 'int'

  _model = None

  # Simple accessor properties
  @property
  def request(self):
    return request

  @property
  def model(self):
    return self._model

  @property
  def modified_attr_name(self):
    return 'updated_at'

  @property
  def modified_attr(self):
    """Return the model attribute to be used for Last-Modified header and
    sorting collection elements.
    """
    return getattr(self.model, self.modified_attr_name)

  def modified_at(self, obj):
    return getattr(obj, self.modified_attr_name)

  # Default model/DB helpers
  def get_collection(self, filter_by_contexts=True):
    if '__stubs_only' not in request.args and \
        hasattr(self.model, 'eager_query'):
      query = self.model.eager_query()
    else:
      query = db.session.query(self.model)
    joinlist = []
    if request.args:
      querybuilder = AttributeQueryBuilder(self.model)
      filter, joinlist, options = querybuilder.collection_filters(request.args)
      if filter is not None:
        for j in joinlist:
          query = query.join(j)
        query = query.filter(filter)
      if options:
        query = query.options(*options)
    if filter_by_contexts:
      contexts = permissions.read_contexts_for(self.model.__name__)
      filter_expr = context_query_filter(self.model.context_id, contexts)
      query = query.filter(filter_expr)
      for j in joinlist:
        j_class = j.property.mapper.class_
        j_contexts = permissions.read_contexts_for(j_class.__name__)
        if j_contexts is not None:
          query = query.filter(
              context_query_filter(j_class.context_id, j_contexts))
    if '__sort' not in request.args:
      query = query.order_by(self.modified_attr.desc())
    order_properties = []
    if '__sort' in request.args:
      sort_attrs = request.args['__sort'].split(",")
      sort_desc = request.args.get('__sort_desc', False)
      for sort_attr in sort_attrs:
        attr_desc = sort_desc
        if sort_attr.startswith('-'):
          attr_desc = not sort_desc
          sort_attr = sort_attr[1:]
        order_property = getattr(self.model, sort_attr, None)
        if order_property and hasattr(order_property, 'desc'):
          if attr_desc:
            order_property = order_property.desc()
          order_properties.append(order_property)
        else:
          # Possibly throw an exception instead, if sorting by invalid attribute?
          pass
    if len(order_properties) == 0:
      order_properties.append(self.modified_attr.desc())
    query = query.order_by(*order_properties)
    if '__limit' in request.args:
      try:
        limit = int(request.args['__limit'])
        query = query.limit(limit)
      except (TypeError, ValueError):
        pass
    return query

  def get_object(self, id):
    # This could also use `self.pk`
    # .one() is required as long as any .eager_load() adds joins using
    #   'contains_eager()' to the core query, because 'LIMIT 1' breaks up
    #   that JOIN result (e.g. Categorizable)
    try:
      return self.get_collection(filter_by_contexts=False)\
          .filter(self.model.id == id).one()
    except sqlalchemy.orm.exc.NoResultFound:
      return None

  def not_found_message(self):
    return '{0} not found.'.format(self.model._inflector.title_singular)

  def not_found_response(self):
    return current_app.make_response((self.not_found_message(), 404, []))

  def etag(self, last_modified):
    """Generate the etag given a datetime for the last time the resource was
    modified. This isn't as good as an etag generated off of a hash of the
    representation, but, it doesn't require the representation in order to be
    calculated. An alternative would be to keep an etag on the stored
    representation, but this will do for now.

    .. note::

       Using the datetime implies the need for some care - the resolution of
       the time object needs to be sufficient such that you don't end up with
       the same etag due to two updates performed in rapid succession.
    """
    return '"{0}"'.format(hashlib.sha1(str(last_modified)).hexdigest())

  def collection_last_modified(self):
    """Calculate the last time a member of the collection was modified. This
    method relies on the fact that the collection table has an `updated_at` or
    other column with a relevant timestamp; services for models that don't have
    this field **MUST** override this method.
    """
    result = db.session.query(
        self.modified_attr).order_by(self.modified_attr.desc()).first()
    if result is not None:
      return self.modified_at(result)
    return datetime.datetime.now()

  # Routing helpers
  @classmethod
  def endpoint_name(cls):
    return cls.__name__

  @classmethod
  def url_for_preserving_querystring(cls, *args, **kwargs):
    url = cls.url_for(*args, **kwargs)
    # preserve original query string
    idx = request.url.find('?')
    querystring = '' if idx < 0 else '?' + request.url[idx+1:]
    return url + querystring

  @classmethod
  def base_url_for(cls, _memoized_base_url={}):
    if cls not in _memoized_base_url:
      _memoized_base_url[cls] = url_for(cls.endpoint_name())
    return _memoized_base_url[cls]

  @classmethod
  def url_for(cls, *args, **kwargs):
    url = cls.base_url_for()
    if len(args) > 0:
      arg = args[0]
      id = arg if not isinstance(arg, db.Model) else arg.id
      url = url + '/' + str(id)
    if 'id' in kwargs:
      url = url + '/' + str(kwargs['id'])
      del kwargs['id']
    if len(kwargs) > 0:
      url = url + '?' + urlencode(kwargs)
    return url

  @classmethod
  def decorate_view_func(cls, view_func, decorators):
    if not isinstance(decorators, (list, tuple)):
      decorators = (decorators,)
    for decorator in reversed(decorators):
      view_func = decorator(view_func)
    return view_func


# View base class for Views handling
#   - /resources (GET, POST)
#   - /resources/<pk:pk_type> (GET, PUT, POST, DELETE)
class Resource(ModelView):
  """View base class for Views handling.  Will typically be registered with an
  application following a collection style for routes. Collection `GET` and
  `POST` will have a route like `/resources` while collection member
  resource routes will have routes likej `/resources/<pk:pk_type>`.

  To register a Resource subclass FooCollection with a Flask application:

  ..

     FooCollection.add_to(app, '/foos')

  By default will only support the `application/json` content-type.
  """

  signals = Namespace()
  model_posted = signals.signal('Model POSTed',
    """
    Indicates that a model object was received via POST and will be committed
    to the database. The sender in the signal will be the model class of the
    POSTed resource. The following arguments will be sent along with the
    signal:

      :obj: The model instance created from the POSTed JSON.
      :src: The original POSTed JSON dictionary.
      :service: The instance of Resource handling the POST request.  
    """,
    )
  model_put = signals.signal('Model PUT',
      """
      Indicates that a model object update was received via PUT and will be
      updated in the database. The sender in the signal will be the model class
      of the PUT resource. The following arguments will be sent along with the
      signal:

        :obj: The model instance updated from the PUT JSON.
        :src: The original PUT JSON dictionary.
        :service: The instance of Resource handling the PUT request.
      """,
      )
  model_deleted = signals.signal('Model DELETEd',
      """
      Indicates that a model object was DELETEd and will be removed from the
      databse. The sender in the signal will be the model class of the DELETEd
      resource. The followin garguments will be sent along with the signal:

        :obj: The model instance removed.
        :service: The instance of Resource handling the DELETE request.
      """,
      )

  def dispatch_request(self, *args, **kwargs):
    method = request.method

    if method in ('POST', 'PUT', 'DELETE')\
        and 'X-Requested-By' not in request.headers:
      raise BadRequest('X-Requested-By header is REQUIRED.')

    try:
      if method == 'GET':
        if self.pk in kwargs and kwargs[self.pk] is not None:
          return self.get(*args, **kwargs)
        else:
          return self.collection_get()
      elif method == 'POST':
        if self.pk in kwargs and kwargs[self.pk] is not None:
          return self.post(*args, **kwargs)
        else:
          return self.collection_post()
      elif method == 'PUT':
        return self.put(*args, **kwargs)
      elif method == 'DELETE':
        return self.delete(*args, **kwargs)
      else:
        raise NotImplementedError()
    except (IntegrityError, ValidationError) as v:
      message = translate_message(v)
      current_app.logger.warn(message)
      return ((message, 403, []))

  def post(*args, **kwargs):
    raise NotImplementedError()

  # Default JSON request handlers
  def get(self, id):
    with benchmark("Query for object"):
      obj = self.get_object(id)
    if obj is None:
      return self.not_found_response()
    if 'Accept' in self.request.headers and \
        'application/json' not in self.request.headers['Accept']:
      return current_app.make_response((
        'application/json', 406, [('Content-Type', 'text/plain')]))
    if not permissions.is_allowed_read(self.model.__name__, obj.context_id):
      raise Forbidden()
    if not permissions.is_allowed_read_for(obj):
      raise Forbidden()
    with benchmark("Serialize object"):
      object_for_json = self.object_for_json(obj)

    if 'If-None-Match' in self.request.headers and \
        self.request.headers['If-None-Match'] == self.etag(object_for_json):
      return current_app.make_response((
        '', 304, [('Etag', self.etag(object_for_json))]))
    return self.json_success_response(
      object_for_json, self.modified_at(obj))

  def validate_headers_for_put_or_delete(self, obj):
    missing_headers = []
    if 'If-Match' not in self.request.headers:
      missing_headers.append('If-Match')
    if 'If-Unmodified-Since' not in self.request.headers:
      missing_headers.append('If-Unmodified-Since')
    if missing_headers:
      # rfc 6585 defines a new status code for missing required headers
      return current_app.make_response((
        'If-Match is required.', 428, [('Content-Type', 'text/plain')]))
    if request.headers['If-Match'] != self.etag(self.object_for_json(obj)) or \
        request.headers['If-Unmodified-Since'] != \
          self.http_timestamp(self.modified_at(obj)):
      return current_app.make_response((
          'The resource has been changed. The conflict must be resolved and '
          'the request resubmitted with an up to date Etag for If-Match '
          'header.',
          409,
          [('Content-Type', 'text/plain')]
          ))
    return None

  def json_update(self, obj, src):
    ggrc.builder.json.update(obj, src)

  def put(self, id):
    with benchmark("Query for object"):
      obj = self.get_object(id)
    if obj is None:
      return self.not_found_response()
    if self.request.mimetype != 'application/json':
      return current_app.make_response((
        'Content-Type must be application/json', 415,[]))
    header_error = self.validate_headers_for_put_or_delete(obj)
    if header_error:
      return header_error
    src = UnicodeSafeJsonWrapper(self.request.json)
    root_attribute = self.model._inflector.table_singular
    try:
      src = src[root_attribute]
    except KeyError, e:
      return current_app.make_response((
        'Required attribute "{0}" not found'.format(root_attribute), 400, []))
    if not permissions.is_allowed_update(self.model.__name__, obj.context_id):
      raise Forbidden()
    if not permissions.is_allowed_update_for(obj):
      raise Forbidden()
    new_context = self.get_context_id_from_json(src)
    if new_context != obj.context_id \
        and not permissions.is_allowed_update(self.model.__name__, new_context):
      raise Forbidden()
    with benchmark("Deserialize object"):
      self.json_update(obj, src)
    obj.modified_by_id = get_current_user_id()
    db.session.add(obj)
    self.model_put.send(obj.__class__, obj=obj, src=src, service=self)
    modified_objects = get_modified_objects(db.session)
    log_event(db.session, obj)
    with benchmark("Update memcache before commit for resource collection PUT"):
      update_memcache_before_commit(self.request, modified_objects, CACHE_EXPIRY_COLLECTION)
    with benchmark("Commit"):
      db.session.commit()
    with benchmark("Query for object"):
      obj = self.get_object(id)
    update_index(db.session, modified_objects)
    with benchmark("Update memcache after commit for resource collection PUT"):
      update_memcache_after_commit(self.request, CACHE_EXPIRY_COLLECTION)
    with benchmark("Serialize collection"):
      object_for_json = self.object_for_json(obj)
    return self.json_success_response(
        object_for_json, self.modified_at(obj))

  def delete(self, id):
    with benchmark("Query for object"):
      obj = self.get_object(id)

    if obj is None:
      return self.not_found_response()
    header_error = self.validate_headers_for_put_or_delete(obj)
    if header_error:
      return header_error
    if not permissions.is_allowed_delete(self.model.__name__, obj.context_id):
      raise Forbidden()
    if not permissions.is_allowed_delete_for(obj):
      raise Forbidden()
    db.session.delete(obj)
    self.model_deleted.send(obj.__class__, obj=obj, service=self)
    modified_objects = get_modified_objects(db.session)
    log_event(db.session, obj)
    with benchmark("Update memcache before commit for resource collection DELETE"):
      update_memcache_before_commit(self.request, modified_objects, CACHE_EXPIRY_COLLECTION)
    with benchmark("Commit"):
      db.session.commit()
    update_index(db.session, modified_objects)
    with benchmark("Update memcache after commit for resource collection DELETE"):
      update_memcache_after_commit(self.request, CACHE_EXPIRY_COLLECTION)
    with benchmark("Query for object"):
      object_for_json = self.object_for_json(obj)
    return self.json_success_response(
      object_for_json, self.modified_at(obj))

  def collection_get(self):
    if 'Accept' in self.request.headers and \
        'application/json' not in self.request.headers['Accept']:
      return current_app.make_response((
        'application/json', 406, [('Content-Type', 'text/plain')]))

    cache_supported = False
    if getattr(settings, 'MEMCACHE_MECHANISM', False) is True:
      stubs_in_args = '__stubs_only' in request.args
      if stubs_in_args:
        category = 'stubs'
      else:
        category = 'collection'
      model_plural = self.model._inflector.table_plural
      cache_response = None
      collection_name = '{0}_collection'.format(model_plural)
      self.request.cache_manager = _get_cache_manager()
      cache_supported=self.request.cache_manager.is_caching_supported(category, model_plural)
      if cache_supported:
        with benchmark("Get resource collection from Memcache"):
          cache_response = self.get_collection_from_cache(category, model_plural, collection_name, model_plural)
        if cache_response is not None:
          current_app.logger.info("CACHE: Successfully response from cache for resource collection: " + model_plural)
          return cache_response
      else:
        current_app.logger.info("CACHE: Caching is not supported for " + \
          model_plural + " in " + category + " category")

    with benchmark("Query for collection"):
      objs = self.get_collection()

    with benchmark("Serialize collection"):
      collection = self.collection_for_json(objs)

    if 'If-None-Match' in self.request.headers and \
        self.request.headers['If-None-Match'] == self.etag(collection):
      return current_app.make_response((
        '', 304, [('Etag', self.etag(collection))]))

    # Write collection to cache, if caching is supported for the model
    #
    if cache_supported:
      with benchmark("Check status entries in Memcache"):
        cache_in_progress=self.is_caching_in_progress(category, model_plural)
      if cache_in_progress is False:
        with benchmark("Write resource collection to Memcache"):
          cache_response = self.write_collection_to_cache(collection, category, model_plural,\
                                collection_name, model_plural)
      else:
        current_app.logger.warn("CACHE: Cache operation in progress state, Unable to write collection to cache for resource: "  +\
          model_plural + " in " + category + " category")

    filter_collection = self.filter_collection(collection_name, model_plural, collection)
    return self.json_success_response(
      filter_collection, self.collection_last_modified(), cache_op='Miss')

  def is_caching_in_progress(self, category, resource):
    """Check the current state of cache and in progress

    Calls the cachemanager to do a bulk GET of status of any operation in cache for the resource 
    The status entries for create, update and delete operation is maintained in memcache
    
    Args:
       category: collection
       resource: regulations, programs, controls, etc.

    Returns:
      True if any resource is question has operation in progress (All or None policy)
      False otherwise
    """
    if self.request.cache_manager is None:
      current_app.logger.warn("CACHE: CacheManager is not initialized")
      return False

    # Check in cache for collection and stubs to determine if cache needs to be invalidated
    #
    status_keys=[]
    cacheobjids = request.args.get('id__in', False)
    if cacheobjids and hasattr(self.model, 'eager_query'):
      for id in cacheobjids:
        status_keys.append('CreateOp:' + category + ':' + resource + ':' + str(id))
        status_keys.append('UpdateOp:' + category + ':' + resource + ':' + str(id))
        status_keys.append('DeleteOp:' + category + ':' + resource + ':' + str(id))
    else:
      return False

    result = self.request.cache_manager.bulk_get(status_keys)
    if len(result) > 0:
      for key, value in result:
        status = value['status']
        if status == 'InProgress':
          return True

    return False

  def filter_collection(self, name, resource, collection_data):
    """ Filter JSON collection that have read permission

    The collection GET gets all items with inclusion_filter set to True. The colleciton items are filtered
    with read permission checks on the the items 

    Args:
       name: collection name such as regulations_collection
       resource: regulations
       collection_data : GET collection JSON response

    Returns:
     filter_data : Filtered collection data after adding only 
    """
    cacheobjids = request.args.get('id__in', False)
    if not (cacheobjids and hasattr(self.model, 'eager_query')):
      return collection_data

    data = collection_data[name][resource]
    filter_data = {name: {resource: []}}
    for attrs in data:
      context_id = self.get_context_id_from_json(attrs)
      if not permissions.is_allowed_read(self.model.__name__, context_id):
        current_app.logger.warn("CACHE: Read permissions is not allowed for id: " + str(id))
        continue
      filter_attrs=self.filter_relationship_attrs(None, attrs)
      filter_data[name][resource].append(filter_attrs)
    filter_data[name]['selfLink'] = collection_data[name]['selfLink']
    return filter_data

  def filter_relationship_attrs(self, id, attrs):
    """ Filter relationship that have read permission

    Traverse through JSON representation in cache and find attributes with "RelationshipProperty"
    The relationship property value dictionary keys 'type' and 'context' are extracted.
    If context is not None, RBAC permission allowed_for_read permission is performed and filtered if needed. 
    
    Args:
       id: Resource ID
       attrs: dictionary containing JSON representation in cache

    Returns:
      filter_attrs: Dictionary that filters out relationship items that pass RBAC permission checks
    """

    filter_attrs={}
    for key, val in attrs.items():
      filter_attrs[key] = val
      if hasattr(self.model, key):
        class_attr = getattr(self.model, key)
        if (isinstance(class_attr, InstrumentedAttribute) and  \
            isinstance(class_attr.property, RelationshipProperty)) or \
            isinstance(class_attr, AssociationProxy):
          if type(val) is list:
            updated_val=[]
            for item in val:
              if self.is_read_allowed_for_item(key, item):
                if type(item) is dict:
                  for sub_key, sub_val in item.items():
                    if not self.is_read_allowed_for_item(sub_key, sub_val):
                      item[sub_key] = None
                updated_val.append(item)
            filter_attrs[key] = updated_val
          else:
            if not self.is_read_allowed_for_item(key, val):
              filter_attrs[key] = None
    return filter_attrs

  def is_read_allowed_for_item(self, key, item):
    """  Check allowed for each item of type dictionary

    Get context_id for given dictionary item and check if there are permissions to read for the item
    dictionary with keys type and context (or context_id)
    
    Args:
       key:  name of the resource item
       item: dictionary with keys type, context (or context_id)

    Returns:
      True if read permissions allowed or item is not a dictionary, type for the item is not found,
            context or context-id is not set in the item to check
      False otherwise
    """
    if type(item) is not dict:
      return True
    type_found    = item.has_key('type')
    context_found = item.has_key('context')
    context_id = None
    if type_found:
      item_type = item['type']
      if context_found:
        if item['context'] is not None and item['context'].has_key('id'):
          context_id = item['context']['id']
        elif item['context'] is not None and item.has_key('context_id'):
          context_id = item['context_id']
        elif item['context'] is None:
          context_id = None
        else:
          current_app.logger.warn("CACHE: context-1 is not available for key: " + key + " item: " + str(item))
          return True
      else:
        if item.has_key('context_id'):
          context_id = item['context_id']
        else:
          current_app.logger.warn("CACHE: context-2 is not available for key: " + key + " item: " + str(item))
          return True
      if not permissions.is_allowed_read(item_type, context_id):
        current_app.logger.warn("CACHE: Read Permission not allowed key: " + str(key) + " value: " + str(item))
        return False
      else:
        return True
    else:
      return True

  def get_collection_from_cache(self, category, resource, x_category, x_resource):
    """Get collection (objects or stubs) from cache

    Parse the request arguments and handles stubs and eager query related collection requests
    Invokes cache manager interface to get collection from cache (e.g. memcache) 
    The collection entry key is collection.<resource>.<id> and value is JSON object (dictionary of attr names, values)
    
    Args:
       category: collection 
       resource: regulations, programs, controls, etc.
       x_category: Output category for the JSON response (resource_collection)
       x_resource: Output resource for JSON response (resource)

    Returns:
      None if any one of the entries is not found in cache, caching is not supported for the resource, 
           request is not a collection
      JSON response on successfully retreiving entries from cache, caching is supported, and
           request is an eager query and collection 
    """
    if self.request.cache_manager is None:
      current_app.logger.warn("CACHE: CacheManager is not initialized")
      return None

    cacheobjids = request.args.get('id__in', False)
    etag = request.args.get('_', False)
    if cacheobjids and hasattr(self.model, 'eager_query'):
      cacheobjidstr = cacheobjids.replace(',', '%2C')
      ids = [long(i) for i in cacheobjids.split(',')]
      filter={'ids':ids, 'attrs':None}
      data = self.request.cache_manager.get_collection(category, resource, filter)
      if data is not None and len(data) > 0:
        converted_data = {x_category: {x_resource: []}}
        for id, attrs in data.items():
          context_id = self.get_context_id_from_json(attrs)
          if not permissions.is_allowed_read(self.model.__name__, context_id):
            continue
          filter_attrs=self.filter_relationship_attrs(id, attrs)
          converted_data[x_category][x_resource].append(filter_attrs)
        selfLink = self.url_for_preserving_querystring(),
        converted_data[x_category]['selfLink'] = selfLink
        controls_data = converted_data[x_category][x_resource]
        if len(controls_data) > 0:
          return self.json_success_response(converted_data, datetime.datetime.now(), cache_op='Hit')
        else:
          return None
      else:
        return None
    else:
      current_app.logger.info("CACHE: Caching is only supported for collection for model: " + resource)
      return None

  def write_collection_to_cache(self, collection, category, resource, x_category, x_resource):
    """Write collection (objects) to cache

    Parse the request arguments and handles eager query related collection requests
    Invokes cache manager interface to write collection into cache (e.g. memcache) 
    The collection entry key is collection.<resource>.<id> and value is JSON object (dictionary of attr names, values)
    
    Args:
       collection: JSON object returned from SQLAlchemy data-ORM layer
       category: collection, etc.
       resource: regulations, programs, controls, etc.
       x_category: Output category for the JSON response (resource_collection)
       x_resource: Output resource for JSON response (resource)

    Returns:
      None Errors in writing to cache, caching is not supported for the resource, 
           and request is not a collection
      JSON response on successfully retreiving entries from cache, if caching is supported,
           and request is an eager query and collection
    """
    if self.request.cache_manager is None:
      current_app.logger.warn("CACHE: CacheManager is not initialized")
      return None

    cacheobjids=None
    if category is 'collection':
      cacheobjids = request.args.get('id__in', False)

    if cacheobjids and hasattr(self.model, 'eager_query'):
      if collection.has_key(x_category):
        resource_collection= collection.get(x_category).get(x_resource)
        cacheData={}
        for aresource in resource_collection:
          id = aresource['id']
          cacheData[id] = deepcopy(aresource)
        write_result = self.request.cache_manager.add_collection(category, resource, cacheData)
        if write_result is None:
          current_app.logger.warn("CACHE: Unable to write collection to cache")
          return None
        else:
          current_app.logger.info("CACHE: Successfully written collection to cache")
          return write_result
      else:
        current_app.logger.error("CACHE: Unable to find data in source collection for model: " + resource)
        return None
    else:
      current_app.logger.info("CACHE: Caching is only supported for collection for model: " + resource)
      return None

  def json_create(self, obj, src):
    ggrc.builder.json.create(obj, src)

  def get_context_id_from_json(self, src):
    context = src.get('context', None)
    if context:
      context_id = context.get('id', None)
      try:
        return int(context_id)
      except (ValueError, TypeError):
        return None
    return None

  def personal_context(self):
    current_user_id = get_current_user_id()
    context = db.session.query(Context).filter(
        Context.related_object_id == current_user_id,
        Context.related_object_type == 'Person',
        ).first()
    if not context:
      context = Context(
          name='Personal Context for {0}'.format(current_user_id),
          description='',
          context_id=1,
          related_object_id=current_user_id,
          related_object_type='Person',
          )
      db.session.add(context)
      db.session.commit()
    return context

  def handle_create(self, obj, src):
    """Do NOTHING by default"""
    pass

  def collection_post(self):
    if self.request.mimetype != 'application/json':
      return current_app.make_response((
        'Content-Type must be application/json', 415,[]))
    obj = self.model()
    src = UnicodeSafeJsonWrapper(self.request.json)
    root_attribute = self.model._inflector.table_singular
    try:
      src = src[root_attribute]
    except KeyError, e:
      return current_app.make_response((
        'Required attribute "{0}" not found'.format(root_attribute), 400, []))
    if not permissions.is_allowed_create(
        self.model.__name__, self.get_context_id_from_json(src)):
      raise Forbidden()
    if src.get('private') == True and src.get('context') is not None \
        and src['context'].get('id') is not None:
      raise BadRequest(
        'context MUST be "null" when creating a private resource.')
    elif 'context' not in src:
      raise BadRequest('context MUST be specified.')
    else:
      if not permissions.is_allowed_create(
          self.model.__name__, self.get_context_id_from_json(src)):
        raise Forbidden()
    with benchmark("Deserialize object"):
      self.json_create(obj, src)
    self.model_posted.send(obj.__class__, obj=obj, src=src, service=self)
    obj.modified_by_id = get_current_user_id()
    db.session.add(obj)
    modified_objects = get_modified_objects(db.session)
    log_event(db.session, obj)
    with benchmark("Update memcache before commit for resource collection POST"):
      update_memcache_before_commit(self.request, modified_objects, CACHE_EXPIRY_COLLECTION)
    with benchmark("Commit"):
      db.session.commit()
    update_index(db.session, modified_objects)
    with benchmark("Update memcache after commit for resource collection POST"):
      update_memcache_after_commit(self.request, CACHE_EXPIRY_COLLECTION)
    with benchmark("Serialize object"):
      object_for_json = self.object_for_json(obj)
    return self.json_success_response(
      object_for_json, self.modified_at(obj), id=obj.id, status=201)

  @classmethod
  def add_to(cls, app, url, model_class=None, decorators=()):
    if model_class:
      service_class = type(model_class.__name__, (cls,), {
        '_model': model_class,
        })
      import ggrc.services
      setattr(ggrc.services, model_class.__name__, service_class)
    else:
      service_class = cls
    view_func = service_class.as_view(service_class.endpoint_name())
    view_func = cls.decorate_view_func(view_func, decorators)
    app.add_url_rule(
        url,
        defaults={cls.pk: None},
        view_func=view_func,
        methods=['GET','POST'])
    app.add_url_rule(
        '{url}/<{type}:{pk}>'.format(url=url, type=cls.pk_type, pk=cls.pk),
        view_func=view_func,
        methods=['GET', 'PUT', 'DELETE'])

  # Response helpers
  @classmethod
  def as_json(cls, obj, **kwargs):
    return as_json(obj, **kwargs)

  def object_for_json(self, obj, model_name=None, properties_to_include=None):
    model_name = model_name or self.model._inflector.table_singular
    json_obj = ggrc.builder.json.publish(
        obj, properties_to_include or [], inclusion_filter)
    return { model_name: json_obj }

  def get_properties_to_include(self, inclusions):
    #FIXME This needs to be improved to deal with branching paths... if that's
    #desirable or needed.
    if inclusions is not None:
      if len(inclusions) == 0:
        raise BadRequest(
            'The __include query parameter requires at least one field to be '
            'included.')
      paths = inclusions.split(',')
      inclusions = []
      for p in paths:
        path = p.split('.')
        if len(path) == 1:
          inclusions.append(tuple(path))
        else:
          inclusions.append((path[0], tuple(path[1:])))
    else:
      inclusions = ()
    return inclusions

  def build_page_object_for_json(self, paging):
    def page_args(next_num, per_page):
      # coerce the values to be plain strings, rather than unicode
      ret = dict([(k,str(v)) for k,v in request.args.items()])
      ret['__page'] = next_num
      if '__page_size' in ret:
        ret['__page_size'] = per_page
      return ret
    paging_obj = {}
    base_url = self.url_for()
    page_url = lambda params: base_url + '?' + urlencode(params)
    if paging.has_next:
      paging_obj['next'] = page_url(
          page_args(paging.next_num, paging.per_page))
    if paging.has_prev:
      paging_obj['prev'] = page_url(
          page_args(paging.prev_num, paging.per_page))
    paging_obj['first'] = page_url(page_args(1, paging.per_page))
    paging_obj['last'] = page_url(page_args(paging.pages, paging.per_page))
    paging_obj['count'] = paging.pages
    paging_obj['total'] = paging.total
    return paging_obj

  def build_collection_for_json(
      self, objects, model_plural, collection_name, paging=None):
    objects_json = []
    stubs = '__stubs_only' in request.args
    for obj in objects:
      if not stubs:
        object_for_json = ggrc.builder.json.publish(
            obj,
            self.get_properties_to_include(request.args.get('__include'))
            )
      else:
        object_for_json = ggrc.builder.json.publish_stub(
            obj, (), inclusion_filter)
      objects_json.append(object_for_json)
    collection_json = {
        collection_name: {
          'selfLink': self.url_for_preserving_querystring(),
          model_plural: objects_json,
          }
        }
    if paging:
      collection_json[collection_name]['paging'] = \
          self.build_page_object_for_json(paging)
    return collection_json

  def paged_collection_for_json(
      self, query, model_plural, collection_name):
    page_number = int(request.args['__page'])
    page_size = min(
        int(request.args.get('__page_size', self.DEFAULT_PAGE_SIZE)),
        self.MAX_PAGE_SIZE)
    items = query.limit(page_size).offset((page_number-1)*page_size).all()
    if page_number == 1 and len(items) < page_size:
      total = len(items)
    else:
      total = query.from_self().order_by(None).count()
    page = Pagination(query, page_number, page_size, total, items)
    return self.build_collection_for_json(
        page.items, model_plural, collection_name, paging=page)

  def collection_for_json(
      self, objects, model_plural=None, collection_name=None):
    model_plural = model_plural or self.model._inflector.table_plural
    collection_name = collection_name or '{0}_collection'.format(model_plural)
    if '__page' in request.args:
      return self.paged_collection_for_json(
          objects, model_plural, collection_name)
    return self.build_collection_for_json(
        objects, model_plural, collection_name)

  def http_timestamp(self, timestamp):
    return format_date_time(time.mktime(timestamp.utctimetuple()))

  def json_success_response(
      self, response_object, last_modified, status=200, id=None, cache_op=None):
    headers = [
        ('Last-Modified', self.http_timestamp(last_modified)),
        ('Etag', self.etag(response_object)),
        ('Content-Type', 'application/json'),
        ]
    if id:
      headers.append(('Location', self.url_for(id=id)))
    if cache_op:
      headers.append(('X-GGRC-Cache', cache_op))
    return current_app.make_response(
      (self.as_json(response_object), status, headers))

  def getval(self, src, attr, *args):
    if args:
      return src.get(unicode(attr), *args)
    return src.get(unicode(attr))

class ReadOnlyResource(Resource):
  def dispatch_request(self, *args, **kwargs):
    method = request.method

    if method == 'GET':
      return super(ReadOnlyResource, self).dispatch_request(*args, **kwargs)
    else:
      raise NotImplementedError()
