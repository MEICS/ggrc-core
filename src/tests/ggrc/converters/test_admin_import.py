# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import date, datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc import db
from ggrc.models.all_models import System, Process
from ggrc.converters.import_helper import handle_csv_import
from ggrc.converters.systems import SystemsConverter
from tests.ggrc import TestCase

THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')


class TestSystemProcess(TestCase):
  def setUp(self):
    super(TestSystemProcess, self).setUp()

  def tearDown(self):
    super(TestSystemProcess, self).tearDown()

  def test_system_collides_with_process_slug(self):
    csv_filename = join(CSV_DIR, "system_over_process.csv")
    proc1 = Process(slug="PROC-1", title="Existing Process")
    db.session.add(proc1)
    db.session.commit()
    expected_error = "Code is already used for a Process"
    options = {'dry_run': True}
    converter = handle_csv_import(
        SystemsConverter,
        csv_filename,
        **options
    )
    actual_error = converter.objects[0].errors_for('slug')[0]
    self.assertEqual(expected_error, actual_error)

  def test_process_collides_with_system_slug(self):
    csv_filename = join(CSV_DIR, "process_over_system.csv")
    sys1 = System(slug="SYS-1", title="Existing System")
    db.session.add(sys1)
    db.session.commit()
    expected_error = "Code is already used for a System"
    options = {'dry_run': True, 'is_biz_process': '1'}
    converter = handle_csv_import(
        SystemsConverter,
        csv_filename,
        **options
    )
    actual_error = converter.objects[0].errors_for('slug')[0]
    self.assertEqual(expected_error, actual_error)

