import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import shap
from typing import Dict, List, Tuple, Any

RANDOM_STATE = 42


def _classify(diff: float) -> str:
    """Classify a disparity score into fair/borderline/biased."""
    if diff < 0.05:
        return 'fair'
    if diff < 0.10:
        return 'borderline'
    return 'biased'


def load_and_prepare(df: pd.DataFrame, target_col: str, protected_col: str) -> Tuple[pd.DataFrame, pd.Series, np.ndarray]:
    """Split features/target, label-encode categoricals. Returns X, y, protected."""
    df = df.copy()
    protected = df[protected_col].values
    y = df[target_col].astype(int)
    X = df.drop(columns=[target_col, protected_col])
    for col in X.select_dtypes(include=['object', 'category']).columns:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))
    for col in X.columns:
        if str(X[col].dtype) in {"Int64", "Int32", "Int8", "UInt64", "UInt32", "UInt8"}:
            X[col] = X[col].astype(float)
    return X, y, protected


def train_model(X: pd.DataFrame, y: pd.Series) -> Tuple[GradientBoostingClassifier, pd.DataFrame, pd.Series, np.ndarray, np.ndarray]:
    """Train GradientBoostingClassifier. Returns (model, X_test, y_test, y_pred, test_index)."""
    X_train, X_test, y_train, y_test, train_idx, test_idx = train_test_split(
        X, y, np.arange(len(X)), test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )
    model = GradientBoostingClassifier(random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    return model, X_test, y_test, y_pred, test_idx


def compute_demographic_parity(y_pred: np.ndarray, protected: np.ndarray) -> Dict[str, Any]:
    """Approval-rate gap between protected groups."""
    g0 = y_pred[protected == 0].mean()
    g1 = y_pred[protected == 1].mean()
    score = abs(g0 - g1)
    return {'score': float(score), 'group_0_rate': float(g0), 'group_1_rate': float(g1), 'status': _classify(score)}


def compute_disparate_impact(y_pred: np.ndarray, protected: np.ndarray) -> Dict[str, Any]:
    """Ratio of approval rates between privileged and unprivileged group."""
    g0 = y_pred[protected == 0].mean()
    g1 = y_pred[protected == 1].mean()
    if g0 == 0:
        ratio = 0.0
    else:
        ratio = g1 / g0
    if ratio >= 0.8:
        status = 'fair'
    elif ratio >= 0.6:
        status = 'borderline'
    else:
        status = 'biased'
    return {'ratio': float(ratio), 'status': status}


def compute_equal_opportunity(y_pred: np.ndarray, y_true: np.ndarray, protected: np.ndarray) -> Dict[str, Any]:
    """TPR difference between groups among true positives."""
    tpr0 = y_pred[(y_true == 1) & (protected == 0)].mean() if (y_true == 1).any() else 0.0
    tpr1 = y_pred[(y_true == 1) & (protected == 1)].mean() if (y_true == 1).any() else 0.0
    score = abs(tpr0 - tpr1)
    return {'score': float(score), 'tpr_group_0': float(tpr0), 'tpr_group_1': float(tpr1), 'status': _classify(score)}


def compute_equalized_odds(y_pred: np.ndarray, y_true: np.ndarray, protected: np.ndarray) -> Dict[str, Any]:
    """Max of TPR and FPR differences between groups."""
    tpr0 = y_pred[(y_true == 1) & (protected == 0)].mean()
    tpr1 = y_pred[(y_true == 1) & (protected == 1)].mean()
    fpr0 = 1 - y_pred[(y_true == 0) & (protected == 0)].mean()
    fpr1 = 1 - y_pred[(y_true == 0) & (protected == 1)].mean()
    tpr_diff = abs(tpr0 - tpr1)
    fpr_diff = abs(fpr0 - fpr1)
    worst = max(tpr_diff, fpr_diff)
    return {'tpr_diff': float(tpr_diff), 'fpr_diff': float(fpr_diff), 'status': _classify(worst)}


def compute_shap_values(model: GradientBoostingClassifier, X: pd.DataFrame) -> List[Dict[str, Any]]:
    """Top 10 features by mean absolute SHAP value."""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    mean_abs = np.abs(shap_values).mean(axis=0)
    feature_names = X.columns.tolist()
    pairs = sorted(zip(feature_names, mean_abs), key=lambda kv: kv[1], reverse=True)[:10]
    return [{'feature': f, 'mean_abs_shap': float(v)} for f, v in pairs]


def detect_conflicts(dp_result: Dict, di_result: Dict, eo_result: Dict, eoo_result: Dict) -> Dict[str, Any]:
    """Detect when one metric is 'fair' while another is 'biased'."""
    statuses = [dp_result['status'], di_result['status'], eo_result['status'], eoo_result['status']]
    has_fair = 'fair' in statuses
    has_biased = 'biased' in statuses
    has_conflict = has_fair and has_biased
    if has_conflict:
        message = 'CONFLICT: Metrics disagree — some pass fairness thresholds while others fail badly.'
    else:
        message = 'No conflict: all metrics agree on overall fairness verdict.'
    return {'has_conflict': has_conflict, 'message': message}


def run_full_audit(df: pd.DataFrame, target_col: str, protected_col: str) -> Dict[str, Any]:
    """Orchestrate the complete FairLens audit pipeline."""
    X, y, protected_all = load_and_prepare(df, target_col, protected_col)
    model, X_test, y_test, y_pred, test_idx = train_model(X, y)
    protected_test = protected_all[test_idx]
    dp = compute_demographic_parity(y_pred, protected_test)
    di = compute_disparate_impact(y_pred, protected_test)
    eo = compute_equal_opportunity(y_pred, y_test.values, protected_test)
    eoo = compute_equalized_odds(y_pred, y_test.values, protected_test)
    shap_list = compute_shap_values(model, X_test)
    conflicts = detect_conflicts(dp, di, eo, eoo)
    return {
        'target': target_col,
        'protected': protected_col,
        'n_samples': int(len(df)),
        'n_test': int(len(y_test)),
        'model': 'GradientBoostingClassifier',
        'metrics': {
            'demographic_parity': dp,
            'disparate_impact': di,
            'equal_opportunity': eo,
            'equalized_odds': eoo,
        },
        'shap_values': shap_list,
        'conflicts': conflicts,
    }


def _value_label(col: str, val) -> str:
    """Map a (column, value) pair to a human-readable label."""
    if col == 'is_female':
        return 'Women' if val == 1 else 'Men'
    if col == 'inc_q':
        mapping = {
            1: 'Quintile 1 (poorest)',
            2: 'Quintile 2',
            3: 'Quintile 3',
            4: 'Quintile 4',
            5: 'Quintile 5 (richest)',
        }
        try:
            return mapping.get(int(val), f'Quintile {val}')
        except (ValueError, TypeError):
            return f'Quintile {val}'
    if col == 'is_urban':
        return 'Urban' if val == 1 else 'Rural'
    return f'{col}={val}'


def compute_intersectional_analysis(
    df: pd.DataFrame, target_col: str, protected_cols: List[str]
) -> Dict[str, Any]:
    """Compute approval rates for every combination of protected attributes."""
    missing = [c for c in protected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Protected columns not in DataFrame: {missing}")
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not in DataFrame.")

    grouped = (
        df.groupby(protected_cols)
        .agg(approval_rate=(target_col, 'mean'), n=(target_col, 'count'))
        .reset_index()
    )
    grouped = grouped[grouped['n'] >= 10].copy()

    if grouped.empty:
        return {
            'groups': [],
            'most_disadvantaged': None,
            'least_disadvantaged': None,
            'max_gap': 0.0,
            'intersectional_insight': 'No groups with n >= 10 were found.',
        }

    def _label(row) -> str:
        return ', '.join(_value_label(col, row[col]) for col in protected_cols)

    def _values(row) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for col in protected_cols:
            v = row[col]
            if pd.isna(v):
                out[col] = None
            else:
                try:
                    out[col] = int(v)
                except (ValueError, TypeError):
                    try:
                        out[col] = float(v)
                    except (ValueError, TypeError):
                        out[col] = str(v)
        return out

    grouped['label'] = grouped.apply(_label, axis=1)
    grouped = grouped.sort_values('approval_rate', ascending=True).reset_index(drop=True)
    best = float(grouped['approval_rate'].max())
    grouped['deviation_from_best'] = grouped['approval_rate'] - best

    groups = []
    for _, row in grouped.iterrows():
        groups.append({
            'label': row['label'],
            'values': _values(row),
            'approval_rate': float(row['approval_rate']),
            'n': int(row['n']),
            'deviation_from_best': float(row['deviation_from_best']),
        })

    most = groups[0]['label']
    least = groups[-1]['label']
    max_gap = float(groups[-1]['approval_rate'] - groups[0]['approval_rate'])
    gap_pp = max_gap * 100

    insight = (
        f"The gap between the most and least advantaged group is {gap_pp:.1f} pp. "
        f"Low-income women face compounding disadvantage beyond what either "
        f"gender or income analysis alone would reveal."
    )

    return {
        'groups': groups,
        'most_disadvantaged': most,
        'least_disadvantaged': least,
        'max_gap': max_gap,
        'intersectional_insight': insight,
    }
