"""Provide commonly-used methods here.

Don't use ``@when``, ``@given``, etc. here, as it will raise
``behave.step_registry.AmbiguousStep``, since this module is included in
multiple steps/*.py modules.
"""
from __future__ import absolute_import

from ggrc.utils import as_json
import json
import datetime
from .factories import factory_for

class Example(object):
  """An example resource for use in a behave scenario, by name."""
  def __init__(self, resource_type, value, response=None):
    self.resource_type = resource_type
    self.value = value
    self.response = response

  def get(self, attr):
    return self.value.get(get_resource_table_singular(self.resource_type)).get(attr)

  def set(self, attr, value):
    self.value[attr] = value

def set_property(obj, attr, value):
  if isinstance(obj, Example):
    obj.set(attr, value)
  else:
    setattr(obj, attr, value)


def handle_example_resource(context, resource_type):
  resource_factory = factory_for(resource_type)
  context.example_resource = resource_factory()

def handle_named_example_resource(
    step_context, resource_type, example_name, **kwargs):
  if type(resource_type) is str and '.' in resource_type:
    import sys
    __import__(resource_type)
    resource_type = sys.modules[resource_type]
  resource_factory = factory_for(resource_type)
  example = Example(resource_type, resource_factory(**kwargs))
  setattr(step_context, example_name, example)

def handle_get_resource_and_name_it(context, url, name):
  response = get_resource(context, url)
  assert response.status_code == 200
  setattr(context, name, response.json())

def get_resource(context, url):
  import requests
  headers={'Accept': 'application/json',}
  if hasattr(context, 'current_user_json'):
    headers['X-ggrc-user'] = context.current_user_json
  response = requests.get(
      context.base_url+url,
      headers=headers,
      cookies=getattr(context, 'cookies', {})
      )
  context.cookies = response.cookies
  return response

def put_resource(context, url, resource):
  import requests
  headers={
      'Content-Type': 'application/json',
      'If-Match': resource.response.headers['Etag'],
      'If-Unmodified-Since': resource.response.headers['Last-Modified'],
      }
  if hasattr(context, 'current_user_json'):
    headers['X-ggrc-user'] = context.current_user_json
  data = as_json(resource.value)
  response = requests.put(
      context.base_url+url,
      data=data,
      headers=headers,
      cookies=getattr(context, 'cookies', {})
      )
  context.cookies = response.cookies
  return response

def handle_get_example_resource(context, name, expected_status=200):
  example = getattr(context, name)
  url = example.get('selfLink')
  response = get_resource(context, url)
  assert response.status_code == expected_status
  if expected_status == 200 or expected_status == 201:
    example = Example(
        example.resource_type, response.json(), response=response)
    setattr(context, name, example)

def handle_post_named_example_to_collection_endpoint(
    context, name, expected_status=201):
  """Create a new resource for the given example. Expects that there is a
  `service_description` in `context` to use to lookup the endpoint url. The
  created resource is added to the context as the attribute name given by
  `name`.
  """
  example = getattr(context, name)
  url = get_service_endpoint_url(context, example.resource_type)
  handle_post_named_example(context, name, url, expected_status)

def handle_post_named_example(context, name, url, expected_status=201):
  example = getattr(context, name)
  response = post_example(
      context, example.resource_type, example.value, url)
  assert response.status_code == expected_status, \
      'Expected status code {0}, received {1}'\
        .format(expected_status, response.status_code)
  if expected_status == 200 or expected_status == 201:
    example = Example(example.resource_type, response.json())
    setattr(context, name, example)

def post_example(context, resource_type, example, url):
  #For **some** reason, I can't import this at the module level in a steps file
  import requests
  headers = {'Content-Type': 'application/json',}
  data = as_json(
      {get_resource_table_singular(resource_type): example})
  response = requests.post(
      context.base_url+url,
      data=data,
      headers=headers,
      allow_redirects=False,
      cookies=getattr(context, 'cookies', {}),
      )
  if response.status_code == 302:
    # deal with login redirect, expect noop
    headers={'Accept': 'text/html',}
    if hasattr(context, 'current_user_json'):
      headers['X-ggrc-user'] = context.current_user_json
    response = requests.get(
        response.headers['Location'],
        headers=headers,
        allow_redirects=False,
        )
    context.cookies = response.cookies
    response = requests.post(
        context.base_url+url,
        data=data,
        headers={
          'Content-Type': 'application/json',
          },
        cookies=context.cookies,
        )
  context.cookies = response.cookies
  return response

def resource_type_string(resource_type):
  if type(resource_type) in [str,unicode]:
    if '.' in resource_type:
      return resource_type.split('.')[-1]
    return resource_type
  else:
    return resource_type.__name__

def get_resource_table_singular(resource_type):
  # This should match the implementation at
  #   ggrc.models.inflector:ModelInflector.underscore_from_camelcase
  import re
  resource_type = resource_type_string(resource_type)
  s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', resource_type)
  return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def get_service_endpoint_url(context, endpoint_name):
  """Return the URL for the `endpoint_name`. This assumes that there is a
  `service_description` in the `context` to ues to lookup the endpoint url.
  """
  endpoint_name = resource_type_string(endpoint_name)
  return context.service_description.get(u'service_description')\
      .get(u'endpoints').get(unicode(endpoint_name)).get(u'href')

def handle_template_text(context, src):
  if '{{' in src:
    from jinja2 import Template
    template = Template(src)
    return template.render(context=context)
  return src
