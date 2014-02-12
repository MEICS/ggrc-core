/*
 * Copyright (C) 2013-2014 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: brad@reciprocitylabs.com
 * Maintained By: brad@reciprocitylabs.com
 */
(function(can, $) {
var create_folder = function(cls, title_generator, parent_attr, model, ev, instance) {
  var that = this
  , dfd
  , owner = cls === CMS.Models.Request ? "assignee" : "contact";

  if(instance instanceof cls) {
    if(parent_attr) {
      dfd = instance[parent_attr].reify().get_binding("folders").refresh_instances();
    } else {
      dfd = $.when([{}]); //make parent_folder instance be undefined; 
                          // GDriveFolder.create will translate that into 'root'
    }
    return dfd.then(function(parent_folders) {
      var xhr = new CMS.Models.GDriveFolder({
        title : title_generator(instance)
        , parents : parent_folders[0].instance
      }).save();

      report_progress("Creating Drive folder for " + title_generator(instance), xhr);
      return xhr;
    }).then(function(folder) {
      var refresh_queue;

      report_progress(
        'Linking folder "' + folder.title + '" to ' + instance.constructor.title_singular
        , new CMS.Models.ObjectFolder({
          folder : folder
          , folderable : instance
          , context : instance.context || { id : null }
        }).save()
      );

      if(instance[owner] && instance[owner].id !== GGRC.current_user.id) {
        refresh_queue = new RefreshQueue().enqueue(instance[owner].reify());
        refresh_queue.trigger().done(function() {
          report_progress(
            'Creating writer permission on folder "' + folder.title + '" for ' + owner
            , new CMS.Models.GDriveFolderPermission({
              folder : folder
              , person : instance[owner]
              , role : "writer"
            }).save()
          );
        });
      }
      return folder;
    });
  }
  else {
    dfd = new $.Deferred();
    return dfd.reject("Type mismatch");
  }
};

function partial_proxy(fn) {
  var args = can.makeArray(arguments).slice(1);
  return function() {
    return fn.apply(this, args.concat(can.makeArray(arguments)));
  };
}

var allops = [];
function report_progress(str, xhr) {
  return xhr;

  function build_flashes() {
    var flash = {}
    , successes = []
    , failures = []
    , pendings = [];

    can.each(allops, function(op) {
      switch(op.xhr.state()) {
        case "resolved":
        successes.push(op.str + " -- Done<br>");
        break;
        case "rejected":
        failures.push(op.str + " -- FAILED<br>");
        break;
        case "pending":
        pendings.push(op.str + "...<br>");
      }
    });

    if(successes.length) {
      flash.success = successes;
    }
    if(failures.length) {
      flash.error = failures;
    }
    if(pendings.length) {
      flash.warning = pendings.concat(["Please wait until " + (pendings.length === 1 ? "this operation completes" : "these operations complete")]);
    } else {
      setTimeout(function() {
        if(can.map(allops, function(op) {
          return op.xhr.state() === "pending" ? op : undefined;
        }).length < 1) {
          allops = [];
        }
      }, 1000);
    }
    $(document.body).trigger("ajax:flash", flash);
  }

  allops.push({str : str, xhr : xhr});
  xhr.always(build_flashes);
  build_flashes();
  return xhr;
}

can.Control("GGRC.Controllers.GDriveWorkflow", {

}, {
  request_create_queue : []

  , create_program_folder : partial_proxy(create_folder, CMS.Models.Program, function(inst) { return inst.title + " Audits"; }, null)
  /*
    NB: We don't do folder creation on Program creation now.  Only when the first Audit is created does the Program folder
    get created as well.
  */

  , create_audit_folder : partial_proxy(create_folder, CMS.Models.Audit, function(inst) { return inst.title; }, "program")
  , "{CMS.Models.Audit} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Audit) {
      var that = this;
      this._audit_create_in_progress = true;
      instance.program.reify().refresh()
      .then(this.proxy("create_folder_if_nonexistent"))
      .then($.proxy(instance.program.reify(), "refresh"))
      .then(function() {
        that.create_audit_folder(model, ev, instance);
        delete that._audit_create_in_progress;
      });
    }
  }

  // if we had to wait for an Audit to get its own folder link on creation, we can now do the delayed creation
  //  of folder links for the audit's requests, which were created first in the PBC workflow
  , "{CMS.Models.ObjectFolder} created" : function(model, ev, instance) {
    var i, that = this, folderable;
    if(instance instanceof CMS.Models.ObjectFolder && (folderable = instance.folderable.reify()) instanceof CMS.Models.Audit) {
      folderable.refresh().then(function() {
        folderable.get_binding("folders").refresh_instances().then(function() {
          for(i = that.request_create_queue.length; i--;) {
            if(that.request_create_queue[i].audit.reify() === instance.folderable.reify()) {
              if(that.request_create_queue[i].objective) {
                that.create_request_folder(CMS.Models.Request, ev, that.request_create_queue[i]);
              } else {
                report_progress(
                  'Linking new Request to Audit folder'
                  , new CMS.Models.ObjectFolder({
                    folder_id : instance.folder_id
                    , folderable : that.request_create_queue[i]
                    , context : that.request_create_queue[i].context || { id : null }
                  }).save()
                );
              }
              that.request_create_queue.splice(i, 1);
            }
          }
        });
      });
    }
  }

  // When creating requests as part of audit workflow, wait for audit to have a folder link before
  // trying to create subfolders for request.  If the audit and its folder link are already created
  //  we can do the request folder immediately.
  , create_request_folder : partial_proxy(
    create_folder, CMS.Models.Request, function(inst) { return inst.objective.reify().title; }, "audit")
  , "{CMS.Models.Request} created" : "link_request_to_new_folder_or_audit_folder"

  , link_request_to_new_folder_or_audit_folder : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Request) {
      if(this._audit_create_in_progress || instance.audit.reify().object_folders.length < 1) {
        this.request_create_queue.push(instance);
      } else {
        if(instance.objective) {
          return this.create_request_folder(model, ev, instance);
        } else {

          if(Permission.is_allowed("create", "ObjectFolder", instance.context.id || null)) {

            return report_progress(
              'Linking new Request to Audit folder'
              , new CMS.Models.ObjectFolder({
                folder_id : instance.audit.reify().object_folders[0].reify().folder_id
                , folderable : instance
                , context : instance.context || { id : null }
              }).save()
            );
          } else {
            return $.when();
          }
        }
      }
    }
  }

  , update_owner_permission : function(model, ev, instance, role, person) {
    var dfd
    , owner = instance instanceof CMS.Models.Request ? "assignee" : "contact";

    // TODO check whether person is the logged-in user, and use OAuth2 identifier if so?
    role = role || "writer";
    if(~can.inArray(instance.constructor.shortName, ["Program", "Audit", "Request"]) && (person || instance[owner])) {
      person = (person || instance[owner]).reify();
      if(person.selfLink) {
        dfd = $.when(person);
      } else {
        dfd = person.refresh();
      }
      dfd.then(function() {
        $.when(
          CMS.Models.GDriveFilePermission.findUserPermissionId(person)
          , instance.get_binding("folders").refresh_instances()
          , GGRC.config.GAPI_ADMIN_GROUP 
            ? CMS.Models.GDriveFilePermission.findUserPermissionId(GGRC.config.GAPI_ADMIN_GROUP)
            : undefined
        ).then(function(user_permission_id, list, admin_permission_id) {
          can.each(list, function(binding) {
            if(binding.instance.userPermission.role !== "writer" && binding.instance.userPermission.role !== "owner")
              return;  //short circuit any operation if the user isn't allowed to add permissions

            binding.instance.findPermissions().then(function(permissions) {
              var owners_matched = !GGRC.config.GAPI_ADMIN_GROUP;  //if no admin group, ignore.
              var matching = can.map(permissions, function(permission) {
                if(admin_permission_id
                   && permission.type === "group"
                   && (permission.id === admin_permission_id)
                       || (permission.emailAddress && permission.emailAddress.toLowerCase() === GGRC.config.GAPI_ADMIN_GROUP.toLowerCase())
                ) {
                  owners_matched = true;
                }
                /* NB: GDrive sometimes provides the email address assigned to a permission and sometimes not.
                   Email addresses will match on permissions that are sent outside of GMail/GApps/google.com
                   while "Permission IDs" will match on internal account permissions (where email address is
                   usually not provided).  Check both.
                */
                if(permission.type === "user"
                  && (permission.id === user_permission_id
                      || (permission.emailAddress && permission.emailAddress.toLowerCase() === person.email.toLowerCase()))
                  && (permission.role === "owner" || permission.role === "writer" || permission.role === role)
                ) {
                  return permission;
                }
              });
              if(matching.length < 1) {
                report_progress(
                  "Creating Drive folder " + (role.name || role) + " permission for " + person.email + ' on folder "' + binding.instance.title + '"'
                  , new CMS.Models.GDriveFolderPermission({
                    folder : binding.instance
                    , person : person
                    , role : role
                  }).save()
                );
              }
              if(!owners_matched) {
                report_progress(
                  'Creating admin group permission on folder "' + binding.instance.title + '"'
                  , new CMS.Models.GDriveFolderPermission({
                    folder : binding.instance
                    , email : GGRC.config.GAPI_ADMIN_GROUP
                    , role : "writer"
                    , permission_type : "group"
                  }).save()
                );
              }
            });
          });
        });
      });
    }
  }

  // extracted out of {Request updated} for readability.
  , move_files_to_new_folder : function(audit_folders, new_folder, audit_files) {
    var tldfds = [];
    can.each(audit_files, function(file) {
      //if the file is still referenced in more than one request without an objective,
      // don't remove from the audit.
      tldfds.push(
        CMS.Models.ObjectDocument.findAll({
          "document.link" : file.alternateLink
        }).then(function(obds) {
          //filter out any object-documents that aren't Responses.
          var responses = can.map(obds, function(obd) {
            if(obd.documentable.reify() instanceof CMS.Models.Response)
              return obd.documentable.reify();
          });
          
          file.addToParent(new_folder);
          return new RefreshQueue().enqueue(responses).trigger().then(function(reified_responses) {
            var dfds = [];

            if(obds.length < 2
              || can.map(reified_responses, function(resp) {
                  if(resp.request.reify() !== instance
                     && !resp.request.reify().objective) {
                    return resp;
                  }
                })
              .length < 1
            ) {
              //If no other request is still using the Audit folder version,
              // remove from the audit folder.
              can.each(audit_folders, function(af) {
                dfds.push(file.removeFromParent(af));
              });
            }

            return $.when.apply($, dfds);
          });
        })
      );
    });

    report_progress(
      "Moving files to new Request folder"
      , $.when.apply($, tldfds)
    );
  }

  , move_files_to_audit_folder : function(instance, audit_folders, req_folders, files) {
    //move each file from the old Request folder to the Audit folders
    var move_dfds = [];
    can.each(files, function(file) {
      var parent_ids = can.map(file.parents, function(p) { return p.id; });
      move_dfds.push(file.addToParent(audit_folders[0]));
      can.each(req_folders, function(rf) {
        if(~can.inArray(rf.id, parent_ids)) {
          move_dfds.push(file.removeFromParent(req_folders[0]));
        }
      });
    });
    report_progress(
      "Moving files to the Audit folder"
      , $.when.apply($, move_dfds).done(function() {
        can.each(req_folders, function(rf) {
          if(!rf.selfLink || rf.userPermission.role !== "writer" && rf.userPermission.role !== "owner")
            return;  //short circuit any operation if the user isn't allowed to add permissions

          report_progress(
            'Checking whether folder "' + rf.title + '" is empty'
            , CMS.Models.GDriveFile.findAll({parents : rf.id}).then(function(orphs) {
              if(orphs.length < 1) {
                report_progress(
                  'Deleting empty folder "' + rf.title + '"'
                  , rf.destroy()
                );
              } else {
                console.warn("can't delete folder", rf.title, "as files still exist:", orphs);
              }
            })
          );
        });
      })
    );
    report_progress(
      'Linking Request to Audit folder'
      , new CMS.Models.ObjectFolder({
        folder_id : instance.audit.reify().object_folders[0].reify().folder_id
        , folderable : instance
        , context : instance.context || { id : null }
      }).save()
    );
  }

  , "{CMS.Models.Program} updated" : "update_owner_permission"
  , "{CMS.Models.Audit} updated" : "update_owner_permission"
  , "{CMS.Models.Request} updated" : "update_request_folder"

  , update_request_folder : function(model, ev, instance) {
    var that = this;
    if(!(instance instanceof CMS.Models.Request) || instance._folders_mutex) {
      return;
    }

    instance._folders_mutex = true;

    return $.when(
      instance.get_binding("folders").refresh_instances()
      , instance.audit.reify().get_binding("folders").refresh_instances()
    ).then(function(req_folders_mapping, audit_folders_mapping) {
      var audit_folder, af_index, obj_folder_to_destroy, obj_destroy_dfds;
      if(audit_folders_mapping.length < 1)
        return; //can't do anything if the audit has no folder
      //reduce the binding lists to instances only -- makes for easier comparison
      var req_folders =  can.map(req_folders_mapping, function(rf) { return rf.instance; });
      //Check whether or not the current user has permissions to modify the audit folder.
      var audit_folders = can.map(audit_folders_mapping, function(af) {
        if(!af.instance.selfLink || af.instance.userPermission.role !== "writer" && af.instance.userPermission.role !== "owner")
          return;  //short circuit any operation if the user isn't allowed to edit
        return af.instance;
      });

      if(audit_folders.length < 1) {
        return;  // no audit folder to work on, or none that the user can edit.
      }

      // check the array of request_folers against the array of audit_folders to see if there is a match.
      af_index = can.reduce(req_folders, function(res, folder) {
        return (res >= 0) ? res : can.inArray(folder, audit_folders);
      }, -1);

      if(af_index > -1 && instance.objective) {
        //we added an objective where previously there was not one.

        //First remove the mapping to the audit folder, else we could constantly revisit this process.
        audit_folder = audit_folders[af_index];
        obj_folder_to_destroy = req_folders_mapping[can.inArray(audit_folder, req_folders)].mappings[0].instance;

        return $.when(
          report_progress(
            'Linking Request "' + instance.objective.reify().title + '" to new folder'
            , new CMS.Models.GDriveFolder({
              title : instance.objective.reify().title
              , parents : audit_folders
            }).save().then(function(folder) {
              return new CMS.Models.ObjectFolder({
                folder : folder
                , folder_id : folder.id
                , folderable : instance
                , context : instance.context || { id : null }
              }).save().then(function() { return folder; });
            })
          )
          , CMS.Models.GDriveFile.findAll({parentfolderid : audit_folders[0].id})
          , obj_folder_to_destroy.refresh().then(function(of) { of.destroy(); })
        ).then(
          that.proxy("move_files_to_new_folder", audit_folders)
          , function() {
            console.warn("a prerequisite failed", arguments[0]);
          }
        ).done(function() {
          that.update_owner_permission(model, ev, instance);
        });
      } else if(req_folders.length < 1) {
        return;
      } else if(af_index < 0 && !instance.objective) {
        //we removed the objective.  This is the easier case.
        obj_destroy_dfds = can.map(req_folders_mapping, function(b) {
          b.mappings[0].instance.refresh().then(function(of) { of.destroy(); });
          return CMS.Models.GDriveFile.findAll({parents : b.instance.id});
        });

        return $.when(
          CMS.Models.GDriveFile.findAll({parents : req_folders[0].id})
          , $.when.apply($, obj_destroy_dfds).then(function() {
            return can.unique(
              can.reduce(arguments, function(a, b) {
                return a.concat(b);
              }, [])
            );
          })
        ).then(
          that.proxy("move_files_to_audit_folder", instance, audit_folders, req_folders)
        ).done(function() {
          return that.update_owner_permission(model, ev, instance);
        });
      }
    }).always(function() {
      delete instance._folders_mutex;
    });
  }

  , "a[data-toggle=gdrive-picker] click" : function(el, ev) {
    var response = CMS.Models.Response.findInCacheById(el.data("response-id"))
    , request = response.request.reify()
    , parent_folder = (request.get_mapping("folders")[0] || {}).instance;

    if(!parent_folder || !parent_folder.selfLink) {
      //no ObjectFolder or cannot access folder from GAPI
      el.trigger(
        "ajax:flash"
        , {
          warning : 'Can\'t upload: No GDrive folder found for PBC Request '
                  + request.objective ? ('"' + request.objective.reify().title + '"') : " with no title"
        });
      return;
    }
    //NB: resources returned from uploadFiles() do not match the properties expected from getting
    // files from GAPI -- "name" <=> "title", "url" <=> "alternateLink".  Of greater annoyance is
    // the "url" field from the picker differs from the "alternateLink" field value from GAPI: the
    // URL has a query parameter difference, "usp=drive_web" vs "usp=drivesdk".  For consistency,
    // when getting file references back from Picker, always put them in a RefreshQueue before
    // using their properties. --BM 11/19/2013
    parent_folder.uploadFiles().then(function(files) {
      return new RefreshQueue().enqueue(files).trigger().then(function(fs) {
        return $.when.apply($, can.map(fs, function(f) {
          if(!~can.inArray(parent_folder.id, can.map(f.parents, function(p) { return p.id; }))) {
            return f.copyToParent(parent_folder);
          } else {
            return f;
          }
        }));
      });
    }).done(function() {
      var files = can.makeArray(arguments);
      can.each(files, function(file) {
        //Since we can re-use existing file references from the picker, check for that case.
        CMS.Models.Document.findAll({link : file.alternateLink }).done(function(d) {
          if(d.length) {
            //file found, just link to Response
            report_progress(
              "Linking GGRC Evidence object for \"" + d[0].title + "\" to Response"
              , new CMS.Models.ObjectDocument({
                context : response.context || {id : null}
                , documentable : response
                , document : d[0]
              }).save()
            );
            CMS.Models.ObjectFile.findAll({ file_id : file.id, fileable : d[0] })
            .done(function(ofs) {
              if(ofs.length < 1) {
                report_progress(
                  "Linking Drive file \"" + file.title + "\" to GGRC Evidence object"
                  , new CMS.Models.ObjectFile({
                    context : response.context || {id : null}
                    , file : file
                    , fileable : d[0]
                  }).save()
                );
              }
            });
          } else {
            //file not found, make Document object.
            report_progress(
              "Creating GGRC Evidence for Drive file \"" + file.title + "\""
              , new CMS.Models.Document({
                context : response.context || {id : null}
                , title : file.title
                , link : file.alternateLink
              }).save()
            ).then(function(doc) {
              report_progress(
                "Linking GGRC Evidence object for \"" + doc.title + "\" to Response"
                , new CMS.Models.ObjectDocument({
                  context : response.context || {id : null}
                  , documentable : response
                  , document : doc
                }).save()
              );
              report_progress(
                "Linking Drive file \"" + file.title + "\" to GGRC Evidence object"
                , new CMS.Models.ObjectFile({
                  context : response.context || {id : null}
                  , file : file
                  , fileable : doc
                }).save()
              );
            });
          }
        });
      });
    });
  }
  , "a.create-folder click" : function(el, ev) {
    var data = el.closest("[data-model], :data(model)").data("model") || GGRC.make_model_instance(GGRC.page_object);
    this.create_folder_if_nonexistent(data);
  }
  , create_folder_if_nonexistent : function(object) {
    var dfd = new $.Deferred()
    , that = this
    , parent_prop = {
      "Program" : null
      , "Audit" : "program"
      , "Request" : "audit"
    };
    if(parent_prop[object.constructor.shortName]) {
      dfd = this.create_folder_if_nonexistent(object[parent_prop[object.constructor.shortName]].reify());
    } else {
      dfd.resolve();
    }
    return dfd.then(function foldercheck() {
      var folder_dfd;
      if(object.get_mapping("folders").length) {
        //assume we already tried refreshing folders.
      } else if(object instanceof CMS.Models.Request) {
        if(that._audit_create_in_progress || object.audit.reify().get_mapping("folders").length < 1) {
          that.request_create_queue.push(object);
        } else {
          that.create_request_folder(object.constructor, {}, object);
        }
      } else {
        folder_dfd = that["create_" + object.constructor.table_singular + "_folder"](object.constructor, {}, object);
        if(object instanceof CMS.Models.Audit) {
          folder_dfd.done(function(fld) {
            new RefreshQueue().enqueue(object.requests.reify()).trigger().done(function(reqs) {
              can.each(reqs, function(req) {
                if(!req.objective) {
                  new CMS.Models.ObjectFolder({
                    folderable : req
                    , folder : fld
                    , context : req.context
                  }).save();
                }
              });
            });
          });
        }
        return folder_dfd;
      }
    });
  }

  // FIXME I can't figure out from the UserRole what context it applies to.  Assuming that we are on
  //  the program page and adding ProgramReader/ProgramEditor/ProgramOwner.
  , "{CMS.Models.UserRole} created" : function(model, ev, instance) {
    var cache, that = this;
    if(instance instanceof CMS.Models.UserRole
       && instance.context // Only proceed if not the common context
       && /^Program|^Auditor/.test(instance.role.reify().name)
    ) {
      cache = /^Program/.test(instance.role.reify().name) ? CMS.Models.Program.cache : CMS.Models.Audit.cache;

      if (!cache)
        return;

      can.each(Object.keys(cache), function(key) {
        if(cache[key].context && cache[key].context.id === instance.context.id) {
          that.update_owner_permission(
            model
            , ev
            , cache[key]
            , /^ProgramReader$|^Auditor/.test(instance.role.reify().name) ? "reader" : "writer"
            , instance.person
          );
        }
      });
    }
  }

  , "{CMS.Models.Meeting} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Meeting) {
      new CMS.Models.GCalEvent({
        calendar : GGRC.config.DEFAULT_CALENDAR
        , summary : instance.title
        , start : instance.start_at
        , end : instance.end_at
        , attendees : can.map(instance.get_mapping("people"), function(m) { return m.instance; })
      }).save().then(function(cev) {
        var subwin;

        function poll() {
          if(!subwin) {
            return; //popup blocker didn't allow a reference to the open window.
          } else if(subwin.closed) {
            cev.refresh().then(function() {
              instance.attr({
                title : cev.summary
                , start_at : cev.start
                , end_at : cev.end
              });
              can.each(instance.get_mapping("people"), function(person_binding) {
                instance.mark_for_deletion("people", person_binding.instance);
              });
              can.each(cev.attendees, function(attendee) {
                instance.mark_for_addition("people", attendee);
              });
              instance.save();
            });
          } else {
            setTimeout(poll, 5000);
          }
        }

        new CMS.Models.ObjectEvent({
          eventable : instance
          , calendar : GGRC.config.DEFAULT_CALENDAR
          , event : cev
          , context : instance.context || { id : null }
        }).save();

        subwin = window.open(cev.htmlLink, cev.summary);
        setTimeout(poll, 5000);

      });
    }
  }
});

$(function() {
  $(document.body).ggrc_controllers_g_drive_workflow();
});

})(this.can, this.can.$);
