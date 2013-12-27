# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

import sys
from . import settings

# Initialize Flask app
from flask import Flask
# Using for import file upload
from werkzeug import secure_filename


app = Flask('ggrc', instance_relative_config=True)
app.config.from_object(settings)
if "public_config" not in app.config:
  app.config.public_config = {}

for key in settings.exports:
  app.config.public_config[key] = app.config[key]

# Configure Flask-SQLAlchemy for app
from . import db
db.app = app
db.init_app(app)

# Initialize models
import ggrc.models
ggrc.models.init_app(app)

# Configure Flask-Login
import ggrc.login
ggrc.login.init_app(app)

# Configure webassets for app
from . import assets
app.jinja_env.add_extension('webassets.ext.jinja2.assets')
app.jinja_env.assets_environment = assets.environment

# Configure Jinja2 extensions for app
app.jinja_env.add_extension('jinja2.ext.autoescape')
app.jinja_env.autoescape = True
app.jinja_env.add_extension('jinja2.ext.with_')
app.jinja_env.add_extension('hamlpy.ext.HamlPyExtension')

# Initialize services
import ggrc.services
ggrc.services.init_all_services(app)

# Initialize views
import ggrc.views
ggrc.views.init_all_object_views(app)

# Initialize extension blueprints
for extension_module in settings.get_extension_modules().values():
  if hasattr(extension_module, 'blueprint'):
    app.register_blueprint(extension_module.blueprint)

# Initialize configured and default extensions
from ggrc.fulltext import get_indexer
ggrc.indexer = get_indexer()

from ggrc.rbac import permissions
permissions.get_permissions_provider()

if settings.ENABLE_JASMINE:
  # Configure Flask-Jasmine, for dev mode unit testing
  from flask.ext.jasmine import Jasmine, Asset
  jasmine = Jasmine(app)

  jasmine.sources(
      Asset("dashboard-js"),
      Asset("dashboard-js-spec-helpers"))

  jasmine.specs(
      Asset("dashboard-js-specs"))

if hasattr(settings, 'SQLALCHEMY_RECORD_QUERIES')\
    and settings.SQLALCHEMY_RECORD_QUERIES:

  def with_prefix(statement, prefix):
    return "\n".join([prefix + line for line in statement.splitlines()])

  @app.after_request
  def display_queries(response):
    from flask.ext.sqlalchemy import get_debug_queries
    for query in get_debug_queries():
      app.logger.info("{:.8f} {}\n{}".format(
        query.duration,
        query.context,
        with_prefix(query.statement, "       ")))
    return response
