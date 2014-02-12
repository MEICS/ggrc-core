scope = "Program Implied"
description = """
  Allow any user assigned a role in a program the ability to read Role
  resources.
  """
permissions = {
    "read": [
        "Role",
        "Person"
    ],
    "create": [],
    "update": [],
    "delete": []
}
