# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
from flask import Blueprint, session, g
import sqlalchemy.orm
from sqlalchemy.orm.attributes import get_history
from sqlalchemy import and_, or_
from ggrc import db, settings
from ggrc.login import get_current_user, login_required
from ggrc.models.audit import Audit
from ggrc.models.context import Context
from ggrc.models.program import Program
from ggrc.rbac import permissions
from ggrc.rbac.permissions_provider import DefaultUserPermissions
from ggrc.services.registry import service
from ggrc.services.common import Resource
from . import basic_roles
from .contributed_roles import lookup_role_implications
from .models import Role, RoleImplication, UserRole, ContextImplication

blueprint = Blueprint(
    'permissions',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/ggrc_basic_permissions',
    )


def get_public_config(current_user):
  """Expose additional permissions-dependent config to client.
    Specifically here, expose GGRC_BOOTSTRAP_ADMIN values to ADMIN users.
  """
  public_config = {}
  if permissions.is_admin():
    if hasattr(settings, 'BOOTSTRAP_ADMIN_USERS'):
      public_config['BOOTSTRAP_ADMIN_USERS'] = settings.BOOTSTRAP_ADMIN_USERS
  return public_config


class CompletePermissionsProvider(object):
  def __init__(self, settings):
    pass

  def permissions_for(self, user):
    ret = UserPermissions()
    # force the permissions to be loaded into session, otherwise templates
    # that depend on the permissions being available in session may assert
    # the user has no permissions!
    ret.check_permissions()
    return ret

  def handle_admin_user(self, user):
    pass

class BasicUserPermissions(DefaultUserPermissions):
  """User permissions that aren't kept in session."""
  def __init__(self, user):
    self.user = user
    self.permissions = load_permissions_for(user)

  def _permissions(self):
    return self.permissions

class UserPermissions(DefaultUserPermissions):
  @property
  def _request_permissions(self):
    return getattr(g, '_request_permissions', None)

  @_request_permissions.setter
  def _request_permissions(self, value):
    setattr(g, '_request_permissions', value)

  def _permissions(self):
    self.check_permissions()
    return self._request_permissions

  def check_permissions(self):
    if not self._request_permissions:
      self.load_permissions()

  def get_email_for(self, user):
    return user.email if hasattr(user, 'email') else 'ANONYMOUS'

  def load_permissions(self):
    user = get_current_user()
    email = self.get_email_for(user)
    self._request_permissions = {}
    self._request_permissions['__user'] = email
    if user is None or user.is_anonymous():
      self._request_permissions = {}
    else:
      self._request_permissions = load_permissions_for(user)

def collect_permissions(src_permissions, context_id, permissions):
  for action, resource_permissions in src_permissions.items():
    if not resource_permissions:
      permissions.setdefault(action, dict())
    for resource_permission in resource_permissions:
      if type(resource_permission) in [str, unicode]:
        resource_type = str(resource_permission)
        condition = None
      else:
        resource_type = str(resource_permission['type'])
        condition = resource_permission.get('condition', None)
        terms = resource_permission.get('terms', [])
      permissions.setdefault(action, {})\
          .setdefault(resource_type, dict())\
          .setdefault('contexts', list())\
          .append(context_id)
      if condition:
        permissions[action][resource_type]\
            .setdefault('conditions', dict())\
            .setdefault(context_id, list())\
            .append({
              'condition': condition,
              'terms': terms,
              })

