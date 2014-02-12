/*
 */

(function(can) {

can.Model.Cacheable("CMS.Models.Template", {
    root_object : "template"
  , root_collection : "templates"
  , category : "risk"
  , findAll : "GET /api/templates"
  , findOne : "GET /api/templates/{id}"
  , create : "POST /api/templates"
  , update : "PUT /api/templates/{id}"
  , destroy : "DELETE /api/templates/{id}"
  , attributes : {
    }

  , init : function() {
      this._super && this._super.apply(this, arguments);
      this.validatePresenceOf("name");
    }
}, {});

})(window.can);
