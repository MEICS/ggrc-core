/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all

(function(can, $) {

$(function() {
  if (!GGRC.page_object)
    return;

  var object_class = GGRC.infer_object_type(GGRC.page_object)
    , object_table = object_class.table_plural
    , object = GGRC.page_instance();

  var info_widget_views = {
      'programs': GGRC.mustache_path + "/programs/info.mustache"
    , 'people': GGRC.mustache_path + "/people/info.mustache"
    , 'policies': GGRC.mustache_path + "/policies/info.mustache"
    , 'objectives': GGRC.mustache_path + "/objectives/info.mustache"
    , 'controls': GGRC.mustache_path + "/controls/info.mustache"
    , 'systems': GGRC.mustache_path + "/systems/info.mustache"
    , 'processes': GGRC.mustache_path + "/processes/info.mustache"
    , 'products': GGRC.mustache_path + "/products/info.mustache"
  }
  default_info_widget_view = GGRC.mustache_path + "/base_objects/info.mustache";

  var info_widget_descriptors = {
      info: {
          widget_id: "info"
        , widget_name: function() {
            if (object_class.title_singular === 'Person')
              return 'Info';
            else
              return object_class.title_singular + " Info";
          }
        , widget_icon: "grcicon-info"
        , content_controller: GGRC.Controllers.InfoWidget
        , content_controller_options: {
              instance: object
            , model: object_class
            , widget_view: info_widget_views[object_table] || default_info_widget_view
          }
      }
  }

  if (!GGRC.extra_widget_descriptors)
    GGRC.extra_widget_descriptors = {};
  if (!GGRC.extra_default_widgets)
    GGRC.extra_default_widgets = [];

  GGRC.extra_widget_descriptors.info = info_widget_descriptors.info;
  GGRC.extra_default_widgets.splice(0, 0, 'info');

  function sort_sections(sections) {
    return can.makeArray(sections).sort(window.natural_comparator);
  }

  function apply_mixins(definitions) {
    var mappings = {};

    // Recursively handle mixins
    function reify_mixins(definition) {
      var final_definition = {};
      if (definition._mixins) {
        can.each(definition._mixins, function(mixin) {
          if (typeof(mixin) === "string") {
            // If string, recursive lookup
            if (!definitions[mixin])
              console.debug("Undefined mixin: " + mixin, definitions);
            else
              can.extend(final_definition, reify_mixins(definitions[mixin]));
          } else if (can.isFunction(mixin)) {
            // If function, call with current definition state
            mixin(final_definition);
          } else {
            // Otherwise, assume object and extend
            can.extend(final_definition, mixin);
          }
        });
      }
      can.extend(final_definition, definition);
      delete final_definition._mixins;
      return final_definition;
    }

    can.each(definitions, function(definition, name) {
      // Only output the mappings if it's a model, e.g., uppercase first letter
      if (name[0] === name[0].toUpperCase())
        mappings[name] = reify_mixins(definition);
    });

    return mappings;
  }

  var far_models = GGRC.JoinDescriptor
        .by_object_option_models[object.constructor.shortName]
    , model_widget_descriptors = {}
    , model_default_widgets = []
    , in_audit_descriptor_options = {
        widget_name: function() {
          return "Mapped Audits";
        }
      }
    , extra_descriptor_options = {
          all: {
              Person: {
                  widget_icon: 'grcicon-user-black'
              }
            , Document: {
                  widget_icon: 'grcicon-link'
              }
          }
        , Contract : {
            Section : {
              widget_name : function() {
                var $objectArea = $(".object-area");
                if ( $objectArea.hasClass("dashboard-area") ) {
                  return "Clauses";
                } else {
                  return "Mapped Clauses";
                }
              }
            }
          }
        , Control : {
            Audit: in_audit_descriptor_options
          }
        , DataAsset: {
            Audit: in_audit_descriptor_options
          }
        , Facility: {
            Audit: in_audit_descriptor_options
          }
        , Market: {
            Audit: in_audit_descriptor_options
          }
        , OrgGroup: {
            Audit: in_audit_descriptor_options
          }
        , Process: {
            Audit: in_audit_descriptor_options
          }
        , Product: {
            Audit: in_audit_descriptor_options
          }
        , Project: {
            Audit: in_audit_descriptor_options
          }
        , System: {
            Audit: in_audit_descriptor_options
          }
        , Document: {
            Audit: in_audit_descriptor_options
          }
      }
    // Prevent widget creation with <model_name>: false
    // e.g. to prevent ever creating People widget:
    //     { all : { Person: false }}
    // or to prevent creating People widget on Objective page:
    //     { Objective: { Person: false } }
    , overridden_models = {
          Program: {
            //  Objective: false
            //, Control: false
            //, Regulation: false
            //, Policy: false
            //, Standard: false
            //, Contract: false
          }
          , all : {
              Document : false
            , DocumentationResponse : false
            , InterviewResponse : false
            , PopulationSampleResponse : false
          }
      }

    , section_child_options = {
          model : CMS.Models.Section
        , mapping : "sections"
        , show_view : GGRC.mustache_path + "/sections/tree.mustache"
        , footer_view : GGRC.mustache_path + "/sections/tree_footer.mustache"
        , draw_children : true
      }

    , extra_content_controller_options = apply_mixins({
          extended_objectives: {
              Objective: {
                  mapping: "extended_related_objectives"
                , draw_children: true
                , show_view: GGRC.mustache_path + "/objectives/tree.mustache"
                , footer_view: GGRC.mustache_path + "/objectives/tree_footer.mustache"
                }
            }
        , extended_controls: {
              Control: {
                  mapping: "extended_related_controls"
                , draw_children: true
                , show_view: GGRC.mustache_path + "/controls/tree.mustache"
                , footer_view: GGRC.mustache_path + "/controls/tree_footer.mustache"
                }
            }
        , extended_business_objects: {
              DataAsset: {
                  mapping: "extended_related_data_assets"
                }
            , Facility: {
                  mapping: "extended_related_facilities"
                }
            , Market: {
                  mapping: "extended_related_markets"
                }
            , OrgGroup: {
                  mapping: "extended_related_org_groups"
                }
            , Process: {
                  mapping: "extended_related_processes"
                }
            , Product: {
                  mapping: "extended_related_products"
                }
            , Project: {
                  mapping: "extended_related_projects"
                }
            , System: {
                  mapping: "extended_related_systems"
                }
            , Document: {
                  mapping: "extended_related_documents"
                }
            , Person: {
                  mapping: "extended_related_people"
                }
            }

        , Program: {
              _mixins: [
                  "extended_objectives"
                , "extended_controls"
                , "extended_business_objects"
                ]

            , Regulation: {
                mapping: "regulations"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              , footer_view: GGRC.mustache_path + "/directives/tree_footer.mustache"
              }
            , Contract: {
                mapping: "contracts"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              , footer_view: GGRC.mustache_path + "/directives/tree_footer.mustache"
              }
            , Standard: {
                mapping: "standards"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              , footer_view: GGRC.mustache_path + "/directives/tree_footer.mustache"
              }
            , Policy: {
                mapping: "policies"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              , footer_view: GGRC.mustache_path + "/directives/tree_footer.mustache"
              }
            , Audit : { 
              mapping: "audits"
              , allow_mapping : true
              , draw_children : true
              , show_view : GGRC.mustache_path + "/audits/tree.mustache"
              , footer_view : GGRC.mustache_path + "/audits/tree_footer.mustache"
            }
          }

        , directive: {
              _mixins: [
                  "extended_objectives"
                , "extended_controls"
                , "extended_business_objects"
                ]
            , Section : section_child_options
            }

        , Regulation: {
              _mixins: ["directive"]
            }
        , Standard: {
              _mixins: ["directive"]
            }
        , Policy: {
              _mixins: ["directive"]
            }
        , Contract : {
              _mixins: ["directive"]
            }

        , extended_audits: {
            Audit: {
              mapping: "related_audits_via_related_responses"
              , allow_mapping : false
              , allow_creating : false
              , draw_children : true
              , show_view : GGRC.mustache_path + "/audits/tree.mustache"
              , footer_view : null
            }
          }

        , Control: {
            _mixins: ["extended_audits"]
          }
        , DataAsset: {
            _mixins: ["extended_audits"]
          }
        , Facility: {
            _mixins: ["extended_audits"]
          }
        , Market: {
            _mixins: ["extended_audits"]
          }
        , OrgGroup: {
            _mixins: ["extended_audits"]
          }
        , Process: {
            _mixins: ["extended_audits"]
          }
        , Product: {
            _mixins: ["extended_audits"]
          }
        , Project: {
            _mixins: ["extended_audits"]
          }
        , System: {
            _mixins: ["extended_audits"]
          }
        , Document: {
            _mixins: ["extended_audits"]
          }

        , Person : {
            // _mixins: ["extended_audits"]
             Program : {
                mapping: "extended_related_programs_via_search"
              , fetch_post_process: sort_sections
              }
            , Regulation: {
                mapping: "extended_related_regulations_via_search"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              }
            , Contract: {
                mapping: "extended_related_contracts_via_search"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              }
            , Standard: {
                mapping: "extended_related_standards_via_search"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              }
            , Policy: {
                mapping: "extended_related_policies_via_search"
              , draw_children: true
              , child_options: [section_child_options]
              , fetch_post_process: sort_sections
              , show_view: GGRC.mustache_path + "/directives/tree.mustache"
              }
            , Audit : { 
                mapping: "extended_related_audits_via_search"
              , draw_children : true
              , show_view : GGRC.mustache_path + "/audits/tree.mustache"
              }
            , Section : {
                model : CMS.Models.Section
              , mapping : "extended_related_sections_via_search"
              , show_view : GGRC.mustache_path + "/sections/tree.mustache"
              , footer_view: GGRC.mustache_path + "/base_objects/tree_footer.mustache"
              , draw_children : true
              } 
            , Objective: {
                mapping: "extended_related_objectives_via_search"
              , draw_children: true
              , show_view: GGRC.mustache_path + "/objectives/tree.mustache"
              , footer_view: GGRC.mustache_path + "/base_objects/tree_footer.mustache"
              }
            , Control: {
                mapping: "extended_related_controls_via_search"
              , draw_children: true
              , show_view: GGRC.mustache_path + "/controls/tree.mustache"
              , footer_view: GGRC.mustache_path + "/base_objects/tree_footer.mustache"
              }
            , DataAsset: {
                mapping: "extended_related_data_assets_via_search"
              }
            , Facility: {
                mapping: "extended_related_facilities_via_search"
              }
            , Market: {
                mapping: "extended_related_markets_via_search"
              }
            , OrgGroup: {
                mapping: "extended_related_org_groups_via_search"
              }
            , Process: {
                mapping: "extended_related_processes_via_search"
              }
            , Product: {
                mapping: "extended_related_products_via_search"
              }
            , Project: {
                mapping: "extended_related_projects_via_search"
              }
            , System: {
                mapping: "extended_related_systems_via_search"
              }
            , Document: {
                mapping: "extended_related_documents_via_search"
              }
        }
      })
    ;

  // Disable editing on profile pages, as long as it isn't audits on the dashboard
  if (GGRC.page_instance() instanceof CMS.Models.Person) {
    var person_options = extra_content_controller_options.Person;
    can.each(person_options, function(options, model_name) {
      if (model_name !== 'Audit' || !/dashboard/.test(window.location)) {
        can.extend(options, {
            allow_creating: false
          , allow_mapping: false
        });
      }
    });
  }

  can.each(far_models, function(join_descriptors, model_name) {
    if ((overridden_models.all
          && overridden_models.all.hasOwnProperty(model_name)
          && !overridden_models[model_name])
        || (overridden_models[object.constructor.shortName]
            && overridden_models[object.constructor.shortName].hasOwnProperty(model_name)
            && !overridden_models[object.constructor.shortName][model_name]))
      return;

    var sources = []
      , list_loader
      , join_descriptor = join_descriptors[0]
      ;

    can.each(join_descriptors, function(join_descriptor) {
      sources.push(join_descriptor.get_loader());
    });
    list_loader = new GGRC.ListLoaders.TypeFilteredListLoader(
      new GGRC.ListLoaders.MultiListLoader(sources), [model_name]);
    list_loader = list_loader.attach(object);

    var far_model = join_descriptor.get_model(model_name)
      , descriptor = {
            content_controller: CMS.Controllers.TreeView
          , content_controller_selector: "ul"
          , widget_initial_content: '<ul class="tree-structure new-tree"></ul>'
          , widget_id: far_model.table_singular
          , widget_guard: function(){
              if (far_model.title_plural === "Audits"
                  && GGRC.page_instance() instanceof CMS.Models.Program){
                return "context" in GGRC.page_instance() && !!(GGRC.page_instance().context.id);
              }
              return true;
            }
          , widget_name: function() {
              var $objectArea = $(".object-area");
              if ( $objectArea.hasClass("dashboard-area") || object_class.title_singular === "Person" ) {
                if (/dashboard/.test(window.location)) {
                  if (far_model.title_plural === 'Sections') {
                    return "My Sections / Clauses";
                  }
                  return "My " + far_model.title_plural;
                } else {
                  return far_model.title_plural;
                }
              } else if (far_model.title_plural === "Audits") {
                return "Mapped Audits <small>BETA</small>";
              } else {
                return (far_model.title_plural === "References" ? "Linked " : "Mapped ") + far_model.title_plural;
              }
            }
          , widget_icon: far_model.table_singular
          , object_category: far_model.category || 'default'
          , model: far_model
          , content_controller_options: {
                child_options: []
              , draw_children: false
              , parent_instance: object
              , model: model_name
              , list_loader: $.proxy(list_loader, "refresh_list")
            }
        }
      ;

    // Custom overrides
    if (extra_descriptor_options.all
        && extra_descriptor_options.all[model_name]) {
      can.extend(
          descriptor,
          extra_descriptor_options.all[model_name]);
    }

    if (extra_descriptor_options[object.constructor.shortName]
        && extra_descriptor_options[object.constructor.shortName][model_name]) {
      can.extend(
          descriptor,
          extra_descriptor_options[object.constructor.shortName][model_name]);
    }

    if (extra_content_controller_options.all
        && extra_content_controller_options.all[model_name]) {
      can.extend(
          descriptor.content_controller_options,
          extra_content_controller_options.all[model_name]);
    }

    if (extra_content_controller_options[object.constructor.shortName]
        && extra_content_controller_options[object.constructor.shortName][model_name]) {
      can.extend(
          descriptor.content_controller_options,
          extra_content_controller_options[object.constructor.shortName][model_name]);
    }

    if (!list_loader)
      return;

    // This overrides the merged Person/Authorizations widget
    if (GGRC.page_instance() instanceof CMS.Models.Program && model_name === 'Person') {
      model_widget_descriptors[far_model.table_singular] = can.extend(descriptor, GGRC.extra_widget_descriptors[far_model.table_singular]);
    }
    else {
      model_widget_descriptors[far_model.table_singular] = descriptor;
    }
    model_default_widgets.push(far_model.table_singular);
  });

  can.extend(GGRC.extra_widget_descriptors, model_widget_descriptors);
  GGRC.extra_default_widgets.push.apply(
      GGRC.extra_default_widgets, model_default_widgets);
});

})(window.can, window.can.$);
