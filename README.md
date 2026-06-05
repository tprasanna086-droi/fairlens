# FairLens — Algorithmic Bias Auditor

**Live demo:** https://fairlens-indol.vercel.app

FairLens audits machine learning models for algorithmic bias. Upload any
CSV dataset, select an outcome column and a protected attribute, and receive
a complete fairness audit in seconds.

---

## What it does

FairLens trains a gradient boosting classifier on your data, then computes
four industry-standard fairness metrics from scratch:

- **Demographic Parity** — are approval rates equal across groups?
- **Disparate Impact** — does the minority group receive 80%+ of majority outcomes?
- **Equal Opportunity** — are true positive rates equal for qualified applicants?
- **Equalized Odds** — are both TPR and FPR equal across groups?

It also runs SHAP analysis to explain which features drive the model's
decisions, detects conflicts between metrics (grounded in Chouldechova's
2017 impossibility theorem), and provides plain-English explanations for
every result.

### Beyond single-attribute analysis

FairLens includes **intersectional analysis** — auditing multiple protected
attributes simultaneously. On the Nepal demo data, single-attribute gender
analysis found an 8.3pp gap. Intersectional analysis (gender × income)
revealed a 39.4pp gap — 4.7× larger.

### The fairness-accuracy tradeoff

An interactive curve shows what happens to model accuracy as fairness
constraints are enforced — making the central tension of the field
visible and quantifiable on real data.

---

## Real findings: Nepal Financial Inclusion (2026)

Audited on World Bank Global Findex 2021 data — 895 Nepali adults.

| Metric | Score | Status |
|---|---|---|
| Demographic Parity | 15.2pp gap | BIASED |
| Disparate Impact | 0.74 ratio | BORDERLINE |
| Equal Opportunity | 16.2pp TPR gap | BIASED |
| Equalized Odds | 16.2% / 2.0% | BIASED |

**Key finding:** Women in the poorest income quintile have 44.4% account
ownership vs 83.8% for men in the richest quintile — a 39.4pp compounding
gap invisible to single-attribute audits.

Most predictive feature: digital payment adoption (SHAP: 2.45), suggesting
financial exclusion in Nepal operates primarily through a digital access
channel.

Full findings: [data/findings.md](data/findings.md)

---

## Stack

- **Backend:** Python 3.11 + FastAPI + scikit-learn + XGBoost + SHAP
- **Frontend:** React 18 + Recharts + Tailwind CSS
- **Deployment:** Frontend → Vercel, Backend → Render
- **Data:** World Bank Global Findex 2021 (Nepal subsample)

---

## Run locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Use your own data

Upload any CSV with:
- A binary outcome column (0/1)
- A binary protected attribute column (0/1)

FairLens will train a model and audit it for all four fairness metrics.

---

## Citations

- Hardt, M., Price, E., & Srebro, N. (2016). Equality of opportunity in supervised learning. *NeurIPS 2016.*
- Chouldechova, A. (2017). Fair prediction with disparate impact. *Big Data, 5(2), 153–163.*
- Myerson, R. (1981). Optimal auction design. *Mathematics of Operations Research, 6(1), 58–73.*
- World Bank. (2021). Global Findex Database 2021.

---

*Built as part of research on algorithmic fairness in South Asian financial inclusion markets.* 

---

## Research Context

This project began with a question: do the algorithmic systems increasingly
used in South Asian financial services encode the same inequalities present
in the societies they operate in?

To answer it concretely, I needed three things — a real dataset, a rigorous
measurement framework, and a way to make the findings accessible beyond
academic papers. FairLens is the result.

The dataset choice was deliberate. Nepal sits at an interesting intersection:
rapidly expanding digital financial infrastructure (mobile money, digital
wallets) layered over deep structural inequalities in gender and income.
The World Bank Findex 2021 survey captures this moment. The finding that
digital payment adoption is 5× more predictive of financial account ownership
than any other feature suggests that Nepal's financial inclusion gap is
increasingly a digital access gap — a more actionable and specific claim
than "gender bias exists."

The intersectional analysis was technically motivated but substantively
important. Standard fairness audits treat protected attributes one at a
time. But the experience of a low-income woman in rural Nepal is not
the sum of being low-income + being a woman + being rural. The 39.4pp
gap revealed by intersectional analysis versus the 8.3pp gap from
gender-only analysis is not a methodological curiosity — it represents
a real difference in how policy interventions should be targeted.

The fairness-accuracy tradeoff curve addresses the question I kept
returning to: what does it cost to fix this? Hardt et al. (2016)
proved theoretically that you cannot simultaneously satisfy demographic
parity and equal opportunity when base rates differ across groups.
FairLens makes that proof empirical and specific — here is the curve,
here is the cost, here is where the threshold sits for this dataset.
That turns an abstract impossibility result into a concrete policy input.

The technical implementation — computing all four metrics from scratch
using numpy rather than wrapping fairlearn, verifying against fairlearn
as a sanity check, building SHAP analysis on top — was a choice about
understanding. I wanted to know exactly what these numbers mean and
where they come from, not just what a library returns.

## What I would do next

The most important extension is causal, not predictive. The current
model identifies correlation between features and outcomes but cannot
distinguish between a model that is biased because it uses gender
directly versus one that is biased because it uses features (like
digital payment access) that are themselves products of historical
discrimination. Separating these requires causal inference methods —
specifically, auditing for proxy discrimination using Pearl's do-calculus
framework. That is the next methodological step.

The second extension is longitudinal. The Findex runs every three years.
Running FairLens on 2014, 2017, and 2021 Nepal data would show whether
the financial inclusion gap is narrowing, stable, or widening — and
whether the feature importance structure is changing as digital
infrastructure expands. 