def load_permissions_for(user):
  """Permissions is dictionary that can be exported to json to share with
  clients. Structure is:
  ..

    permissions[action][resource_type][contexts]
                                      [conditions][context][context_conditions]

  'action' is one of 'create', 'read', 'update', 'delete'.
  'resource_type' is the name of a valid gGRC resource type.
  'contexts' is a list of context_id where the action is allowed.
  'conditions' is a dictionary of 'context_conditions' indexed by 'context'
    where 'context' is a context_id.
  'context_conditions' is a list of dictionaries with 'condition' and 'terms'
    keys.
  'condition' is the string name of a conditional operator, such as 'contains'.
  'terms' are the arguments to the 'condition'.
  """
  permissions = {}

  # Add default `Help` permissions for everyone, always
  help_permissions = { "read": [ "Help" ] }
  collect_permissions(help_permissions, None, permissions)

  # Add `ADMIN_PERMISSION` for "bootstrap admin" users
  if hasattr(settings, 'BOOTSTRAP_ADMIN_USERS') \
      and user.email in settings.BOOTSTRAP_ADMIN_USERS:
    admin_permissions = {
        DefaultUserPermissions.ADMIN_PERMISSION.action: [
          DefaultUserPermissions.ADMIN_PERMISSION.resource_type
          ]
        }
    collect_permissions(
        admin_permissions,
        DefaultUserPermissions.ADMIN_PERMISSION.context_id,
        permissions)

  # Now add permissions from all DB-managed roles
  user_roles = db.session.query(UserRole)\
      .options(
          sqlalchemy.orm.undefer_group('UserRole_complete'),
          sqlalchemy.orm.undefer_group('Role_complete'),
          sqlalchemy.orm.joinedload('role'))\
      .filter(UserRole.person_id==user.id)\
      .order_by(UserRole.updated_at.desc())\
      .all()

  source_contexts_to_rolenames = {}
  for user_role in user_roles:
    source_contexts_to_rolenames.setdefault(
        user_role.context_id,list()).append(user_role.role.name)
    if isinstance(user_role.role.permissions, dict):
      collect_permissions(
          user_role.role.permissions, user_role.context_id, permissions)

  # apply role implications per context implication
  all_context_implications = db.session.query(ContextImplication)
  keys = [k for k in source_contexts_to_rolenames.keys() if k is not None]
  if keys and None in source_contexts_to_rolenames:
    all_context_implications = all_context_implications.filter(
        or_(
          ContextImplication.source_context_id == None,
          ContextImplication.source_context_id.in_(keys),
          ))#.all()
  elif keys:
    all_context_implications = all_context_implications.filter(
          ContextImplication.source_context_id.in_(keys)).all()
  elif None in source_contexts_to_rolenames:
    all_context_implications = all_context_implications.filter(
          ContextImplication.source_context_id == None).all()
  else:
    all_context_implications = []
  context_implications_by_source = {}
  for context_implication in all_context_implications:
    context_implications_by_source.setdefault(
        context_implication.source_context_id, set())\
            .add(context_implication.context_id)

  # Gather all roles required by context implications
  all_implied_roles = {}
  for source_context, implied_contexts \
      in context_implications_by_source.items():
    for rolename in source_contexts_to_rolenames.get(source_context, []):
      for implied_rolename in lookup_role_implications(rolename):
        all_implied_roles.setdefault(implied_rolename, None)
  # If some roles are required, query for them in bulk
  if all_implied_roles:
    implied_roles = db.session.query(Role)\
        .filter(Role.name.in_(all_implied_roles.keys()))\
        .options(sqlalchemy.orm.undefer_group('Role_complete'))\
        .all()
    for implied_role in implied_roles:
      all_implied_roles[implied_role.name] = implied_role
  # Now aggregate permissions resulting from these roles
  for source_context, implied_contexts \
      in context_implications_by_source.items():
    for rolename in source_contexts_to_rolenames.get(source_context, []):
      for implied_rolename in lookup_role_implications(rolename):
        implied_role = all_implied_roles[implied_rolename]
        for implied_context in implied_contexts:
          collect_permissions(
              implied_role.permissions, implied_context, permissions)

  #grab personal context
  personal_context = db.session.query(Context).filter(
      Context.related_object_id == user.id,
      Context.related_object_type == 'Person',
      ).first()
  if not personal_context:
    personal_context = Context(
        name='Personal Context for {0}'.format(user.id),
        description='',
        context_id=1,
        related_object_id=user.id,
        related_object_type='Person',
        )
    db.session.add(personal_context)
    db.session.commit()
  permissions.setdefault('__GGRC_ADMIN__',{})\
      .setdefault('__GGRC_ALL__', dict())\
      .setdefault('contexts', list())\
      .append(personal_context.id)
  return permissions


@Resource.model_posted.connect_via(Program)
def handle_program_post(sender, obj=None, src=None, service=None):
  # get the personal context for this logged in user
  personal_context = service.personal_context()

  # create a context specific to the program
  context = Context(
      context=personal_context,
      name='{object_type} Context {timestamp}'.format(
        object_type=service.model.__name__,
        timestamp=datetime.datetime.now()),
      description='',
      )
  context.related_object = obj
  db.session.add(context)
  obj.context = context

  # add a user_roles mapping assigning the user creating the program
  # the ProgramOwner role in the program's context.
  program_owner_role = basic_roles.program_owner()
  user_role = UserRole(
      person=get_current_user(),
      role=program_owner_role,
      context=context,
      )
  #pass along a temporary attribute for logging the events.
  user_role._display_related_title = obj.title
  db.session.add(user_role)
  db.session.flush()

  assign_role_reader(get_current_user())
  if not src.get('private'):
    # Add role implication - all users can read a public program
    add_public_program_context_implication(context)

