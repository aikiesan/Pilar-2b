# PILAR-2b — Month Round-up & Forward Plan

> Snapshot + plan written at the end of the DBFZ/FOSS4G travel month. Purpose:
> one place to see **what we did, what's merged vs. stranded, and what to do next**
> — tuned to the working cadence (≈2 Claude Code / Opus sessions per day, merge as
> we go) and to what the **GitHub cloud sandbox can and can't validate**.

_Last updated: 2026-06-29._

---

## 1. The month in review (what we did)

**Compliance / LGPD**
- Real bilingual Privacy & Terms pages; consent gate (opt-in by default, 403 without
  consent), versioned + timestamped consent; data-subject access/erasure endpoints.
- **CPF/CNPJ collection removed** (data minimisation) + erasure migration + guardrail tests.
- Compliance docs: ROPA, DPIA/RIPD, DPO intake, e-MAG/WCAG mapping, internal-auth LGPD record.

**Accessibility** — WCAG 2.1 **Level A** pass (labels, keyboard, reduced-motion, statement page).

**Security / auth** — replaced a fully-mocked auth (granted admin to *any* token) with real
VM-local JWT auth (bcrypt + PyJWT, RBAC + clearance tiers, lockout, token denylist);
security headers + PII log-sanitizer.

**Engineering quality** — round-2 code review + a "no-mock" test strategy; real
no-mock unit tests for validation/co-digestion; OGC test tiers (assembly/acceptance/CITE).

**Interoperability (experimental)** — additive GeoServer 3.0 layer + OGC compliance tests
(parked; see §3).

**Open-data analysis (all merged)** — five data docs: the API landscape, energy/logistics/
bioeconomy, and the three SP **dynamics** docs (energy price & time, waste flow, biomass
seasonality). Plus an IBGE/ANEEL integration scaffold (code on a branch).

---

## 2. Where things stand (merged vs. in-flight vs. stranded)

| State | Items |
|-------|-------|
| ✅ **On `main`** | Privacy/Terms + consent gate + DSR (#118); 5 open-data docs (#122–126); CPF/CNPJ removal + compliance guardrails (this batch). |
| 🟡 **Mergeable, small** | This round-up; future small compliance PRs split from #121. |
| 🔴 **Stranded in draft #121** | Security headers, **PII log-sanitizer**, full **WCAG-A** accessibility page, **real auth** rewrite — bundled with GeoServer + blocked by GitGuardian test-fixture false-positives. |
| 🧪 **Branch, needs VM** | IBGE/ANEEL integration clients (`claude/api-data-integrations`) — sandbox can't reach the APIs. |

> **Key finding:** a lot of *real* compliance/security value is **stuck in the giant
> draft #121** and therefore *not protecting `main`*. The single highest-leverage move is
> to **split #121 into small, single-purpose PRs** and land them. (The CPF/CNPJ fix was
> the first slice — it was live-collecting on `main` until now.)

---

## 3. What the GitHub sandbox can / can't validate (plan around this)

The cloud sessions run in a constrained environment. Knowing the edges keeps each session productive.

