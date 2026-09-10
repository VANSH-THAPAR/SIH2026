from pydantic import BaseModel, Field
from typing import List, Optional

class SafetyAnalysis(BaseModel):
    unsafe_act: Optional[str] = Field(None, description="The unsafe act described in the report, if any.")
    unsafe_condition: Optional[str] = Field(None, description="The unsafe condition described in the report, if any.")
    hazard: Optional[str] = Field(None, description="The primary hazard present (e.g., Stored pressure, Arc flash).")
    energy_source: Optional[str] = Field(None, description="The source of hazardous energy (e.g., Pressurized fluid, Electrical energy).")
    worker_exposure: Optional[str] = Field(None, description="How workers were exposed to the hazard.")
    existing_controls: Optional[str] = Field(None, description="Controls that were present or mentioned as existing.")
    missing_controls: Optional[str] = Field(None, description="Controls that failed or were missing (e.g., Isolation verification).")
    potential_consequence: Optional[str] = Field(None, description="What could have happened realistically, such as 'Serious injury or fatality'.")
    actual_consequence: Optional[str] = Field(None, description="What actually happened, such as 'No injury'.")
    causal_chain: List[str] = Field(default_factory=list, description="A step-by-step causal chain leading to the potential or actual event.")
    key_evidence: List[str] = Field(default_factory=list, description="Key facts extracted from the report description supporting this analysis.")
