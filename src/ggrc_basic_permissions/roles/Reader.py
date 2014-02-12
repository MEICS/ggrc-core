scope = "System"
description = """
  This role grants a user basic, read-only, access permission to a gGRC
  instance.
  """
permissions = {
    "read": [
        "Categorization",
        "Category",
        "Control",
        "ControlControl",
        "ControlSection",
        "DataAsset",
        "Directive",
        "Contract",
        "Policy",
        "Regulation",
        "Standard",
        "DirectiveControl",
        "Document",
        "Facility",
        "Help",
        "Market",
        "Objective",
        "ObjectiveControl",
        "ObjectControl",
        "ObjectDocument",
        "ObjectObjective",
        "ObjectPerson",
        "ObjectSection",
        "Option",
        "OrgGroup",
        "PopulationSample",
        "Product",
        "ProgramControl",
        "ProgramDirective",
        "Project",
        "Relationship",
        "RelationshipType",
        "Section",
        "SectionObjective",
        "SystemOrProcess",
        "System",
        "Process",
        "SystemControl",
        "SystemSystem",
        "ObjectOwner",
        "Person",
        "Program",
        "Role",
    ],
    "create": [],
    "view_object_page": [
        "__GGRC_ALL__"
    ],
    "update": [],
    "delete": []
}
