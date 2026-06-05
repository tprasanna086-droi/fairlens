import sys
from pathlib import Path

import pandas as pd
import requests


SCRIPT_DIR = Path(__file__).resolve().parent
RAW_CSV = SCRIPT_DIR / "findex_raw.csv"
NEPAL_CSV = SCRIPT_DIR / "findex_nepal.csv"
INVENTORY_TXT = SCRIPT_DIR / "findex_columns.txt"

DOWNLOAD_URL = "https://microdata.worldbank.org/index.php/catalog/4607/download/64942"
COUNTRY_COL_CANDIDATES = ["economycode", "economy", "country", "countrycode"]
NEPAL_CODE = "NPL"

TARGET_KEYWORDS = ["account", "loan", "borrow", "credit", "saved", "fin"]
PROTECTED_KEYWORDS = ["female", "gender", "sex"]
FEATURE_KEYWORDS = [
    "income", "educ", "age", "urban", "rural",
    "employ", "job", "wealth", "labor", "poverty", "poor", "rich",
]

MANUAL_INSTRUCTIONS = """\
Please download manually from:
 https://microdata.worldbank.org/index.php/catalog/4607
 Click 'Get Microdata', register free, download CSV, save as data/findex_raw.csv
 Then re-run this script."""


def print_manual_instructions(error=None):
    if error:
        print(f"\nERROR: {error}\n")
    print(MANUAL_INSTRUCTIONS)


