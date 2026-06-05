# FairLens — Algorithmic Bias Auditor

FairLens is an open-source tool for auditing machine learning models for algorithmic bias. Upload any CSV dataset, choose your target and protected attribute columns, and get a full fairness audit across four industry-standard metrics.

## Live Demo
[Coming soon]

## Features
- Four fairness metrics: Demographic Parity, Disparate Impact, Equal Opportunity, Equalized Odds
- SHAP feature importance — see what drives the model's decisions
- Plain-English explanations for every metric
- Upload your own CSV or try the built-in India demo dataset (synthetic IHDS-II)

## Quick Start (local)

### Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload

### Frontend
cd frontend
npm install
npm run dev

Then open http://localhost:5173

## Built with
- Python 3.11, FastAPI, scikit-learn, SHAP
- React 18, Recharts, Tailwind CSS

## Research context
Built as part of research on algorithmic fairness in South Asian credit markets.

### References
- Hardt, M., Price, E., & Srebro, N. (2016). Equality of opportunity in supervised learning. NeurIPS.
- Chouldechova, A. (2017). Fair prediction with disparate impact. Big Data.
