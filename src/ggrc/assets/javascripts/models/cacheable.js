/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all

(function(can) {

var makeFindRelated = function(thistype, othertype) {
  return function(params) {
    if(!params[thistype + "_type"]) {
      params[thistype + "_type"] = this.shortName;
    }
    return CMS.Models.Relationship.findAll(params).then(function(relationships) {
      var dfds = [], things = new can.Model.List();
      can.each(relationships, function(rel,idx) {
        var dfd;
        if(rel[othertype].selfLink) {
          things.push(rel[othertype]);
        } else {
          dfd = rel[othertype].refresh().then(function(dest) {
            things.splice(idx, 1, dest);
          });
          dfds.push(dfd);
          things.push(dfd);
        }
      });
      return $.when.apply($, dfds).then(function(){ return things; });
    });
  };
};

function dateConverter(d) {
  var conversion = "YYYY-MM-DD\\THH:mm:ss\\Z";
  var ret;
  if(typeof d === "object") {
    d = d.getTime();
  }
  if(typeof d === "number") {
    d /= 1000;
    conversion = "X";
  }
  if(typeof d === "string" && ~d.indexOf("/")) {
    conversion = "MM/DD/YYYY";
  }
  ret = moment(d.toString(), conversion);
  if (typeof d === "string" && ret
      //  Don't correct timezone for dates
      && !/^\d+-\d+-\d+$/.test(d) && !/^\d+\/\d+\/\d+$/.test(d)
      //  Don't correct timezone if `moment.js` has already done it
      && !/[-+]\d\d:?\d\d/.test(d)) {
    ret.subtract(new Date().getTimezoneOffset(), "minute");
  }
  return ret ? ret.toDate() : undefined;
}

function makeDateUnpacker(keys) {
  return function(d) {
    return can.reduce(keys, function(curr, key) {
      return curr || (d[key] && dateConverter(d[key]));
    }, null) || d;
  };
}

function makeDateSerializer(type, key) {
  var conversion = type === "date" ? "YYYY-MM-DD" : "YYYY-MM-DD\\THH:mm:ss\\Z";
  return function(d) {
    if(d == null) {
      return "";
    }
    if(typeof d !== "number") {
      d = d.getTime();
    }
    var retstr = moment((d / 1000).toString(), "X").utc().format(conversion);
    var retval;
    if(key) {
      retval = {};
      retval[key] = retstr;
    } else {
      retval = retstr;
    }
    return retval;
  };
}


can.Model("can.Model.Cacheable", {

  root_object : ""
  , root_collection : ""
  , model_singular : ""
  , model_plural : ""
  , table_singular : ""
  , table_plural : ""
  , title_singular : ""
  , title_plural : ""
  , findOne : "GET {href}"
  , makeFindAll: function(finder) {
      return function(params, success, error) {
        var deferred = $.Deferred()
          , sourceDeferred = finder.call(this, params)
          , self = this
          ;

        deferred.then(success, error);
        sourceDeferred.then(function(sourceData) {
          var obsList = new self.List([]);
          
          if(sourceData[self.root_collection + "_collection"]) {
            sourceData = sourceData[self.root_collection + "_collection"];
          }
          if(sourceData[self.root_collection]) {
            sourceData = sourceData[self.root_collection];
          }

          setTimeout(function(){
            var piece = sourceData.splice ? sourceData.splice(0,Math.min(sourceData.length, 5)) : [sourceData];
            obsList.push.apply(obsList, self.models(piece));

            if(sourceData.length) {
              setTimeout(arguments.callee, 10);
            } else {
              deferred.resolve(obsList);
            }
          }, 10);
        }, function() {
          deferred.reject.apply(deferred, arguments);
        });

        return deferred;
      };
    }

  , setup : function(construct, name, statics, prototypes) {
    var overrideFindAll = false;
    if(this.fullName === "can.Model.Cacheable") {
      this.findAll = function() {
        throw "No default findAll() exists for subclasses of Cacheable";
      };
      this.findPage = function() {
        throw "No default findPage() exists for subclasses of Cacheable";
      }
    }
    else if((!statics || !statics.findAll) && this.findAll === can.Model.Cacheable.findAll) { 
      if(this.root_collection) {
        this.findAll = "GET /api/" + this.root_collection;
      } else {
        overrideFindAll = true;
      }
    }
    if(this.root_collection) {
      this.model_plural = statics.model_plural || this.root_collection.replace(/(?:^|_)([a-z])/g, function(s, l) { return l.toUpperCase(); } );
      this.title_plural = statics.title_plural || this.root_collection.replace(/(^|_)([a-z])/g, function(s, u, l) { return (u ? " " : "") + l.toUpperCase(); } );
      this.table_plural = statics.table_plural || this.root_collection;
    }
    if(this.root_object) {
      this.model_singular = statics.model_singular || this.root_object.replace(/(?:^|_)([a-z])/g, function(s, l) { return l.toUpperCase(); } );
      this.title_singular = statics.title_singular || this.root_object.replace(/(^|_)([a-z])/g, function(s, u, l) { return (u ? " " : "") + l.toUpperCase(); } );
      this.table_singular = statics.table_singular || this.root_object;
    }

    if (!can.isFunction(this.findAll)) {
      this.findPage = this.makeFindPage(this.findAll);
    }

    var ret = this._super.apply(this, arguments);
    if(overrideFindAll)
      this.findAll = can.Model.Cacheable.findAll;

    //set up default attribute converters/serializers for all classes
    can.extend(this.attributes, {
      created_at : "datetime"
      , updated_at : "datetime"
    });

    return ret;
  }
  , init : function() {
    var id_key = this.id;
    this.bind("created", function(ev, new_obj) {
      var cache = can.getObject("cache", new_obj.constructor, true);
      if(new_obj[id_key]) {
        cache[new_obj[id_key]] = new_obj;
        if(cache[undefined] === new_obj)
          delete cache[undefined];
      }
    });
    this.bind("destroyed", function(ev, old_obj) {
      delete can.getObject("cache", old_obj.constructor, true)[old_obj[id_key]];
    });
    //can.getObject("cache", this, true);

    var _update = this.update;
    this.update = function(id, params) {
      var ret = _update
        .call(this, id, this.process_args(params))
        .then(
          $.proxy(this, "resolve_deferred_bindings")
          , function(status) {
            var dfd;
            if(status === 409) {
              //handle conflict.
            } else {
              dfd = new $.Deferred();
              return dfd.reject.apply(dfd, arguments);
            }
          }
        );
      delete ret.hasFailCallback;
      return ret;
    };

    var _create = this.create;
    this.create = function(params) {
      var ret = _create
        .call(this, this.process_args(params))
        .then($.proxy(this, "resolve_deferred_bindings"));
      delete ret.hasFailCallback;
      return ret;
    };


    var _refresh = this.makeFindOne({ type : "get", url : "{href}" });
    this.refresh = function(params) {
      var href = params.selfLink || params.href;

      if (href)
        return _refresh.call(this, {href : params.selfLink || params.href});
      else
        return (new can.Deferred()).reject();
    };

    var that = this;
    this.risk_tree_options = can.extend(true, {}, this.risk_tree_options); //for subclasses
    var risk_child_options = that.risk_tree_options.child_options[0];
    this.risk_tree_options.show_view = GGRC.mustache_path + "/base_objects/tree.mustache";
    if(risk_child_options) {
      risk_child_options.find_params.destination_type = that.shortName;
      risk_child_options.find_params.relationship_type_id = "risk_is_a_threat_to_" + this.root_object;
    }
    $(function() {
      if(risk_child_options)
        risk_child_options.model = CMS.Models.Risk;
      if(that.risk_tree_options.child_options && that.risk_tree_options.child_options.length > 1)
        that.risk_tree_options.child_options[1].model = that;
    });
    $(function() {
      if (GGRC.current_user) {
        that.defaults.contact = CMS.Models.Person.model(GGRC.current_user).stub();
      }
    });
  }

  , resolve_deferred_bindings : function(obj) {
    var _pjs, refresh_dfds = [], dfds = [];
    if(obj._pending_joins) {
      _pjs = obj._pending_joins.slice(0); //refresh of bindings later will muck up the pending joins on the object
      can.each(can.unique(can.map(_pjs, function(pj) { return pj.through; })), function(binding) {
        refresh_dfds.push(obj.get_binding(binding).refresh_stubs());
      });

      return $.when.apply($, refresh_dfds)
      .then(function() {
        can.each(obj._pending_joins, function(pj) {
          var inst
          , binding = obj.get_binding(pj.through)
          , model = CMS.Models[binding.loader.model_name] || GGRC.Models[binding.loader.model_name];
          if(pj.how === "add") {
            //Don't re-add -- if the object is already mapped (could be direct or through a proxy)
            // move on to the next one
            if(~can.inArray(pj.what, can.map(binding.list, function(bo) { return bo.instance; }))
               || (binding.loader.option_attr
                  && ~can.inArray(
                    pj.what
                    , can.map(
                      binding.list
                      , function(join_obj) { return join_obj.instance[binding.loader.option_attr]; }
                    )
                  )
            )) {
              return;
            }
            inst = pj.what instanceof model
              ? pj.what
              : new model({
                  context : obj.context
                });
            if(binding.loader.object_attr) {
              inst.attr(binding.loader.object_attr, obj.stub());
            }
            if(binding.loader.option_attr) {
              inst.attr(binding.loader.option_attr, pj.what.stub());
            }
            dfds.push(inst.save());
          } else if(pj.how === "remove") {
            can.map(binding.list, function(bound_obj) {
              if(bound_obj.instance === pj.what || bound_obj.instance[binding.loader.option_attr] === pj.what) {
                can.each(bound_obj.get_mappings(), function(mapping) {
                  dfds.push(mapping.refresh().then(function() { mapping.destroy(); }));
                });
              }
            });
          }
        });
        delete obj._pending_joins;
        return $.when.apply($, dfds).then(function() {
          return obj;
        });
      });
    } else {
      return obj;
    }
  }

  , findInCacheById : function(id) {
    return can.getObject("cache", this, true)[id];
  }

  , newInstance : function(args) {
    var cache = can.getObject("cache", this, true);
    if(args && args[this.id] && cache[args[this.id]]) {
      //cache[args.id].attr(args, false); //CanJS has bugs in recursive merging 
                                          // (merging -- adding properties from an object without removing existing ones 
                                          //  -- doesn't work in nested objects).  So we're just going to not merge properties.
      return cache[args[this.id]];
    } else {
      return this._super.apply(this, arguments);
    }
  }
  , process_args : function(args, names) {
    var pargs = {};
    var obj = pargs;
    // NB possible improvement for the next line:
    //if(this.root_object && (!(this.root_object in args) || typeof args[this.root_object] !== "object")) {
    if(this.root_object && !(this.root_object in args)) {
      obj = pargs[this.root_object] = {};
    }
    var src = args.serialize ? args.serialize() : args;
    var go_names = (!names || names.not) ? Object.keys(src) : names;
    for(var i = 0 ; i < (go_names.length || 0) ; i++) {
      obj[go_names[i]] = src[go_names[i]];
    }
    if(names && names.not) {
      var not_names = names.not;
      for(i = 0 ; i < (not_names.length || 0) ; i++) {
        delete obj[not_names[i]];
      }
    }
    return pargs;
  }
  , findRelated : makeFindRelated("source", "destination")
  , findRelatedSource : makeFindRelated("destination", "source")
  , models : function(params) {
    if(params[this.root_collection + "_collection"]) {
      params = params[this.root_collection + "_collection"];
    }
    if(params[this.root_collection]) {
      params = params[this.root_collection];
    }
    if (!params || params.length == 0)
      return new this.List();
    var ms = this._super(params);
    if(params instanceof can.Observe) {
      params.replace(ms);
      return params;
    } else {
      return ms;
    }
  }
  , object_from_resource : function(params) {
      var obj_name = this.root_object;
      if(!params) {
        return params;
      }
      if(typeof obj_name !== "undefined" && params[obj_name]) {
          for(var i in params[obj_name]) {
            if(params[obj_name].hasOwnProperty(i)) {
              params.attr
              ? params.attr(i, params[obj_name][i])
              : (params[i] = params[obj_name][i]);
            }
          }
          if(params.removeAttr) {
            params.removeAttr(obj_name);
          } else {
            delete params[obj_name];
          }
      }
      return params;
    }

  , stubs : function(params) {
      return can.map(this.models(params), function(instance) {
        return instance.stub();
      });
    }

  , stub : function(params) {
      return this.model(params).stub();
    }

  , model : function(params) {
    var m, that = this;
    params = this.object_from_resource(params);
    if (!params)
      return params;
    var fn = (typeof params.each === "function") ? $.proxy(params.each,"call") : can.each;
    m = this.findInCacheById(params[this.id])
        || (params.provisional_id && can.getObject("provisional_cache", can.Model.Cacheable, true)[params.provisional_id]);
    if(m) {
      if(m.provisional_id) {
        delete can.Model.Cacheable.provisional_cache[m.provisional_id];
        m.removeAttr("provisional_id");
      }

      if (m === params) {
        //return m;
      } else if (!params.selfLink) {
        //return m;
      } else {
      if (!m.selfLink) {
        //we are fleshing out a stub, which is much like creating an object new.
        //But we don't want to trigger every change event on the new object's props.
        m._init = 1;
        // Stub attributes should be removed to not conflict with real model
        // attributes; however, this should be well-tested first
        //m.removeAttr('type');
        //m.removeAttr('href');
      }
      fn(params, function(val, key) {
        if (key === 'context' && val == null && m[key] && m[key].id == null)
          return;
        val = that.get_attr(key, val);
        if (val == null)
          m.removeAttr(key)
        else
          m.attr(key, val);// && val.serialize ? val.serialize() : val);
      });
      delete m._init;
      }
    } else {
      fn(params, function(val, key) {
        val = that.get_attr(key, val);
        if (val == null) {
          if (params.removeAttr)
            params.removeAttr(key);
          else
            delete params[key];
        } else {
          if (params.attr) {
            params.attr(key, val);
          } else {
            params[key] = val;
          }
        }
      });
      m = this._super(params);
    }
    return m;
  }

  , get_attr: function(key, val) {
      // Special case to avoid constant replacement of `null` contexts
      var i = 0, j = 0, k, changed = false;
      converter = this.constructor.attributes && this.constructor.attributes[name];
      if (converter) {
        function_name = converter.substr(fun_name.lastIndexOf(".") + 1);
        converted_value = can.getObject(converter)(val);
        if (function_name === "stub"
            || function_name == "models"
            || function_name == "get_instances") {
          return can.map(converted_value, function(item) {
            return item.stub();
          });
        } else if (function_name === "stub"
                   || function_name == "model"
                   || function_name == "get_instance") {
          return converted_value.stub();
        } else {
          return converted_value;
        }
      } else {
        return val;
      }
    }
  , convert : {
    "date" : dateConverter
    , "datetime" : dateConverter
    , "packaged_datetime" : makeDateUnpacker(["dateTime", "date"])
  }
  , serialize : {
    "datetime" : makeDateSerializer("datetime")
    , "date" : makeDateSerializer("date")
    , "packaged_datetime" : makeDateSerializer("datetime", "dateTime")
  }
  , tree_view_options : {}
  , list_view_options : {}
  , risk_tree_options : {
    single_object : true
    , child_options : [{
      model : null
      , show_view : GGRC.mustache_path + "/risks/tree.mustache"
      , draw_children : false
      , find_params : {
        source_type : "Risk"
      }
      , find_function : "findRelatedSource"
      , create_link : true
      , related_side : "destination"
      , parent_find_param : "destination_id"
    }, {
      model : null
      , start_expanded : false
      , draw_children : true
    }]
  }
  , getRootModelName: function() {
    return this.root_model || this.shortName;
  }

  , makeFindPage: function(findAllSpec) {
      /* Create a findPage function that will return a paging object that will
       * provide access to the model items provided in a single page as well
       * as paging capability to retrieve the named pages provided in the
       * resposne.
       *
       * findPage returns an object with two properties:
       * {this.options.model.root_collection}_collection and paging. The models
       * property will be an array of all model instances in the page retrieved
       * for the collection. The paging property will be an object that can be
       * used to retrieve other named pages from the collection.  The names of
       * pages include first, prev, next, last. Named page properties will
       * either be functions or the null value in the case where there is no
       * link available in the collection under that name.  Paging functions
       * have the same type of return value as the findPage function.
       *
       * This method assumes that findAllSpec is a string like
       * "GET /api/programs". If this assumption is invalid, this function
       * WILL NOT work correctly.
       */
      var parts, method, collection_url;
      if(typeof findAllSpec === "string") {
        parts = findAllSpec.split(" ");
        method = parts.length == 2 ? parts[0] : "GET";
        collection_url = parts.length == 2 ? parts[1] : parts[0];
      } else if(typeof findAllSpec === "object") {
        method = findAllSpec.type || "GET";
        collection_url = findAllSpec.url;
      } else {
        return; // TODO make a pager if findAllSpec is a function.
      }
      var base_params = {
        type: method
        , dataType: "json"
      };

      var findPageFunc = function(url, data){
        return can.ajax(can.extend({
          url: url
          , data: data
        }, base_params)).then(function(response_data) {
            var collection = response_data[that.root_collection+"_collection"];
            var ret  = {
              paging: make_paginator(collection.paging)
            };
            ret[that.root_collection+"_collection"] = that.models(collection[that.root_collection]);
            return ret;
          });
      };

      var that = this;
      var make_paginator = function(paging) {
        var get_page = function(page_name) {
          if (paging[page_name]) {
            return function() { return findPageFunc(paging[page_name]); };
          } else {
            return null;
          }
        };

        return {
            count: paging.count
          , total: paging.total
          , first: get_page("first")
          , prev: get_page("prev")
          , next: get_page("next")
          , last: get_page("last")
          , has_next: function() { return this.next != null; }
          , has_prev: function() { return this.prev != null; }
        };
      };

      return function(params) {
        params = params || {};
        if (!params.__page) {
          params.__page = 1;
        }
        if (!params.__page_size) {
          params.__page_size = 100;
        }
        return findPageFunc(collection_url, params);
      };
    }
}, {
  init : function() {
    var cache = can.getObject("cache", this.constructor, true)
    , id_key = this.constructor.id;
    if (this[id_key])
      cache[this[id_key]] = this;
    this.attr("class", this.constructor);
  }
  , computed_errors : function() {
      var that = this
        , compute = can.compute(function() { return that.errors(); });
      return compute;
    }

  , get_list_loader: function(name) {
      var binding = this.get_binding(name);
      return binding.refresh_list();
    }

  , get_mapping: function(name) {
      var binding = this.get_binding(name);
      binding.refresh_list();
      return binding.list;
    }

  // This retrieves the potential orphan stats for a given instance
  // Example: "This may also delete 3 Sections, 2 Controls, and 4 object mappings."
  , get_orphaned_count : function(){
    
    if (!this.get_binding('orphaned_objects')) {
      return new $.Deferred().reject();
    }
    return this.get_list_loader('orphaned_objects').then(function(list) {
      var objects = [], mappings = []
        , counts = {}
        , result = []
        , parts = 0;

      function is_join(mapping) {
        if (mapping.mappings.length > 0) {
          for (var i = 0, child; child = mapping.mappings[i]; i++) {
            if (child = is_join(child)) {
              return child;
            }
          }
        }
        return mapping.instance && mapping.instance instanceof can.Model.Join && mapping.instance;
      }
      can.each(list, function(mapping) {
        var inst;
        if (inst = is_join(mapping))
          mappings.push(inst);
        else
          objects.push(mapping.instance);
      });

      // Generate the summary
      result.push('This may also delete');
      if (objects.length) {
        can.each(objects, function(instance) {
          var title = instance.constructor.title_singular;
          counts[title] = counts[title] || {
              model: instance.constructor
            , count: 0
            };
          counts[title].count++;
        });
        can.each(counts, function(count, i) {
          parts++;
          result.push(count.count + ' ' + (count.count === 1 ? count.model.title_singular : count.model.title_plural) + ',')
        });
      }
      if (mappings.length) {
        parts++;
        result.push(mappings.length + ' object mapping' + (mappings.length !== 1 ? 's' : ''));
      }

      // Clean up commas, add an "and" if appropriate
      parts >= 1 && parts <= 2 && (result[result.length - 1] = result[result.length - 1].replace(',',''));
      parts === 2 && (result[result.length - 2] = result[result.length - 2].replace(',',''));
      parts >= 2 && result.splice(result.length - 1, 0, 'and');
      return result.join(' ') + (objects.length || mappings.length ? '.' : '');
    });
  }

  , _get_binding_attr: function(mapper) {
      if (typeof(mapper) === "string")
        return "_" + mapper + "_binding";
    }

  , get_binding: function(mapper) {
      var mappings
        , mapping
        , binding
        , binding_attr = this._get_binding_attr(mapper)
        ;

      if (binding_attr) {
        binding = this[binding_attr];
      }

      if (!binding) {
        if (typeof(mapper) === "string") {
          // Lookup and attach named mapper
          mappings = GGRC.Mappings[this.constructor.shortName];
          mapping = mappings && mappings[mapper];
          if (!mapping)
            console.debug("No such mapper:  " + this.constructor.shortName + "." + mapper);
          else
            binding = mapping.attach(this);
        } else if (mapper instanceof GGRC.ListLoaders.BaseListLoader) {
          // Loader directly provided, so just attach
          binding = mapper.attach(this);
        } else {
          console.debug("Invalid mapper specified:", mapper);
        }
        if (binding && binding_attr) {
          this[binding_attr] = binding;
          binding.name = this.constructor.shortName + "." + mapper;
        }
      }
      return binding;
    }

  , addElementToChildList : function(attrName, new_element) {
    this[attrName].push(new_element);
    this._triggerChange(attrName, "set", this[attrName], this[attrName].slice(0, this[attrName].length - 1));
  }
  , removeElementFromChildList : function(attrName, old_element, all_instances) {
    for(var i = this[attrName].length - 1 ; i >= 0; i--) {
      if(this[attrName][i]===old_element) {
        this[attrName].splice(i, 1);
        if(!all_instances) break;
      }
    }
    this._triggerChange(attrName, "set", this[attrName], this[attrName].slice(0, this[attrName].length - 1));
  }
  , refresh : function(params) {
    var href = this.selfLink || this.href
    , that = this;

    if (!href)
      return (new can.Deferred()).reject();
    if(!this._pending_refresh) {
      this._pending_refresh = {
        dfd : new $.Deferred()
        , fn : $.debounce(1000, function() {
          var dfd = that._pending_refresh.dfd;
          delete that._pending_refresh;
          $.ajax({
            url : href
            , params : params
            , type : "get"
            , dataType : "json"
          })
          .then($.proxy(that.constructor, "model"))
          .done(function(d) {
            d.updated();
            dfd.resolve(d);
          })
          .fail(function() {
            dfd.reject.apply(dfd, arguments);
          });
        })
      };
    }
    this._pending_refresh.fn();
    return this._pending_refresh.dfd;
  }
  , attr : function() {
    if(arguments.length < 1) {
      return this.serialize();  // Short-circuit CanJS's "attr"-based serialization which leads to infinite recursion
    } else if(arguments[0] instanceof can.Observe) {
      if(arguments[0] === this)
        return this;
      else
        return this._super(arguments[0].serialize());
    } else {
      return this._super.apply(this, arguments);
    }
  }
  , serialize : function() {
    var that = this, serial = {};
    if(arguments.length) {
      return this._super.apply(this, arguments);
    }
    this.each(function(val, name) {
      var fun_name;
      if(that.constructor.attributes && that.constructor.attributes[name]) {
        fun_name = that.constructor.attributes[name];
        fun_name = fun_name.substr(fun_name.lastIndexOf(".") + 1);
        if (fun_name === "stubs" || fun_name === "get_stubs"
            ||fun_name === "models" || fun_name === "get_instances") {
          // val can be null in some cases
          val && (serial[name] = val.stubs().serialize());
        } else if (fun_name === "stub" || fun_name === "get_stub"
                   || fun_name === "model" || fun_name === "get_instance") {
          serial[name] = (val ? val.stub().serialize() : null);
        } else {
          serial[name] = that._super(name);
        }
      } else if(val && typeof val.save === "function") {
        serial[name] = val.stub().serialize();
      } else if(typeof val === "object" && val != null && val.length != null) {
        serial[name] = can.map(val, function(v) {
          return (v && typeof v.save === "function") ? v.stub().serialize() : (v.serialize ? v.serialize() : v);
        });
      } else if(typeof val !== 'function') {
        serial[name] = that[name] && that[name].serialize ? that[name].serialize() : that._super(name);
      }
    });
    return serial;
  }
  , display_name : function() {
    return this.title || this.name;
  }
  , autocomplete_label : function() {
    return this.title;
  }
  , set_owner_to_current_user_if_unset : function() {
    if(this.constructor.attributes.owners
          && (!this.owners || this.owners.length === 0)) {
      this.attr('owners', [{ id: GGRC.current_user.id }]);
    }
  }
  /**
   Set up a deferred join object deletion when this object is updated.
  */
  , mark_for_deletion : function(join_attr, obj) {
    obj = obj.reify ? obj.reify() : obj;
    if(!this._pending_joins) {
      this._pending_joins = [];
    }
    for(var i = this._pending_joins.length; i--;) {
      if(this._pending_joins[i].what === obj) {
        this._pending_joins.splice(i, 1);
      }
    }
    this._pending_joins.push({how : "remove", what : obj, through : join_attr });
  }
  /**
   Set up a deferred join object creation when this object is updated.
  */
  , mark_for_addition : function(join_attr, obj) {
    obj = obj.reify ? obj.reify() : obj;
    if(!this._pending_joins) {
      this._pending_joins = [];
    }
    for(var i = this._pending_joins.length; i--;) {
      if(this._pending_joins[i].what === obj) {
        this._pending_joins.splice(i, 1);
      }
    }
    this._pending_joins.push({how : "add", what : obj, through : join_attr });
  }
  , save : function() {
    if(this.isNew()) {
      this.attr("provisional_id", "provisional_" + Math.floor(Math.random() * 10000000));
      can.getObject("provisional_cache", can.Model.Cacheable, true)[this.provisional_id] = this;
    }
    return this._super.apply(this, arguments);
  }
});

_old_attr = can.Observe.prototype.attr;
can.Observe.prototype.attr = function(key, val) {
  if(key instanceof can.Observe) {
    if(arguments[0] === this)
      return this;
    else
      return _old_attr.apply(this, [key.serialize()]);
  } else {
    return _old_attr.apply(this, arguments);
  }
}
can.Observe.prototype.stub = function() {
  var type;

  if (this.constructor.shortName)
    type = this.constructor.shortName;
  else
    type = this.type;

  if (!this.id)
    return null;

  var obj = {
    id : this.id,
    href : this.selfLink || this.href,
    type : type
  };
  if(this.constructor.id && this.constructor.id !== "id") {
    obj[this.constructor.id] = this[this.constructor.id];
  }

  return new can.Observe(obj);
};

can.Observe.List.prototype.stubs = function() {
  return new can.Observe.List(can.map(this, function(obj) {
    return obj.stub();
  }));
}

can.Observe.prototype.reify = function() {
  var type = this.constructor.shortName || this.type;
  var model;
  if (this.selfLink) {
    return this;
  } else if (model = (CMS.Models[type] || GGRC.Models[type])) {
    if (model.cache
        && model.cache[this[model.id]]) {
        //&& CMS.Models[this.type].cache[this.id].selfLink) {
      return model.cache[this[model.id]];
    } else {
      return null;
    }
  } else {
    console.debug("`reify()` called on non-stub, non-instance object", this);
  }
};

can.Observe.List.prototype.reify = function() {
  return new can.Observe.List(can.map(this, function(obj) {
    return obj.reify();
  }));
}

})(window.can);
