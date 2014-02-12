# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


import ggrc.models
from .template import Template
from .risk_assessment import RiskAssessment
from .risk_assessment_mapping import RiskAssessmentMapping
from .risk_assessment_control_mapping import RiskAssessmentControlMapping
from .threat import Threat
from .vulnerability import Vulnerability


ggrc.models.all_models.Template = Template
ggrc.models.all_models.RiskAssessment = RiskAssessment
ggrc.models.all_models.RiskAssessmentMapping = RiskAssessmentMapping
ggrc.models.all_models.RiskAssessmentControlMapping = RiskAssessmentControlMapping
ggrc.models.all_models.Threat = Threat
ggrc.models.all_models.Vulnerability = Vulnerability

ggrc.models.all_models.all_models += [
    Template,
    RiskAssessment,
    RiskAssessmentMapping,
    RiskAssessmentControlMapping,
    Threat,
    Vulnerability,
    ]

ggrc.models.all_models.__all__ += [
    Template.__name__,
    RiskAssessment.__name__,
    RiskAssessmentMapping.__name__,
    RiskAssessmentControlMapping.__name__,
    Threat.__name__,
    Vulnerability.__name__,
    ]
