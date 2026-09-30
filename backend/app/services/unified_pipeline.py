"""
Backend adapter for SIF Sentinel Engine.
All live safety intelligence runs through engine/ai/unified_service.py.
"""
import sys
import os

# Ensure engine is on python path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
engine_dir = os.path.join(root_dir, "engine")
if engine_dir not in sys.path:
    sys.path.insert(0, engine_dir)

from ai.unified_service import UnifiedSafetyAnalyzer, LSR_TAXONOMY, BARRIER_TAXONOMY

__all__ = ["UnifiedSafetyAnalyzer", "LSR_TAXONOMY", "BARRIER_TAXONOMY"]
