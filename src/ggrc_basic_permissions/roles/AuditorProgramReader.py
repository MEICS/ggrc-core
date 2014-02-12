scope = "Private Program Implied"
description = """
  A user with Auditor role for a program audit will also have this role in the
  program context so that the auditor will have access to the private program
  information and mappings required to perform the audit.
  """
permissions = {
    "read": [
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "Program",
        "ProgramControl",
        "ProgramDirective",
        "Relationship",
    ],
    "create": [],
    "update": [],
    "delete": []
}
