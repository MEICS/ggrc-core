/*
 */

(function(can) {

can.Model.Cacheable("CMS.Models.RiskAssessment", {
    root_object : "risk_assessment"
  , root_collection : "risk_assessments"
  , category : "risk"
  , findAll : "GET /api/risk_assessments"
  , findOne : "GET /api/risk_assessments/{id}"
  , create : "POST /api/risk_assessments"
  , update : "PUT /api/risk_assessments/{id}"
  , destroy : "DELETE /api/risk_assessments/{id}"
  , attributes : {
    }

  , init : function() {
      this._super && this._super.apply(this, arguments);
      this.validatePresenceOf("title");
    }
}, {});

})(window.can);
