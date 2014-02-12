/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: dan@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require bootstrap-modal
//= require can.jquery-all
//= require jquery-migrate
//= require jquery-ui

!function($) {

  "use strict"; // jshint ;_;

  function preload_content() {
    var template =
      [ '<div class="modal-header">'
      , '  <a class="btn btn-mini pull-right" href="#" data-dismiss="modal">'
      , '    <i class="grcicon-x-grey"></i>'
      , '  </a>'
      , '  <h2>Loading...</h2>'
      , '</div>'
      , '<div class="modal-body" style="padding-top:150px;"></div>'
      , '<div class="modal-footer">'
      , '</div>'
      ];
    return $(template.join('\n'))
      .filter('.modal-body')
        .html(
          $(new Spinner().spin().el)
            .css({
              width: '100px', height: '100px',
              left: '50%', top: '50%',
              zIndex : calculate_spinner_z_index
            })
        ).end();
  }

  function emit_loaded(responseText, textStatus, xhr) {
    if (xhr.status == 403) {
      // For now, only inject the response HTML in the case
      // of an authorization error
      $(this).html(responseText)
    }
    $(this).trigger('loaded');
  }

  function refresh_page() {
    setTimeout(can.proxy(window.location.reload, window.location), 10);
  }

  var handlers = {
    'modal': function($target, $trigger, option) {
      $target.modal(option).draggable({ handle: '.modal-header' });
    },

    'listselect': function($target, $trigger, option) {
      var list_target = $trigger.data('list-target');
      $target.modal_single_selector(option, $trigger);

      // Close the modal and rewrite the target list
      $target.on('modal:select', function(e, data) {
        $target.modal_single_selector('hide');
        $trigger.trigger('modal:select', data);
      });
    },

    'relationshipsform': function($target, $trigger, option) {
      var list_target = $trigger.data('list-target');
      $target.modal_relationship_selector(option, $trigger);

      // Close the modal and rewrite the target list
      $target.on('ajax:json', function(e, data, xhr) {
        if (data.errors) {
        } else {
          $trigger.trigger('modal:success', [data]);
          if (list_target == 'refresh') {
            refresh_page();
          } else if (list_target) {
            $(list_target).tmpl_setitems(data);
            $target.modal_relationship_selector('hide');
          }
        }

      });
    },

    'listform': function($target, $trigger, option) {
      var list_target = $trigger.data('list-target');
      $target.modal_relationship_selector(option, $trigger);

      // Close the modal and rewrite the target list
      $target.on('ajax:json', function(e, data, xhr) {
        if (data.errors) {
        } else if (list_target == 'refresh') {
          refresh_page();
        } else if (list_target) {
          $(list_target).tmpl_setitems(data);
          $target.modal_relationship_selector('hide');
        }
      });
    },

    'listnewform': function($target, $trigger, option) {
      $target.modal_form(option, $trigger);
      var list_target = $trigger.data('list-target')
        , selector_target = $trigger.data('selector-target')
        ;

      // Close the modal and append to the target list
      $target.on('ajax:json', function(e, data, xhr) {
        if (data.errors) {
        } else {
          if (list_target) {
            $(list_target).tmpl_additem(data)
          }
          if (selector_target) {
            $(selector_target).trigger('list-add-item', data);
          }
          //$(tablist_target).trigger('list-add-item', data);
          $target.modal_form('hide');
        }
      });
    },

    'listeditform': function($target, $trigger, option) {
      $target.modal_form(option, $trigger);
      var list_target = $trigger.data('list-target')
        , selector_target = $trigger.data('selector-target')
        ;

      // Close the modal and append to the target list
      $target.on('ajax:json', function(e, data, xhr) {
        if (data.errors) {
        } else {
          if (list_target) {
            $(list_target).tmpl_mergeitems([data]);
          }
          if (selector_target) {
            $(selector_target).trigger('list-update-item', data);
          }
          $target.modal_form('hide');
          $trigger.trigger('modal:success', data);
        }
      });
    },

    'deleteform': function($target, $trigger, option) {
      var form_target = $trigger.data('form-target')
        , model = CMS.Models[$trigger.attr("data-object-singular")]
        , instance
        , delete_counts = new can.Observe({loading: true, counts: ""})
        ;

      if($trigger.attr('data-object-id') === "page") {
        instance = GGRC.page_instance();
      } else {
        instance = model.findInCacheById($trigger.attr('data-object-id'));
      }

      instance.get_orphaned_count().done(function(counts){
          delete_counts.attr('loading', false);
          delete_counts.attr('counts', counts);
        }).fail(function(){
          delete_counts.attr('loading', false);
      });
      
      $target
      .modal_form(option, $trigger)
      .ggrc_controllers_delete({
          $trigger : $trigger
        , new_object_form : false
        , button_view : GGRC.mustache_path + "/modals/delete_cancel_buttons.mustache"
        , model : model
        , instance : instance
        , delete_counts : delete_counts
        , modal_title : "Delete " + $trigger.attr("data-object-singular")
        , content_view : GGRC.mustache_path + "/base_objects/confirm_delete.mustache" 
      });

      $target.on('modal:success', function(e, data) {
        var model_name = $trigger.attr("data-object-plural").toLowerCase();
        if($trigger.attr('data-object-id') === "page" || (instance === GGRC.page_instance())) {
          window.location.assign('/dashboard');
        } else if (model_name  == 'people' || model_name  == 'roles') {
          window.location.assign('/admin#' + model_name + "_list_widget");
          window.location.reload();
        } else {
          $trigger.trigger('modal:success', data);
          $target.modal_form('hide');
        }
      });
    },

    'unmapform': function($target, $trigger, option) {
      var form_target = $trigger.data('form-target')
      , object_params = $trigger.attr('data-object-params')
      , model = CMS.Models[$trigger.attr("data-object-singular")]
      , instance;
      if($trigger.attr('data-object-id') === "page") {
        instance = GGRC.page_instance();
      } else {
        instance = model.findInCacheById($trigger.attr('data-object-id'));
      }
      if (object_params) {
        object_params = JSON.parse(object_params.replace(/\\n/g, "\\n"));
      } else {
        object_params = {};
      }

      $target
      .modal_form(option, $trigger)
      .ggrc_controllers_unmap({
          $trigger : $trigger
        , new_object_form : false
        , button_view : GGRC.mustache_path + "/modals/unmap_cancel_buttons.mustache"
        , model : model
        , instance : instance
        , object_params : object_params
        , modal_title : $trigger.attr("data-modal-title") || ("Delete " + $trigger.attr("data-object-singular"))
        , content_view : $trigger.attr('data-content-view') || (GGRC.mustache_path + "/base_objects/confirm_unmap.mustache")
      });

      $target.on('modal:success', function(e, data) {
        $trigger.children(".result").each(function(i, result_el) {
          var $result_el = $(result_el)
            , result = $result_el.data('result')
            , mappings = result && result.get_mappings()
            , i
            ;

          can.each(mappings, function(mapping) {
            mapping.refresh().done(function() {
              if (mapping instanceof CMS.Models.Control) {
                mapping.removeAttr('directive');
                mapping.save();
              }
              else {
                mapping.destroy();
              }
            });
          });
        });
      });
    },

    'form': function($target, $trigger, option) {
      var form_target = $trigger.data('form-target')
      , object_params = $trigger.attr('data-object-params')
      , model = CMS.Models[$trigger.attr("data-object-singular")]
      , instance;
      if($trigger.attr('data-object-id') === "page") {
        instance = GGRC.page_instance();
      } else {
        instance = model.findInCacheById($trigger.attr('data-object-id'));
      }
      if (object_params) {
        object_params = JSON.parse(object_params.replace(/\\n/g, "\\n"));
      } else {
        object_params = {};
      }

      var modal_title = (instance ? "Edit " : "New ") + ($trigger.attr("data-object-singular-override") || model.title_singular || $trigger.attr("data-object-singular"));
      // If this was initiated via quick join link
      if (object_params.section) {
        modal_title = "Map " + modal_title + " to " + object_params.section.title;
      }
      
      $target
      .modal_form(option, $trigger)
      .ggrc_controllers_modals({
          new_object_form : !$trigger.attr('data-object-id')
        , object_params : object_params
        , button_view : GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL_DELETE
        , model : model
        , current_user : GGRC.current_user
        , instance : instance
        , modal_title : object_params.modal_title || modal_title
        , content_view : GGRC.mustache_path + "/" + $trigger.attr("data-object-plural") + "/modal_content.mustache"
      });

      $target.on('modal:success', function(e, data, xhr) {
        if (form_target == 'refresh') {
          refresh_page();
        } else if (form_target == 'redirect' && data.type != 'Audit' && data.type != 'Program') {
          if (typeof xhr !== 'undefined' && "getResponseHeader" in xhr) {
            window.location.assign(xhr.getResponseHeader('location'));
          }
          else {
            window.location.assign(data.selfLink.replace('/api', ''));
          }
        } else {
          var dirty;
          $target.modal_form('hide');
          if($trigger.data("dirty")) {
            dirty = $($trigger.data("dirty").split(",")).map(function(i, val) {
              return '[href="' + val.trim() + '"]';
            }).get().join(",");
            $(dirty).data('tab-loaded', false);
          }
          if(dirty) {
            var $active = $(dirty).filter(".active [href]");
            $active.closest(".active").removeClass("active");
            $active.click();
          }
          $trigger.trigger("routeparam", $trigger.data("route"));
          $trigger.trigger('modal:success', data);
        }
      });
    },

    'helpform' : function($target, $trigger, option) {
      $target.modal_form(option, $trigger).ggrc_controllers_help({ slug : $trigger.attr('data-help-slug') });
    }

  };


  var arrangeBackgroundModals = function(modals, referenceModal) {
    modals = $(modals).not(referenceModal);
    if(modals.length < 1) return;

    var $header = referenceModal.find(".modal-header");
    var header_height = $header.height() + parseInt($header.css("padding-top")) + parseInt($header.css("padding-bottom"));
    var _top = parseInt($(referenceModal).offset().top);

    modals.css({
        "overflow" : "hidden"
      , "height" : function() {
          return header_height;
        }
      , "top" : function(i) {
        return _top - (modals.length - i) * (header_height);
      }
      , "margin-top" : 0
      , 'position' : "absolute"
    })
    modals.off("scroll.modalajax");
    modals.on("scroll.modalajax", function() { 
        $(this).scrollTop(0); //fix for Chrome rendering bug when resizing block elements containing CSS sprites.
    });
  }

  var arrangeTopModal = function(modals, modal) {
    if(!modal || !modal.length)
      return;

    var $header = modal.find(".modal-header:first");
    var header_height = $header.height() + parseInt($header.css("padding-top")) + parseInt($header.css("padding-bottom"));

    var offsetParent = modal.offsetParent();
    var _scrollY = 0;
    var _top = 0;    
    var _left = modal.position().left;
    if(!offsetParent.length || offsetParent.is("html, body")) {
      offsetParent = $(window);
      _scrollY = window.scrollY;
      _top = _scrollY 
        + (offsetParent.height() 
          - modal.height()) / 2 
        + header_height / 2

        window.scrollY + ($(window).height() - modal.height()) / 2 + (modals.length - 1) * parseInt(modal.find(".modal-header").height()) 
    } else {
      _top = offsetParent.closest(".modal").offset().top - offsetParent.offset().top + header_height;
      _left = offsetParent.closest(".modal").offset().left + offsetParent.closest(".modal").width() / 2 - offsetParent.offset().left;
    }
    if (_top < 0) {
      _top = 0;
    }
    modal
    .css("top", _top + "px")
    .css({"position" : "absolute", "margin-top" : 0, "left" : _left});
  }

  var _modal_show = $.fn.modal.Constructor.prototype.show;
  $.fn.modal.Constructor.prototype.show = function() {
    var that = this;
    var $el = this.$element;
    var shownevents, keyevents;
    if(!(shownevents = $._data($el[0], "events").shown)
        || $(shownevents).filter(function() { 
            return $.inArray("arrange", this.namespace.split(".")) > -1; 
        }).length < 1) {
          $el.on("shown.arrange, loaded.arrange", function(ev) {
            if(ev.target === ev.currentTarget)
                reconfigureModals.call(that);
          });
    }

    if($el.is("body > * *")) {
      this.$cloneEl = $("<div>").appendTo($el.parent());
      can.each($el[0].attributes, function(attr) {
        that.$cloneEl.attr(attr.name, attr.value);
      });
      $el.find("*").uniqueId();
      this.$cloneEl.html($el.html());
      $el.detach().appendTo(document.body);
      this.$cloneEl.removeAttr("id").find("*").attr("data-original-id", function() {
        return this.id;
      }).removeAttr("id");

      $el.on(["click", "mouseup", "keypress", "keydown", "keyup", "show", "shown", "hide", "hidden"].join(".clone ") + ".clone", function(e) {
        that.$cloneEl 
        ? that.$cloneEl.find("[data-original-id=" + e.target.id + "]").trigger(new $.Event(e))
        : $el.off(".clone");
      }); 
    }


    // prevent form submissions when descendant elements are also modals.
    if(!(keyevents = $._data($el[0], "events").keypress)
        || $(keyevents).filter(function() {
            return $.inArray("preventdoublesubmit", this.namespace.split(".")) > -1;
          }).length < 1) {
      $el.on('keypress.preventdoublesubmit', function(ev) {
        if(ev.which === 13 && !$(document.activeElement).hasClass('wysihtml5')) {
          ev.preventDefault();
          if(ev.originalEvent) {
            ev.originalEvent.preventDefault();
          }
          return false;
        }
      });
    }
    if(!(keyevents = $._data($el[0], "events").keyup)
        || $(keyevents).filter(function() {
            return $.inArray("preventdoubleescape", this.namespace.split(".")) > -1;
          }).length < 1) {
      $el.on('keyup.preventdoubleescape', function(ev) {
       if(ev.which === 27 && $(ev.target).closest(".modal").length) {
          $(ev.target).closest(".modal").attr("tabindex", -1).focus();
          ev.stopPropagation();
          ev.originalEvent && ev.originalEvent.stopPropagation();
          that.hide();
        }
      });
      $el.attr("tabindex") || $el.attr("tabindex", -1);
      setTimeout(function() { $el.focus(); }, 1);
    }

    _modal_show.apply(this, arguments);
    //reconfigureModals.call(this);   //handled by modal shown event firing.
  };

  var reconfigureModals = function() {

    var modal_backdrops = $(".modal-backdrop").css("z-index", function(i) {
      return 1040 + i * 20;
    });

    var modals = $(".modal:visible");
    modals.each(function(i) {
        var parent = this.parentNode;
        if(parent !== document.body)
        { 
            modal_backdrops
            .eq(i)
            .detach()
            .appendTo(parent);
        }
    });
    modal_backdrops.slice(modals.length).remove();

    modals.not(this.$element).css("z-index", function(i) {return 1050 + i * 20;});
    this.$element.css("z-index", 1050 + (modals.length - 1) * 20)

    arrangeTopModal(modals, this.$element);
    arrangeBackgroundModals(modals, this.$element);
  }

  var _modal_hide = $.fn.modal.Constructor.prototype.hide;
  $.fn.modal.Constructor.prototype.hide = function(ev) {
    if(ev && (ev.modalHidden))
        return;  //We already hid one

    if(this.$cloneEl) {
      this.$element.detach().appendTo(this.$cloneEl.parent());
      this.$cloneEl.remove();
      this.$cloneEl = null;
      this.$element.off(".clone")
    }

    _modal_hide.apply(this, arguments);

    var animated =
        $(".modal").filter(":animated");
    if(animated.length) {
        animated.stop(true, true);
    }

    var modals = $(".modal:visible");
    var lastModal = modals.last();
    lastModal.css({"height" : "", "overflow" : "", top : "", "margin-top" : ""});
    arrangeTopModal(modals, lastModal);
    arrangeBackgroundModals(modals, lastModal);
    if(ev) ev.modal_hidden = true; //mark that we've hidden one
  };

  $(function() {
    $('body').on('click.modal-ajax.data-api keydown.modal-ajax.data-api', '[data-toggle="modal-ajax"], [data-toggle="modal-ajax-form"], [data-toggle="modal-ajax-listform"], [data-toggle="modal-ajax-listnewform"], [data-toggle="modal-ajax-relationship-selector"], [data-toggle="modal-ajax-single-selector"], [data-toggle="modal-ajax-listeditform"], [data-toggle="modal-ajax-deleteform"], [data-toggle="modal-ajax-unmapform"]', function(e) {

      var $this = $(this)
        , toggle_type = $(this).data('toggle')
        , modal_id, target, $target, option, href, new_target, modal_type;

      if(e.type === "keydown" && e.which !== 13)
        return;  //activate for keydown on Enter/Return only.

      href = $this.attr('data-href') || $this.attr('href');
      modal_id = 'ajax-modal-' + href.replace(/[\/\?=\&#%]/g, '-').replace(/^-/, '');
      target = $this.attr('data-target') || $('#' + modal_id);

      //if ($this.data('modal-reset') == 'reset')
      //  $(target).remove();

      $target = $(target);
      new_target = $target.length == 0

      if (new_target) {
        $target = $('<div id="' + modal_id + '" class="modal hide"></div>');
        $target.addClass($this.attr('data-modal-class'));
        $this.attr('data-target', '#' + modal_id);
      }

      $target.on('hidden', function(ev) {
        if(ev.target === ev.currentTarget)
            $target.remove();
      });

      if (new_target || $this.data('modal-reset') === 'reset') {
        $target.html(preload_content());
        if($this.prop("protocol") === window.location.protocol) {
          $target.load(href, emit_loaded);
        }
      }

      option = $target.data('modal-help') ? 'toggle' : $.extend({}, $target.data(), $this.data());

      e.preventDefault();
      e.originalEvent && e.originalEvent.preventDefault();
      e.stopPropagation();

      modal_type = $this.data('modal-type');
      if (!modal_type) {
        if (toggle_type == 'modal-ajax-form') modal_type = 'form';
        if (toggle_type == 'modal-ajax-listform') modal_type = 'listform';
        if (toggle_type == 'modal-ajax-listnewform') modal_type = 'listnewform';
        if (toggle_type == 'modal-ajax-listeditform') modal_type = 'listeditform';
        if (toggle_type == 'modal-ajax') modal_type = 'modal';
        if (toggle_type == 'modal-ajax-relationship-selector') modal_type = 'relationshipsform';
        if (toggle_type == 'modal-ajax-single-selector') modal_type = 'listselect';
        if (toggle_type == 'modal-ajax-deleteform') modal_type = 'deleteform';
        if (toggle_type == 'modal-ajax-unmapform') modal_type = 'unmapform';
        if (!modal_type) modal_type = 'modal';
      }

      handlers[modal_type].apply($target, [$target, $this, option]);
    });
  });
}(window.jQuery);
