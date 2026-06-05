import json
from pathlib import Path

import pandas as pd


SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_CSV = SCRIPT_DIR / "findex_nepal.csv"
OUTPUT_CSV = SCRIPT_DIR / "nepal_clean.csv"
METADATA_JSON = SCRIPT_DIR / "nepal_metadata.json"

RAW_COLUMNS = [
    "female", "account", "borrowed", "saved", "inc_q", "educ", "age",
    "urbanicity_f2f", "emp_in", "mobileowner", "internetaccess",
    "anydigpayment", "remittances",
]

RECODE_MAPS = {
    "female":         {1: 1, 2: 0},
    "urbanicity_f2f": {1: 1, 2: 0},
    "emp_in":         {1: 1, 2: 0},
    "mobileowner":    {1: 1, 2: 0},
    "internetaccess": {1: 1, 2: 0},
    "remittances":    {1: 1, 5: 0},
}

RENAME_MAP = {
    "female":         "is_female",
    "account":        "has_account",
    "borrowed":       "has_borrowed",
    "urbanicity_f2f": "is_urban",
    "emp_in":         "is_employed",
    "mobileowner":    "has_mobile",
    "internetaccess": "has_internet",
    "anydigpayment":  "has_digital_payment",
    "remittances":    "receives_remittances",
}

BINARY_COLS = [
    "is_female", "has_account", "has_borrowed",
    "is_urban", "is_employed", "has_mobile",
    "has_internet", "has_digital_payment", "receives_remittances",
]


def main():
    df = pd.read_csv(INPUT_CSV, encoding="latin-1")
    print(f"Loaded {INPUT_CSV.name}: {len(df):,} rows x {df.shape[1]} columns")

    missing = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing:
        print(f"ERROR: missing columns in input: {missing}")
        return
    df = df[RAW_COLUMNS].copy()
    print(f"Selected {len(RAW_COLUMNS)} columns\n")

    for col, mapping in RECODE_MAPS.items():
        df[col] = df[col].map(mapping)

    n_before = len(df)
    df = df.dropna(subset=["internetaccess", "remittances"])
    print(f"Dropped {n_before - len(df)} rows (internetaccess=3 or remittances invalid)")

    for col in RECODE_MAPS:
        df[col] = df[col].astype("Int64")

    df = df.rename(columns=RENAME_MAP)

    print("\n=== FINAL CLEAN DATASET ===")
    print(f"Rows: {len(df):,}")
    print("\nColumns and dtypes:")
    for col, dtype in df.dtypes.items():
        print(f"  {col:25s}  {dtype}")

    print("\n=== BINARY COLUMN VALUE COUNTS ===")
    for col in BINARY_COLS:
        if col not in df.columns:
            continue
        counts = df[col].value_counts(dropna=False).sort_index()
        total = int(counts.sum())
        print(f"\n  {col}:")
        for val, count in counts.items():
            label = "<NA>" if pd.isna(val) else f"{int(val)}"
            pct = (count / total * 100) if total else 0.0
            print(f"    {label}: {count:,} ({pct:.1f}%)")

    print("\n=== ACCOUNT OWNERSHIP BY GENDER ===")
    acc_by_gender = df.groupby("is_female", dropna=False)["has_account"].mean()
    women_prop = float(acc_by_gender.get(1, 0.0))
    men_prop = float(acc_by_gender.get(0, 0.0))
    women_pct = women_prop * 100
    men_pct = men_prop * 100
    gap_pp = women_pct - men_pct
    print(f"  Women with account: {women_pct:.1f}%")
    print(f"  Men with account:   {men_pct:.1f}%")
    print(f"  Gap: {gap_pp:+.1f} percentage points")

    print("\n=== BORROWING RATE BY GENDER ===")
    borr_by_gender = df.groupby("is_female", dropna=False)["has_borrowed"].mean()
    women_b = float(borr_by_gender.get(1, 0.0)) * 100
    men_b = float(borr_by_gender.get(0, 0.0)) * 100
    gap_b = women_b - men_b
    print(f"  Women who borrowed: {women_b:.1f}%")
    print(f"  Men who borrowed:   {men_b:.1f}%")
    print(f"  Gap: {gap_b:+.1f} percentage points")

    print("\n=== ACCOUNT OWNERSHIP BY INCOME QUINTILE ===")
    acc_by_inc = df.groupby("inc_q", dropna=False)["has_account"].mean() * 100
    for q in [1, 2, 3, 4, 5]:
        rate = float(acc_by_inc.get(q, 0.0))
        print(f"  Quintile {q}: {rate:.1f}%")

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved {OUTPUT_CSV.name} with {len(df):,} rows")

    feature_cols = [c for c in df.columns if c not in ("is_female", "has_account")]
    metadata = {
        "source": "World Bank Global Findex 2021",
        "country": "Nepal",
        "n_rows": int(len(df)),
        "target_col": "has_account",
        "protected_col": "is_female",
        "feature_cols": feature_cols,
        "account_rate_female": women_prop,
        "account_rate_male": men_prop,
        "gender_gap_percentage_points": gap_pp,
        "year": 2021,
    }
    with open(METADATA_JSON, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved {METADATA_JSON.name}")


if __name__ == "__main__":
    main()
