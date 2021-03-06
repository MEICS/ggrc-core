/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all
//= require models/cacheable

can.Model.Cacheable("CMS.Models.Meeting", {
  root_collection : "meetings"
  , root_object : "meeting"
  , findAll : "GET /api/meetings"
  , create : "POST /api/meetings"
  , update : "PUT /api/meetings/{id}"
  , destroy : "DELETE /api/meetings/{id}"
  , attributes : {
    response : "CMS.Models.Response.stub"
    , people : "CMS.Models.Person.stubs"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , start_at : "datetime"
    , end_at : "datetime"
  }
  , defaults : {}
  , init : function() {
    this._super && this._super.apply(this, arguments);
    this.validatePresenceOf("title");
    this.validatePresenceOf("start_at");
    this.validatePresenceOf("end_at");
  }
}, {
  init : function () {
      this._super && this._super.apply(this, arguments);
      // this.bind("change", function(ev, attr, how, newVal, oldVal) {
      //     var obj;
      //     if(obj = CMS.Models.ObjectDocument.findInCacheById(this.id) && attr !== "id") {
      //         obj.attr(attr, newVal);
      //     }
      // });

      var that = this;

      this.each(function(value, name) {
        if (value === null)
          that.removeAttr(name);
      });
        that.bind("change", function(){
          if(typeof that.response !== "undefined" && !that._preloaded_people){
            that._preloaded_people = true;

            can.map(that.response.reify().people, function(person){
              that.mark_for_addition("people", person);
            })
          }
        })
  }

});
