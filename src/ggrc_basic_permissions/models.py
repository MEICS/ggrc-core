# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import json
from flask import current_app
from ggrc import db
from ggrc.builder import simple_property
from ggrc.models.context import Context
from ggrc.models.mixins import Base, Described
from sqlalchemy.orm import backref
from .contributed_roles import DECLARED_ROLE, get_declared_role

class Role(Base, Described, db.Model):
  """A user role. All roles have a unique name. This name could be a simple
  string, an email address, or some other form of string identifier.
  
  :permissions:
    example -
      { 'create': ['Program', 'Control'],
        'read': ['Program', 'Control'],
        'update': ['Program', 'Control'],
        'delete': ['Program']
      }
  """
  __tablename__ = 'roles'

  name = db.Column(db.String(128), nullable=False)
  permissions_json = db.Column(db.Text(), nullable=False)
  scope = db.Column(db.String(64), nullable=False)

  @simple_property
  def permissions(self):
    if self.permissions_json == DECLARED_ROLE:
      declared_role = get_declared_role(self.name)
      permissions = declared_role.permissions
    else:
      permissions = json.loads(self.permissions_json) or {}
    # make sure not to omit actions
    for action in ['create', 'read', 'update', 'delete']:
      if action not in permissions:
        permissions[action] = []
    return permissions

  @permissions.setter
  def permissions(self, value):
    self.permissions_json = json.dumps(value)

  _publish_attrs = ['name', 'permissions', 'scope']

  @classmethod
  def eager_query(cls):
    from sqlalchemy import not_
    query = super(Role, cls).eager_query()
    # FIXME: 'RoleReader' role should not be shown in interface, but this is
    #   the wrong place to filter it.
    return query.filter(not_(cls.name == 'RoleReader'))

  def _display_name(self):
    return self.name

from ggrc.models.person import Person
Person._publish_attrs.extend(['user_roles'])
Person._include_links = ['user_roles']

class UserRole(Base, db.Model):
  __tablename__ = 'user_roles'

  role_id = db.Column(db.Integer(), db.ForeignKey('roles.id'), nullable=False)
  role = db.relationship(
      'Role', backref=backref('user_roles', cascade='all, delete-orphan'))
  person_id = db.Column(db.Integer(), db.ForeignKey('people.id'), nullable=False)
  person = db.relationship(
      'Person', backref=backref('user_roles', cascade='all, delete-orphan'))

  _publish_attrs = ['role', 'person']

  @classmethod
  def role_assignments_for(cls, context):
    context_id = context.id if type(context) is Context else context
    all_assignments = db.session.query(UserRole)\
        .filter(UserRole.context_id == context_id)
    assignments_by_user = {}
    for assignment in all_assignments:
        assignments_by_user.setdefault(assignment.person.email, [])\
            .append(assignment.role)
    return assignments_by_user

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(UserRole, cls).eager_query()
    return query.options(
        orm.subqueryload('role'),
        orm.subqueryload('person'))

  def _display_name(self):
    if self.context and self.context.related_object:
      context_related = ' in ' + self.context.related_object.display_name
    elif hasattr(self, '_display_related_title'):
      context_related = ' in ' + self._display_related_title
    elif self.context:
      current_app.logger.warning(
          'Unable to identify context.related for UserRole')
      context_related = ''
    else:
      context_related = ''
    return '{0} <-> {1}{2}'.format(
        self.person.display_name, self.role.display_name, context_related)

class RoleImplication(Base, db.Model):
  __tablename__ = 'role_implications'

  context_id = db.Column(
      db.Integer(), db.ForeignKey('contexts.id'), nullable=True)
  source_context_id = db.Column(
      db.Integer(), db.ForeignKey('contexts.id'), nullable=True)
  source_role_id = db.Column(
      db.Integer(), db.ForeignKey('roles.id'), nullable=False)
  role_id = db.Column(
      db.Integer(), db.ForeignKey('roles.id'), nullable=False)

  context = db.relationship(
      'Context',
      uselist=False,
      foreign_keys=[context_id],
      )
  source_context = db.relationship(
      'Context',
      uselist=False,
      foreign_keys=[source_context_id],
      )
  source_role = db.relationship(
      'Role',
      uselist=False,
      foreign_keys=[source_role_id],
      )
  role = db.relationship(
      'Role',
      uselist=False,
      foreign_keys=[role_id],
      )

  #@classmethod
  #def eager_query(cls):
    #from sqlalchemy import orm

    #query = super(RoleImplication, cls).eager_query()
    #return query.options(
        #orm.subqueryload('source_context'),
        #orm.subqueryload('source_role'),
        #orm.subqueryload('role'),
        #)

  def _display_name(self):
    if self.source_context:
      source_context_display_name = self.source_context.display_name
    else:
      source_context_display_name = 'Default Context'
    if self.context:
      context_display_name = self.context.display_name
    else:
      context_display_name = 'Default Context'
    return '{source_role},{source_context} -> {role},{context}'.format(
      source_role=self.source_role.display_name,
      source_context=source_context_display_name,
      role=self.role.display_name,
      context=context_display_name,
    )

class ContextImplication(Base, db.Model):
  __tablename__ = 'context_implications'

  context_id = db.Column(
      db.Integer(), db.ForeignKey('contexts.id'), nullable=True)
  source_context_id = db.Column(
      db.Integer(), db.ForeignKey('contexts.id'), nullable=True)

  context = db.relationship(
      'Context',
      uselist=False,
      foreign_keys=[context_id],
      )
  source_context = db.relationship(
      'Context',
      uselist=False,
      foreign_keys=[source_context_id],
      )

  def _display_name(self):
    if self.source_context:
      source_context_display_name = self.source_context.display_name
    else:
      source_context_display_name = 'Default Context'
    if self.context:
      context_display_name = self.context.display_name
    else:
      context_display_name = 'Default Context'
    return '{source_context} -> {context}'.format(
        source_context=source_context_display_name,
        context=context_display_name,
        )
