/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all

function _firstElementChild(el) {
  if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    for (i=0; i<el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType !== Node.TEXT_NODE)
        return el.childNodes[i];
    }
  } else {
    return el;
  }
}

can.Observe("can.Observe.TreeOptions", {
  defaults : {
    instance : undefined
    , parent : null
    , children_drawn : false
  }
}, {
  // init : function() {
  //   this.bind("child_options.*.list", function(ev, newVal) {
  //     this.attr("children_drawn", !newVal.length)
  //     .attr("children_drawn", !!newVal.length);
  //   });
  // }
});

can.Control("CMS.Controllers.TreeView", {
  //static properties
  defaults : {
    model : null
    , header_view : null
    , show_view : null
    , footer_view : null
    , parent : null
    , list : null
    , single_object : false
    , find_params : {}
    , start_expanded : false //true
    , draw_children : true
    , find_function : null
    , options_property : "tree_view_options"
    , allow_reading : true
    , allow_mapping : true
    , allow_creating : true
    , child_options : [] //this is how we can make nested configs. if you want to use an existing 
    //example child option :
    // { property : "controls", model : CMS.Models.Control, }
    // { parent_find_param : "system_id" ... }
  }
  , do_not_propagate : [
        "header_view", "footer_view", "list", "original_list", "single_object"
      , "find_function", "find_all_deferred"
      ]
}, {
  //prototype properties
  setup : function(el, opts) {
    var that = this;
    typeof this._super === "function" && this._super.apply(this, [el]);
    if(opts instanceof can.Observe) {

      this.options = opts;
      if (typeof(this.options.model) === "string")
        this.options.attr("model", CMS.Models[this.options.model]);
      if(this.options.model) {
        can.each(this.options.model[opts.options_property || this.constructor.defaults.options_property], function(v, k) {
          that.options.hasOwnProperty(k) || that.options.attr(k, v);
        });
      }      
      can.each(this.constructor.defaults, function(v, k) {
        that.options.hasOwnProperty(k) || that.options.attr(k, v);
      });
    } else {
      if (typeof(opts.model) === "string")
        opts.model = CMS.Models[opts.model];
      this.options = new can.Observe(this.constructor.defaults).attr(opts.model ? opts.model[opts.options_property || this.constructor.defaults.options_property] : {}).attr(opts);
    }
  }

  , init : function(el, opts) {
    this.element.uniqueId();
    var that = this;

    if('parent_instance' in opts && 'status' in opts.parent_instance){
      var setAllowMapping = function(){
        var is_accepted = opts.parent_instance.attr('status') === 'Accepted'
          , admin = Permission.is_allowed("__GGRC_ADMIN__")
          ;
        that.options.attr("allow_mapping_or_creating", (admin || !is_accepted) &&
            (that.options.allow_mapping || that.options.allow_creating));
      }
      setAllowMapping();
      opts.parent_instance.bind('change', setAllowMapping);
    }
    else{
      this.options.attr("allow_mapping_or_creating",
        this.options.allow_mapping || this.options.allow_creating);
    }

    // Override nested child options for allow_* properties
    var allowed = {};
    this.options.each(function(item, prop) {
      if (prop.indexOf('allow') === 0 && item === false)
        allowed[prop] = item;
    });
    this.options.attr('child_options', this.options.child_options.slice(0));
    can.each(this.options.child_options, function(options, i) {
      that.options.child_options.attr(i, new can.Observe(can.extend(options.attr(), allowed)));
    });

    this._attached_deferred = new $.Deferred();
    if (this.element && this.element.closest('body').length)
      this._attached_deferred.resolve();
  }

  , " inserted": function() {
      this._attached_deferred.resolve();
    }

  , prepare: function() {
      var that = this;

      if (this._prepare_deferred)
        return this._prepare_deferred;

      this._prepare_deferred = new $.Deferred();
      this._prepare_deferred.resolve();

      this._attached_deferred.then(function() {
        if (that.element) {
          that.element.trigger("updateCount", 0)
          if (that.options.allow_reading) {
            that.init_count();
          }
        }
      });

      return this._prepare_deferred;
    }

  , init_view : function() {
      var that = this
        , dfds = []
        ;

      if(this.options.header_view) {
        dfds.push(
          can.view(this.options.header_view, $.when(this.options)).then(function(frag) {
            if (that.element) {
              that.element.prepend(frag);
            }
          }));
      }

      // Init the spinner if items need to be loaded:
      if(this._count && this._count())
        this._loading_started();

      if(this.options.footer_view) {
        dfds.push(
          can.view(this.options.footer_view, this.options, function(frag) {
            if (that.element) {
              that.element.append(frag);
            }
          }));
      }

      return $.when.apply($.when, dfds);
    }

  , init_spinner: function() {
      var spinner
        , $spinner
        , $spinner_li
        , $footer = this.element.children('.tree-footer').first()
        ;

      if (this.element) {
        // Only show the spinner if this is the last subtree
        // FIXME: This spinner will disappear when this list is completely
        //   loaded, even if other lists are still pending.
        if (this.element.next().length > 0)
          return;

        spinner = new Spinner({
            "radius": 4
          , "length": 4
          , "width": 2
          }).spin();
        $spinner = $(spinner.el);
        $spinner_li = $('<li class="tree-footer tree-item tree-spinner" />');
        $spinner_li.append($spinner);
        $spinner.css({
            display: 'inline-block'
          , paddingLeft: '20px'
          , left: '10px'
          , top: '-4px'
        });

        if ($footer.length == 0) {
          this.element.append($spinner_li);
        }
        else {
          $footer.before($spinner_li);
        }
      }
    }

  , init_count : function() {
      var self = this
        ;

      if (!this.get_count_deferred
          && this.options.parent_instance && this.options.mapping) {
        this.get_count_deferred =
          this.options.parent_instance.get_list_counter(this.options.mapping);
      } else if (this.options.list_loader) {
        this.get_count_deferred =
          this.options.list_loader(this.options.parent_instance)
            .then(function(list) {
              return can.compute(function() {
                return list.attr("length");
              });
            });
      }
      if (this.get_count_deferred) {
        this.get_count_deferred.then(function(count) {
          self._count = count;
          self.element && self.element.trigger("updateCount", count());
          count.bind("change", function() {
            self.element && self.element.trigger("updateCount", count());
          });
        });
      }
    }

  , fetch_list : function() {
    var find_function;
    if (this.find_all_deferred) {
      //  Skip, because already done, e.g., display() already called
      return this.find_all_deferred;
    } /*else if (can.isFunction(this.options.find_params)) {
      this.options.list = this.options.find_params();
      this.draw_list();
    } */else {
      if(can.isEmptyObject(this.options.find_params.serialize())) {
        this.options.find_params.attr(
          "id", this.options.parent_instance ? this.options.parent_instance.id : undefined);
      }

      if (this.options.mapping) {
        this.find_all_deferred =
          this.options.parent_instance.get_list_loader(this.options.mapping);
      } else if (this.options.list_loader) {
        this.find_all_deferred =
          this.options.list_loader(this.options.parent_instance);
      } else {
        console.debug("Unexpected code path", this);
        /*
        if (this.options.find_function)
          find_function = this.options.find_function;
        else
          find_function = this.options.single_object ? "findOne" : "findAll";
        this.find_all_deferred =
          this.options.model[find_function](this.options.find_params.serialize());
        if (this.options.fetch_post_process)
          this.find_all_deferred =
            this.find_all_deferred.then(this.options.fetch_post_process);
        */
      }

      return this.find_all_deferred;
    }
  }

  , display: function() {
      var that = this;

      // Dan(Todo): Need to get the title for category argument
      GGRC.Tracker_start("Tree View", "Display Mappings");

      if (this._display_deferred) {
        return this._display_deferred;
      }

      this._display_deferred = $.when(this._attached_deferred, this.prepare());

      this._display_deferred.then(function() {
        return $.when(that.fetch_list(), that.init_view())
          .then(that.proxy("draw_list"));
      }).done(function() {
        // Dan(Todo): Need to get the title for category argument
        GGRC.Tracker_stop("Tree View", "Display Mappings");
      });

      return this._display_deferred;
    }

  , display_path: function(path) {
      var that = this
        , rest = path.split("/")
        , step = rest.shift()
        , type_id = step.split("-")
        , type = type_id[0]
        , id = type_id.length > 0 && type_id[1]
        , $node
        , node_controller
        ;

      return this.display().then(function() {
        if (id) {
          //  FIXME: Make this trigger only direct children, *not* nodes of
          //    sub-trees.
          $node = that.element
            .find("[data-object-type=" + type + "][data-object-id=" + id + "]");
          node_controller = $node.control();
          if (node_controller && node_controller.trigger_expand) {
            return node_controller.trigger_expand().then(function() {
              node_controller.display_path(rest.join("/"));
            });
          }
          else {
            //  TODO: `resolve` or `reject` if path isn't found?
            return new $.Deferred().resolve();
          }
        }
        else {
          return new $.Deferred().resolve();
        }
      });
    }

  , prepare_child_options: function(v) {
    //  v may be any of:
    //    <model_instance>
    //    { instance: <model instance>, mappings: [...] }
    //    <TreeOptions>
    var tmp, that = this;
    if(!(v instanceof can.Observe.TreeOptions)) {
      tmp = v;
      v = new can.Observe.TreeOptions();
      v.attr("instance", tmp);
      this.options.each(function(val, k) {
        ~can.inArray(k, that.constructor.do_not_propagate) || v.attr(k, val);
      });
    }
    if (!(v.instance instanceof can.Model)) {
      if (v.instance.instance instanceof can.Model) {
        v.attr("result", v.instance);
        v.attr("mappings", v.instance.mappings_compute());
        v.attr("instance", v.instance.instance);
      } else {
        v.attr("instance", this.options.model.model(v.instance));
      }
    }
    v.attr("child_count", can.compute(function() {
      var total_children = 0;
      if (v.attr("child_options")) {
        can.each(v.attr("child_options"), function(child_options) {
          var list = child_options.attr("list");
          if (list)
            total_children = total_children + list.attr('length');
        });
      }
      return total_children;
    }));
    return v;
  }

  , draw_list : function(list) {
    if (this._draw_list_deferred)
      return this._draw_list_deferred;
    this._draw_list_deferred = new $.Deferred();
    if (this.element && !this.element.closest('body').length)
      return;

    var that = this
      , refresh_queue = new RefreshQueue();

    if(list) {
      list = list.length == null ? new can.Observe.List([list]) : list;
    } else {
      list = this.options.list;
    }

    if(!this.element)
      return;  //controller has been destroyed

    if(!this.options.original_list) {
      this.options.attr("original_list", list);
    }
    this.options.attr("list", []);
    this.on();

    var temp_list = [];
    can.each(list, function(v, i) {
      var item = that.prepare_child_options(v);
      temp_list.push(item);
      if(!item.instance.selfLink) {
        refresh_queue.enqueue(v.instance);
      }
    });

    temp_list = can.map(temp_list, function(o) { if (o.instance.selfLink) return o; })
    this._draw_list_deferred = this.enqueue_items(temp_list);
    return this._draw_list_deferred;
  }

  , "{original_list} add" : function(list, ev, newVals, index) {
    var that = this
      , real_add = []
      ;
    can.each(newVals, function(newVal) {
      var _newVal = newVal.instance ? newVal.instance : newVal;
      if(!that.oldList || !~can.inArray(_newVal, that.oldList)) {
        that.element && real_add.push(newVal);
        //that.element.trigger("newChild", newVal);
      }
    });
    delete that.oldList;
    this.enqueue_items(real_add);
  }

  , _loading_started: function() {
      if (!this._loading_deferred) {
        this._loading_deferred = new $.Deferred();
        this.init_spinner();
        this.element.trigger("loading");
      }
    }

  , _loading_finished: function() {
      var loading_deferred;
      if (this._loading_deferred) {
        this.element.trigger("loaded");
        this.element.find(".tree-spinner").remove();
        loading_deferred = this._loading_deferred;
        this._loading_deferred = null;
        loading_deferred.resolve();
      }
    }

  , enqueue_items: function(items) {
      var that = this;

      if (!items || items.length == 0) {
        return new $.Deferred().resolve();
      }

      if (!this._pending_items) {
        this._pending_items = [];
        this._loading_started();
      }

      this._pending_items.push.apply(this._pending_items, items);
      this._pending_items_ms = Date.now();

      setTimeout(function() {
        if (!that._pending_items) {
          return;
        }
        var chunk = that._pending_items.splice(0, 5);
        that.insert_items(chunk);
        if (that._pending_items.length > 0) {
          setTimeout(arguments.callee, 100);
        }
        else {
          that._pending_items = null;
          setTimeout(function() {
            if (!that._pending_items) {
              that._loading_finished();
            }
          }, 200);
        }
      }, 100);

      return this._loading_deferred;
    }

  , insert_items: function(items) {
      var that = this
        , prepped_items = []
        ;

      can.each(items, function(item) {
        var prepped = that.prepare_child_options(item);
        if (prepped.instance.selfLink) {
          prepped_items.push(prepped);
        }
      });

      if (prepped_items.length > 0) {
        this.options.list.push.apply(this.options.list, prepped_items);
        this.add_child_lists(prepped_items);
      }
    }

  , "{original_list} remove" : function(list, ev, oldVals, index) {
    var that = this;

    //  FIXME: This assumes we're replacing the entire list, and corrects for
    //    instances being removed and immediately re-added.  This should be
    //    changed to support exact mirroring of the order of
    //    `this.options.list`.
    //assume we are doing a replace
    this.oldList = can.map(oldVals, function(v) { return v.instance ? v.instance : v; });
    GGRC.queue_event(function() {
      if(that.oldList) {
        can.each(oldVals, function(v) {
          that.element && that.element.trigger("removeChild", v);
        });
        delete that.oldList;
      } else {
        list = can.map(list, function(l) { return l.instance || l});
        can.each(oldVals, function(v) {
          var _v = v.instance || v;
          if(!~can.inArray(_v, list)) {
            that.element && that.element.trigger("removeChild", v);
          }
        });
      }
    });
  }

  , ".tree-structure subtree_loaded" : function(el, ev) {
    ev.stopPropagation();
    var instance_id = el.closest(".tree-item").data("object-id");
    var parent = can.reduce(this.options.list, function(a, b) {
      switch(true) {
        case !!a : return a;
        case b.instance.id === instance_id: return b;
        default: return null;
      }
    }, null);
    if(parent && !parent.children_drawn) {
      parent.attr("children_drawn", true);
    }
  }

  // add child options to every item (TreeViewOptions instance) in the drawing list at this level of the tree.
  , add_child_lists : function(list) {
    var that = this
      , current_list = can.makeArray(list)
      , list_window = []
      , all_draw_items_dfds = []
      , final_dfd
      ;

    //Recursively define tree views anywhere we have subtree configs.
    function queue_window(list_window) {
      all_draw_items_dfds.push(that.draw_items(list_window));
    }

    can.each(current_list, function(item) {
      list_window.push(item);
      if (list_window.length >= 20) {
        queue_window(list_window);
        list_window = [];
      }
    });
    if (list_window.length > 0)
      queue_window(list_window);
    final_dfd = $.when.apply($, all_draw_items_dfds);
    final_dfd.done(function() {
      //  Trigger update for sticky headers and footers
      that.element.trigger("updateSticky");
    });
    return final_dfd;
  }

  , draw_items : function(options_list) {
      var $footer = this.element.children('.tree-footer').first()
        , $items = $()
        , draw_items_dfds = []
        ;

      options_list = can.makeArray(options_list);
      can.map(options_list, function(options) {
        var $li = $("<li />").cms_controllers_tree_view_node(options);
        draw_items_dfds.push($li.control()._draw_node_deferred);
        $items.push($li[0]);
      });

      if($footer.length) {
        $items.insertBefore($footer);
      } else {
        $items.appendTo(this.element);
      }
      return $.when.apply($, draw_items_dfds);
    }


  , " removeChild" : function(el, ev, data) {
    var that = this
      , instance
      ;

    if (data.instance && data.instance instanceof this.options.model)
      instance = data.instance;
    else
      instance = data;

    //  FIXME: This should be done using indices, when the order of elements
    //    is guaranteed to mirror the order of `this.options.list`.

    //  Replace the list with the list sans the removed instance
    that.options.list.replace(
      can.map(this.options.list, function(options, i) {
        if (options.instance !== instance)
          return options;
      }));

    //  Remove items by data attributes
    that.element.children([
        "[data-object-id=" + instance.id + "]"
      , "[data-object-type=" + instance.constructor.table_singular + "]"
      ].join("")
    ).remove();
    ev.stopPropagation();
  }

  , " updateCount": function(el, ev) {
      // Suppress events from sub-trees
      if (!($(ev.target).closest('.' + this.constructor._fullName).is(this.element)))
        ev.stopPropagation();
    }

/*  , "{list} add": function() {
      this.element.trigger('updateCount', this.options.list.length);
    }

  , "{list} remove": function() {
      this.element.trigger('updateCount', this.options.list.length);
    }
*/
  , ".edit-object modal:success" : function(el, ev, data) {
    var model = el.closest("[data-model]").data("model");
    model.attr(data[model.constructor.root_object] || data);
    ev.stopPropagation();
  }

});

