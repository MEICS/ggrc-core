# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

Feature: Return collections that only provide stub representations
  Background:
    Given service description

  Scenario Outline: GET of a collection with __stubs_only query parameter returns only stubs.
    Given an example "<resource_type>"
    When the example "<resource_type>" is POSTed to its collection
    Then a 201 status code is received
    When GET of "<resource_type>" collection with stubs only
    Then "<resource_type>" collection only contains stub entries

  Examples: Resources
      | resource_type      |
      #| Audit              |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      | Contract           |
      | Policy             |
      | Regulation         |
      | Standard           |
      | Document           |
      | Facility           |
      | Help               |
      | Market             |
      #| Meeting            |
      | Objective          |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Product            |
      | Project            |
      | Program            |
      #| Request            |
      #| Response           |
      #| DocumentationResponse    |
      #| InterviewResponse        |
      #| PopulationSampleResponse |
      | Section            |
      | System             |
      | Process            |
