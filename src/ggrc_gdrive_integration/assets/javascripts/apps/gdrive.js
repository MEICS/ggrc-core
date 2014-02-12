/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function(can, $, CMS, GGRC) {

  var scopes = new can.Observe.List(['https://www.googleapis.com/auth/userinfo.email']);

  GGRC.gapi_request_with_auth = $.proxy(GGRC.Controllers.GAPI, "gapi_request_with_auth");
  $(function() {
    $(document.body).ggrc_controllers_gapi({ scopes : scopes });
  });

  // set up a temporary global auth function so the GAPI onload can find it
  var r = Math.floor(Math.random() * 100000000);
  window["resolvegapi" + r] = function(gapi) {
    GGRC.Controllers.GAPI.gapidfd.resolve(gapi);
    delete window["resolvegapi" + r];
  };
  $('head').append("<scr" + "ipt type='text/javascript' src='https://apis.google.com/js/client.js?onload=resolvegapi" + r + "'></script>");


  $.extend(true, CMS.Models.Program.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  // GGRC.Mappings.Program.object_folders = new GGRC.ListLoaders.DirectListLoader("ObjectFolder", "folderable");
  GGRC.Mappings.Program.folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  GGRC.register_hook("Program.extended_info", GGRC.mustache_path + "/programs/gdrive_info.mustache");

  $.extend(true, CMS.Models.Audit.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  can.getObject("GGRC.Mappings.Audit", window, true).folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  //GGRC.Mappings.Audit.object_folders = new GGRC.ListLoaders.DirectListLoader("ObjectFolder", "folderable");
  CMS.Models.Audit.tree_view_options.show_view = GGRC.mustache_path + "/audits/gdrive_tree.mustache";

  GGRC.register_hook("Audit.tree_view_info", GGRC.mustache_path + "/audits/gdrive_info.mustache");


  $.extend(true, CMS.Models.Request.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  can.getObject("GGRC.Mappings.Request", window, true).folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  GGRC.register_hook("Request.tree_view_info", GGRC.mustache_path + "/requests/gdrive_info.mustache");

  $.extend(true, CMS.Models.DocumentationResponse.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  $.extend(true, CMS.Models.PopulationSampleResponse.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  $.extend(true, CMS.Models.Document.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  can.getObject("GGRC.Mappings.Document", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");

  CMS.Models.Response.tree_view_options.child_options[1].show_view = GGRC.mustache_path + "/responses/gdrive_evidence_tree.mustache";
  CMS.Models.Response.tree_view_options.child_options[1].footer_view = GGRC.mustache_path + "/responses/gdrive_upload_evidence.mustache";
  //We are no longer mapping GDrive files directly to responses.  It makes it difficult to figure out which GDrive file is which
  // document when we go to present. however, this functionality is still supported. 
  can.getObject("GGRC.Mappings.Response", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");
  can.getObject("GGRC.Mappings.DocumentationResponse", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");
  can.getObject("GGRC.Mappings.PopulationSampleResponse", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");

  can.getObject("GGRC.Mappings.GDriveFolder", window, true).permissions = new GGRC.ListLoaders.DirectListLoader("GDriveFolderPermission", "id");
  can.getObject("GGRC.Mappings.GDriveFile", window, true).permissions = new GGRC.ListLoaders.DirectListLoader("GDriveFilePermission", "id");
  can.getObject("GGRC.Mappings.GDriveFolder", window, true).revisions = new GGRC.ListLoaders.DirectListLoader("GDriveFileRevision", "id");
  can.getObject("GGRC.Mappings.GDriveFile", window, true).revisions = new GGRC.ListLoaders.DirectListLoader("GDriveFileRevision", "id");


  // GGRC.JoinDescriptor.from_arguments_list([
  //   [["Program", "Audit", "Request"], "GDriveFolder", "ObjectFolder", "folder", "folderable"]
  //   , ["Response", "GDriveFile", "ObjectFile", "file", "fileable"]
  // ]);

  $.extend(true, CMS.Models.Meeting.attributes, {
    "object_events" : "CMS.Models.ObjectEvent.stubs"
    , "events" : "CMS.Models.GCalEvent.stubs"
  });
  can.getObject("GGRC.Mappings.Meeting", window, true).events = new GGRC.ListLoaders.ProxyListLoader("ObjectEvent", "eventable", "event", "object_events", "GCalEvent");
  GGRC.register_hook("Meeting.tree_view_info", GGRC.mustache_path + "/meetings/gcal_info.mustache");

  // Enable these hooks when the deployment allows G+ APIs
  // GGRC.register_hook("Person.popover_actions", GGRC.mustache_path + "/people/gplus_actions.mustache");
  // GGRC.register_hook("Person.popover_info", GGRC.mustache_path + "/people/gplus_photo.mustache");

})(this.can, this.can.$, this.CMS, this.GGRC);