can.Control("CMS.Controllers.TreeViewNode", {
  defaults : {
    model : null
    , parent : null
    , instance : null
    , options_property : "tree_view_options"
    , show_view : null
    , expanded : false
    , draw_children : true
    , child_options : []
  }
}, {
  setup : function(el, opts) {
    var that = this;
    typeof this._super === "function" && this._super.apply(this, [el]);
    if(opts instanceof can.Observe) {

      this.options = opts;
      if (typeof(this.options.model) === "string")
        this.options.attr("model", CMS.Models[this.options.model]);
      // if(this.options.model) {
      //   can.each(this.options.model[opts.options_property || this.constructor.defaults.options_property], function(v, k) {
      //     that.options.hasOwnProperty(k) || that.options.attr(k, v);
      //   });
      // }      
      can.each(this.constructor.defaults, function(v, k) {
        that.options.hasOwnProperty(k) || that.options.attr(k, v);
      });
    } else {
      if (typeof(opts.model) === "string")
        opts.model = CMS.Models[opts.model];
      this.options = new can.Observe.TreeOptions(this.constructor.defaults)
      .attr(opts.model ? opts.model[opts.options_property || this.constructor.defaults.options_property] : {})
      .attr(opts);
    }
  }
  , init : function(el, opts) {
    var that = this;
    if(that.options.instance && !that.options.show_view) {
      that.options.show_view =
        that.options.instance.constructor[that.options.options_property].show_view
        || that.options.model[that.options.options_property].show_view
        || GGRC.mustache_path + "/base_objects/tree.mustache";
    }
    this._draw_node_deferred = new $.Deferred();
    setTimeout(this.proxy("draw_node"), 20);
  }

  , draw_node: function() {
    this.add_child_lists_to_child();
    //setTimeout(function() {
      var that = this;
      can.view(that.options.show_view, that.options, function(frag) {
        that.replace_element(frag);
        that._draw_node_deferred.resolve();
      });
    //}, 20);
  }
  , should_draw_children : function(){
    var draw_children = this.options.draw_children;
    if(can.isFunction(draw_children)) 
      return draw_children.apply(this.options);
    return draw_children;
  }
  // add all child options to one TreeViewOptions object
  , add_child_lists_to_child : function() {
    var that = this
      , original_child_options = this.options.child_options
      , new_child_options = [];
    this.options.attr("child_options", new can.Observe.List())
    if (original_child_options.length == null)
      original_child_options = [original_child_options]

    if(this.should_draw_children()) {
      can.each(original_child_options, function(data, i) {
        var options = new can.Observe();
        data.each(function(v, k) {
          options.attr(k, v);
        });
        that.add_child_list(that.options, options);
        options.attr({
            "options_property": that.options.options_property
          , "single_object": false
          //, "parent": that.options
          , "parent_instance": that.options.instance
        });
        new_child_options.push(options);
      });
      that.options.attr("child_options", new_child_options);
    }
  }

  // data is an entry from child options.  if child options is an array, run once for each.
  , add_child_list : function(item, data) {
    //var $subtree = $("<ul class='tree-structure'>").appendTo(el);
    //var model = $(el).closest("[data-model]").data("model");
    data.attr({ start_expanded : false });
    var find_params;
    if(can.isFunction(item.instance[data.property])) {
      // Special case for handling mappings which are functions until
      // first requested, then set their name via .attr('...')
      find_params = function() {
        return item.instance[data.property]();
      };
      data.attr("find_params", find_params);
    } else if(data.property) {
      find_params = item.instance[data.property];
      if(find_params && find_params.isComputed) {
        data.attr("original_list", find_params);
        find_params = find_params();
      } else if(find_params && find_params.length) {
        data.attr("original_list", find_params);
        find_params = find_params.slice(0);
      }
      data.attr("list", find_params);
    } else {
      find_params = data.attr("find_params");
      if(find_params) {
        find_params = find_params.serialize();
      } else {
        find_params = {};
      }
      if(data.parent_find_param){
        find_params[data.parent_find_param] = item.instance.id;
      } else {
        find_params["parent.id"] = item.instance.id;
      }
      data.attr("find_params", new can.Observe(find_params));
    }
    // $subtree.cms_controllers_tree_view(opts);
  }

  , replace_element : function(el) {
    var old_el = this.element
      , $el
      , old_data
      , i
      , firstchild
      ;

    if (!this.element)
      return;

    $el = $(el)
    old_data = $.extend({}, old_el.data())

    firstchild = $(_firstElementChild(el));

    old_data.controls = old_data.controls.slice(0);
    old_el.data("controls", []);
    this.off();
    old_el.replaceWith(el);
    this.element = firstchild.addClass(this.constructor._fullName).data(old_data);
    this.on();
  }

  , display_path: function(path) {
    }

  , display_subtrees: function() {
      var child_tree_dfds = []
        , that = this
        ;

      this.element.find('.' + CMS.Controllers.TreeView._fullName).each(function(_, el) {
        var $el = $(el)
          , child_tree_control
          ;

        //  Ensure this targets only direct child trees, not sub-tree trees
        if ($el.closest('.' + that.constructor._fullName).is(that.element)) {
          child_tree_control = $el.control();
          if (child_tree_control)
            child_tree_dfds.push(child_tree_control.display());
        }
      });

      return $.when.apply($, child_tree_dfds);
    }

  , expand: function() {
      if (this._expand_deferred) {
        //  If we've already expanded, then short-circuit the call.  However,
        //  we still need to toggle `expanded`, but if it's the first time
        //  expanding, `this.add_child_lists_to_child` *must* be called first.
        this.options.attr("expanded", true);
        return this._expand_deferred;
      }

      var that = this
        , $openclose = this.element.find(".openclose").first();

      this.options.attr("expanded", true);

      this._expand_deferred = new $.Deferred();
      setTimeout(function() {
        that.display_subtrees().then(function() {
          that.element.trigger("subtree_loaded");
          that.element.trigger("loaded");
          that._expand_deferred.resolve();
        });
      }, 500);
      return this._expand_deferred;
    }

  , ".openclose:not(.active) click" : function(el, ev) {
    // Ignore unless it's a direct child
    if (el.closest('.' + this.constructor._fullName).is(this.element))
      this.expand();
  }

  , "input,select click" : function(el, ev) {
    // Don't toggle accordion when clicking on input/select fields
    ev.stopPropagation();
  }

  , trigger_expand: function() {
      var $expand_el = this.element.find(".openclose").first();
      if (!$expand_el.hasClass("active"))
        $expand_el.trigger("click");
      return this.expand();
    }
});
