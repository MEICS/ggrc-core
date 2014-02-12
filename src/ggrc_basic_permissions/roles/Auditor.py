scope = "Audit"
description = """
  The permissions required by an auditor to access relevant resources for the
  program being audited.
  """
permissions = {
    "read": [
        "Audit",
        "Request",
        {
            "terms": {
                "property_name": "status",
                "value": [
                    "Accepted",
                    "Completed"
                ]
            },
            "type": "DocumentationResponse",
            "condition": "in"
        },
        {
            "terms": {
                "property_name": "status",
                "value": [
                    "Accepted",
                    "Completed"
                ]
            },
            "type": "InterviewResponse",
            "condition": "in"
        },
        {
            "terms": {
                "property_name": "status",
                "value": [
                    "Accepted",
                    "Completed"
                ]
            },
            "type": "PopulationSampleResponse",
            "condition": "in"
        },
        "Meeting",
        "ObjectControl",
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "Relationship",
        "Document",
        "Meeting",
        "UserRole",
    ],
    "create": [
        "Request",
    ],
    "view_object_page": [
        "__GGRC_ALL__"
    ],
    "update": [
        "Request",
        "Response"
    ],
    "delete": []
}
