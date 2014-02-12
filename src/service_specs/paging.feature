# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

Feature: Collections can be paged
  Background:
    Given service description

  Scenario Outline: GET of a collection with __page query parameter returns a paged collection
    Given a new "<resource_type>" named "resource1"
    And a new "<resource_type>" named "resource2"
    And a new "<resource_type>" named "resource3"
    And "resource1" is POSTed to its collection
    And wait
    And "resource2" is POSTed to its collection
    And wait
    And "resource3" is POSTed to its collection
    When Querying "<resource_type>" with "__page=1&__page_size=2"
    Then query result selfLink query string is "__page=1&__page_size=2"
    # Remember, they're in descending order by modified_at
    And "resource3" is in query result
    And "resource2" is in query result
    And "resource1" is not in query result
    And query result has a "next" page link
    And query result doesn't have a "prev" page link
    And query result has a "first" page link
    And query result has a "last" page link
    When retrieving query result page "next"
    Then query result selfLink query string is "__page=2&__page_size=2"
    And "resource3" is not in query result
    And "resource2" is not in query result
    And "resource1" is in query result
    And query result has a "prev" page link
    And query result has a "first" page link
    And query result has a "last" page link
    When retrieving query result page "prev"
    Then query result selfLink query string is "__page=1&__page_size=2"
    And "resource3" is in query result
    And "resource2" is in query result
    And "resource1" is not in query result
    And query result doesn't have a "prev" page link
    And query result has a "first" page link
    And query result has a "last" page link
    When retrieving query result page "first"
    Then query result selfLink query string is "__page=1&__page_size=2"
    And "resource3" is in query result
    And "resource2" is in query result
    And "resource1" is not in query result
    And query result doesn't have a "prev" page link
    And query result has a "first" page link
    And query result has a "last" page link
    When retrieving query result page "last"
    Then query result doesn't have a "next" page link
    And query result has a "prev" page link
    And query result has a "first" page link
    And query result has a "last" page link

  Examples:
      | resource_type      |
      #| Audit              |
      | ControlCategory    |
      | ControlAssertion   |
      | Control            |
      | DataAsset          |
      | Contract           |
      | Policy             |
      | Regulation         |
      | Standard           |
      | Document           |
      | Facility           |
      | Help               |
      | Market             |
      | Objective          |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Product            |
      | Project            |
      | Program            |
      | Section            |
      | System             |
      | Process            |
