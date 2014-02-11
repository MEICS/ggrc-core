# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: anze@reciprocitylabs.com
# Maintained By: anze@reciprocitylabs.com

from ggrc import db, settings
from .mixins import deferred, Base, Stateful
from functools import wraps
from flask import request
from flask.wrappers import Response
from ggrc.models.types import CompressedType

class Task(Base, Stateful, db.Model):
  __tablename__ = 'tasks'

  VALID_STATES = [
    "Pending",
    "Running",
    "Success",
    "Failure"
  ]
  name = deferred(db.Column(db.String), 'Task')
  parameters = deferred(db.Column(CompressedType), 'Task')
  result = deferred(db.Column(CompressedType), 'Task')

  _publish_attrs = [
      'name',
      'result'
  ]

  def start(self):
    self.status = "Running"
    db.session.add(self)
    db.session.commit()

  def finish(self, status, result):
    # Ensure to not commit any not-yet-committed changes
    db.session.rollback()

    if isinstance(result, Response):
      self.result = {'content': result.response[0],
                     'status_code': result.status_code,
                     'headers': result.headers.items()}
    else:
      self.result = {'content': result,
                     'status_code': 200,
                     'headers': [('Content-Type', 'text/html')]}
    self.status = status
    db.session.add(self)
    db.session.commit()

  def make_response(self, default=None):
    if self.result == None:
      return default
    from ggrc.app import app
    return app.make_response((self.result['content'], self.result['status_code'],
                              self.result['headers']))

def create_task(name, queued_task, parameters={}, context_id=None):
  from time import time
  task = Task(name=name + str(int(time()))) # task name must be unique
  task.parameters = parameters
  if context_id is not None:
    task.context_id = context_id

  from ggrc.app import db
  db.session.add(task)
  db.session.commit()

  # schedule a task queue
  if getattr(settings, 'APP_ENGINE', False):
    from google.appengine.api import taskqueue
    from flask import url_for
    cookie_header = [h for h in request.headers if h[0] == 'Cookie']
    taskqueue = taskqueue.add(queue_name="ggrc",
                              url=url_for(queued_task.__name__), name=task.name,
                              params={'task_id': task.id},
                              headers=cookie_header)
  else:
    queued_task(task)

  return task

def make_task_response(id):
  task = Task.query.get(id)
  return task.make_response()

def queued_task(func):

  @wraps(func)
  def decorated_view(*args, **kwargs):
    if len(args) > 0 and isinstance(args[0], Task):
      task = args[0]
    else:
      task = Task.query.get(request.form.get("task_id"))
    task.start()
    try:
      result = func(task)
    except:
      import traceback
      from ggrc.app import app
      task.finish("Failure", app.make_response((
        traceback.format_exc(), 200, [('Content-Type', 'text/html')])))

      # Return 200 so that the task is not retried
      return app.make_response((
        'failure', 200, [('Content-Type', 'text/html')]))
    task.finish("Success", result)
    return result
  return decorated_view
