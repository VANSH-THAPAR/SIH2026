import argparse
import sys
import os

# Add parent dir to path so we can import 'ai'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.pattern_intelligence.engine import PatternEngine

def main():
    parser = argparse.ArgumentParser(description="Nirikshan Pattern Intelligence Engine CLI")
    parser.add_argument("--mode", choices=["rebuild", "incremental"], required=True, help="Mode of execution")
    parser.add_argument("--limit", type=int, default=10, help="Max LLM explanation calls")
    parser.add_argument("--min-reports", type=int, default=3, help="Minimum reports to form a candidate pattern")
    
    args = parser.parse_args()
    
    engine = PatternEngine()
    
    if args.mode == "rebuild":
        print(f"Starting FULL REBUILD. Min reports: {args.min_reports}, Max LLM calls: {args.limit}")
        result = engine.rebuild(min_reports=args.min_reports, max_llm_calls=args.limit)
        print("\n--- REBUILD RESULTS ---")
        print(f"Candidate Patterns Generated: {result.get('total_candidates')}")
        print(f"Patterns Persisted: {result.get('persisted_patterns')}")
        print(f"LLM Calls Made: {result.get('llm_calls')}")
        print(f"LLM Failures: {result.get('llm_failures')}")
        print(f"Execution Time: {result.get('execution_time_seconds')} seconds")
    elif args.mode == "incremental":
        print("Starting INCREMENTAL mode...")
        # Since we don't have a specific report passed, this just acts as a placeholder
        # or triggers a rebuild with 0 LLM calls for speed
        engine.incremental_update({})

if __name__ == "__main__":
    main()
