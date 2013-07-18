# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import datetime
from flask import session
from ggrc import db, settings
from ggrc.login import get_current_user
from ggrc.models.context import Context
from ggrc.models.program import Program
from ggrc.rbac.permissions_provider import DefaultUserPermissions
from ggrc.services.registry import service
from ggrc.services.common import Resource
from .models import Role, UserRole

class CompletePermissionsProvider(object):
  def __init__(self, settings):
    pass

  def permissions_for(self, user):
    if 'permissions' not in session:
      self.add_permissions_to_session(user)
    return DefaultUserPermissions()

  def handle_admin_user(self, user):
    pass

  def add_permissions_to_session(self, user):
    if user is not None \
        and hasattr(settings, 'BOOTSTRAP_ADMIN_USERS') \
        and user.email in settings.BOOTSTRAP_ADMIN_USERS:
      permissions = {
          DefaultUserPermissions.ADMIN_PERMISSION.action: {
            DefaultUserPermissions.ADMIN_PERMISSION.resource_type: [
              DefaultUserPermissions.ADMIN_PERMISSION.context_id,
              ],
            },
          }
    elif user is not None:
      permissions = {}
      user_roles = db.session.query(UserRole).filter(
          UserRole.user_email==user.email).all()
      for user_role in user_roles:
        for action, resource_types in user_role.role.permissions.items():
          for resource_type in resource_types:
            permissions.setdefault(action, {}).setdefault(resource_type, [])\
                .append(user_role.context_id)
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
      permissions['__GGRC_ADMIN__'] = {
          '__GGRC_ALL__': [personal_context.id,],
          }
    else:
      permissions = {}
    session['permissions'] = permissions

def all_collections():
  """The list of all collections provided by this extension."""
  return [
      service('roles', Role),
      service('users_roles', UserRole),
      ]

@Resource.model_posted.connect_via(Program)
def handle_program_post(sender, obj=None, src=None, service=None):
  if 'private' in src:
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
    db.session.add(context)
    db.session.flush()
    obj.context = context

    # add a user_roles mapping assigning the user creating the program
    # the ProgramOwner role in the program's context.
    current_user_email = get_current_user().email
    program_owner_role = db.session.query(Role)\
        .filter(Role.name == 'ProgramOwner').first()
    user_role = UserRole(
        user_email=current_user_email,
        role=program_owner_role,
        context=context,
        )
    db.session.add(user_role)
    db.session.flush()

    # assign the user RoleReader if they don't already have that role
    role_reader_role = db.session.query(Role)\
        .filter(Role.name == 'RoleReader').first()
    role_reader_for_user = db.session.query(UserRole)\
        .join(Role, UserRole.role == role_reader_role)\
        .filter(UserRole.user_email == current_user_email \
            and Role.name == 'RoleReader')\
        .first()
    if not role_reader_for_user:
      role_reader_for_user = UserRole(
          user_email=current_user_email,
          role=role_reader_role,
          context_id=1,
          )
      db.session.add(role_reader_for_user)
      db.session.flush()
