# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from collections import namedtuple
from .common import BaseObjectView
from .tooltip import TooltipView


ObjectViewEntry = namedtuple(
  'ObjectViewEntry', 'url model_class service_class')


def object_view(model_class, service_class=BaseObjectView):
  return ObjectViewEntry(
      model_class._inflector.table_plural,
      model_class,
      service_class)


def tooltip_view(model_class, service_class=TooltipView):
  return object_view(model_class, service_class=service_class)
