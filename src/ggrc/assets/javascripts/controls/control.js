/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all
//= require models/cacheable
(function(namespace, $){
can.Model.Cacheable("CMS.Models.Control", {
  // static properties
    root_object : "control"
  , root_collection : "controls"
  , category : "controls"
  , findOne : "GET /api/controls/{id}"
  , create : "POST /api/controls"
  , update : "PUT /api/controls/{id}"
  , destroy : "DELETE /api/controls/{id}"
  , attributes : {
      contact : "CMS.Models.Person.stub"
    , owners : "CMS.Models.Person.stubs"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , categories : "CMS.Models.ControlCategory.stubs"
    , assertions : "CMS.Models.ControlAssertion.stubs"
    , control_controls : "CMS.Models.ControlControl.stubs"
    , implemented_controls : "CMS.Models.Control.stubs"
    , implementing_control_controls : "CMS.Models.ControlControl.stubs"
    , implementing_controls : "CMS.Models.Control.stubs"
    , objective_controls : "CMS.Models.ObjectiveControl.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , directive : "CMS.Models.Directive.stub"
    , control_sections : "CMS.Models.ControlSection.stubs"
    , sections : "CMS.Models.Section.stubs"
    , program_controls : "CMS.Models.ProgramControl.stubs"
    , programs : "CMS.Models.Program.stubs"
    , directive_controls : "CMS.Models.DirectiveControl.stubs"
    , control_risks : "CMS.Models.ControlRisk.stubs"
    , risks : "CMS.Models.Risk.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , kind : "CMS.Models.Option.stub"
    , means : "CMS.Models.Option.stub"
    , verify_frequency : "CMS.Models.Option.stub"
    , principal_assessor : "CMS.Models.Person.stub"
    , secondary_assessor : "CMS.Models.Person.stub"
  }
  , links_to : {
    "Section" : "ControlSection"
    , "Regulation" : "DirectiveControl"
    , "Policy" : "DirectiveControl"
    , "Standard" : "DirectiveControl"
    , "Contract" : "DirectiveControl"
    , "Risk" : {}
    , "Program" : "ProgramControl"
  }

  , defaults : {
      "selected" : false
    , "title" : ""
    , "slug" : ""
    , "description" : ""
    , "url" : ""
  }

  , tree_view_options : {
      show_view : GGRC.mustache_path + "/controls/tree.mustache"
    , footer_view : GGRC.mustache_path + "/controls/tree_footer.mustache"
    , draw_children : true
    , child_options : [{
        model : can.Model.Cacheable
      , mapping : "related_and_able_objects"
      , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
      , title_plural : "Business Objects"
      , draw_children : false
    }]
  }

  , init : function() {
    this.validatePresenceOf("title");
    this._super.apply(this, arguments);
  }
}
, {
  init : function() {
    var that = this;
    this._super.apply(this, arguments);

    this.bind("change", function(ev, attr, how, newVal, oldVal) {
      // Emit the "orphaned" event when the directive attribute is removed
      if (attr === "directive" && how === "remove" && oldVal && newVal === undefined) {
        // It is necessary to temporarily add the attribute back for orphaned
        // processing to work properly.
        that.directive = oldVal;
        can.trigger(that.constructor, 'orphaned', that);
        delete that.directive;
      }
    });
  }

  , bind_section : function(section) {
    var that = this;
    this.bind("change.section" + section.id, function(ev, attr, how, newVal, oldVal) {
      if(attr !== 'implementing_controls')
        return;

      var oldValIds = can.map(can.makeArray(oldVal), function(val) { return val.id; });

      if(how === "add" || (how === "set" && newVal.length > oldVal.length)) {
        can.each(newVal, function(el) {
          if($.inArray(el.id, oldValIds) < 0) {
            section.addElementToChildList("linked_controls", CMS.Models.Control.findInCacheById(el.id));
          }
        });
      } else {
        var lcs = section.linked_controls.slice(0);
        can.each(oldVal, function(el) {
          if($.inArray(el, newVal) < 0) {
            lcs.splice($.inArray(el, lcs), 1);
          }
        });
        section.attr(
          "linked_controls"
          , lcs
        );
      }
    });
  }
  , unbind_section : function(section) {
    this.unbind("change.section" + section.id);
  }
});

// This creates a subclass of the Control model
CMS.Models.Control("CMS.Models.ImplementedControl", {
	findAll : "GET /api/controls/{id}/implemented_controls"
}, {
});

/*
	Note: This is kind of a hack.  I would like to revisit the structure of the control models later
	in order to just pull the linked ones out of cache, but it takes some clever finagling with
	$.Deferred and it's too much work to think through at the moment.  In the meantime, implementing
	controls as a separate model from Regulation or Company controls works for my needs (comparing IDs)
	--BM 12/10/2012
*/
CMS.Models.ImplementedControl("CMS.Models.ImplementingControl", {
	findAll : "GET /api/controls/{id}/implementing_controls"
}, {});


// This creates a subclass of the Control model
CMS.Models.Control("CMS.Models.RegControl", {
	findAll : "GET /api/programs/{id}/controls"
  , attributes : {
    implementing_controls : "CMS.Models.ImplementingControl.stubs"
  }
	, map_ccontrol : function(params, control) {
		return can.ajax({
			url : "/mapping/map_ccontrol"
			, data : params
			, type : "post"
			, dataType : "json"
			, success : function() {
				if(control) {
					var ics;
					if(params.u) {
						//unmap
						ics = new can.Model.List();
						can.each(control.implementing_controls, function(ctl) {
              //TODO : Put removal functionality into the Cacheable, in the vein of addElementToChildList,
              //  and update this code to simply remove the unmap code.
              //We are needing to manually trigger changes in Model.List due to CanJS being unable to
              //  trigger template changes for lists automatically.
							if(ctl.id !== params.ccontrol)
							{
								ics.push(ctl);
							}
              control.attr("implementing_controls", ics);
              control.updated();
            });
          } else {
            //map
            control.addElementToChildList("implementing_controls", CMS.Models.Control.findInCacheById(params.ccontrol));
          }
				}
			}
		});
	}
}, {
	init : function() {
		this._super();
		this.attr((this.control ? "control." : "") + "type", "regulation");
	}
	, map_ccontrol : function(params) {
		return this.constructor.map_ccontrol(can.extend({}, params, {rcontrol : this.id}), this);
	}

});

})(this, can.$);
