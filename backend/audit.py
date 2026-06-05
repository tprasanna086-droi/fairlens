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
