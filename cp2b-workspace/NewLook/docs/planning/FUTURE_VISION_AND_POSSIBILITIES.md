# PILAR-2b / CP2B Maps — Future Vision & Full Possibility Map

> **Internal strategy document — NIPE/UNICAMP CP2B.** A wide-ranging (deliberately expansive)
> exploration of where the platform can go: new capabilities, audience-specific products, a
> connected "ecosystem of tools," the feasibility of full Brazilian coverage, and a sequenced
> roadmap. Every idea stays tethered to the **root**: *spatial intelligence linking biomass
> residues → energy/bioproduct potential → siting & decisions, with scientific traceability.*
>
> Companion docs: `PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md`,
> `DEVELOPMENT_ROADMAP_APR_AUG_2026.md`, `data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md`.

## North Star
> *"One open, scientifically-traceable spatial platform that turns Brazil's residual biomass into
> actionable energy, bioproduct, and policy decisions — usable by a student, a mayor, an investor,
> and a researcher alike."*

**Strategic model — hub & satellites:** keep PILAR-2b as the **data + methodology spine**, expose it
via a **public API**, and let specialized tools (some embedded, some standalone) plug into that spine.
That's how the platform "serves everyone" without becoming one bloated app — and the shared canonical
parameters mean *a number means the same thing everywhere* (single-source-of-truth scaled to a product
family). This consistency + traceability across an ecosystem is the strategic moat.

**Legend** — Effort: **S** ≤2 wk · **M** 1–2 mo · **L** 3–6 mo · **XL** 6 mo+ · 🧱 needs a dependency
first. Difficulty ★1–5. Novelty: 🟢 common · 🟡 differentiated · 🔴 genuinely novel.

---

## 1. Geographic & Data Scale

| Idea | Problem solved | Audience | Effort | Diff | Prior art / Novelty |
|---|---|---|---|---|---|
| National @ 133 intermediate regions | SP-only limits national relevance | Gov, researchers | M (scaffold exists) | ★★ | DBFZ (DE), NREL Atlas (US) · 🟡 first open tropical |
| National @ 5,570 municipalities | Municipal decisions nationwide | All | XL 🧱 | ★★★★ | CIBiogás national but coarse · 🟡 |
| Temporal layer (annual back-series + trends) | Static maps hide dynamics | Researchers, gov | L | ★★★ | DBFZ Monitor does this · 🟡 |
| Near-real-time feeds (ANP monthly, MapBiomas annual) | Data goes stale; validation needs current | Enterprises, gov | M | ★★★ | Rare · 🔴 |
| LATAM expansion (AR, CO, MX) | Regional bioenergy hub positioning | Gov, intl | XL | ★★★★ | None integrated · 🔴 |

## 2. Scientific / Methodology Depth

| Idea | Problem solved | Audience | Effort | Diff | Prior art / Novelty |
|---|---|---|---|---|---|
| Integrated LCA / GHG balance per residue & route | "Is it actually low-carbon?" unanswered | Researchers, gov, ESG | L | ★★★★ | GREET (Argonne), RenovaBio · spatialized = 🔴 |
| Techno-economic engine (CAPEX/OPEX/LCOE per site) | Potential ≠ viability | Investors, consultants | L | ★★★ | GEF Biogás Invest, EU tools · 🟡 |
| MCDA siting optimizer (weighted multi-criteria) | Current = screening only | All decision-makers | L 🧱 | ★★★★ | GIS-MCDA academic · productized 🟡 |
| Supply-chain / logistics optimizer (catchment, transport cost, roads) | Logistics decide projects | Enterprises | L | ★★★★ | S2BIOM (EU) · 🟡 |
| ML BMP/yield prediction from feedstock chemistry | Lab BMP slow/expensive | Researchers | M | ★★★ | Academic ML-BMP · 🟡 |
| Realized-vs-potential validation engine (ANP/ANEEL gap) | Everyone maps potential; nobody tracks realization | Gov, researchers | M | ★★★ | Almost nobody · 🔴 key edge |
| Uncertainty / Monte-Carlo over FDE | Bands are deterministic | Researchers | M | ★★★ | 🟡 |

## 3. Decision & Optimization Tools (the "do something" layer)

