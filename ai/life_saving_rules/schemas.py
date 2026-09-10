from pydantic import BaseModel, Field
from typing import List, Optional

class LifeSavingRuleEvidence(BaseModel):
    rule_code: str = Field(..., description="The unique code of the Life-Saving Rule.")
    rule_name: str = Field(..., description="The name of the Life-Saving Rule.")
    applicable: bool = Field(..., description="Whether this rule is directly applicable to the report.")
    confidence: float = Field(..., description="Confidence score from 0.0 to 100.0 that this rule is applicable based on evidence.")
    priority: str = Field(..., description="'PRIMARY' if this is the main failed barrier/rule, 'SECONDARY' otherwise.")
    evidence: List[str] = Field(..., description="List of direct quotes or explicit evidence from the report supporting the mapping.")
    trigger: str = Field(..., description="What specific action or condition triggered this rule mapping.")
    reasoning: str = Field(..., description="Brief explanation of why this rule applies to the given scenario.")

class LifeSavingRuleResult(BaseModel):
    mapped_rules: List[LifeSavingRuleEvidence] = Field(..., description="List of mapped rules with evidence. If none, return an empty list.")
    unmapped_reason: Optional[str] = Field(None, description="If no rules are mapped, explain why based on evidence.")
