/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

;(function(GGRC, can) {

  function Proxy(
      option_model_name, join_option_attr, join_model_name, join_object_attr,
      instance_join_attr) {
    return new GGRC.ListLoaders.ProxyListLoader(
        join_model_name, join_object_attr, join_option_attr,
        instance_join_attr, option_model_name);
  }

  function Direct(option_model_name, instance_join_attr) {
    return new GGRC.ListLoaders.DirectListLoader(option_model_name, instance_join_attr);
  }

  function Indirect(instance_model_name, option_join_attr) {
    return new GGRC.ListLoaders.IndirectListLoader(instance_model_name, option_join_attr);
  }

  function Search(term, types, params) {
    return new GGRC.ListLoaders.SearchListLoader(term, types, params);
  }

  function Multi(sources) {
    return new GGRC.ListLoaders.MultiListLoader(sources);
  }

  function TypeFilter(source, model_name) {
    return new GGRC.ListLoaders.TypeFilteredListLoader(source, [model_name]);
  }

  function CustomFilter(source, filter_fn) {
    return new GGRC.ListLoaders.CustomFilteredListLoader(source, filter_fn);
  }

  function Cross(local_mapping, remote_mapping) {
    return new GGRC.ListLoaders.CrossListLoader(local_mapping, remote_mapping);
  }

  function create_mappings(definitions) {
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

  function extended_related(name) {
    return function(definition) {
      definition["related_" + name + "_via_extended_sections"] = Cross("extended_related_sections", "related_" + name);
      definition["related_" + name + "_via_extended_controls"] = Cross("extended_related_controls", "related_" + name);
      definition["related_" + name + "_via_extended_objectives"] = Cross("extended_related_objectives", "related_" + name);

      definition["extended_related_" + name] = Multi([
            "related_" + name + "_via_extended_sections"
          , "related_" + name + "_via_extended_controls"
          , "related_" + name + "_via_extended_objectives"
          , "related_" + name
          ]);
    };
  }

  GGRC.Mappings = create_mappings({
      base: {
      }

    // Governance
    , Control: {
        _mixins: ["personable"] //controllable
      , related_objects: Proxy(
          null, "controllable", "ObjectControl", "control", "object_controls") //control_objects
      , related_and_able_objects : Multi(["objectives", "implemented_controls", "related_objects", "people"])
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      , related_documentation_responses:        TypeFilter("related_objects", "DocumentationResponse")
      , related_interview_responses:            TypeFilter("related_objects", "InterviewResponse")
      , related_population_sample_responses:    TypeFilter("related_objects", "PopulationSampleResponse")
      , related_responses:                      Multi(["related_documentation_responses"
                                                , "related_interview_responses"
                                                , "related_population_sample_responses"
                                                ])
      , related_audits_via_related_responses:   Cross("related_responses", "audit_via_request")
      , programs: Proxy(
          "Program", "program", "ProgramControl", "control", "program_controls")
      , controls: Proxy(
         "Control", "control", "ObjectControl", "controllable", "object_controls", "ControlControl", "control_controls")
      , objectives: Proxy(
          "Objective", "objective", "ObjectiveControl", "control", "objective_controls")
      , sections: Proxy(
          "Section", "section", "ControlSection", "control", "control_sections")
      , implemented_controls: Proxy(
          "Control", "implemented_control", "ControlControl", "control", "control_controls")
      , implementing_controls: Proxy(
          "Control", "control", "ControlControl", "implemented_control", "implementing_control_controls")
      //  FIXME: Cannot currently represent singular foreign-key references
      //    with Mappers/ListLoaders
      //, direct_directives: ForeignKey("Directive", "directive", "controls")
      , joined_directives: Proxy(
          "Directive", "directive", "DirectiveControl", "control", "directive_controls")
      , directives: Multi(["joined_directives"]) // "direct_directives"
      , contracts: TypeFilter("directives", "Contract")
      , policies: TypeFilter("directives", "Policy")
      , standards: TypeFilter("directives", "Standard")
      , regulations: TypeFilter("directives", "Regulation")
      , orphaned_objects: Multi([
          "related_objects"
        , "sections"
        , "controls"
        , "programs"
        , "objectives"
        , "implemented_controls"
        , "implementing_controls"
        , "joined_directives"
        , "people"
        // These don't exist client-side yet:
        // , "risks"
        // , "control_risks"
        // , "control_assessments"
        ])
      }
    , Objective: {
        _mixins: ["personable"] //objectiveable
      , related_objects: Proxy(
          null, "objectiveable", "ObjectObjective", "objective", "objective_objects")
      , related_and_able_objects : Multi(["controls", "objectives", "related_objects", "people"])
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      , objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")
      , controls: Proxy(
          "Control", "control", "ObjectiveControl", "objective", "objective_controls")
      , sections: Proxy(
          "Section", "section", "SectionObjective", "objective", "section_objectives")
      , orphaned_objects: Multi([
          "related_objects"
        , "controls"
        , "sections"
        , "people"
        ])
      }
    , Section: {
        _mixins: ["personable"] //sectionable
      , related_objects: Proxy(
          null, "sectionable", "ObjectSection", "section", "object_sections") //section_objects
      , related_and_able_objects : Multi(["objectives", "controls", "related_objects", "people"])
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      //, sections: Proxy(
      //    "Section", "section", "ObjectSection", "sectionable", "object_sections")
      , objectives: Proxy(
          "Objective", "objective", "SectionObjective", "section", "section_objectives")
      , controls: Proxy(
          "Control", "control", "ControlSection", "section", "control_sections")
      , orphaned_objects: Multi([
          "related_objects"
        , "controls"
        , "objectives"
        , "people"
        ])
      }

    , controllable: {
        controls: Proxy(
          "Control", "control", "ObjectControl", "controllable", "object_controls")
      }

    , objectiveable: {
        objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")
      }

    , sectionable: {
        sections: Proxy(
          "Section", "section", "ObjectSection", "sectionable", "object_sections")
      }

    , personable: {
        people: Proxy(
          "Person", "person", "ObjectPerson", "personable", "object_people")
      }

    , documentable: {
        documents: Proxy(
          "Document", "document", "ObjectDocument", "documentable", "object_documents")
      }

    , related_object: {
        related_objects_as_source: Proxy(
          null, "destination", "Relationship", "source", "related_destinations")
      , related_objects_as_destination: Proxy(
          null, "source", "Relationship", "destination", "related_sources")
      , related_objects: Multi(["related_objects_as_source", "related_objects_as_destination"])
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")
      , related_documentation_responses:        TypeFilter("related_objects", "DocumentationResponse")
      , related_interview_responses:            TypeFilter("related_objects", "InterviewResponse")
      , related_population_sample_responses:    TypeFilter("related_objects", "PopulationSampleResponse")
      , related_responses:                      Multi(["related_documentation_responses"
                                                , "related_interview_responses"
                                                , "related_population_sample_responses"
                                                ])
      , related_requests_via_related_responses: Cross("related_responses", "_request")
      , related_audits_via_related_responses:   Cross("related_responses", "audit_via_request")
      }

    // Program
    , Program: {
        _mixins: [
            "related_object", "personable", "objectiveable"
          , extended_related("data_assets")
          , extended_related("facilities")
          , extended_related("markets")
          , extended_related("org_groups")
          , extended_related("processes")
          , extended_related("products")
          , extended_related("projects")
          , extended_related("systems")
          ]
      , controls: Proxy(
          "Control", "control", "ProgramControl", "program", "program_controls")
      /*, objectives: Proxy(
          "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")*/
      , directives: Proxy(
          null, "directive", "ProgramDirective", "program", "program_directives")
      , contracts: TypeFilter("directives", "Contract")
      , policies: TypeFilter("directives", "Policy")
      , standards: TypeFilter("directives", "Standard")
      , regulations: TypeFilter("directives", "Regulation")
      , audits: Direct("Audit", "program")
      , related_objects_via_audits: Cross("audits", "extended_related_objects")
      , related_people_via_audits: TypeFilter("related_objects_via_audits", "Person")
      , related_controls_via_audits: TypeFilter("related_objects_via_audits", "Control")

      , authorizations: Indirect("UserRole", "context")
      , authorizations_via_audits: Cross("audits", "authorizations")
      , extended_authorizations: Multi([
          "authorizations", "authorizations_via_audits"])

      , sections_via_directives: Cross("directives", "sections")
      , controls_via_directives: Cross("directives", "controls")

      , sections_via_directive_controls: Cross("controls_via_directives", "sections")
      , extended_related_sections: Multi([
          "sections_via_directive_controls", "sections_via_directives"])

      , controls_via_directive_sections: Cross("sections_via_directives", "controls")
      , objectives_via_sections: Cross("extended_related_sections", "objectives")
      , extended_related_objectives: Multi(["objectives_via_sections", "objectives"])
      , controls_via_extended_objectives: Cross("extended_related_objectives", "controls")
      , extended_related_controls: Multi([
            "controls_via_extended_objectives"
          , "controls_via_directive_sections"
          , "controls_via_directives"
          , "related_controls_via_audits"
          , "controls"
          ])

      , related_people_via_sections: Cross("extended_related_sections", "people")
      , related_people_via_extended_controls: Cross("extended_related_controls", "people")
      , related_people_via_extended_objectives: Cross("extended_related_objectives", "people")
      , extended_related_people:
          Multi([
              "people"
            , "related_people_via_extended_controls"
            , "related_people_via_extended_objectives"
            , "related_people_via_audits"
            , "related_people_via_sections"
            ])

      , related_objects_via_sections:
          Cross("extended_related_sections", "related_objects")
      , related_objects_via_extended_controls:
          Cross("extended_related_controls", "related_objects")
      , related_objects_via_extended_objectives:
          Cross("extended_related_objectives", "related_objects")
      , extended_related_objects:
          Multi([
              "related_objects_via_extended_controls"
            , "related_objects_via_extended_objectives"
            , "related_objects_via_sections"
            , "related_objects_via_audits"
            , "related_objects"
            ])
      , extended_related_data_assets: TypeFilter("extended_related_objects", "DataAsset")
      , extended_related_facilities:  TypeFilter("extended_related_objects", "Facility")
      , extended_related_markets:     TypeFilter("extended_related_objects", "Market")
      , extended_related_org_groups:  TypeFilter("extended_related_objects", "OrgGroup")
      , extended_related_processes:   TypeFilter("extended_related_objects", "Process")
      , extended_related_products:    TypeFilter("extended_related_objects", "Product")
      , extended_related_projects:    TypeFilter("extended_related_objects", "Project")
      , extended_related_systems:     TypeFilter("extended_related_objects", "System")
      , orphaned_objects: Multi([
          "related_objects"
        , "controls"
        , "directives"
        , "people"
        ])
      }

    , directive_object: {
        _mixins: [
          "related_object", "personable", "objectiveable"
          , extended_related("data_assets")
          , extended_related("facilities")
          , extended_related("markets")
          , extended_related("org_groups")
          , extended_related("processes")
          , extended_related("products")
          , extended_related("projects")
          , extended_related("systems")
          ]
      , sections: Direct("Section", "directive")
      , extended_related_sections: Multi(["sections"])

      , direct_controls: Direct("Control", "directive")
      , joined_controls: Proxy(
          "Control", "control", "DirectiveControl", "directive", "directive_controls")
      , controls: Multi(["direct_controls", "joined_controls"])

      , programs: Proxy(
          "Program", "program", "ProgramDirective", "directives", "program_directives")

      , controls_via_sections: Cross("sections", "controls")
      , objectives_via_sections: Cross("sections", "objectives")
      , extended_related_objectives: Multi(["objectives_via_sections", "objectives"])
      , controls_via_extended_objectives: Cross("extended_related_objectives", "controls")
      , extended_related_controls: Multi([
            "controls_via_extended_objectives"
          , "controls_via_sections"
          , "controls"
          ])

      , related_objects_via_sections: Cross("sections", "related_objects")

      , related_people_via_sections: Cross("sections", "people")
      , related_people_via_extended_controls: Cross("extended_related_controls", "people")
      , related_people_via_extended_objectives: Cross("extended_related_objectives", "people")
      , extended_related_people:
          Multi([
              "people"
            , "related_people_via_extended_controls"
            , "related_people_via_extended_objectives"
            , "related_people_via_sections"
            ])

      , orphaned_objects: Multi([
          "sections"
        , "people"
        , "controls"
        , "programs"
        ])
      }

    // Directives
    , Regulation: {
        _mixins: ["directive_object"]
      }
    , Contract: {
        _mixins: ["directive_object"]
      }
    , Standard: {
        _mixins: ["directive_object"]
      }
    , Policy: {
        _mixins: ["directive_object"]
      }

    // Business objects
    , business_object: {
        _mixins: [
            "related_object", "personable"
          , "controllable", "objectiveable", "sectionable"
          ]
      , orphaned_objects: Multi([
          "related_objects"
        , "people"
        , "controls"
        , "objectives"
        , "sections"
        ])
      }

    , DataAsset: {
        _mixins: ["business_object"]
      }
    , Facility: {
        _mixins: ["business_object"]
      }
    , Market: {
        _mixins: ["business_object"]
      }
    , OrgGroup: {
        _mixins: ["business_object"]
      }
    , Product: {
        _mixins: ["business_object"]
      }
    , Project: {
        _mixins: ["business_object"]
      }
    , System: {
        _mixins: ["business_object"]
      }
    , Process: {
        _mixins: ["business_object"]
      }

    , Person: {
        owned_programs: Indirect("Program", "contact")
      , owned_regulations: Indirect("Regulation", "contact")
      , owned_contracts: Indirect("Contract", "contact")
      , owned_policies: Indirect("Policy", "contact")
      , owned_standards: Indirect("Standard", "contact")
      , owned_objectives: Indirect("Objective", "contact")
      , owned_controls: Indirect("Control", "contact")
      , owned_sections: Indirect("Section", "contact")
      , owned_data_assets: Indirect("DataAsset", "contact")
      , owned_facilities: Indirect("Facility", "contact")
      , owned_markets: Indirect("Market", "contact")
      , owned_org_groups: Indirect("OrgGroup", "contact")
      , owned_processes: Indirect("Process", "contact")
      , owned_products: Indirect("Product", "contact")
      , owned_projects: Indirect("Project", "contact")
      , owned_systems: Indirect("System", "contact")

      , related_objects: Proxy(
          null, "personable", "ObjectPerson", "person", "object_people")
      , related_programs:    TypeFilter("related_objects", "Program")
      , related_regulations: TypeFilter("related_objects", "Regulation")
      , related_contracts:   TypeFilter("related_objects", "Contract")
      , related_policies:    TypeFilter("related_objects", "Policy")
      , related_standards:    TypeFilter("related_objects", "Standard")
      , related_objectives:  TypeFilter("related_objects", "Objective")
      , related_controls:    TypeFilter("related_objects", "Control")
      , related_sections:    TypeFilter("related_objects", "Section")
      , related_data_assets: TypeFilter("related_objects", "DataAsset")
      , related_facilities:  TypeFilter("related_objects", "Facility")
      , related_markets:     TypeFilter("related_objects", "Market")
      , related_org_groups:  TypeFilter("related_objects", "OrgGroup")
      , related_processes:   TypeFilter("related_objects", "Process")
      , related_products:    TypeFilter("related_objects", "Product")
      , related_projects:    TypeFilter("related_objects", "Project")
      , related_systems:     TypeFilter("related_objects", "System")

      , authorizations: Indirect("UserRole", "person")
      , programs_via_authorizations: Cross("authorizations", "program_via_context")

      , extended_related_programs:    Multi(["related_programs", "owned_programs", "programs_via_authorizations"])
      , extended_related_regulations: Multi(["related_regulations", "owned_regulations"])
      , extended_related_contracts:   Multi(["related_contracts", "owned_contracts"])
      , extended_related_policies:    Multi(["related_policies", "owned_policies"])
      , extended_related_objectives:  Multi(["related_objectives", "owned_objectives"])
      , extended_related_controls:    Multi(["related_controls", "owned_controls"])
      , extended_related_sections:    Multi(["related_sections", "owned_sections"])
      , extended_related_data_assets: Multi(["related_data_assets", "owned_data_assets"])
      , extended_related_facilities:  Multi(["related_facilities", "owned_facilities"])
      , extended_related_markets:     Multi(["related_markets", "owned_markets"])
      , extended_related_org_groups:  Multi(["related_org_groups", "owned_org_groups"])
      , extended_related_processes:   Multi(["related_processes", "owned_processes"])
      , extended_related_products:    Multi(["related_products", "owned_products"])
      , extended_related_projects:    Multi(["related_projects", "owned_projects"])
      , extended_related_systems:     Multi(["related_systems", "owned_systems"])

      , related_objects_via_search: Search("", [
          "Program",  "Regulation", "Contract", "Policy", "Standard", "Section", "Objective",
          "Control", "System", "Process", "DataAsset", "Product", "Project", "Facility",
          "Market", "OrgGroup", "Audit"//, "Request", "Response"
        ], { contact_id: "id" })

      , extended_related_programs_via_search:    TypeFilter("related_objects_via_search", "Program")
      , extended_related_regulations_via_search: TypeFilter("related_objects_via_search", "Regulation")
      , extended_related_contracts_via_search:   TypeFilter("related_objects_via_search", "Contract")
      , extended_related_policies_via_search:    TypeFilter("related_objects_via_search", "Policy")
      , extended_related_standards_via_search:    TypeFilter("related_objects_via_search", "Standard")
      , extended_related_objectives_via_search:  TypeFilter("related_objects_via_search", "Objective")
      , extended_related_controls_via_search:    TypeFilter("related_objects_via_search", "Control")
      , extended_related_sections_via_search:    TypeFilter("related_objects_via_search", "Section")
      , extended_related_data_assets_via_search: TypeFilter("related_objects_via_search", "DataAsset")
      , extended_related_facilities_via_search:  TypeFilter("related_objects_via_search", "Facility")
      , extended_related_markets_via_search:     TypeFilter("related_objects_via_search", "Market")
      , extended_related_org_groups_via_search:  TypeFilter("related_objects_via_search", "OrgGroup")
      , extended_related_processes_via_search:   TypeFilter("related_objects_via_search", "Process")
      , extended_related_products_via_search:    TypeFilter("related_objects_via_search", "Product")
      , extended_related_projects_via_search:    TypeFilter("related_objects_via_search", "Project")
      , extended_related_systems_via_search:     TypeFilter("related_objects_via_search", "System")
      , extended_related_audits_via_search:      TypeFilter("related_objects_via_search", "Audit")
    }

    , UserRole : {
        program_via_context: Indirect("Program", "context")
      , audit_via_context: Indirect("Audit", "context")
    }

    , Audit : {
      requests: Direct("Request", "audit")
      , _program: Indirect("Program", "audit")
      , objectives_via_program : Cross("_program", "objectives")
      , responses_via_requests: Cross("requests", "responses")
      , related_objects: Multi(['requests', 'responses_via_requests'])
      , authorizations: Indirect("UserRole", "context")

      , related_owned_objects: CustomFilter("related_objects", function(result) {
          var person = GGRC.page_instance() instanceof CMS.Models.Person && GGRC.page_instance();
          return !person
            || (result.instance.contact && result.instance.contact.id === person.id)
            || (result.instance.assignee && result.instance.assignee.id === person.id)
            || (result.instance.requestor && result.instance.requestor.id === person.id)
            ;
        })
      , related_owned_requests: TypeFilter("related_owned_objects", "Request")
      , related_owned_documentation_responses: TypeFilter("related_owned_objects", "DocumentationResponse")
      , related_owned_interview_responses: TypeFilter("related_owned_objects", "InterviewResponse")
      , related_owned_population_sample_responses: TypeFilter("related_owned_objects", "PopulationSampleResponse")
      , related_owned_responses: Multi(["related_owned_documentation_responses"
                                      , "related_owned_interview_responses"
                                      , "related_owned_population_sample_responses"
                                      ])

      , related_mapped_objects: CustomFilter("related_objects", function(result) {
          var page_instance = GGRC.page_instance()
            , instance = result.instance
            , is_mapped = function(responses) {
                var i, j, response, relationships, relationship;
                for (i = 0; response = responses[i]; i++) {
                  relationships = new can.Observe.List().concat(response.related_sources.reify(), response.related_destinations.reify());
                  for (j = 0; relationship = relationships[j]; j++) {
                    if (relationship.source.reify() === page_instance || relationship.destination.reify() === page_instance) {
                      return true;
                    }
                  }
                }
                return false;
              }
            ;

          if (instance instanceof CMS.Models.Request)
            return is_mapped(instance.responses.reify());
          else if (instance instanceof CMS.Models.Response)
            return is_mapped([instance]);
          else
            return false;
        })
      , related_mapped_requests: TypeFilter("related_mapped_objects", "Request")
      , related_mapped_documentation_responses: TypeFilter("related_mapped_objects", "DocumentationResponse")
      , related_mapped_interview_responses: TypeFilter("related_mapped_objects", "InterviewResponse")
      , related_mapped_population_sample_responses: TypeFilter("related_mapped_objects", "PopulationSampleResponse")
      , related_mapped_responses: Multi(["related_mapped_documentation_responses"
                                      , "related_mapped_interview_responses"
                                      , "related_mapped_population_sample_responses"
                                      ])
      , extended_related_objects: Cross("requests", "extended_related_objects")
    }
    , Request : {
      responses: Direct("Response", "request")
      , _audit: Indirect("Audit", "requests")
      , documentation_responses : TypeFilter("responses", "DocumentationResponse")
      , interview_responses : TypeFilter("responses", "InterviewResponse")
      , population_sample_responses : TypeFilter("responses", "PopulationSampleResponse")
      , related_objects_via_responses : Cross("responses", "business_objects")
      , extended_related_objects: Multi(["related_objects_via_responses"])
      , orphaned_objects : Multi(["responses"])
      //, responses : Multi(["documentation_responses", "interview_responses", "population_sample_responses"])
    }

    , response : {
      _mixins : ["business_object", "documentable"]
      , _request : Indirect("Request", "responses")
      , audit_via_request : Cross("_request", "_audit")
    }
    , Response : {
      _mixins : ["response"]
    }
    , DocumentationResponse : {
      _mixins : ["response"]
      , business_objects : Multi(["related_objects", "controls", "people"])
    }
    , InterviewResponse : {
      _mixins : ["response"]
      , meetings: Direct("Meeting", "response")
      , business_objects : Multi(["related_objects", "controls", "documents"])
    }
    , PopulationSampleResponse : {
      _mixins : ["response"]
      , business_objects : Multi(["related_objects", "controls", "people", "documents"])
      , population_samples : Direct("PopulationSample", "response")
    }
    , Meeting : {
      _mixins : ["personable"]
    }
  });
})(GGRC, can);