| Idea | Problem solved | Audience | Effort | Diff | Novelty |
|---|---|---|---|---|---|
| Plant feasibility wizard → auto PDF report | Pros redo the same study by hand | Consultants, farmers, SMEs | M | ★★ | 🟡 |
| Co-digestion recipe optimizer (C:N + BMP synergy + inhibitors) | Current is spatial-only | Engineers, plants | L | ★★★★ | 🔴 spatial+chemical |
| Offtake / matchmaking marketplace (suppliers ↔ plants ↔ buyers) | Market fragmented, opaque | Enterprises, cooperatives | L | ★★★★ | None for BR biomass · 🔴 |
| Policy / auction simulator (RenovaBio, gas auctions, subsidies) | Gov can't see policy effects spatially | Governments | L | ★★★★ | 🔴 |
| Carbon-credit / MRV estimator (CBIO, methane avoidance) | Credits need spatial baselines | Enterprises, gov | L | ★★★★ | Verra/RenovaBio manual · 🟡 |

## 4. Data & Interoperability (the spine that enables everyone else)

| Idea | Problem solved | Audience | Effort | Diff | Novelty |
|---|---|---|---|---|---|
| Public REST/GraphQL API + API keys | Tool is a walled garden | Developers, researchers | M | ★★★ | DBFZ has GraphQL · 🟢 |
| Open-data portal + Zenodo DOIs per dataset | No citable, versioned downloads | Researchers | M | ★★ | DBFZ/Zenodo · 🟢 |
| QGIS plugin + GeoServer/OGC (WMS/WFS) | GIS pros want it in their stack | Professionals, gov | M | ★★★ | 🟡 |
| Google Earth Engine app / dataset | Reach global RS community | Researchers | M | ★★★ | 🟡 |
| INDE / IDE-SP integration | Gov interoperability mandate | Governments | M | ★★ | 🟡 |

## 5. AI / LLM Layer ("Bagacinho 2.0")

| Idea | Problem solved | Audience | Effort | Diff | Novelty |
|---|---|---|---|---|---|
| Natural-language query ("biogas potential of swine in Toledo?") | GIS learning curve | Students, gov, public | M | ★★★ | 🟡 |
| Auto-generated feasibility/policy reports (LLM over data) | Reports take days | Consultants, gov | M | ★★★ | 🟡 |
| RAG assistant over the reference corpus | Methodology opaque to newcomers | Students, researchers | M | ★★ | V2 had RAG · 🟢 |
| Document-extraction agent (permits/ANP/CETESB → structured data) | Manual data entry | Data team, gov | L | ★★★★ | 🔴 |

## 6. Audience-Specific Products (same spine, different doors)

| Audience | Tailored tool | Why it lands |
|---|---|---|
| Students | "Learn mode" + gamified calculator + course modules | Education + recruitment funnel |
| Researchers | Reproducible notebooks, benchmark datasets, sandbox, DOIs | Citations + collaborations (e.g. DBFZ) |
| Professionals/consultants | Feasibility-report generator, white-label, API | Revenue / sustainability path |
| Enterprises/investors | Site-prospecting + market intelligence + due-diligence | Where the money is |
| Cooperatives/farmers | Simple "what's my residue worth?" mobile calc + cluster finder | Inclusion, real impact |
| Governments/public servants | Policy dashboards, permitting support, subsidy targeting, regional plans | Public mandate, funding |

## 7. Beyond Biogas — Multi-Energy Expansion

| Idea | Note |
|---|---|
| Biomethane → SAF / green H₂ / green ammonia siting | Same residues, hot markets (Raízen/Yara already in your data) · 🔴 |
| Biochar / pyrolysis & material-use (biorefinery products) | Integrated material use = DBFZ framing · 🟡 |
| Co-siting with solar/wind (hybrid renewable hubs) | Multi-source planning · 🟡 |
| Water–Energy–Food nexus layer | Vinasse/water, digestate→fertilizer loops · 🔴 |
| Circular-economy / digestate marketplace | Closes the loop, agronomic value · 🟡 |

---

## 8. Is full Brazilian coverage *actually* possible? — honest feasibility

**Short answer: yes, and the path is already started.** The 133-intermediate-region layer is the
proof-of-concept; the national input data exists.

| Stage | Feasibility | Why | Timeline |
|---|---|---|---|
| National @ 133 regions | ✅ High | Already live; distances pre-computed; CONAB/IBGE national | ~now–3 mo |
| National @ 5,570 municipalities | ✅ Med-high | IBGE PAM/PPM, MapBiomas, ANP/ANEEL all national; a data-volume + validation problem, not a method problem | 9–18 mo |
| Real-time national | ⚠️ Medium | Feeds exist (ANP monthly, MapBiomas annual) but pipelines + storage scale | 12–24 mo |

