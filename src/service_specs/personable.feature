# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Some resources can be related to Person resources

  Background:
    Given service description

  Scenario Outline:
    Given a new "Person" named "person"
    And "person" is posted to its collection
    And a new "<personable_type>" named "personable"
    And "personable" is POSTed to its collection
    And a new "ObjectPerson" named "object_person"
    And "object_person" link property "person" is "person"
    And "object_person" polymorphic link property "personable" is "personable"
    And "object_person" is POSTed to its collection
    When GET of the resource "personable"
    Then "person" is in the links property "people" of "personable"

  Examples:
      | personable_type |
      | Control         |
      #| Audit           |
      | DataAsset       |
      #| Directive       |
      | Contract        |
      | Policy          |
      | Regulation      |
      | Standard        |
      | Facility        |
      | Market          |
      | Objective       |
      | OrgGroup        |
      | Product         |
      | Program         |
      | Project         |
      #| Response        |
      | System          |
      | Process         |
