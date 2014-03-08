# caching/localcache.py
#
# This module implements the local caching mechanism
#
# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# 
# Maintained By: dan@reciprocitylabs.com
#

from collections import OrderedDict
from cache import Cache
from cache import all_cache_entries


"""
    LocalCache implements the caching mechanism that is local to the AppEngine instance

"""
class LocalCache(Cache):
  cache_entries=OrderedDict()

  def __init__(self, configparam=None):
    self.config = configparam
    self.name = 'local'

    for cache_entry in all_cache_entries():
      if cache_entry.cache_type is self.name:
        self.supported_resources[cache_entry.model_plural]=cache_entry.class_name
 
    # initialize collection for each resource type
    #
    for key in self.supported_resources.keys():
     self.cache_entries['collection:'+key] =  {}

  def get_name(self):
     return self.name

  def set_config(self, configparam):
     self.config = configparam
	
  def get_config(self):
     return self.config

  # Get data from all cache for the specified filter
  #
  def get(self, category, resource, filter): 
    if not self.is_caching_supported(category, resource):
      return None

    cache_key = self.get_key(category, resource)
    if cache_key is None:
      return  None

    entries = self.cache_entries.get(cache_key)
    if entries is None:
       return None

    ids, attrs = self.parse_filter(filter)
    if ids is None and attrs is None:
      return None
    else:
      if ids is None:
        return self.get_data(entries.keys(), entries, attrs)
      else:
        return self.get_data(ids, entries, attrs)

  # Add data to cache for the specified data
  #
  def add(self, category, resource, data): 
    if not self.is_caching_supported(category, resource):
      return None
    cache_key = self.get_key(category, resource)
    if cache_key is None:
      return None
    if self.cache_entries is None:
      return None
    entries = self.cache_entries.get(cache_key)
    if entries is None:
      return None

    # REVISIT: Should we perform deep copy of data
    for key in data.keys(): 
      entries[key] = data.get(key)

    return entries

  # Update data from cache for the specified data
  #
  def update(self, category, resource, data): 
    return None

  # Remove data from cache for the specified data
  #
  def remove(self, category, resource, data): 
    if not self.is_caching_supported(category, resource):
      return None
    cache_key = self.get_key(category, resource)
    if cache_key is None:
      return None
    if self.cache_entries is None:
      return None
    entries = self.cache_entries.get(cache_key) 	

    for key in data.keys(): 
      del entries[key]

    return entries

  # Get data from cache for the given set of keys and attributes in cache
  # REVISIT: all or none default policy is implemeted here, it should be in cachemanager
  #
  def get_data(self, keys, cacheitems, attrs):
    data=OrderedDict()

    for key in keys:
      if not cacheitems.has_key(key):
        #  ALL or None Policy: if a key is not in cache, stop processing and continue as before going to Data-ORM layer
        #
        return None
      attrvalues = cacheitems.get(key)
      targetattrs=None
      if attrs is None and attrvalues is not None:
        targetattrs=attrvalues.keys()
      elif attrvalues is None:
        # Do nothing as there are no attrs to get
        continue
      else:
        # set the targetattrs
        targetattrs=attrs

      # populate result data for the object with key and specified target attrs
      attr_dict = {}
      for attr in targetattrs:
        if attrvalues.has_key(attr): 
          attr_dict[attr] = attrvalues.get(attr)

      data[key] = attr_dict

    return data 

  # Cleanup
  #
  def clean(self):
    self.cache_entries.clear()

  # Print content of cache
  #
  def __repr__(self):
    return str(self.cache_entries.keys()) + str(self.cache_entries.values())
