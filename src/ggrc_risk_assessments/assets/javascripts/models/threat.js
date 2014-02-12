/*
 */

(function(can) {

can.Model.Cacheable("CMS.Models.Threat", {
    root_object : "threat"
  , root_collection : "threats"
  , category : "risk"
  , findAll : "GET /api/threats"
  , findOne : "GET /api/threats/{id}"
  , create : "POST /api/threats"
  , update : "PUT /api/threats/{id}"
  , destroy : "DELETE /api/threats/{id}"
  , attributes : {
    }

  , init : function() {
      this._super && this._super.apply(this, arguments);
      this.validatePresenceOf("title");
    }
}, {});

})(window.can);
