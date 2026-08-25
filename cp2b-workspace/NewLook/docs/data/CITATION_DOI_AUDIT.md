# Citation / DOI Audit — `references.yaml` (canonical 32 academic DOIs)

**Date:** 2026-06-12
**Method:** Each DOI was checked via web search + (attempted) publisher-page resolution.
**⚠️ Reliability caveat:** `doi.org/api`, Crossref, ScienceDirect/Springer/PubMed landing pages
all return **HTTP 403** from this environment, so verdicts rest on **search-result evidence, not
confirmed publisher pages**. Therefore: **no "corrected" DOI below is to be written into the
database until confirmed on the actual publisher page** (by the user or a follow-up with web access).
Suspect DOIs are marked `NEEDS_FIX`; proposed replacements are **candidates only**.

## Summary
- **OK (matches):** 11 — batstone2002, angelidaki2003, hashimoto1989, moller2004, kaparaju2005,
  pourbafrani2010, pognani2011, von_sperling2007, carvalho2017, leal2013, lohrasbi2010,
  mussatto2011, pandey2000.
- **NEEDS_FIX (DOI resolves to an unrelated paper):** amon2007_cattle, bonomi2015_vinhaca,
  paulose2021_bagaco, talha2016_bagaco, okonkwo2021_coffee, wikandari2014_citrus,
  heerenklage2019_sludge, sheets2015_fats, davidsson2008_grease, herrmann2012_corn.
- **CONTENT_MISMATCH (valid DOI, wrong usage):** kafle2016_soy (livestock-manure paper used for
  soybean-hull BMP); murto2004 (real paper is sewage-sludge+pig-manure, file title misdescribes it).
- **UNVERIFIABLE (could not confirm):** wall2014_swine, abouelenien2014_poultry,
  velasquez2020_sugarcane, tenelli2021_straw, souza2009_cattle, de_baere2012_forsu (book DOI),
  mata_alvarez2014 (title/year internally inconsistent).

## Highest-confidence problems (DOI lands on a clearly unrelated paper)

| cite_key | DOI in file | resolves to (per search) | candidate correct DOI (UNCONFIRMED) |
|---|---|---|---|
| amon2007_cattle | 10.1016/j.biortech.2006.07.016 | dairy-slurry surface-banding agronomy (Bittman et al.) | 10.1016/j.biortech.2006.07.007 |
| bonomi2015_vinhaca | 10.1016/j.rser.2015.01.022 | Yangtze hydroelectric optimization | 10.1016/j.rser.2015.01.023 (Moraes, Zaiat, Bonomi) |
| paulose2021_bagaco | 10.1016/j.indcrop.2021.113498 | arbuscular-mycorrhizal-fungi / Passiflora | 10.1016/j.indcrop.2021.113712 |
| talha2016_bagaco | 10.15376/biores.11.3.6824-6841 | BioResources wood-products pages | 10.1155/2016/8650597 (BioMed Research Intl) |
| okonkwo2021_coffee | 10.1016/j.biteb.2021.100830 | "AD in Indian context" (Bandgar et al.) | — |
| wikandari2014_citrus | 10.1016/j.biortech.2014.07.074 | corn-stalk fast-pyrolysis | real paper in Biochem. Eng. J. (vol 109) |
| heerenklage2019_sludge | 10.1016/j.wasman.2019.04.025 | textile-dyeing-sludge plasma gasification | — |
| sheets2015_fats | 10.1016/j.biortech.2014.09.072 | algal-cell disruption (microbubbles) | — |
| davidsson2008_grease | 10.1016/j.wasman.2006.06.008 | clay-barrier landfill covers | Davidsson WM 27:406-414 = 10.1016/j.wasman.2006.02.013 (different paper) |
| herrmann2012_corn | 10.1016/j.biortech.2011.12.074 | allothermal biomass gasification | — |

## Content / usage mismatches (DOI valid, citation misapplied)
- **kafle2016_soy** — DOI is correct for Kafle & Chen "five livestock manures BMP", but it is cited
  to justify **soybean-hull** BMP. Need a real soy-hull BMP source.
- **murto2004_substrates** — DOI valid; real title is "Impact of food industrial waste on anaerobic
  co-digestion of **sewage sludge and pig manure**" — file title should be corrected.
- **de_baere2012_forsu** — `10.1007/978-3-642-28495-4` is a Springer **book** DOI, inconsistent with
  the claimed *Waste Management* article. Needs the correct article DOI.

## Action
1. **Do not auto-write** candidate DOIs. For each `NEEDS_FIX`/`UNVERIFIABLE`, confirm the real DOI on
   the publisher page (user-assisted) → then update `references.yaml` and set `verified: true`.
2. Until confirmed, set `verified: false` and add `audit_status: NEEDS_FIX` / `UNVERIFIABLE` so the
   `test_fde_traceability` URL check still passes (URL present) but the entry is visibly unverified.
3. Re-run this audit against publisher pages once network or a user export is available.
