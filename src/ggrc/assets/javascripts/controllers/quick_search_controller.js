/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//require can.jquery-all

(function(can, $) {
  function with_params(href, params) {
    if (href.charAt(href.length - 1) === '?')
      return href + params;
    else if (href.indexOf('?') > 0)
      return href + '&' + params;
    else
      return href + '?' + params;
  }

  function get_attr(el, attrnames) {
    var attrval = null
    , $el = $(el);
    can.each(can.makeArray(attrnames), function(attrname) {
      var a = $el.attr(attrname);
      if(a) {
        attrval = a;
        return false;
      }
    });
    return attrval;
  }

CMS.Controllers.Filterable("CMS.Controllers.QuickSearch", {
  defaults : {
    list_view : GGRC.mustache_path + "/dashboard/object_list.mustache"
    , spin : true
    , tab_selector : 'ul.nav-tabs:first > li > a'
    , tab_href_attr : [ "href", "data-tab-href" ]
    , tab_target_attr : [ "data-tab-target", "href" ]
    , tab_model_attr : [ "data-model", "data-object-singular" ]
    , limit : null
  }
}, {

  setup : function(el, opts) {
    this._super && this._super.apply(this, arguments);
    if(!opts.observer) {
      opts.observer = new can.Observe();
    }
  }

  , init : function(opts) {
    var that = this;
    var $tabs = this.element.find(this.options.tab_selector);
    $tabs.each(function(i, tab) {
      var $tab = $(tab)
      , href = get_attr($tab, that.options.tab_href_attr)
      , loaded = $tab.data('tab-loaded')
      , pane = get_attr($tab, that.options.tab_target_attr)
      , $pane = $(pane)
      , template = $tab.data("template") || that.options.list_view
      , model_name = get_attr($tab, that.options.tab_model_attr)
      , model = can.getObject("CMS.Models." + model_name) || can.getObject("GGRC.Models." + model_name)
      , view_data = null
      , spinner
      , xhrs = {};

      if(!template && typeof console !== "undefined") {
        console.warn("No template defined for quick_search in ", $pane.attr("id"));
      }

      if(model && template) {
        view_data = new can.Observe({
          list: new model.List()
          , all_items: new model.List()
          , filtered_items: new model.List()
          , observer: that.options.observer
          , model : model
        });

        $tab.data("view_data", view_data);
        $tab.data("model", model);
        $pane.trigger("loading");
        model.findAll().done(function(data) {
          view_data.attr('all_items', data);
          view_data.attr('filtered_items', data.slice(0));
          if($tab.is("li.active a")) {
            can.Observe.startBatch();
            if(that.options.limit != null) {
              view_data.attr('list').replace(data.slice(0, that.options.limit));
            } else {
              view_data.attr('list', data);
            }
            can.Observe.stopBatch();
            $pane.trigger("loaded", xhrs[$pane.attr("id")], $tab.data("list"));
          } else {
            GGRC.queue_event(function() {
              if(that.options.limit != null) {
                view_data.attr('list').replace(data.slice(0, that.options.limit));
              } else {
                view_data.attr('list', data);
              }
              $pane.trigger("loaded", xhrs[$pane.attr("id")], $tab.data("list"));
            });
          }
          $tab.find(".item-count").html(data ? data.length : 0);
        });

        model.bind("created", function(ev, instance) {
          if(instance.constructor === model) {
            view_data.list.unshift(instance.serialize());
          }
        });
      }

      if(that.options.spin) {
        spinner = new Spinner({ }).spin();
        $pane.html(spinner.el);
        // Scroll up so spinner doesn't get pushed out of visibility
        $pane.scrollTop(0);
        $(spinner.el).css({ width: '100px', height: '100px', left: '50px', top: '50px', zIndex : calculate_spinner_z_index });
      }

      if (view_data) {
        $pane.html(
          $(new Spinner().spin().el)
          .css({
            width: '100px', height: '100px',
            left: '38%', top: '50%',
            zIndex : calculate_spinner_z_index
          }));
        can.view(template, view_data, function(frag, xhr) {
          $tab.data('tab-loaded', true);
          $pane.html(frag);
          xhrs[$pane.attr("id")] = xhr;
        });
      }
    });
  }

  , "{observer} value" : function(el, ev, newval) {
    this.filter(newval);
    this.element.trigger('kill-all-popovers');
  }

  , "{observer} my_work" : function(el, ev, newval) {
    this.filter(null, newval ? { "contact_id": GGRC.current_user.id } : null);
    this.element.trigger('kill-all-popovers');
  }

  // @override
  , redo_last_filter : function(id_to_add) {
    var that = this;
    var $tabs = $(this.element).find(this.options.tab_selector);
    var old_sel = this.options.filterable_items_selector;
    var old_ids = this.last_filter_ids;

    $tabs.each(function(i, tab) {
      var $tab = $(tab)
      , model = $tab.data("model")
      , res = old_ids ? that.last_filter.getResultsFor(model) : null
      , view_data = $tab.data("view_data");

      //that.options.filterable_items_selector = $(get_attr($tab, that.options.tab_href_attr)).find("li:not(.view-more, .add-new)");
      that.last_filter_ids = res = res ? can.unique(can.map(res, function(v) { return v.id; })) : null; //null is the show-all case
      if(res) {
        view_data.filtered_items.replace(can.map(view_data.all_items, function(item) { return ~can.inArray(item.id, res) ? item : undefined; }));
      } else {
        view_data.filtered_items.replace(view_data.all_items.slice(0));
      }
      view_data.list.replace(that.options.limit ? view_data.filtered_items.slice(0, that.options.limit) : view_data.filtered_items);

      //that._super();
      // res = can.map(res, function(obj, i) {
      //   var m = new model(obj);
      //   if(!m.selfLink) {
      //     m.refresh();
      //   }
      //   return m;
      // });
      $tab.find(".item-count").html(res ? res.length : $tab.data("view_data").filtered_items.length);
    });
  }

  , ".tabbable loaded" : function(el, ev) {
    $(el).scrollTop(0);
  }

  , ".nav-tabs li click" : function(el, ev) {
    var plural = el.children("a").attr("data-object-plural");
    var singular = can.map(window.cms_singularize(plural).split("_"), can.capitalize).join(" ");
    el.closest(".widget").find(".object-type").text(singular)
      .closest("a").attr("data-object-plural", plural.split(" ").join("_").toLowerCase())
      .attr("data-object-singular", singular.replace(" ", ""));
  }
});

can.Control("CMS.Controllers.LHN", {
    defaults: {
    }
}, {
    init: function() {
      var self = this
        ;

      this.obs = new can.Observe();

      if (this.should_show_lhn()) {
        this.init_lhn();
      }
      else {
        this.hide_lhn();
      }
    }

  , should_show_lhn: function() {
      return Permission.is_allowed("view_object_page", "__GGRC_ALL__", null);
    }

  , "input.widgetsearch keypress": function(el, ev) {
      if(ev.which === 13)
        this.obs.attr("value", $(ev.target).val());
    }

  , "input.my-work click": function(el, ev) {
      var target = $(ev.target);
      if (target.is('input.my-work')) {
        var checked = target.prop("checked");
        this.obs.attr("my_work", checked);
        target.closest('.btn')[checked ? 'addClass' : 'removeClass']('btn-success');
        CMS.Models.DisplayPrefs.findAll().done(function(prefs) {
          if(prefs.length < 1) {
            prefs.push(new CMS.Models.DisplayPrefs());
            prefs[0].save();
          }
          prefs[0].setGlobal("lhs", { my_work: checked });
        });
      }
    }

  , init_lhn: function() {
      var self = this;

      CMS.Models.DisplayPrefs.findAll().done(function(prefs) {
        var settings, checked
          , $lhs = $("#lhs")
          ;

        if(prefs.length < 1) {
          prefs.push(new CMS.Models.DisplayPrefs());
          prefs[0].save();
        }

        settings = prefs[0].getGlobal("lhs");
        checked = (settings && 'my_work' in settings) ? !!settings.my_work : true;
        self.obs.attr("my_work", checked);

        $lhs.cms_controllers_lhn_search({ observer: self.obs });
        $lhs.cms_controllers_lhn_tooltips();

        // Delay LHN initializations until after LHN is rendered
        setTimeout(function() {
          var target = self.element.find('#lhs input.my-work')
            , checked = self.obs.attr('my_work')
            ;

          target.prop('checked', checked);
          target.closest('.btn')[checked ? 'addClass' : 'removeClass']('btn-success');
          if(!$lhs.hasClass("lhs-closed")) {
            $(".recent").ggrc_controllers_recently_viewed();
            self.size && self.resize_lhn(self.size);
          }
        }, 200);
        self.size = prefs[0].getLHNavSize(null, "lhs") || self.min_lhn_size;
        self.resize_lhn(self.size);
        // Collapse the LHN if they did it on a previous page
        var collapsed = prefs[0].getCollapsed(null, "lhs");
        collapsed && self.toggle_lhs();
      });
    }

  , hide_lhn: function() {
      var $area = $(".area")
        , $lhsHolder = $(".lhs-holder")
        ;

      this.element.hide();
      $lhsHolder.css("width", 0);
      $area.css("margin-left", 0);

      window.resize_areas();
    }

  , toggle_lhs: function() {
      var $lhs = $("#lhs")
        , $lhsHolder = $(".lhs-holder")
        , $area = $(".area")
        , $bar = $(".bar-v")
        , $search = $('.widgetsearch')
        ;
      if($lhs.hasClass("lhs-closed")) {
        $lhs.removeClass("lhs-closed");
        $bar.removeClass("bar-closed");
        $lhsHolder.css("width", this.size + "px");
        $area.css("margin-left", (this.size + 8) + "px");
        $bar.css("left", this.size + "px");
        $search.width(this.size - 100);
      } else {
        $lhs.addClass("lhs-closed");
        $bar.addClass("bar-closed");
        $lhsHolder.css("width","40px");
        $area.css("margin-left","48px");
        $bar.css("left", "40px");
      }

      window.resize_areas();

      CMS.Models.DisplayPrefs.findAll().done(function(prefs) {
        prefs[0].setCollapsed(null, "lhs", $lhs.hasClass("lhs-closed"));
      })
    }
  
  , min_lhn_size : 240
  , mousedown : false
  , dragged : false
  , resize_lhn : function(resize){
    var $lhs = $("#lhs")
    , $lhsHolder = $(".lhs-holder")
    , $area = $(".area")
    , $bar = $(".bar-v")
    , $search = $('.widgetsearch')
    ;
    if(resize < this.min_lhn_size/2 && !$lhs.hasClass("lhs-closed")) this.toggle_lhs();
    if(resize < this.min_lhn_size) return;
    if($lhs.hasClass("lhs-closed")) this.toggle_lhs();
    $lhsHolder.width(resize);
    
    var a = (resize) + "px";
    var b = (resize+8) + "px"
    $area.css("margin-left",  b);
    
    $bar.css("left", a)
    
    $search.width(resize - 100);
    window.resize_areas();

  }
  , ".bar-v mousedown" : function(el, ev) {
    this.mousedown = true;
    this.dragged = false;
  }
  , "{window} mousemove" : function(el, ev){
    if(!this.mousedown){
      return;
    }

    ev.preventDefault();
    this.dragged = true;
    this.size = ev.pageX;
    this.resize_lhn(this.size);

  }
  , "{window} mouseup" : function(el, ev){
    var self = this;
    if(!this.mousedown) return;
    
    this.mousedown = false;
    if(!this.dragged){
      this.toggle_lhs();
      return;
    }
    self.size = Math.max(self.size, this.min_lhn_size);
    CMS.Models.DisplayPrefs.findAll().done(function(prefs) {
      prefs[0].setLHNavSize(null, "lhs", self.size);
    });
  }

  , "#lhs click": function(el, ev) {
      this.resize_search();
    }

  , resize_search: function() {
      // Resize search input as necessary
      var input = this.element.find('#lhs input.widgetsearch')
        , width;

      width =
        input.closest('.form-search').width()
        - input.parent().outerWidth() + input.parent().width()
        - input.next().outerWidth() - input.outerWidth() + input.width();

      input.css('width', width + 'px');
    }

  , "#lhs input.widgetsearch focus": function(el, ev) {
      this.resize_search();
    }

  , ".lhs-closed click": function(el, ev) {
      this.toggle_lhs();
    }
});

can.Control("CMS.Controllers.LHN_Search", {
    defaults : {
        list_view : GGRC.mustache_path + "/base_objects/search_result.mustache"
      , actions_view : GGRC.mustache_path + "/base_objects/search_actions.mustache"
      , list_selector: 'ul.top-level > li'
      , model_attr_selector: null
      , model_attr: 'data-model-name'
      , count_selector: '.item-count'
      , list_content_selector: 'ul.sub-level'
      , actions_content_selector: 'ul.sub-actions'
      , spinner_selector: '.spinner'
      , limit : 50
      , observer : null
    }
}, {
    init: function() {
      var self = this
        , template_path = GGRC.mustache_path + this.element.data('template')
        ;

      can.view(template_path, {}, function(frag, xhr) {
        self.element.html(frag);
        self.post_init();
      });
    }

  , post_init: function() {
      var self = this;
      this.init_object_lists();
      this.init_list_views();
      this.run_search("", this.options.observer.my_work ? { "contact_id": GGRC.current_user.id } : null);

      can.Model.Cacheable.bind("created", function(ev, instance) {
        var visible_model_names =
              can.map(self.get_visible_lists(), self.proxy("get_list_model"))
          , model_name = instance.constructor.shortName
          ;

        if(visible_model_names.indexOf(model_name) > -1) {
          self.options.visible_lists[model_name].unshift(instance);
          self.options.results_lists[model_name].unshift(instance);
          // Refresh the counts whenever the lists change
          self.refresh_counts();
        }
      });
    }

  , make_spinner: function() {
      var spinner = new Spinner({
          radius: 4
        , length: 7
        , width: 2
        }).spin();
      $(spinner.el).css({
        width: '30px',
        height: '30px',
        left: '30px',
        top: '15px',
        //zIndex : calculate_spinner_z_index
      });
      return spinner.el;
    }

  , "{list_selector} > a click": "toggle_list_visibility"

  , toggle_list_visibility: function(el, ev) {
      var selector = this.options.list_content_selector + ',' + this.options.actions_content_selector
        , $ul = el.parent().find(selector)
        ;

      if ($ul.is(":visible")) {
        el.removeClass("active");
        $ul.slideUp().removeClass("in");
      } else {
        // Use a cached max-height if one exists
        var holder = el.closest('.lhs-holder')
          , $content = $ul.filter(this.options.list_content_selector)
          , $siblings = $ul.closest(".lhs").find(selector)
          , extra_height = 0
          , top
          ;

        // Collapse other lists
        $siblings.slideUp().removeClass("in");
        // Expand this list
        $ul.slideDown().addClass("in");
        
        // Remove active class from other lists
        holder.find('a.active').removeClass('active');
        // Add active class to this list
        el.addClass("active");
        
        // Compute the extra height to add to the expandable height, 
        // based on the size of the content that is sliding away.
        top = $content.offset().top;
        $siblings.filter(':visible').each(function() {
          var sibling_top = $(this).offset().top;
          if (sibling_top <= top) {
            extra_height += this.offsetHeight + (sibling_top < 0 ? -holder[0].scrollTop : 0);
          }
        });

        // Determine the expandable height
        this._holder_height = holder.outerHeight();
        $content.filter(this.options.list_content_selector).css(
            'maxHeight'
          , Math.max(160, (this._holder_height - holder.position().top + extra_height - top - 40)) + 'px'
        );

        this.on_show_list($ul);
      }
      ev.preventDefault();
    }

  , " resize": function() {
      var $content = this.element.find(this.options.list_content_selector).filter(':visible');


      if ($content.length) {
        var last_height = this._holder_height
          , holder = this.element.closest('.lhs-holder')
          ;
        this._holder_height = holder.outerHeight();

        $content.css(
            'maxHeight'
          , (parseFloat($content.css('maxHeight')) + this._holder_height - last_height) + 'px'
        );
      }
    }

  , on_show_list: function(el, ev) {
      var $list = $(el).closest(this.get_lists())
        , model_name = this.get_list_model($list)
        ;

      setTimeout(this.proxy("refresh_visible_lists"), 20);
    }

  , "{observer} value" : function(el, ev, newval) {
      this.run_search(newval, this.current_params);
    }

  , "{observer} my_work" : function(el, ev, newval) {
    this.run_search(this.current_term, newval ? { "contact_id": GGRC.current_user.id } : null);
  }

  , show_more: function($el) {
      if (this._show_more_pending)
        return;

      var that = this
        , $list = $el.closest(this.get_lists())
        , model_name = this.get_list_model($list)
        , visible_list = this.options.visible_lists[model_name]
        , results_list = this.options.results_lists[model_name]
        , refresh_queue
        , new_visible_list
        ;

      if (visible_list.length >= results_list.length)
        return;

      this._show_more_pending = true;
      refresh_queue = new RefreshQueue();
      new_visible_list =
        //results_list.slice(0, visible_list.length + this.options.limit);
        results_list.slice(visible_list.length, visible_list.length + this.options.limit);

      can.each(new_visible_list, function(item) {
        refresh_queue.enqueue(item);
      });
      refresh_queue.trigger().then(function() {
        visible_list.push.apply(visible_list, new_visible_list);
        visible_list.attr('is_loading', false)
        //visible_list.replace(new_visible_list);
        delete that._show_more_pending;
      });
      visible_list.attr('is_loading', true)
    }

  , ".sub-level DOMMouseScroll": "prevent_overscroll"
  , ".sub-level mousewheel": "prevent_overscroll"

  , prevent_overscroll: function($el, ev) {
      // Based on Troy Alford's response on StackOverflow:
      //   http://stackoverflow.com/a/16324762
      var scrollTop = $el[0].scrollTop
        , scrollHeight = $el[0].scrollHeight
        , height = $el.height()
        , scrollTopMax = scrollHeight - height
        , delta
        , up
        , loadTriggerOffset = 50
        ;

      if (ev.type === "DOMMouseScroll")
        delta = ev.originalEvent.detail * -40;
      else
        delta = ev.originalEvent.wheelDelta;

      up = delta > 0;

      var prevent = function() {
        ev.stopPropagation();
        ev.preventDefault();
        ev.returnValue = false;
        return false;
      }

      if (!up && scrollTop - delta > scrollTopMax) {
        // Scrolling down, but this will take us past the bottom.
        $el.scrollTop(scrollHeight);
        this.show_more($el);
        return prevent();
      } else if (up && delta > scrollTop) {
        // Scrolling up, but this will take us past the top.
        $el.scrollTop(0);
        return prevent();
      } else if (!up && scrollTop - delta > scrollTopMax - loadTriggerOffset) {
        // Scrolling down, close to bottom, so start loading more
        this.show_more($el);
      }
    }

  , init_object_lists: function() {
      var self = this;
      if (!this.options.results_lists)
        this.options.results_lists = {};
      if (!this.options.visible_lists)
        this.options.visible_lists = {};

      can.each(this.get_lists(), function($list) {
        var model_name;
        $list = $($list);
        model_name = self.get_list_model($list);
        self.options.results_lists[model_name] = new can.Observe.List();
        self.options.visible_lists[model_name] = new can.Observe.List();
      });
    }

  , init_list_views: function() {
      var self = this;
      can.each(this.get_lists(), function($list) {
        var model_name;
        $list = $($list);
        model_name = self.get_list_model($list);

        var context = {
            model: CMS.Models[model_name]
          , list: self.options.visible_lists[model_name]
          , count: can.compute(function() {
              return self.options.results_lists[model_name].attr('length');
            })
        };

        can.view($list.data("template") || self.options.list_view, context, function(frag, xhr) {
          $list.find(self.options.list_content_selector).html(frag);
        });
        can.view($list.data("actions") || self.options.actions_view, context, function(frag, xhr) {
          $list.find(self.options.actions_content_selector).html(frag);
        });
      });
    }

  , get_list_model: function($list) {
      $list = $($list);
      if (this.options.model_attr_selector)
        $list = $list.find(this.options.model_attr_selector).first();
      return $list.attr(this.options.model_attr);
    }

  , display_counts: function(search_result) {
      var self = this;
      can.each(this.get_lists(), function($list) {
        var model_name, count;
        $list = $($list);
        model_name = self.get_list_model($list);
        if (model_name) {
          count = search_result.getCountFor(model_name);

          if (Permission.is_allowed('read', model_name, null) && !isNaN(parseInt(count))) {
            $list
              .find(self.options.count_selector)
              .text(count);
          }
          else {
            $list.find(self.options.count_selector).closest('small').remove();
          }
        }
      });
    }

  , display_lists: function(search_result) {
      var self = this
        , lists = this.get_visible_lists()
        ;

      can.each(lists, function(list) {
        var $list = $(list)
          , model_name = self.get_list_model($list)
          , results = search_result.getResultsForType(model_name)
          , refresh_queue = new RefreshQueue()
          , initial_visible_list = null;
          ;

        self.options.results_lists[model_name].replace(results);
        initial_visible_list =
          self.options.results_lists[model_name].slice(0, self.options.limit);

        can.each(initial_visible_list, function(obj) {
          refresh_queue.enqueue(obj);
        });
        refresh_queue.trigger().then(function(_) {
          self.options.visible_lists[model_name].replace(initial_visible_list);
          // Stop spinner when request is complete
          $list.find(self.options.spinner_selector).html("");
        });
      });
    }

  , refresh_counts: function() {
      var models;
      models = can.map(this.get_lists(), this.proxy("get_list_model"));

      // Retrieve and display counts
      GGRC.Models.Search.counts_for_types(this.current_term, models, this.current_params)
        .then(this.proxy("display_counts"));
    }

  , refresh_visible_lists: function() {
      var self = this
        , lists = this.get_visible_lists()
        , models = can.map(lists, this.proxy("get_list_model"))
        ;

      models = can.map(models, function(model_name) {
        if (self.options.loaded_lists.indexOf(model_name) == -1)
          return model_name;
      });

      if (models.length > 0) {
        // Register that the lists are loaded
        can.each(models, function(model_name) {
          self.options.loaded_lists.push(model_name);
        });

        // Start the spinners before the request
        can.each(lists, function(list) {
          var $list = $(list);
          $list.find('.spinner').html(self.make_spinner());
        });

        GGRC.Models.Search.search_for_types(this.current_term, models, this.current_params)
          .then(this.proxy("display_lists"));
      }
    }

  , run_search: function(term, extra_params) {
      var self = this;
      if (term !== this.current_term || extra_params !== this.current_params) {
        // Clear current result lists
        can.each(this.options.results_lists, function(list) {
          list.replace([]);
        });
        can.each(this.options.visible_lists, function(list) {
          list.replace([]);
        });
        this.options.loaded_lists = [];

        this.current_term = term;
        this.current_params = extra_params;
        this.refresh_counts();
        // Retrieve and display results for visible lists
        this.refresh_visible_lists();
      }
    }

  , get_lists: function() {
      return $.makeArray(
          this.element.find(this.options.list_selector));
    }

  , get_visible_lists: function() {
      var self = this;
      return can.map(this.get_lists(), function($list) {
        $list = $($list);
        if ($list.find(self.options.list_content_selector).hasClass('in'))
          return $list;
      });
    }
});


can.Control("CMS.Controllers.LHN_Tooltips", {
    defaults : {
        tooltip_view: GGRC.mustache_path + "/base_objects/extended_info.mustache"
      , trigger_selector: ".show-extended"
      , fade_in_delay: 300
      , fade_out_delay: 300
    }
}, {
    init: function() {
      if (!this.options.$extended) {
        this.options.$extended = $('#extended-info');
        if (this.options.$extended.length < 1)
          this.options.$extended =
            $('<div id="extended-info" class="extended-info hide" />')
              .appendTo('body');
      }
      if (!this.options.$lhs)
        this.options.$lhs = $('#lhs');
      // Renew event listening, since we assigned $extended, $lhs
      this.on();
    }

  // Tooltip / popover handling
  , "{trigger_selector} mouseenter": "on_mouseenter"
  , "{trigger_selector} mouseleave": "on_mouseleave"
  , "{$extended} mouseleave": "on_mouseleave"
  , "{$extended} mouseenter": "on_tooltip_mouseenter"

  , on_mouseenter: function(el, ev) {
      var instance = el.closest("[data-model]").data("model")
                      || el.closest(":data(model)").data("model")
        , delay = this.options.fade_in_delay
        ;

      // There isn't tooltip data available for recently viewed objects
      if (instance instanceof GGRC.Models.RecentlyViewedObject)
        return;

      if (this.options.$extended.data('model') !== instance) {
        clearTimeout(this.fade_in_timeout);
        // If tooltip is already showing, show new content without delay
        if (this.options.$extended.hasClass('in'))
          delay = 0;
        this.fade_in_timeout = setTimeout(
            this.proxy('on_fade_in_timeout', el, instance), delay);
        clearTimeout(this.fade_out_timeout);
        this.fade_out_timeout = null;
      } else if (this.fade_out_timeout) {
        clearTimeout(this.fade_out_timeout);
        this.fade_out_timeout = null;
      }
    }

  , ensure_tooltip_visibility: function() {
      var offset = this.options.$extended.offset().top
        , height = this.options.$extended.height()
        // "- 24" compensates for the Chrome URL display when hovering a link
        , window_height = $(window).height() - 24
        , new_offset
        ;

      if (offset + height > window_height) {
        if (height > window_height)
          new_offset = 0;
        else
          new_offset = window_height - height;
        this.options.$extended.css({ top: new_offset });
      }
    }

  , get_tooltip_view: function(el) {
      var tooltip_view = $(el)
            .closest('[data-tooltip-view]').attr('data-tooltip-view');
      if (tooltip_view && tooltip_view.length > 0) {
        if (tooltip_view === "null") {
          return null;
        }
        else {
          return GGRC.mustache_path + tooltip_view;
        }
      }
      else {
        return this.options.tooltip_view;
      }
    }

  , on_fade_in_timeout: function(el, instance) {
      var self = this
        , tooltip_view = this.get_tooltip_view(el)
        ;

      if (tooltip_view) {
        this.fade_in_timeout = null;
        can.view(tooltip_view, new can.Observe({ instance: instance }), function(frag) {
          self.options.$extended
            .html(frag)
            .addClass('in')
            .removeClass('hide')
            .css({ top: el.offset().top, left: self.options.$lhs.width() })
            .data('model', instance);
          self.ensure_tooltip_visibility();
        });
      }
    }

  , on_tooltip_mouseenter: function() {
      clearTimeout(this.fade_out_timeout);
      this.fade_out_timeout = null;
    }

  , on_fade_out_timeout: function() {
      clearTimeout(this.fade_in_timeout);
      this.fade_in_timeout = null;
      this.fade_out_timeout = null;
      this.options.$extended
        .removeClass('in')
        .addClass('hide')
        .data('model', null);
    }

  , on_mouseleave: function(el, ev) {
      // Cancel fade_in, if we haven't displayed yet
      clearTimeout(this.fade_in_timeout);
      this.fade_in_timeout = null;

      clearTimeout(this.fade_out_timeout);
      this.fade_out_timeout =
        setTimeout(
            this.proxy("on_fade_out_timeout"),
            this.options.fade_out_delay);
    }
});

})(this.can, this.can.$);
