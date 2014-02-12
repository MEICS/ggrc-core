scope = "Private Program"
description = """
  A user with authorization to edit mapping objects related to an access
  controlled program.<br/><br/>When a person has this role they can map and
  unmap objects to the Program but they are unable to edit the Program info,
  delete the Program, or assign other people roles for that program.
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
        "UserRole"
    ],
    "create": [
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "ProgramControl",
        "ProgramDirective",
        "Relationship",
    ],
    "view_object_page": [
        "__GGRC_ALL__"
    ],
    "update": [
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "Program",
        "ProgramControl",
        "ProgramDirective",
        "Relationship"
    ],
    "delete": [
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "ProgramControl",
        "ProgramDirective",
        "Relationship",
    ]
}
