# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Many resources type pairs reference each other M x N relations. This 
  feature will exercise the cases where the linking between resources is M x N.

  Background:
    Given service description

  Scenario Outline:
    Given a new "<type_a>" named "resource_a"
    And "resource_a" is POSTed to its collection
    And a new "<type_b>" named "resource_b"
    And "resource_a" is added to links property "<link_property_b>" of "resource_b"
    And "resource_b" is POSTed to its collection
    When GET of the resource "resource_a"
    And GET of the resource "resource_b"
    Then the "<link_property_a>" property of the "resource_a" is not empty
    And "resource_b" is in the links property "<link_property_a>" of "resource_a"
    And the "<link_property_b>" property of the "resource_b" is not empty
    And "resource_a" is in the links property "<link_property_b>" of "resource_b"
    # Now, do it the reverse way
    Given a new "<type_b>" named "resource_b"
    And "resource_b" is POSTed to its collection
    Given a new "<type_a>" named "resource_a"
    And "resource_b" is added to links property "<link_property_a>" of "resource_a"
    And "resource_a" is POSTed to its collection
    When GET of the resource "resource_a"
    And GET of the resource "resource_b"
    Then the "<link_property_a>" property of the "resource_a" is not empty
    And "resource_b" is in the links property "<link_property_a>" of "resource_a"
    And the "<link_property_b>" property of the "resource_b" is not empty
    And "resource_a" is in the links property "<link_property_b>" of "resource_b"

   Examples: m-by-n link Resources
      | type_a    | link_property_a      | type_b    | link_property_b       |
     #| Control   | documents            | Document  | FIXME no property??   |
     #| Control   | people               | Person    | ??                    |
      | Control   | sections             | Section   | controls              |
      #| Control   | implemented_controls | Control   | implementing_controls |
      #| Directive | programs             | Program   | directives            |
      | Contract  | programs             | Program   | directives            |
      | Policy    | programs             | Program   | directives            |
      | Regulation| programs             | Program   | directives            |
      | Standard  | programs             | Program   | directives            |
      | Control   | objectives           | Objective | controls              |
      | Section   | objectives           | Objective | sections              |
      | Objective | controls             | Control   | objectives            |
      | Objective | sections             | Section   | objectives            |

  Scenario Outline: Update of M x N relationships
    Given a new "<source>" named "source_a"
    And a new "<dest>" named "dest_b"
    And "dest_b" is POSTed to its collection
    And "dest_b" is added to links property "<link_property>" of "source_a"
    And "source_a" is POSTed to its collection
    When GET of the resource "source_a"
    Then PUT of "source_a" is allowed

   Examples: m-by-n link Resources
      | source    | link_property      | dest    |
      #| Directive | programs             | Program |
      | Contract   | programs             | Program |
      | Policy     | programs             | Program |
      | Regulation | programs             | Program |
      | Standard   | programs             | Program |
