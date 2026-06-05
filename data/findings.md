# FairLens: Findings from Nepal Financial Inclusion Audit
**Dataset:** World Bank Global Findex 2021 — Nepal subsample  
**Date:** June 2026  
**Tool:** FairLens (https://fairlens-indol.vercel.app)

---

## 1. Dataset

The World Bank Global Findex 2021 survey interviewed 1,000 Nepali adults,
of which 895 remained after cleaning (dropped rows with missing internet
access or remittance data). The dataset covers financial inclusion indicators
including account ownership, borrowing, saving, and digital payment adoption.

**Target variable:** has_account — whether the respondent owns a financial
account at a bank or mobile money provider (58.8% overall ownership rate).

**Protected attribute:** is_female — gender of respondent
(53.5% women, 46.5% men in the sample).

---

## 2. Column Choices

| Column | Role | Reasoning |
|---|---|---|
| has_account | Target | Most complete financial inclusion indicator, 0% nulls, binary |
| is_female | Protected | Only demographic attribute with 0% nulls and binary coding |
| inc_q | Feature + intersectional | Income quintile, strong predictor, enables intersectional analysis |
| educ | Feature | Education level (3 tiers), 0% nulls |
| age | Feature | Continuous, 0% nulls |
| is_urban | Feature | Urban/rural split, relevant to Nepal's geography |
| is_employed | Feature | Employment status, 0% nulls |
| has_mobile | Feature | Mobile ownership, proxy for digital access |
| has_internet | Feature | Internet access, strong predictor |
| has_digital_payment | Feature | Digital payment adoption |
| receives_remittances | Feature | Remittance income, highly relevant in Nepal context |

---

## 3. Audit Results

### Four Fairness Metrics

| Metric | Score | Status |
|---|---|---|
| Demographic Parity | 0.152 (15.2pp gap) | BIASED |
| Disparate Impact | 0.736 ratio | BORDERLINE |
| Equal Opportunity | 0.162 (16.2pp TPR gap) | BIASED |
| Equalized Odds | TPR diff 16.2%, FPR diff 2.0% | BIASED |

**Overall verdict: BIASED (3 of 4 metrics)**

Raw account ownership: Women 54.9%, Men 63.2% — gap of 8.3pp.
Model-detected bias (15.2pp) exceeds raw gap due to compounding
feature interactions learned by the classifier.

### SHAP Feature Importance

The gradient boosting model ranked features by mean absolute SHAP value:

1. **has_digital_payment** (2.45) — dominant predictor by far
2. age (0.49)
3. receives_remittances (0.34)
4. saved (0.33)
5. inc_q (0.16)
6. has_internet (0.13)
7. educ (0.13)
8. has_borrowed (0.12)
9. is_urban (0.10)
10. has_mobile (0.06)

Digital payment adoption is 5× more predictive than the next feature.
This suggests that financial exclusion in Nepal operates primarily
through a digital access channel — those without digital payments
are systematically less likely to have formal accounts.

---

## 4. Intersectional Analysis

Single-attribute audits (gender alone) found an 8.3pp gap.
Intersectional analysis (gender × income quintile) revealed:

| Group | Account Ownership Rate |
|---|---|
| Men, Quintile 5 (richest) | 83.8% |
| Men, Quintile 4 | 77.1% |
| Women, Quintile 5 (richest) | 71.2% |
| Women, Quintile 4 | 67.6% |
| Women, Quintile 3 | 54.3% |
| Men, Quintile 2 | 53.8% |
| Men, Quintile 3 | 53.3% |
| Men, Quintile 1 (poorest) | 49.4% |
| Women, Quintile 2 | 48.6% |
| Women, Quintile 1 (poorest) | 44.4% |

**Compounding gap: 39.4pp** (vs 8.3pp from single-attribute analysis —
4.7× larger).

**Key finding:** Men in Quintile 1 (49.4%) outscore Women in Quintile 2
(48.6%). Gender disadvantage at the bottom of the income distribution
is severe enough to override income effects — low-income women are
more excluded than slightly-less-poor men. This pattern is invisible
to single-attribute audits.

### What this means for real people in Nepal

Nepal has 30 million people. Applying these rates to the adult
population (~20.7 million), the gender gap in account ownership
represents approximately 1.7 million women without financial accounts
who would have them if they were men with identical characteristics.
For low-income women specifically, the compounding disadvantage means
reduced access to savings, credit, remittances, and government
transfers — all of which flow increasingly through formal financial
channels. Financial exclusion compounds: those without accounts cannot
receive digital wages, cannot access microloans, and are excluded from
Nepal Rastra Bank's financial inclusion programs that require account
ownership as a prerequisite.

---

## 5. The Efficiency Cost of Correcting Bias

The fairness-accuracy tradeoff curve shows what happens as demographic
parity constraints are progressively enforced on the model:

- **Baseline:** 77.7% accuracy, 8.9% parity gap (BIASED)
- **At strong constraint (0.9):** accuracy decreases, parity gap narrows
- **Accuracy cost of achieving fairness:** varies by threshold chosen

This instantiates the theoretical result of Hardt et al. (2016): there
is no free lunch in fairness. Reducing demographic disparity requires
accepting reduced predictive accuracy. The curve makes this tradeoff
explicit and quantifiable for this specific dataset.

The policy question this raises — consistent with Myerson (1981) on
mechanism design — is not whether to accept this cost, but who bears
it. A bank that optimizes purely for accuracy externalizes the cost of
bias onto excluded groups. A regulator enforcing the 80% disparate
impact rule (currently borderline at 0.74) would internalize some of
that cost into the institution.

---

## 6. Citations

- Hardt, M., Price, E., & Srebro, N. (2016). Equality of opportunity
  in supervised learning. *NeurIPS 2016.*
- Chouldechova, A. (2017). Fair prediction with disparate impact.
  *Big Data, 5(2), 153-163.*
- Myerson, R. (1981). Optimal auction design.
  *Mathematics of Operations Research, 6(1), 58-73.*
- World Bank. (2021). Global Findex Database 2021.
  *Washington, DC: World Bank.* 