def download():
    print(f"Downloading {DOWNLOAD_URL} ...")
    print("(This file is large; please be patient)")
    try:
        with requests.get(
            DOWNLOAD_URL,
            timeout=300,
            stream=True,
            headers={"User-Agent": "Mozilla/5.0 FairLens/1.0"},
        ) as r:
            r.raise_for_status()
            with open(RAW_CSV, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        f.write(chunk)
        size = RAW_CSV.stat().st_size
        print(f"Saved raw file to {RAW_CSV} ({size:,} bytes)")
        return True
    except Exception as e:
        if RAW_CSV.exists():
            try:
                RAW_CSV.unlink()
            except OSError:
                pass
        print_manual_instructions(error=str(e))
        return False


def find_country_column(df):
    for cand in COUNTRY_COL_CANDIDATES:
        if cand in df.columns:
            return cand
    lower = {c.lower(): c for c in df.columns}
    for cand in COUNTRY_COL_CANDIDATES:
        if cand in lower:
            return lower[cand]
    return None


def filter_nepal(df):
    country_col = find_country_column(df)
    if country_col is None:
        print(
            "ERROR: could not find a country column. "
            f"Tried: {COUNTRY_COL_CANDIDATES}"
        )
        print(f"Available columns (first 20): {list(df.columns)[:20]}")
        print_manual_instructions()
        sys.exit(0)

    print(f"Using country column: '{country_col}'")
    npl = df[df[country_col].astype(str).str.strip().str.upper() == NEPAL_CODE]
    npl.to_csv(NEPAL_CSV, index=False)
    print(f"Nepal rows found: {len(npl)}")
    return npl


def column_matches(col, keywords):
    name = col.lower()
    return any(kw in name for kw in keywords)


def build_inventory(df):
    lines = []
    lines.append("=" * 78)
    lines.append("FAIRLENS — FINDEX 2021 NEPAL DATA INVENTORY")
    lines.append("=" * 78)
    lines.append("")
    lines.append(f"Total rows: {len(df)}")
    lines.append(f"Total columns: {df.shape[1]}")
    lines.append("")

    lines.append("--- ALL COLUMNS WITH DTYPE ---")
    for col, dtype in df.dtypes.items():
        lines.append(f"  {col:50s}  {str(dtype)}")
    lines.append("")

    lines.append("--- VALUE COUNTS (columns with fewer than 20 unique values) ---")
    for col in df.columns:
        nunique = df[col].nunique(dropna=True)
        if 0 < nunique < 20:
            lines.append(f"\n  [{col}]  ({nunique} unique values)")
            vc = df[col].value_counts(dropna=False).head(20)
            for val, count in vc.items():
                lines.append(f"      {repr(val):>30s}: {count}")
    lines.append("")

    lines.append("--- NULL PERCENTAGE PER COLUMN ---")
    nulls = (df.isnull().mean() * 100).sort_values(ascending=False)
    for col, pct in nulls.items():
        lines.append(f"  {col:50s}  {pct:6.2f}%")
    lines.append("")

    target_flags = [c for c in df.columns if column_matches(c, TARGET_KEYWORDS)]
    protected_flags = [c for c in df.columns if column_matches(c, PROTECTED_KEYWORDS)]
    feature_flags = [c for c in df.columns if column_matches(c, FEATURE_KEYWORDS)]

    lines.append("--- FLAGGED CANDIDATES ---")
    lines.append("")
    lines.append("TARGET candidates (credit / loan / borrow / account / financial access):")
    if target_flags:
        for c in target_flags:
            nunique = df[c].nunique(dropna=True)
            null_pct = df[c].isnull().mean() * 100
            lines.append(f"  - {c}  (nunique={nunique}, null={null_pct:.1f}%)")
    else:
        lines.append("  (none found)")
    lines.append("")

    lines.append("PROTECTED candidates (gender / female / sex):")
    if protected_flags:
        for c in protected_flags:
            nunique = df[c].nunique(dropna=True)
            null_pct = df[c].isnull().mean() * 100
            lines.append(f"  - {c}  (nunique={nunique}, null={null_pct:.1f}%)")
    else:
        lines.append("  (none found)")
    lines.append("")

    lines.append("FEATURE candidates (income / education / age / urban / rural / employment):")
    if feature_flags:
        for c in feature_flags:
            nunique = df[c].nunique(dropna=True)
            null_pct = df[c].isnull().mean() * 100
            lines.append(f"  - {c}  (nunique={nunique}, null={null_pct:.1f}%)")
    else:
        lines.append("  (none found)")
    lines.append("")

    return lines, target_flags, protected_flags, feature_flags


def _col_stats(df, col):
    return df[col].isnull().mean() * 100, df[col].nunique(dropna=True)


def pick_target(candidates, df):
    if not candidates:
        return None, "No target-like column discovered in the data."
    priority = ["account", "loan", "borrow", "credit", "saved", "fin"]
    best, best_score, best_info = None, -float("inf"), None
    for c in candidates:
        name = c.lower()
        prio_score, matched_kw = -100, None
        for i, kw in enumerate(priority):
            if kw in name:
                prio_score = 100 - i * 10
                matched_kw = kw
                break
        null_pct, nunique = _col_stats(df, c)
        bin_bonus = 30 if nunique == 2 else 0
        score = prio_score + bin_bonus - null_pct
        if score > best_score:
            best, best_score, best_info = c, score, (matched_kw, nunique, null_pct)
    matched_kw, nunique, null_pct = best_info
    reason = (
        f"matched on '{matched_kw}' keyword, "
        f"binary indicator (nunique={nunique}), {null_pct:.1f}% nulls."
    )
    return best, reason


def pick_protected(candidates, df):
    if not candidates:
        return None, "No protected-like column discovered in the data."
    best, best_score, best_info = None, -float("inf"), None
    for c in candidates:
        null_pct, nunique = _col_stats(df, c)
        bin_bonus = 50 if nunique == 2 else 0
        score = bin_bonus - null_pct
        if score > best_score:
            best, best_score, best_info = c, score, (nunique, null_pct)
    nunique, null_pct = best_info
    reason = f"binary demographic attribute (nunique={nunique}), {null_pct:.1f}% nulls."
    return best, reason


def pick_features(candidates, df, target, protected, n=8):
    scored = []
    for c in candidates:
        if c == target or c == protected:
            continue
        null_pct, nunique = _col_stats(df, c)
        if null_pct > 50:
            continue
        variety_bonus = min(nunique, 10)
        score = variety_bonus * 2 - null_pct
        scored.append((c, nunique, null_pct, score))
    scored.sort(key=lambda x: (-x[3], x[0]))
    return [c for c, _, _, _ in scored[:n]]


def main():
    if not RAW_CSV.exists():
        ok = download()
        if not ok:
            sys.exit(0)
    else:
        print(f"Using existing {RAW_CSV}")

    print(f"\nReading {RAW_CSV} ...")
    df = None
    for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            df = pd.read_csv(RAW_CSV, low_memory=False, encoding=encoding)
            print(f"Read successfully with encoding: {encoding}")
            break
        except UnicodeDecodeError:
            continue
    if df is None:
        print_manual_instructions(error=f"Failed to read {RAW_CSV} with all tried encodings")
        sys.exit(0)

    print(f"Loaded {len(df):,} rows x {df.shape[1]} columns\n")

    npl = filter_nepal(df)
    if len(npl) == 0:
        print("ERROR: 0 Nepal rows found — aborting inventory.")
        sys.exit(0)

    lines, target_flags, protected_flags, feature_flags = build_inventory(npl)

    print("\n".join(lines))

    with open(INVENTORY_TXT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nInventory saved to {INVENTORY_TXT}")

    target, t_reason = pick_target(target_flags, npl)
    protected, p_reason = pick_protected(protected_flags, npl)
    features = pick_features(feature_flags, npl, target, protected, n=8)

    if len(features) < 6:
        used = {target, protected, *features}
        for c in npl.columns:
            if c in used:
                continue
            if npl[c].isnull().mean() * 100 > 50:
                continue
            features.append(c)
            used.add(c)
            if len(features) >= 6:
                break

    f_reason = (
        f"{len(features)} socioeconomic features with low null rates and "
        f"meaningful variance for model training."
    )

    print("\n=== RECOMMENDED COLUMNS ===")
    print(f"TARGET (outcome):     {target}")
    print(f"PROTECTED (fairness): {protected}")
    print(f"FEATURES:             {features}")
    print(
        f"Reasoning:            "
        f"TARGET — {t_reason} "
        f"PROTECTED — {p_reason} "
        f"FEATURES — {f_reason}"
    )


if __name__ == "__main__":
    main()
