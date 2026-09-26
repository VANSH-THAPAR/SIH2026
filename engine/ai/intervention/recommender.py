import json
from typing import Dict, Any
from ai.provider import AIProvider
from .schemas import InterventionContext, InterventionData, HSEActionData
from .playbook import InterventionPlaybook
from .prioritizer import InterventionPrioritizer

class InterventionRecommender:
    def __init__(self):
        self.provider = AIProvider()
        
    def generate_intervention(self, context: InterventionContext, use_llm: bool = True) -> InterventionData:
        """
        Generates an intervention strictly based on context.
        Uses deterministic playbook for actions, LLM only for rationale (if possible).
        """
        # 1. Deterministic Selection
        intervention_type = InterventionPrioritizer.determine_intervention_type(context)
        urgency = InterventionPrioritizer.map_urgency(context.priority_level)
        
        actions_data = InterventionPlaybook.get_actions(
            lsr_code=context.primary_lsr_code or "",
            barrier_code=context.primary_barrier_code or "",
            barrier_status=context.barrier_status or ""
        )
        
        hse_actions = [HSEActionData(**a) for a in actions_data]
        
        # 2. Base Rationale (Deterministic)
        rationale = f"Recommended based on {context.priority_level} risk priority. "
        if context.primary_barrier_code and context.barrier_status:
            rationale += f"Barrier {context.primary_barrier_name} is marked as {context.barrier_status}. "
        if context.sif_potential:
            rationale += "Event has SIF potential. "
            
        title = f"Address {context.primary_barrier_name or 'Safety'} Risk at {context.site_name or 'Site'}"
        
        # 3. Optional LLM Refinement for human readability
        prompt = f"""You are an HSE expert. Make this intervention rationale concise and professional.
        DO NOT invent any workers, injuries, or facts. DO NOT change priority.
        
        Context:
        Site: {context.site_name}
        Activity: {context.activity}
        Barrier: {context.primary_barrier_name} ({context.barrier_status})
        Risk: {context.priority_level}
        Event: {context.report_description}
        
        Return ONLY valid JSON:
        {{
            "title": "short professional title",
            "rationale": "1-2 sentence explanation of WHY based ONLY on facts provided"
        }}
        """
        if use_llm:
            try:
                llm_result = self.provider.generate_structured_json(prompt, prompt)
                if llm_result.get("title"):
                    title = llm_result["title"]
                if llm_result.get("rationale"):
                    rationale = llm_result["rationale"]
            except Exception:
                pass # Fall back to deterministic strings
            
        evidence = []
        if context.report_id:
            evidence.append(f"Report: {context.report_id}")
            
        return InterventionData(
            intervention_type=intervention_type,
            title=title,
            rationale=rationale,
            priority_level=context.priority_level,
            intervention_urgency=urgency,
            site_name=context.site_name,
            activity=context.activity,
            primary_lsr_code=context.primary_lsr_code,
            primary_barrier_code=context.primary_barrier_code,
            barrier_status=context.barrier_status,
            evidence=evidence,
            recommended_actions=hse_actions
        )