def add_role_reader_implications(source_role, context):
  db.session.add(RoleImplication(
    source_context=context,
    source_role=source_role,
    role=basic_roles.program_basic_reader(),
    context=None,
    modified_by=get_current_user(),
    ))

def add_public_program_context_implication(context, check_exists=False):
  if check_exists and db.session.query(ContextImplication)\
      .filter(
          and_(
            ContextImplication.context_id == context.id,
            ContextImplication.source_context_id == None))\
      .count() > 0:
    return
  db.session.add(ContextImplication(
    source_context=None,
    context=context,
    modified_by=get_current_user(),
    ))

def add_public_program_role_implication(
    source_role, context, check_exists=False):
  if check_exists and db.session.query(RoleImplication)\
      .filter(
          and_(
            RoleImplication.context_id == context.id,
            RoleImplication.source_context_id == None))\
      .count() > 0:
    return
  db.session.add(RoleImplication(
    source_context=None,
    source_role=source_role,
    context=context,
    role=basic_roles.program_reader(),
    modified_by=get_current_user(),
    ))

@Resource.model_put.connect_via(Program)
def handle_program_put(sender, obj=None, src=None, service=None):
  #Check to see if the private property of the program has changed
  if get_history(obj, 'private').has_changes():
    if obj.private:
      #ensure that any implications from null context are removed
      implications = db.session.query(RoleImplication)\
          .filter(
              RoleImplication.context_id == obj.context_id,
              RoleImplication.source_context_id == None)\
                  .delete()
      db.session.flush()
      implications = db.session.query(ContextImplication)\
          .filter(
              ContextImplication.context_id == obj.context_id,
              ContextImplication.source_context_id == None)\
                  .delete()
      db.session.flush()
    else:
      #ensure that implications from null are present
      add_public_program_context_implication(obj.context, check_exists=True)
      db.session.flush()

@Resource.model_posted.connect_via(Audit)
def handle_audit_post(sender, obj=None, src=None, service=None):
  #Create an audit context
  context = Context(
      context=obj.context,
      name='Audit Context {timestamp}'.format(
        timestamp=datetime.datetime.now()),
      description='',
      modified_by=get_current_user(),
      )
  db.session.add(context)
  db.session.flush()

  #Create the program -> audit implication
  db.session.add(ContextImplication(
    source_context=obj.context,
    context=context,
    modified_by=get_current_user(),
    ))

  #Create the audit -> program implicaiton
  db.session.add(ContextImplication(
    source_context=context,
    context=obj.context,
    modified_by=get_current_user(),
    ))
  
  #Create the role implication for Auditor from Audit for default context
  db.session.add(ContextImplication(
      source_context=context,
      context=None,
      modified_by=get_current_user(),
      ))
  db.session.flush()

  #Place the audit in the audit context
  obj.context = context

@Resource.model_posted.connect_via(UserRole)
def handle_program_owner_role_assignment(
    sender, obj=None, src=None, service=None):
  if 'read' in obj.role.permissions and \
      'UserRole' in obj.role.permissions['read']:
    # Make sure that the user can read roles, too
    assign_role_reader(obj.person)

def assign_role_reader(user):
    role_reader_role = db.session.query(Role)\
        .filter(Role.name == 'RoleReader').first()
    user_permissions = BasicUserPermissions(user)
    if not user_permissions.is_allowed_read('Role', None):
      role_reader_for_user = UserRole(
          person_id=user.id,
          role=role_reader_role,
          context_id=None,
          )
      db.session.add(role_reader_for_user)

# Removed because this is now handled purely client-side, but kept
# here as a reference for the next one.
# @BaseObjectView.extension_contributions.connect_via(Program)
def contribute_to_program_view(sender, obj=None, context=None):
  if obj.context_id != None and \
      permissions.is_allowed_read('Role', 1) and \
      permissions.is_allowed_read('UserRole', obj.context_id) and \
      permissions.is_allowed_create('UserRole', obj.context_id) and \
      permissions.is_allowed_update('UserRole', obj.context_id) and \
      permissions.is_allowed_delete('UserRole', obj.context_id):
    return 'permissions/programs/_role_assignments.haml'
  return None

from ggrc.app import app
@app.context_processor
def authorized_users_for():
  return {'authorized_users_for': UserRole.role_assignments_for,}


def contributed_services():
  """The list of all collections provided by this extension."""
  return [
      service('roles', Role),
      service('user_roles', UserRole),
      ]


def contributed_object_views():
  from ggrc.views.registry import object_view
  return [
      object_view(Role)
      ]


from .contributed_roles import BasicRoleDeclarations, BasicRoleImplications
ROLE_DECLARATIONS = BasicRoleDeclarations()
ROLE_IMPLICATIONS = BasicRoleImplications()
