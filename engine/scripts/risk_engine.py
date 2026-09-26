import argparse
import sys
import os

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.risk_prioritization.engine import RiskEngine

def run_rebuild():
    engine = RiskEngine()
    print("Rebuilding Risk Priorities...")
    stats = engine.rebuild_all_priorities()
    
    print("\nRisk Priority Engine")
    print("--------------------")
    print(f"Reports processed: {stats.get('reports_processed', 0)}")
    print(f"CRITICAL: {stats.get('critical', 0)}")
    print(f"HIGH: {stats.get('high', 0)}")
    print(f"MEDIUM: {stats.get('medium', 0)}")
    print(f"LOW: {stats.get('low', 0)}\n")
    print(f"Safety floor applied: {stats.get('safety_floor_applied', 0)}")
    print(f"Reports without pattern: {stats.get('reports_without_pattern', 0)}")
    print(f"Reports with pattern: {stats.get('reports_with_pattern', 0)}\n")
    print(f"Average priority score: {stats.get('average_score', 0.0)}")

def run_incremental(report_id: str):
    engine = RiskEngine()
    print(f"Running incremental risk prioritization for report: {report_id}")
    result = engine.process_risk_priority(report_id)
    if result:
        print(f"Successfully processed {report_id}: {result.final_priority_level} ({result.final_priority_score})")
        print(f"Reason: {result.reason_json.json()}")
    else:
        print(f"Failed to process {report_id}. Ensure Stage 2 (SIF) is complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Risk Prioritization Engine")
    parser.add_argument("--mode", choices=["rebuild", "incremental"], required=True)
    parser.add_argument("--report-id", type=str, help="Report ID for incremental mode")
    
    args = parser.parse_args()
    
    if args.mode == "rebuild":
        run_rebuild()
    elif args.mode == "incremental":
        if not args.report_id:
            print("Error: --report-id is required for incremental mode")
            sys.exit(1)
        run_incremental(args.report_id)
