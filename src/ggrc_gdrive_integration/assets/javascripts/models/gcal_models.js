/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: brad@reciprocitylabs.com
 * Maintained By: brad@reciprocitylabs.com
 */

(function(can, $) {
  var gcal_findAll, gcalevent_findAll
  , scopes = ['https://www.googleapis.com/auth/calendar'];

  can.Model.Cacheable("CMS.Models.GCal", {

    findAll : (gcal_findAll = function(params) {
      return GGRC.gapi_request_with_auth({
        path : "/calendar/v3/users/me/calendarList"
               + (params && params.id ? "/" + params.id : "")
               + "?"
               + $.param($.extend({ minAccessRole : "writer"}, params))
        , callback : function(dfd, result) {
          if(result.error) {
            dfd.reject(result.error);
          } else {
            var objs = result.items || [result];
            can.each(objs, function(obj) {
              obj.selfLink = obj.selfLink || "#";
            });
            dfd.resolve(objs);
          }
        }
      });
    })
    , findOne : gcal_findAll

    , getPrimary : function() {
      return GGRC.gapi_request_with_auth({
        path : "/calendar/v3/calendars/primary"
        , callback : function(dfd, d) { dfd.resolve(d); }
        , scopes : scopes
      });
    }

  }, {

    eventsModel : function() {
      var that = this;
      return CMS.Models.GCalEvent.extend({
        getPath : function() {
          return "/calendar/v3/calendars/" + that.id + "/events";
        }
      }, {});
    }
    , refresh : function(params) {
      return this.constructor.findOne({ id : this.id })
      .then($.proxy(this.constructor, "model"))
      .done(function(d) {
        d.updated();
        //  Trigger complete refresh of object -- slow, but fixes live-binding
        //  redraws in some cases
        can.trigger(d, "change", "*");
      });
    }

  });

  function check_path(obj, params) {
    if(!obj.getPath(params)) {
      GGRC.config = GGRC.config || {};
      return CMS.Models.GCal.getPrimary().then(function(d) {
        GGRC.config.USER_PRIMARY_CALENDAR = d;
        if(!GGRC.config.DEFAULT_CALENDAR) {
          GGRC.config.DEFAULT_CALENDAR = d;
        }
      });
    } else {
      return $.when();
    }
  }

  can.Model.Cacheable("CMS.Models.GCalEvent", {

    getPath : function(params) {
      if(!params.calendar && !GGRC.config.DEFAULT_CALENDAR) {
        return null;
      }

      return ["/calendar/v3/calendars/"
      , (params && params.calendar ? params.calendar.id : GGRC.config.DEFAULT_CALENDAR.id)
      , "/events"
      , (params && params.id ? "/" + params.id : "")
      , (params && params.q ? "?q=" + encodeURIComponent(params.q) : "")].join("");
    }

    , findAll : (gcalevent_findAll = function(params) {
      var dfd = check_path(this, params)
      , that = this;

      if(params && params.response) {
        params.q = "PBC Response #" + params.response.id;
      }
      return dfd.then(function() {
        return GGRC.gapi_request_with_auth({
          path : that.proxy("getPath", params)
          , method : "get"
          , callback : function(dfd, result) {
            if(result.error) {
              dfd.reject(result.error);
            } else if(result.items) {
              var objs = result.items;
              can.each(objs, function(obj) {
                obj.selfLink = obj.selfLink || "#";
              });
              dfd.resolve(objs);
            } else {
              result.selfLink = "#";
              dfd.resolve(result);
            }
          }
          , scopes : scopes
        });
      });
    })
    , findOne : gcalevent_findAll
    , create : function(params) {
      var dfd = check_path(this, params)
      , that = this;
      return dfd.then(function() {
        return GGRC.gapi_request_with_auth({
          path : that.getPath(params)
          , body : params
          , method : "post"
          , callback : function(dfd, d) {
            dfd.resolve(d);
          }
          , scopes : scopes
        });
      });
    }
    , destroy : function(id) {
      var dfd = check_path(this, params)
      , that = this;
      return dfd.then(function() {
        return GGRC.gapi_request_with_auth({
          path : that.getPath() + "/" + id
          , method : "delete"
          , callback : function(dfd, d) {
            dfd.resolve(d);
          }
          , scopes : scopes
        });
      });
    }
    , attributes : {
      start : "packaged_datetime"
      , end : "packaged_datetime"
      , attendees: "email_only"
    }
    , serialize : {
      email_only : function(val) {
        if(val.reify) {
          return can.map(val.reify(), function(p) { return {email : p.email}; });
        }
      }
    }
    , convert : {
      email_only : function(val) {
        var finds = []
        , result = new CMS.Models.Person.List();
        can.each(val, function(g_person) {
          var p;
          if(p = CMS.Models.Person.findInCacheByEmail(g_person.email)) {
            result.push(p);
          } else {
            finds.push(g_person.email);
          }
        });
        if(finds.length > 0) {
          CMS.Models.Person.findAll({"email__in" : finds.join(",") }).done(function(np) {
            result.push.apply(result, np);
          });
        }
        return result;
      }
    }
  }, {

    refresh : function(params) {
      return this.constructor.findOne({ calendar : this.calendar, id : this.id })
      .then($.proxy(this.constructor, "model"))
      .done(function(d) {
        d.updated();
        //  Trigger complete refresh of object -- slow, but fixes live-binding
        //  redraws in some cases
        can.trigger(d, "change", "*");
      });
    }
  });

can.Model.Join("CMS.Models.ObjectEvent", {
  root_object : "object_event"
  , root_collection : "object_events"
  , findAll: "GET /api/object_events?__include=event"
  , create : "POST /api/object_events"
  , update : "PUT /api/object_events/{id}"
  , destroy : "DELETE /api/object_events/{id}"
  , join_keys : {
    eventable : can.Model.Cacheable
    , event : CMS.Models.GCalEvent
  }
  , attributes : {
      modified_by : "CMS.Models.Person.stub"
    , event : "CMS.Models.GCalEvent.stub"
    , eventable : "CMS.Models.get_stub"
    , calendar : "CMS.Models.GCal.stub"
  }

  , model : function(params) {
    if(typeof params === "object") {
      params.event = {
        id : params.event_id
        , type : "GCalEvent"
        , calendar_id : params.calendar_id
        , href : "/calendar/v3/calendars/" + params.calendar_id + "/events/" + params.event_id
      };
    }
    return this._super(params);
  }
}, {

  serialize : function(attr) {
    var serial;
    if(!attr) {
      serial = this._super.apply(this, arguments);
      serial.event_id = serial.event ? serial.event.id : serial.event_id;
      delete serial.event;
      serial.calendar_id = serial.calendar ? serial.calendar.id : serial.calendar_id;
      delete serial.calendar;
      return serial;
    }
    switch(attr) {
      case "event":
        return this.event_id || this.event.id;
      case "calendar":
        return this.calendar_id || this.calendar.id;
      default:
        return this._super.apply(this, arguments);
    }
  }
});
})(this.can, this.can.$);
