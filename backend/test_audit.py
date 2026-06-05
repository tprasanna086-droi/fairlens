"""FairLens Phase 1 — audit engine smoke test."""
import json
import os
import pandas as pd
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from audit import run_full_audit


def main() -> None:
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'demo_dataset.csv')
    df = pd.read_csv(csv_path)

    result = run_full_audit(df, target_col='loan_approved', protected_col='gender')

    print('=' * 70)
    print('FAIRLENS AUDIT RESULT')
    print('=' * 70)
    print(json.dumps(result, indent=2))
    print('=' * 70)
    print('ASSERTIONS')
    print('=' * 70)

    results = []

    statuses = [
        result['metrics']['demographic_parity']['status'],
        result['metrics']['disparate_impact']['status'],
        result['metrics']['equal_opportunity']['status'],
        result['metrics']['equalized_odds']['status'],
    ]
    biased_present = 'biased' in statuses
    a1 = biased_present
    results.append(('at least one metric has status == "biased"', a1))

    a2 = len(result['shap_values']) == 10
    results.append(('shap values list has exactly 10 items', a2))

    for label, ok in results:
        print(f"[{'PASS' if ok else 'FAIL'}] {label}")

    if all(ok for _, ok in results):
        print('\nALL TESTS PASSED')
    else:
        print('\nSOME TESTS FAILED')
        sys.exit(1)


if __name__ == '__main__':
    main()
