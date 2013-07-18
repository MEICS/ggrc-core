import csv
import os
from ggrc.models import Directive, Section
from StringIO import StringIO
from flask import current_app
from ggrc import db


def handle_csv_import(converter_class, filepath, **options):
  rows = []
  csv_file = filepath
  if isinstance(filepath, basestring):
    csv_file = open(filepath,'rbU')

  if options.get('directive_id') and not options.get('directive'):
    options['directive'] = Directive.query.filter_by(id=int(options['directive_id'])).first()

  csv_reader = unicode_csv_reader(csv_file.read().splitlines(True))
  rows = [row for row in csv_reader]
  csv_file.close()
  converter = converter_class.from_rows(rows, **options)
  return converter.do_import(options.get('dry_run', True))

def unicode_csv_reader(unicode_csv_data, dialect=csv.excel, **kwargs):
  csv_reader = csv.reader(utf_8_encoder(unicode_csv_data),
                            dialect=dialect, **kwargs)
  for row in csv_reader:
    yield [unicode(cell, 'utf-8') for cell in row]

def utf_8_encoder(unicode_csv_data):
  for line in unicode_csv_data:
    yield line.encode('utf-8')

def handle_csv_export(filename):
  pass

def handle_converter_csv_export(directive_id, converter_class, **options):
  options['export'] = True
  directive = Directive.query.filter_by(id=int(directive_id)).first()
  options['directive'] = directive
  filename = "{}.csv".format(directive.slug)
  objects = directive.sections

  headers = [('Content-Type', 'text/csv'), ('Content-Disposition','attachment; filename="{}"'.format(filename))]
  status_code = 200

  exporter = converter_class(objects, **options)
  output_buffer = StringIO()
  writer = csv.writer(output_buffer)

  for metadata_row in exporter.do_export_metadata():
    writer.writerow([ line.encode("utf-8") for line in metadata_row ])

  exporter.do_export(writer)
  body = output_buffer.getvalue()
  output_buffer.close()
  return current_app.make_response((body, 200, headers))
