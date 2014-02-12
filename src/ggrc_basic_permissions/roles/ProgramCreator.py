scope = "System"
description = """
  This role grants a user the permission to create public and private programs.
  """
permissions = {
    "read": [
        "Program",
    ],
    "create": [
        "Program",
    ],
    "view_object_page": [
        "__GGRC_ALL__"
    ],
    "update": [
        {
            "type": "Program",
            "terms": {
                "list_property": "owners",
                "value": "$current_user"
            },
            "condition": "contains"
        }
    ],
    "delete": [
        {
            "type": "Program",
            "terms": {
                "list_property": "owners",
                "value": "$current_user"
            },
            "condition": "contains"
        },
    ]
}
