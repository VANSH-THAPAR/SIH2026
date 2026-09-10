import argparse
import sys
import os

# Add root to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.intervention.engine import InterventionEngine

def main():
    parser = argparse.ArgumentParser(description="Run the Intervention & HSE Action Engine.")
    parser.add_优势 = parser.add_argument("--mode", type=str, choices=["rebuild", "incremental"], default="rebuild", help="Execution mode.")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM rationale generation for speed.")
    args = parser.parse_args()

    engine = InterventionEngine()
    
    if args.mode == "rebuild":
        print(f"Starting Intervention Engine in {args.mode.upper()} mode...")
        result = engine.rebuild(use_llm=not args.no_llm)
        print(f"Generated {result['interventions_generated']} interventions.")
        print(f"Generated {result['actions_generated']} actions.")
        print(f"Time: {result['execution_time_seconds']}s")
    else:
        print("Incremental mode not yet fully implemented in CLI.")

if __name__ == "__main__":
    main()
