/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all
//= require controllers/quick_search_controller
(function(namespace, $) {

var RELATIONSHIP_TYPES = {
  "DataAsset":  {
    "Process": ["data_asset_has_process"]
    , "DataAsset": ["data_asset_relies_upon_data_asset"]
    , "Facility": ["data_asset_relies_upon_facility"]
    , "System": ["data_asset_relies_upon_system"]
    , "Market": []
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "Facility": {
    "Process": ["facility_has_process"]
    , "DataAsset": ["facility_relies_upon_data_asset"]
    , "Facility": ["facility_relies_upon_facility"]
    , "System": ["facility_relies_upon_system"]
    , "Market": []
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "Market": {
    "Process": ["market_has_process"]
    , "Market": ["market_includes_market"]
    , "DataAsset": ["market_relies_upon_data_asset"]
    , "Facility": ["market_relies_upon_facility"]
    , "System": ["market_relies_upon_system"]
    , "OrgGroup": []
    , "Product": []
    , "Program": []
    , "Project": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "OrgGroup": {
      "Process": ["org_group_has_process", "org_group_is_responsible_for_process"]
    , "OrgGroup": ["org_group_is_affiliated_with_org_group", "org_group_is_responsible_for_org_group", "org_group_relies_upon_org_group"]
    , "DataAsset": ["org_group_is_responsible_for_data_asset", "org_group_relies_upon_data_asset"]
    , "Facility": ["org_group_is_responsible_for_facility", "org_group_relies_upon_facility"]
    , "Market": ["org_group_is_responsible_for_market"]
    , "Product": ["org_group_is_responsible_for_product"]
    , "Project": ["org_group_is_responsible_for_project"]
    , "System": ["org_group_is_responsible_for_system", "org_group_relies_upon_system"]
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "Product": {
    "Process": ["product_has_process"]
    , "Product": ["product_is_affiliated_with_product", "product_relies_upon_product"]
    , "Market": ["product_is_sold_into_market"]
    , "DataAsset": ["product_relies_upon_data_asset"]
    , "Facility": ["product_relies_upon_facility"]
    , "System": ["product_relies_upon_system"]
    , "OrgGroup": []
    , "Program": []
    , "Project": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "Program": {
    "DataAsset": ["program_applies_to_data_asset"]
    , "Facility": ["program_applies_to_facility"]
    , "Market": ["program_applies_to_market"]
    , "OrgGroup": ["program_applies_to_org_group"]
    , "Process": ["program_applies_to_process"]
    , "Product": ["program_applies_to_product"]
    , "Project": ["program_applies_to_project"]
    , "System": ["program_applies_to_system"]
  }, "Project": {
    "Process": ["project_has_process"]
    , "DataAsset": ["project_relies_upon_data_asset", "project_targets_data_asset"]
    , "Facility": ["project_relies_upon_facility", "project_targets_facility"]
    , "System": ["project_relies_upon_system"]
    , "Market": ["project_targets_market"]
    , "OrgGroup": ["project_targets_org_group"]
    , "Product": ["project_targets_product"]
    , "Project": ["project_relies_upon_project"]
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, /*"Risk": {
    "DataAsset": ["risk_is_a_threat_to_data_asset"]
    , "Facility": ["risk_is_a_threat_to_facility"]
    , "Market": ["risk_is_a_threat_to_market"]
    , "OrgGroup": ["risk_is_a_threat_to_org_group"]
    , "Process": ["risk_is_a_threat_to_process"]
    , "Product": ["risk_is_a_threat_to_product"]
    , "Project": ["risk_is_a_threat_to_project"]
    , "System": ["risk_is_a_threat_to_system"]
    , "Program": []
  },*/ "System": {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "Process": {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
    , "Program": []
    , "Regulation": []
    , "Policy" : []
    , "Standard" : []
    , "Contract" : []
  }, "DocumentationResponse" : {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
  }, "InterviewResponse" : {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
  }, "PopulationSampleResponse" : {
      "System": []
    , "Process": []
    , "DataAsset": []
    , "Facility": []
    , "Product": []
    , "Project": []
    , "Market": []
    , "OrgGroup": []
}};

GGRC.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;

  GGRC.JoinDescriptor = can.Construct({
      defaults: {
          object_model_name: null
        , option_model_name: null
        , join_model_name: null
        , join_option_attr: null
        , join_object_attr: null
        , join_options: null
        , options: null
      }

    , by_object_model: {}
    , by_option_model: {}
    , by_object_option_models: {}
    , by_option_object_models: {}
    , join_model_name_for: function (model_name_a, model_name_b) {
        var join_descriptor = null;
        if (this.by_object_option_models[model_name_a] &&
            this.by_object_option_models[model_name_a][model_name_b]) {
          join_descriptor = this.by_object_option_models[model_name_a][model_name_b][0];
          return join_descriptor.get_join_model_name();
        }
        return null;
    }

    , from_arguments_list: function(args_list) {
        var self = this;

        return can.map(args_list, function(args) {
          return self.from_arguments_cross_product.apply(self, args);
        });
      }

    , from_arguments_cross_product: function(
          object_model_names, option_model_names) {
        var self = this
          , rest = Array.prototype.splice.call(arguments, 2)
          , results = []
          ;

        if (!(object_model_names instanceof Array))
          object_model_names = [object_model_names];
        if (!(option_model_names instanceof Array))
          option_model_names = [option_model_names];

        can.each(object_model_names, function(object_model) {
          can.each(option_model_names, function(option_model) {
            results.push(
              self.from_arguments.apply(
                self, [object_model, option_model].concat(rest)))
          });
        });

        return results;
      }

    , from_arguments: function(
          object_model_name, option_model_name, join_model_name,
          join_option_attr, join_object_attr, object_join_attr, join_options, options) {

        // Create a new subclass of `this`
        return new this($.extend({
            object_model_name: object_model_name
          , option_model_name: option_model_name
          , join_model_name: join_model_name
          , join_option_attr: join_option_attr
          , join_object_attr: join_object_attr
          , object_join_attr: object_join_attr
          , join_options: join_options || {}
        }, (options || {})), {});
      }
  }, {
      init: function(options) {
        var options = $.extend({}, this.constructor.defaults, options)
          , constructor = this.constructor
          , by_object_model = constructor.by_object_model
          , by_option_model = constructor.by_option_model
          , by_object_option_models = constructor.by_object_option_models
          , by_option_object_models = constructor.by_option_object_models
          , object_option_models
          , option_object_models
          , object_model_name = options.object_model_name
          , option_model_name = options.option_model_name
          , object_join_attr = options.object_join_attr
          ;

        this.options = options;

        // Add to registry of joins
        if (!by_object_model[object_model_name])
          by_object_model[object_model_name] = [];
        by_object_model[object_model_name].push(this);

        if (!by_option_model[option_model_name])
          by_option_model[option_model_name] = [];
        by_option_model[option_model_name].push(this);

        if (!by_object_option_models[object_model_name])
          by_object_option_models[object_model_name] = {};
        object_option_models = by_object_option_models[object_model_name];
        if (!object_option_models[option_model_name])
          object_option_models[option_model_name] = [];
        object_option_models[option_model_name].push(this);

        if (!by_option_object_models[option_model_name])
          by_option_object_models[option_model_name] = {};
        option_object_models = by_option_object_models[option_model_name];
        if (!option_object_models[object_model_name])
          option_object_models[object_model_name] = [];
        option_object_models[object_model_name].push(this);
      }

    , get_model: function(model_name) {
        return GGRC.Models[model_name] || CMS.Models[model_name] || null;
      }

    , get_join_model: function() {
        if (!this.options.join_model)
          this.options.join_model = this.get_model(this.options.join_model_name);
        return this.options.join_model;
      }

    , get_join_model_name: function() {
        if (this.options.join_model_name)
          return this.options.join_model_name;
        else
          // FIXME: This is only used for Section, since it has a foreign key
          //   relationship to Directive.
          return this.options.option_model_name;
      }

    , make_join_object: function(object, option, join_attrs) {
        var join_model = this.get_join_model() //this.get_model(this.options.join_model_name)
          , object_attrs = { id: object.id, type: object.constructor.shortName }
          , option_attrs = { id: option.id, type: option.constructor.shortName }
          ;

        join_attrs = $.extend({}, this.options.join_options, join_attrs || {});
        join_attrs[this.options.join_option_attr] = option_attrs;
        join_attrs[this.options.join_object_attr] = object_attrs;

        return join_model && (new join_model(join_attrs));
      }

    , get_loader: function() {
        if (false && this.options.join_model_name === 'Relationship')
          return new GGRC.ListLoaders.RelatedListLoader(
              this.options.option_model_name);
        else if (!this.options.join_model_name) // join_model_name === option_model_name
          return new GGRC.ListLoaders.DirectListLoader(
              this.options.option_model_name,
              this.options.join_object_attr);
        else
          return new GGRC.ListLoaders.ProxyListLoader(
              this.options.join_model_name,
              this.options.join_object_attr,
              this.options.join_option_attr,
              this.options.object_join_attr,
              this.options.option_model_name);
      }

    /*, get_list_loader: function(object) {
        if (false && this.options.join_model_name === 'Relationship')
          return new GGRC.ListLoaders.RelatedListLoader(
              object, this.options.option_model_name);
        else if (!this.options.join_model_name) // join_model_name === option_model_name
          return new GGRC.ListLoaders.DirectListLoader(
              object,
              this.options.option_model_name,
              this.options.join_object_attr);
        else
          return new GGRC.ListLoaders.ProxyListLoader(
              object,
              this.options.join_model_name,
              this.options.join_object_attr,
              this.options.join_option_attr,
              this.options.object_join_attr,
              this.options.option_model_name);
      }*/

  });

  business_minus_system_object_types = [
    "DataAsset", "Facility", "Market", "OrgGroup",
    "Process", "Product", "Project"
    ];

  business_object_types =
    business_minus_system_object_types.concat(["System"]);

  business_plus_program_object_types =
    business_object_types.concat(["Program"]);

  directive_object_types = ["Regulation", "Policy", "Standard", "Contract"];

  response_object_types = ["DocumentationResponse", "InterviewResponse", "PopulationSampleResponse"];

  business_plus_program_and_directive_object_types =
    business_plus_program_object_types.concat(directive_object_types);

  governance_object_types =
    directive_object_types.concat(["Control", "Section", "Objective"]);

  person_object_types = governance_object_types.concat(business_plus_program_object_types).concat(["Audit"])

  all_object_types =
    governance_object_types.concat(business_plus_program_object_types).concat(response_object_types);

  join_descriptor_arguments = [
        [business_object_types,
          "Control", "ObjectControl", "control", "controllable"]
      , ["Control", business_object_types,
          "ObjectControl", "controllable", "control"]
      , [business_plus_program_and_directive_object_types,
          "Objective", "ObjectObjective", "objective", "objectiveable", "object_objectives"]
      , ["Objective", business_plus_program_and_directive_object_types,
          "ObjectObjective", "objectiveable", "objective", "objective_objects"]
      , ["Objective", "Objective",
          "ObjectObjective", "objective", "objectiveable", "object_objectives"]
      , ["Objective", "Objective",
          "ObjectObjective", "objectiveable", "objective", "objective_objects"]
      , ["Control", "Control",
          "ControlControl", "implemented_control", "control", "control_controls"]
      , ["Control", "Control",
          "ControlControl", "control", "implemented_control", "implementing_control_controls"]
      , [all_object_types,
          "Person", "ObjectPerson", "person", "personable"]
      , ["Person", person_object_types,
          "ObjectPerson", "personable", "person", "object_people"]
      , [business_object_types,
          "Section", "ObjectSection", "section", "sectionable"]
      , ["Section", business_object_types,
          "ObjectSection", "sectionable", "section"]
      , ["Control", "Program", "ProgramControl", "program", "control"]
      , ["Program", "Control", "ProgramControl", "control", "program"]
      // , ["Control", "Section", "ControlSection", "section", "control"]
      , ["Section", "Control", "ControlSection", "control", "section"]
      , ["Control", "Objective", "ObjectiveControl", "objective", "control"]
      , ["Objective", "Control", "ObjectiveControl", "control", "objective"]
      , ["Program", directive_object_types, "ProgramDirective", "directive", "program"]
      , ["Program", "Audit", null, null, "program"]
      , [directive_object_types, "Program", "ProgramDirective", "program", "directive"]
      , [directive_object_types, "Section", null, null, "directive"]
      , ["Control", directive_object_types, "DirectiveControl", "directive", "control"]
      , [directive_object_types, "Control", "DirectiveControl", "control", "directive"]
      , [directive_object_types, "Control", null, null, "directive"]
      , ["Section", "Objective", "SectionObjective", "objective", "section"]
      //, ["Objective", "Section", "SectionObjective", "section", "objective"]
      //, ["Risk", "Control", "RiskControl", "control", "risk"]
      //, ["Control", "Risk", "RiskControl", "risk", "control"]
      , ["Audit", "Request", null, null, "audit"]
      , ["Request", "Objective", null, null, "objective"]
      , ["Request", response_object_types, null, null, "request"]
      // , ["Person", "Request", null, null, "assignee"]
      , [response_object_types, "Control", "ObjectControl", "control", "controllable"]
      , [business_object_types.concat(["Control"]),
          "Audit", null, null, null]
      ];


  make_join_descriptor_arguments_from_relationships = function(relationship_types) {
    var relationship_join_descriptor_arguments = [];
    can.each(relationship_types, function(source_relationship_types, source_model) {
      can.each(source_relationship_types, function(relationship_type_ids, destination_model) {
        // For now, just ignore types in relationships
        //can.each(relationship_type_ids, function(relationship_type_id) {
        //  //console.debug(relationship_type_id);
        //  relationship_join_descriptor_arguments.push(
        //    [source_model, destination_model, "Relationship", "destination", "source",
        //      { relationship_type_id: relationship_type_id }]);
        //  // Avoid double-adding symmetric relations
        //  if (destination_model !== source_model)
        //    relationship_join_descriptor_arguments.push(
        //      [destination_model, source_model, "Relationship", "source", "destination",
        //        { relationship_type_id: relationship_type_id }]);
        //});
        relationship_join_descriptor_arguments.push(
          [destination_model, source_model, "Relationship", "source", "destination", "related_sources"]);
        //if (destination_model != source_model)
        relationship_join_descriptor_arguments.push(
          [source_model, destination_model, "Relationship", "destination", "source", "related_destinations"]);
      });
    });
    return relationship_join_descriptor_arguments;
  };

  GGRC.JoinDescriptor.from_arguments_list(join_descriptor_arguments);
  GGRC.JoinDescriptor.from_arguments_list(
      make_join_descriptor_arguments_from_relationships(RELATIONSHIP_TYPES));


$(function() {
  $("#lhn").cms_controllers_lhn();

  $(document.body).on("click", "a[data-toggle=unmap]", function(ev) {
    var $el = $(this)
      ;
    $el.fadeTo('fast', 0.25);
    $el.children(".result").each(function(i, result_el) {
      var $result_el = $(result_el)
        , result = $result_el.data('result')
        , mappings = result && result.get_mappings()
        , i
        ;
      
      function notify(instance){
        $(document.body).trigger(
            "ajax:flash"
            , {"success" : "Unmap successful."}
          );
      }
      
      can.each(mappings, function(mapping) {
        mapping.refresh().done(function() {
          if (mapping instanceof CMS.Models.Control) {
            mapping.removeAttr('directive');
            mapping.save().then(notify);
          }
          else {
            mapping.destroy().then(notify);
          }
        });
      });
    });
  });

  $(document.body).on("click", ".map-to-page-object", function(ev) {
    var inst = $(ev.target).closest("[data-model], :data(model)").data("model")
    , page_model = GGRC.infer_object_type(GGRC.page_object)
    , page_instance = GGRC.page_instance()
    , join_descriptor = GGRC.JoinDescriptor.by_object_option_models[page_model.shortName][inst.constructor.shortName][0]
    //, link = page_model.links_to[inst.constructor.model_singular]
    , params = {};

    if(typeof link === "string") {
      link = GGRC.Models[link] || CMS.Models[link];
    }

    function triggerFlash(type) {
      $(ev.target).trigger(
        "ajax:flash"
        , type === "error" 
          ? {
            error : [
              "Failed to map"
              , inst.constructor.title_singular
              , "<strong>"
              , inst.title
              , "</strong> to"
              , page_model.title_singular
              , "<strong>"
              , page_instance.title
              , "</strong>"
              ].join(" ")
            }
          : {
            success : [
              "Mapped"
              , inst.constructor.title_singular
              , "<strong>"
              , inst.title
              , "</strong> to"
              , page_model.title_singular
              , "<strong>"
              , page_instance.title
              , "</strong>"
              ].join(" ")
            }
        );

      // Switch the active widget view
      if (type !== "error") {
        window.location.hash = '#' + inst.constructor.root_object + '_widget';
        $('a[href="' + window.location.hash + '"]').trigger("click");
      }
    }

    /*if(can.isPlainObject(link)) {

      $("<div id='relationship_type_modal' class='modal hide'>").appendTo(document.body)
        .modal_form({}, ev.target)
        .ggrc_controllers_modals({
          new_object_form : true
          , button_view : GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL
          , model : CMS.Models.Relationship
          , page_object : page_instance
          , related_object : inst
          , relationships : can.map(RELATIONSHIP_TYPES[page_model.model_singular][inst.constructor.model_singular], function(v) {
            return {id : v, name : v.replace(/_/g, " ") };
          })
          , find_params : {
            source : page_instance
            , destination : inst
            , context : page_instance.context || { id : null }
          }
          , modal_title : "Select Relationship Type"
          , content_view : GGRC.mustache_path + "/base_objects/map_related_modal_content.mustache"
        })
        .one("modal:success", triggerFlash);
    } else {*/
      // Mappings to/from a program should be in the context of the program.
      // Otherwise, default to the page_instance context then default context.
      var join_context;
      if (inst instanceof CMS.Models.Program && inst.context) {
        join_context = { id : inst.context.id };
      } else {
        join_context = page_instance.context || { id : null };
      }
      join_object = join_descriptor.make_join_object(
          page_instance, inst, { context : join_context });
      // Map the object if we're able to
      if (join_object) {
        join_object.save()
          .done(triggerFlash)
          .fail(function(xhr) {
            // Currently, the only error we encounter here is uniqueness
            // constraint violations.  Let's use a nicer message!
            var message = "That object is already mapped";
            $(ev.target).trigger("ajax:flash", { error: message });
          });
      }
      // Otherwise throw a warning
      else {
        triggerFlash("error");
      }
      //params[page_model.root_object] = { id : page_instance.id };
      //params[inst.constructor.root_object] = { id : inst.id };
      //params.context = page_instance.context || { id : null };
      //new link(params).save().done(triggerFlash);
    //}

  });

});

})(this, jQuery);
