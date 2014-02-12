# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Rather than have clients keep a list of the endpoint URLs for
  gGRC-Core services, a service description document will be provided that
  lists the endpoints by name.

  Scenario: GET the service description for gGRC-CORE
    Given nothing new
    When GET of "/api" as "service_description"
    Then all expected endpoints are listed and GETtable in "service_description"
      | endpoint           |
      | Audit              |
      | Categorization     |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      | Directive          |
      | DirectiveControl   |
      | Contract           |
      | Policy             |
      | Regulation         |
      | Standard           |
      | Document           |
      | Facility           |
      | Market             |
#      | Meeting            |
      | Objective          |
      | ObjectiveControl   |
      | ObjectDocument     |
      | ObjectPerson       |
      | ObjectControl      |
      | ObjectSection      |
      | ObjectObjective    |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Product            |
      | Project            |
      | Program            |
      | ProgramDirective   |
      | Relationship       |
      | Request            |
#      | Response           |
      | DocumentationResponse    |
      | InterviewResponse        |
      | PopulationSampleResponse |
      | Section            |
      | SectionObjective   |
      | SystemOrProcess    |
      | System             |
      | Process            |
