import asyncio
from models import ReportPayload, Site
from ai.analyzer import SafetyAnalyzer

analyzer = SafetyAnalyzer()

def create_mock_report(report_id: str, description: str, activity: str) -> ReportPayload:
    return ReportPayload(
        report_id=report_id,
        report_date="2026-05-10",
        time="10:00",
        site=Site(site_id="TEST", site_name="Test Site", region="Test Region"),
        location="Test Location",
        department="Test Department",
        reported_by=[],
        report_type="observation",
        activity=activity,
        description=description,
        source="TEST"
    )

def run_tests():
    print("========================================")
    print("TEST 1 - SIF-like near miss")
    print("========================================")
    report1 = create_mock_report(
        "T001",
        "During maintenance, a technician started opening a pipeline valve before confirming that the line was fully depressurized. No injury occurred.",
        "Pipeline Maintenance"
    )
    analysis1, model1 = analyzer.analyze(report1)
    if analysis1:
        print(analysis1.model_dump_json(indent=2))
        print("\nExpected: Hazard -> Stored Pressure, Consequence -> Serious injury/fatality possible")
    else:
        print("Failed to analyze")

    print("\n========================================")
    print("TEST 2 - Hot Work")
    print("========================================")
    report2 = create_mock_report(
        "T002",
        "During welding, the work area was not properly barricaded and nearby workers were exposed to welding arc radiation.",
        "Hot Work"
    )
    analysis2, model2 = analyzer.analyze(report2)
    if analysis2:
        print(analysis2.model_dump_json(indent=2))
        print("\nExpected: Hazard -> Arc flash / welding radiation, Unsafe Condition -> Inadequate barricading")
    else:
        print("Failed to analyze")

    print("\n========================================")
    print("TEST 3 - Confined Space")
    print("========================================")
    report3 = create_mock_report(
        "T003",
        "A worker entered a confined space before gas testing was verified.",
        "Confined Space Entry"
    )
    analysis3, model3 = analyzer.analyze(report3)
    if analysis3:
        print(analysis3.model_dump_json(indent=2))
        print("\nExpected: Hazard -> Hazardous atmosphere, Missing Control -> Gas testing verification")
    else:
        print("Failed to analyze")

    print("\n========================================")
    print("TEST 4 - Non-SIF example")
    print("========================================")
    report4 = create_mock_report(
        "T004",
        "A worker noticed a small housekeeping issue in the office corridor and removed the obstruction.",
        "Office Work"
    )
    analysis4, model4 = analyzer.analyze(report4)
    if analysis4:
        print(analysis4.model_dump_json(indent=2))
        print("\nExpected: Low risk, no significant SIF potential consequence")
    else:
        print("Failed to analyze")

if __name__ == "__main__":
    run_tests()
