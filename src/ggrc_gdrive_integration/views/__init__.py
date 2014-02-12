import json
from ggrc.app import app
from ggrc.login import login_required
from flask import render_template, request, flash
from ggrc.views import base_context

@app.context_processor
def gdrive_context():
  ctx = base_context()
  def instance_json():
    return "null"
  ctx["instance_json"] = instance_json
  return ctx

@app.route("/gdrive_sandbox")
@login_required
def sandbox():
  """A demo page for GDrive integration models
  """
  return render_template("sandbox/gdrive.haml")

@app.route("/gcal_sandbox")
@login_required
def sandbox_gcal():
  """A demo page for GDrive integration models
  """
  return render_template("sandbox/gcal.haml")

@app.route("/audits/post_import_request_hook", methods=['GET'])
def post_import_requests():
  count = unicode(len(json.loads(request.args.get('ids', '[]'))))
  flash(u'Successfully imported {} request{}'.format(count, 's' if count > 1 else ''), 'notice')
  return_to = unicode(request.args.get('return_to', u'/dashboard'))

  return render_template(
    "programs/post_import_requests.haml",
    audit_id=request.args.get('audit_id', ''),
    created_updated_request_ids=request.args.get("ids", "[]")
  )
