import io
import uuid
from pathlib import Path
from typing import Dict, List

import pandas as pd
from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from audit import run_full_audit


app = FastAPI(title="FairLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024

file_columns: Dict[str, List[str]] = {}


def _error(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": message})


def _build_response(audit_result: dict) -> dict:
    metrics = audit_result["metrics"]
    dp = metrics["demographic_parity"]
    di = metrics["disparate_impact"]
    eo = metrics["equal_opportunity"]
    eoo = metrics["equalized_odds"]

    dp_threshold_word = "within" if dp["status"] == "fair" else "outside"
    dp_plain = (
        f"Group 1 is approved at {dp['group_1_rate']:.1%} vs "
        f"{dp['group_0_rate']:.1%} for Group 0. "
        f"The gap of {dp['score']:.1%} is {dp_threshold_word} the fair threshold of 5%."
    )
    di_plain = (
        f"The minority group is approved at {di['ratio']:.2f}x the rate of the majority group. "
        f"The legal threshold is 0.8x (80% rule)."
    )
    eo_plain = (
        f"Among qualified applicants, Group 1 has a {eo['tpr_group_1']:.1%} approval rate vs "
        f"{eo['tpr_group_0']:.1%} for Group 0. "
        f"True positive rate gap: {eo['score']:.1%}."
    )
    eoo_plain = (
        f"TPR difference: {eoo['tpr_diff']:.1%}, FPR difference: {eoo['fpr_diff']:.1%}. "
        f"Both must be near zero for equalized odds."
    )

    statuses = [dp["status"], di["status"], eo["status"], eoo["status"]]
    if "biased" in statuses:
        overall = "biased"
    elif "borderline" in statuses:
        overall = "borderline"
    else:
        overall = "fair"

    num_biased = sum(1 for s in statuses if s == "biased")

    shap_list = audit_result.get("shap_values", []) or []
    most_biased_feature = shap_list[0]["feature"] if shap_list else ""

    return {
        "metrics": {
            "demographic_parity": {
                "score": dp["score"],
                "group_0_rate": dp["group_0_rate"],
                "group_1_rate": dp["group_1_rate"],
                "status": dp["status"],
                "plain_english": dp_plain,
            },
            "disparate_impact": {
                "ratio": di["ratio"],
                "status": di["status"],
                "plain_english": di_plain,
            },
            "equal_opportunity": {
                "score": eo["score"],
                "tpr_group_0": eo["tpr_group_0"],
                "tpr_group_1": eo["tpr_group_1"],
                "status": eo["status"],
                "plain_english": eo_plain,
            },
            "equalized_odds": {
                "tpr_diff": eoo["tpr_diff"],
                "fpr_diff": eoo["fpr_diff"],
                "status": eoo["status"],
                "plain_english": eoo_plain,
            },
        },
        "shap": shap_list,
        "conflict": audit_result.get("conflicts", {"has_conflict": False, "message": ""}),
        "summary": {
            "overall_status": overall,
            "num_biased_metrics": num_biased,
            "most_biased_feature": most_biased_feature,
        },
    }


def _read_csv(contents: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise ValueError(f"Malformed CSV: {e}")


@app.post("/audit")
async def audit(
    file: UploadFile = File(...),
    target_col: str = Form(...),
    protected_col: str = Form(...),
):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        return _error("File too large; maximum size is 10MB.", status_code=400)

    try:
        df = _read_csv(contents)
    except ValueError as e:
        return _error(str(e), status_code=400)

    if target_col not in df.columns:
        return _error(f"Target column '{target_col}' not found in CSV.", status_code=400)
    if protected_col not in df.columns:
        return _error(f"Protected column '{protected_col}' not found in CSV.", status_code=400)

    file_id = str(uuid.uuid4())
    file_columns[file_id] = df.columns.tolist()

    try:
        audit_result = run_full_audit(df, target_col=target_col, protected_col=protected_col)
    except Exception as e:
        return _error(f"Audit failed: {e}", status_code=400)

    response = _build_response(audit_result)
    response["file_id"] = file_id
    return response


@app.get("/demo")
async def demo():
    csv_path = Path(__file__).parent / "demo_dataset.csv"
    if not csv_path.exists():
        return _error(f"Demo dataset not found at {csv_path}", status_code=500)

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        return _error(f"Failed to load demo dataset: {e}", status_code=500)

    try:
        audit_result = run_full_audit(df, target_col="loan_approved", protected_col="gender")
    except Exception as e:
        return _error(f"Demo audit failed: {e}", status_code=500)

    return _build_response(audit_result)


@app.get("/columns")
async def columns(file_id: str = Query(...)):
    if file_id not in file_columns:
        return _error(f"file_id '{file_id}' not found.", status_code=404)
    return {"columns": file_columns[file_id]}


@app.get("/health")
async def health():
    return {"status": "ok"}
