# cache/policies/policymanager.py
#
# This module provides the mechanism to manage policies to be applied for a certain pattern
# This is initialized during initialization of cache configuration
#
# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# 
# Maintained By: dan@reciprocitylabs.com
#


"""
    policyManager provides the mechanism to determine which policies to be applied for a category, resource and filter

"""

from collection import OrderedList

class PolicyManager:
  config = None
  policyDict = OrderedList()
  def __init__(self):
    pass

  def setConfig(self, config):
    self.config = config

  def getPolicyConfigs(self, policyargs):
    return None

  def setPolicyConfigs(self, policyargs, policyconfigs): 
    return None

  def removePolicyConfigs(self, policyargs, policyconfigs): 
    return None