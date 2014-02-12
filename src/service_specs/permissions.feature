# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: RBAC Permissions enforcement for REST API

  Background:
    Given service description
    And the current user
    """
    { "email": "admin@testertester.com",
      "name": "Admin Tester",
      "permissions": {
        "__GGRC_ADMIN__": { "__GGRC_ALL__": { "contexts": [0] } }
      }
    }
    """
    And a new "Context" named "context1"
    And "context1" is POSTed to its collection
    And a new "Context" named "context2"
    And "context2" is POSTed to its collection

  Scenario Outline: POST requires create permission for the context
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        }
      }
    }
    """
    And a new "<resource_type>" named "resource"
    And "resource" link property "context" is "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context2"
    Then POST of "resource" to its collection is allowed
    Given a new "<resource_type>" named "resource"
    And "resource" link property "context" is "context2"
    Then POST of "resource" to its collection is forbidden

  Examples:
      | resource_type      |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      #| Directive          |
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
      | ObjectiveControl   |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Process            |
      | Product            |
      | Project            |
      #| Program            |
      #| ProgramDirective   |
      | Section            |
      | SectionObjective   |
      | System             |

  Scenario Outline: GET requires read permission for the context
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        }
      }
    }
    """
    And a new "<resource_type>" named "resource"
    And "resource" link property "context" is "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context1"
    And "resource" is POSTed to its collection
    Then GET of "resource" is allowed
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context2.value['context']['id']}}]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [{{context.context2.value['context']['id']}}]
          }
        }
      }
    }
    """
    Then GET of "resource" is forbidden

  Examples:
      | resource_type      |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      #| Directive          |
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
      | ObjectiveControl   |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Process            |
      | Product            |
      | Project            |
      #| Program            |
      #| ProgramDirective   |
      | Section            |
      | SectionObjective   |
      | System             |

  Scenario Outline: PUT requires update permission for the context
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "update": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        }
      }
    }
    """
    And a new "<resource_type>" named "resource"
    And "resource" link property "context" is "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context1"
    And "resource" is POSTed to its collection
    Then GET of "resource" is allowed
    Then PUT of "resource" is allowed
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "read": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        },
        "update": {
          "<resource_type>": {
            "contexts": [{{context.context2.value['context']['id']}}]
          }
        }
      }
    }
    """
    Then GET of "resource" is allowed
    Then PUT of "resource" is forbidden

  Examples:
      | resource_type      |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      #| Directive          |
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
      | ObjectiveControl   |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Process            |
      | Product            |
      | Project            |
      #| Program            |
      #| ProgramDirective   |
      | Section            |
      | SectionObjective   |
      | System             |

  Scenario Outline: DELETE requires delete permission for the context
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "update": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        }
      }
    }
    """
    And a new "<resource_type>" named "resource"
    And "resource" link property "context" is "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context1"
    And "resource" is POSTed to its collection
    Then GET of "resource" is allowed
    Then DELETE of "resource" is forbidden 
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        },
        "delete": {
          "<resource_type>": {
            "contexts": [{{context.context1.value['context']['id']}}]
          }
        }
      }
    }
    """
    Then GET of "resource" is allowed
    Then DELETE of "resource" is allowed

  Examples:
      | resource_type      |
      | Control            |
      | ControlCategory    |
      | ControlAssertion   |
      | DataAsset          |
      #| Directive          |
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
      | ObjectiveControl   |
      | Option             |
      | OrgGroup           |
      | Person             |
      | Process            |
      | Product            |
      | Project            |
      #FIXME programs can have special behavior | Program            |
      #| ProgramDirective   |
      | Section            |
      | SectionObjective   |
      | System             |

  Scenario: Property link objects can be included with __include if the user has read access to the target
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "create": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        },
        "read": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}}
              , {{context.context2.value['context']['id']}}
            ]
          }
        },
        "update": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        }
      }
    }
    """
    And a new "Contract" named "directive_in_1"
    And "directive_in_1" property "kind" is "Contract"
    And "directive_in_1" link property "context" is "context1"
    And "directive_in_1" is POSTed to its collection
    And a new "Contract" named "directive_in_2"
    And "directive_in_2" property "kind" is "Contract"
    And "directive_in_2" link property "context" is "context2"
    And "directive_in_2" is POSTed to its collection
    And a new "Program" named "program"
    And "program" link property "context" is "context1"
    And "program" property "private" is literal "False"
    And "program" is POSTed to its collection
    And a new "ProgramDirective" named "program_directive_1"
    And "program_directive_1" link property "directive" is "directive_in_1"
    And "program_directive_1" link property "context" is "context1"
    And "program_directive_1" link property "program" is "program"
    And "program_directive_1" is POSTed to its collection
    And a new "ProgramDirective" named "program_directive_2"
    And "program_directive_2" link property "directive" is "directive_in_2"
    And "program_directive_2" link property "context" is "context2"
    And "program_directive_2" link property "program" is "program"
    And "program_directive_2" is POSTed to its collection
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "create": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        },
        "read": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}}
              , {{context.context2.value['context']['id']}}
              , {{context.program.value['program']['context']['id']}}
            ]
          }
        },
        "update": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        }
      }
    }
    """

    When Querying "Program" with "program_directives.directive.kind=Contract&__include=directives"
    Then query result selfLink query string is "program_directives.directive.kind=Contract&__include=directives"
    And "program" is in query result
    And evaluate "len(context.queryresultcollection['programs_collection']['programs'][0]['directives']) == 2"
    And evaluate "'kind' in context.queryresultcollection['programs_collection']['programs'][0]['directives'][0] and 'kind' in context.queryresultcollection['programs_collection']['programs'][0]['directives'][1]"
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        },
        "read": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}}
              , {{context.program.value['program']['context']['id']}}
            ]
          }
        },
        "update": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        }
      }
    }
    """
    When Querying "Program" with "program_directives.directive.kind=Contract&__include=directives"
    Then query result selfLink query string is "program_directives.directive.kind=Contract&__include=directives"
    And "program" is in query result
    And evaluate "len(context.queryresultcollection['programs_collection']['programs'][0]['directives']) == 1"
    And evaluate "'kind' in context.queryresultcollection['programs_collection']['programs'][0]['directives'][0]"
    Given the current user
    """
    { "email": "alicetester@testertester.com",
      "name": "Alice Tester",
      "permissions": {
        "read": {
          "Contract": {
            "contexts": [333]
          },
          "ProgramDirective": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          },
          "Program": {
            "contexts": [
              {{context.context1.value['context']['id']}}
              , {{context.program.value['program']['context']['id']}}
            ]
          }
        },
        "update": {
          "Contract": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        }
      }
    }
    """
    When Querying "Program" with "program_directives.directive.kind=Contract&__include=directives"
    Then query result selfLink query string is "program_directives.directive.kind=Contract&__include=directives"
    And "program" is not in query result

  Scenario Outline: A single query parameter supplied to a collection finds matching resources in contexts that the user is authorized to for read
    Given the current user
    """
    { "email": "bobtester@testertester.com",
      "name": "Bob Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        },
        "update": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}},
              {{context.context2.value['context']['id']}}
            ]
          }
        }
      }
    }
    """
    Given a new "<resource_type>" named "resource1"
    And a new "<resource_type>" named "resource2"
    And "resource1" property "<property_name>" is "<match_value>"
    And "resource2" property "<property_name>" is "<match_value>"
    And "resource1" link property "context" is "context1"
    And "resource2" link property "context" is "context2"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context1"
    And current user has create permissions on resource types that "<resource_type>" depends on in context "context2"
    And "resource1" is POSTed to its collection
    And "resource2" is POSTed to its collection
    When Querying "<resource_type>" with "<property_name>=<match_value>"
    And GET of the resource "resource1"
    And GET of the resource "resource2"
    Then query result selfLink query string is "<property_name>=<match_value>"
    And "resource1" is in query result
    And "resource2" is in query result
    Given the current user
    """
    { "email": "tester@testertester.com",
      "name": "Jo Tester",
      "permissions": {
        "create": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        },
        "read": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        },
        "update": {
          "<resource_type>": {
            "contexts": [
              {{context.context1.value['context']['id']}}
            ]
          }
        }
      }
    }
    """
    When Querying "<resource_type>" with "<property_name>=<match_value>"
    Then query result selfLink query string is "<property_name>=<match_value>"
    And "resource1" is in query result
    And "resource2" is not in query result

  Examples: Resources
      | resource_type    | property_name | match_value         |
      | ControlCategory  | name          | category1           |
      | ControlAssertion | name          | assertion1          |
      | Help             | title         | foo                 |
      #| Program          | state         | draft               |