**Real constraints (not the method):** (1) data heterogeneity / disclosure suppression; (2)
validation at scale — the ANP/ANEEL realized-vs-potential layer must grow nationally; (3)
compute/storage — raster ops on national MapBiomas are the cost driver; (4) maintenance/funding — a
national tool needs a sustainability model (grant → gov contract → freemium API).

**Verdict:** full national municipal coverage is a **when, not if** — gated by data-engineering
effort and a funding model, not by scientific impossibility. The FDE method is geography-agnostic;
only the inputs change.

---

## 9. Ecosystem of connected tools (separate-but-rooted)

**PILAR-2b Core** (data + FDE engine + API) at the center, with satellites sharing the spine:
- **PILAR-Edu** — teaching/student app (lightweight, gamified).
- **PILAR-Invest** — techno-economic + site-prospecting for enterprises.
- **PILAR-Gov** — policy/auction/subsidy dashboards + permitting.
- **PILAR-Field** — mobile farmer/cooperative calculator (offline-friendly).
- **PILAR-Carbon** — MRV / carbon-credit baselines.
- **Bagacinho** — AI concierge fronting all of them.

All read the **same canonical parameters + API** → consistency and traceability across the whole family.

---

## 10. Prioritized Roadmap (sequenced, with rationale)

**Horizon 1 — Consolidate & open (0–6 mo): "make the spine solid & public"**
1. National @ 133 regions + remove SP gating — unlocks everything; low effort, high signal.
2. Public API + Zenodo DOIs — prerequisite for every satellite and for collaborations (DBFZ).
3. Wire ANP/ANEEL validation into the live map — the unique realized-vs-potential edge; data assembled.
4. Plant feasibility wizard + PDF report — immediate value to pros/farmers; recruits users.

**Horizon 2 — Decide & quantify (6–18 mo): "from maps to decisions"**
5. Techno-economic engine + MCDA siting optimizer — potential → investment cases.
6. LCA/GHG + carbon-credit estimator — ESG/RenovaBio relevance; funding magnet.
7. National @ municipalities — the headline national tool.
8. Bagacinho 2.0 (NL query + report gen) — serves students/gov/public; differentiator.

**Horizon 3 — Widen & sustain (18 mo+): "platform → ecosystem"**
9. PILAR-Gov / PILAR-Invest / PILAR-Field satellite apps.
10. Multi-energy (SAF/H₂/biochar) + offtake marketplace.
11. LATAM expansion; sustainability/business model (gov contracts, freemium API).

---

## 11. Moonshots (go-wild tier) 🔴
- **National "biogas realization gap" index** — a public KPI: potential vs authorized vs produced per
  region. Nobody publishes this; policy-defining and uniquely enabled by your ANP/ANEEL data.
- **Digital twin of Brazil's biomethane fleet** — live plant telemetry + predicted potential.
- **Auto-prospecting agent** — given a budget + offtake, returns ranked buildable sites with PDFs.
- **"Residue-to-anything" pathway explorer** — pick a residue, see all valorization routes ranked.
- **Open global tropical biomass atlas** — extend the method to all tropical agriculture (the
  Global-South gap DBFZ doesn't fill).

---

## 12. Risks to plan around
- **Maintenance/funding cliff** after grants → needs a sustainability model early.
- **Data-licensing** — some feeds restrict redistribution → check before the public API.
- **Scope sprawl** → the hub-and-satellite model is the discipline that prevents an unmaintainable app.
- **Validation debt** → if the realized-vs-potential layer lags national coverage, credibility erodes.

---

## Prior-art reference (for honest positioning)
DBFZ DE Biomass Monitor & Resource Database (DE) · CIBiogás BiogásMap / Panorama (BR) · ABiogás maps
(BR) · NREL Bioenergy/Biofuels Atlas (US) · Argonne GREET (LCA) · EU S2BIOM / BIORAISE / ENERMAPS ·
Phyllis2 biomass-composition DB · World Biogas Association Global Biogas Atlas · GEF Biogás Invest (BR).
CP2B's differentiators: tropical/sugarcane focus, explicit FDE factor decomposition, realized-vs-
potential validation (ANP/ANEEL utilization), and an integrated open Global-South tool spanning
potential → siting → economics → policy for a multi-audience ecosystem.