| ✅ Can do & validate here | ❌ Needs the VM / CI (author here, run there) |
|---------------------------|----------------------------------------------|
| Docs, planning, analysis | Live external APIs (egress policy blocks IBGE/ANEEL/…) |
| Pure-Python tests (file-scan, pure logic, FDE invariants) | Full `pytest` (no `geopandas`/`jwt`/`cryptography` here) |
| Source authoring (clients, refactors) that compiles | DB migrations / anything needing PostgreSQL |
| Static/guardrail checks, secret scans | Docker / GeoServer / OGC live stack |
| Git surgery (splitting #121 into PRs) | Frontend build / `tsc` / Jest (no `node_modules`) |

**Implication:** prefer **docs, guardrail tests, and code-authoring-with-CI-validation**;
treat anything needing DB/Docker/network/jwt as "author here → green on CI/VM".
The compliance guardrail suite is the template: pure file-scans that run anywhere.

---

## 4. Forward plan (prioritised backlog)

Tags: **[sbx]** validatable in the sandbox · **[ci]** needs CI/VM to verify ·
**[easy]** trivially mergeable · **[rev]** wants your review.

### P0 — Land the stranded compliance/security from #121 (one small PR each)
1. **Security headers** middleware + `next.config.js` headers. **[sbx]** add a guardrail test
   asserting the headers are configured. **[easy]**
2. **PII log-sanitizer** (redaction filter) wired in `main.py` + unit tests on the redactor
   (emails, coords, doc patterns). **[sbx]** **[easy]**
3. **WCAG-A accessibility page** (the real statement). **[ci]** (frontend) **[easy]** — also
   flips the skipped guardrail test green.
4. **Real auth** (bcrypt + PyJWT, RBAC + clearance, denylist) + its rewritten tests. **[ci]**
   **[rev]** — biggest; do after 1–3. Resolve the GitGuardian test-fixture FPs on the dashboard.

### P1 — Compliance / UNICAMP / responsible-AI hardening
5. Extend the **guardrail suite** as each P0 item lands (headers present, sanitizer wired,
   accessibility WCAG tokens). **[sbx]**
6. **UNICAMP best-practices checklist** doc (institutional hosting, data governance, license
   GPL-3.0, accessibility e-MAG, DPO sign-off path). **[sbx]** **[easy]**
7. **Responsible-AI / governance note** (see §5). **[sbx]** **[easy]**
8. Retention TTL on `calculator_leads` + deactivated accounts (LGPD storage limitation). **[ci]**

### P2 — Dynamics & data integrations (the static→dynamic shift)
9. **Temporal data model spec** — how to store the time-series (hourly PLD, crush curve,
   waste flows) and surface them as profile-panel charts. **[sbx]** doc + schema.
10. **IBGE SIDRA + Malhas clients** finished & **run on the VM** → refresh
    `municipality_biomass_tons.csv` from live data into the existing forward engine. **[ci]**
11. **ANEEL SIGA / ANP** clients → validate `biogas_plants` + demand layer. **[ci]**

### P3 — Map UX & interoperability (from the FOSS4G roadmap)
12. Map **display tiers** (biomass → CH₄ → biogas → biomethane cascade). **[ci]**
13. **pygeoapi spike** (lighter than GeoServer; same Python stack) for OGC API – Features. **[ci]**
14. Decide GeoServer/OGC (#121 part C): keep parked or adopt pygeoapi instead.

---

## 5. UNICAMP best-practices & responsible-AI checklist

**LGPD (keep green):** opt-in consent ✓ · data minimisation (CPF/CNPJ removed) ✓ · DSR
endpoints ✓ · versioned consent ✓ · PII log redaction (P0-2) · retention TTL (P1-8) ·
ROPA/DPIA maintained · DPO sign-off (institutional).

**UNICAMP / institutional:** data stays on the UNICAMP VM behind the proxy (no third-party
processors) ✓ · GPL-3.0 + citation/DOI ✓ · accessibility to e-MAG/LBI 13.146 (WCAG-A done,
AA next) · security headers + TLS at the edge.

**Responsible AI / methodology transparency:** the platform is a **deterministic model**
(FDE forward engine), *not* ML profiling — **no automated decisions about individuals**
(LGPD Art. 20 N/A by design) · single source of truth for parameters (`feedstocks.yaml`) ·
every parameter cited (traceability matrix) · AI-assisted development is disclosed in commit
trailers. Add a short `RESPONSIBLE_AI.md` stating: model assumptions & limits, human
oversight, reproducibility, data provenance, and "no personal-data profiling."

---

## 6. Session playbook (≈2 sessions/day, merge as you go)

Each session is short and self-contained:
1. **Pick one P0/P1 item** (prefer **[sbx][easy]** first — they merge same-day).
2. Author the change **+ a guardrail/pure test** that proves it (the suite is the safety net).
3. Push a **single-purpose branch**, open a focused PR, **merge** once CI is green.
4. For **[ci]** items: author here, let CI/VM validate; don't block the session waiting.
5. **GitGuardian:** test-fixture passwords (`Password123`, etc.) are false-positives →
   dismiss on the dashboard; never commit real secrets (the guardrail test enforces it).

**Suggested 7-day sequence (~14 sessions):**
- Day 1–2: P0-1 (headers) + P0-2 (log-sanitizer) — both **[sbx][easy]**, merge fast.
- Day 3: P0-3 (WCAG-A page) → guardrail flips green.
- Day 4–5: P0-4 (auth) split + tests; resolve GitGuardian; merge after CI.
- Day 6: P1-6 (UNICAMP checklist) + P1-7 (RESPONSIBLE_AI.md).
- Day 7: P2-9 (temporal data model spec); queue P2-10/11 for the VM on return.

---

## 7. PR ledger (live)

| PR / branch | What | Action |
|-------------|------|--------|
| #122–126 | Open-data + dynamics docs | ✅ merged |
| `claude/lgpd-data-minimization` | CPF/CNPJ removal + guardrail tests | review & merge |
| `claude/compliance-roadmap` | this doc | review & merge |
| #121 (`…dbfz…`) | compliance + auth + GeoServer | **split into P0 PRs**, then close |
| `claude/api-data-integrations` | IBGE/ANEEL clients | finish + run on VM |

> Keep this file current — it's the working plan. Tick items as they merge.
