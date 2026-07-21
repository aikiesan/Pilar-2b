# Crop (agricultural) data — current structure and input spec

What the database holds today for crops, and the exact format to prepare so the
national PAM load can be built against it. Written 2026-07-21 against the live
local DB.

---

## 1. What exists right now

### The spine is national; crops are not

| Thing | State |
|---|---|
| `municipalities` rows | **5,571** (national, with geometry) |
| Livestock — `municipality_timeseries` `source_id='ibge_ppm'` | 1,433,650 rows, **5,543** municipalities, 2008–2024 |
| Urban — `municipality_timeseries` `source_id='snis'` | 420,699 rows, **5,570** municipalities, 2008–2022 |
| **Crops** | **UF 35 (São Paulo) only — 645 municipalities** |

Crop provenance today is exactly 645 × 5 streams = **3,225 rows**, all
`source_id='sp_master_csv'`, `reference_year=2023`.

```
 stream    | count
-----------+-------
 citrus    |   645
 coffee    |   645
 corn      |   645
 soybean   |   645
 sugarcane |   645
```

Everything outside SP renders `no_data` — correctly, by design.

### The two tables that matter

**`municipality_timeseries`** — the long, per-year store.

```
ibge_code      varchar(7)   NOT NULL   FK -> municipalities
year           smallint     NOT NULL   CHECK (1985..2100)
source_id      varchar(40)  NOT NULL
variable       varchar(80)  NOT NULL
value          double precision        -- nullable
unit           varchar(16)  NOT NULL   -- never inferred at write time
quality        varchar(12)  NOT NULL   CHECK IN (measured|interpolated|proxy|estimated)
UNIQUE (ibge_code, year, source_id, variable)   -- makes re-runs idempotent
```

**`municipality_biomass_provenance`** — the coverage guard.

```
ibge_code      varchar(7)   NOT NULL
stream         varchar(32)  NOT NULL   -- sugarcane|soybean|corn|coffee|citrus|…
source_id      varchar(40)  NOT NULL
reference_year smallint     NOT NULL
quality        varchar(12)  NOT NULL   CHECK IN (measured|interpolated|proxy|estimated)
PRIMARY KEY (ibge_code, stream)
```

**A crop value with no provenance row is invisible.** The API emits `null` and
the map paints `no_data`. This is deliberate — before this table existed, a `0`
meaning "never loaded" was byte-identical to a `0` meaning "grows none here",
and the map rendered the data gap as a finding.

### Where crop values are read from

Two different read paths:

- **Livestock + urban** — derived at *read time* from `municipality_timeseries`
  (head count / population × canonical factor). Already national.
- **Crops** — read from the wide column `municipalities.{crop}_biomass_tons_year`,
  gated by the provenance table.

So a national crop load must write **both** the wide column and a provenance row.

---

## 2. The critical detail: the crop columns are NOT all the same thing

This is the single most important thing to know before preparing files. The five
crop columns are **semantically mixed**. Verified in
`backend/scripts/compute_sp_canonical_totals.py`:

| Column | What it actually stores | Residue conversion happens |
|---|---|---|
| `sugarcane_biomass_tons_year` | **raw green cane production** (PAM) | downstream, into 4 sub-streams |
| `citrus_biomass_tons_year` | **whole fruit production** (PAM) | downstream, × 0.50 peel |
| `soybean_biomass_tons_year` | **residue tonnes** (straw) | already applied upstream |
| `corn_biomass_tons_year` | **residue tonnes** (straw) | already applied upstream |
| `coffee_biomass_tons_year` | **residue tonnes** (husk) | already applied upstream |

Sanity check against the live DB, SP totals: cana **247.21 Mt** (only credible
as raw cane), soja **6.12 Mt** (only credible as straw — SP produces ~3 Mt of
soybeans). The two really are on different footings.

The downstream conversions, all in `compute_sp_canonical_totals.py`:

```python
CITRUS_RESIDUE_FRACTION = 0.50          # whole fruit -> wet peel (FUNDECITRUS 2022)

SUGARCANE_SUBSTREAMS = [                # per tonne of green cane
    ("cana_bagaco",  "BAGACO",       0.280),   # UNICA/CONSECANA 2022
    ("cana_torta",   "TORTA_FILTRO", 0.030),   # CONSECANA-SP
    ("cana_palha",   "PALHA",        0.053),   # Carvalho 2017, doi:10.1111/gcbb.12410
    ("cana_vinhaca", "VINHACA",      0.420),   # UNICA SP
]                                              # sums to 0.783 t/t cane

AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee")   # already residue tonnes
```

### What this means for your files

**Good news: sugarcane and citrus need no conversion at all.** PAM production
tonnes go straight into those two columns — that is exactly what the column
already holds for SP, and the residue chemistry is applied downstream where it
is already documented and cited.

**Only soybean, corn and coffee need a residue factor** (RPR × availability),
because their columns hold residue rather than production. SP got those three
from MapBiomas area × yield_t_ha, not from PAM.

This also means the RPR gap is **narrower than it first looked**: it is needed
for 3 crops, not 5. RPR currently has no canonical home — zero hits in any
`.yaml`; it lives only in
`frontend/src/app/[locale]/dashboard/advanced-analysis/page.tsx:138`.

---

## 3. The format to prepare

### Preferred: hand over the raw PAM workbooks unchanged

Do **not** pre-process. The parser should own the transformation so it is
versioned, gated and reproducible. Drop the SIDRA exports at:

```
backend/data/raw/pam/TABELA_1612_<range>.xlsx    # lavouras temporárias
backend/data/raw/pam/TABELA_1613_<range>.xlsx    # lavouras permanentes
```

`backend/data/raw/` is gitignored, and `./backend` is bind-mounted to `/app`, so
these appear inside the container at `/app/data/raw/pam/`.

Export them the same way the PPM tables were exported — SIDRA **"Ano × variável"**,
one workbook per table, whole series. The existing PPM parser already handles
that layout: header on row 3, **year on row 4 in merged cells (forward-fill
required)**, variable on row 5, data from row 6, and `Cód.` as a real 7-digit
IBGE code (so there is no name join and none of the municipality-matching traps).

Please keep the SIDRA value codes intact — do not clean them:

| Code | Meaning | Must become |
|---|---|---|
| `-` | measured as zero | `0` |
| `..` / `...` | not surveyed / not available | `NULL` (row dropped) |

Collapsing `..` to `0` would assert a municipality grows no soybeans when IBGE
simply did not survey it. That distinction is load-bearing.

**Which variable to export:** *Quantidade produzida* (tonnes). Área
colhida/plantada is useful as a secondary cross-check but production is what the
columns need.

**Crops to include:** cana-de-açúcar, soja, milho (1612); café, laranja (1613).

### If you prefer to hand over processed sheets

Then match this shape exactly — one row per municipality per crop, long form:

```csv
ibge_code,year,crop,value,unit,quality
3500105,2023,sugarcane,454363.0,t,measured
3500105,2023,soybean,1205.3,t,measured
```

- `ibge_code` — 7 digits, zero-padded, as text (Excel will silently strip a
  leading zero; several UFs need it)
- `crop` — one of `sugarcane|soybean|corn|coffee|citrus` (the stream keys)
- `value` — **production tonnes** for sugarcane/citrus, **residue tonnes** for
  soybean/corn/coffee (per §2). State clearly which you used.
- blank ≠ zero — leave not-surveyed rows out entirely rather than writing `0`

Wide form (one column per crop) is also fine; long is just less ambiguous.

### MapBiomas

Hand over whatever you have — municipal crop **area in hectares**, keyed by
`ibge_code`. It is planned as a *cross-check* on PAM (`gates.cross_source_gate`)
rather than a second writer into the same columns, so its precise shape is less
constrained. Note the existing yield factors (cana 12, soja 4, milho 4.5, café
0.6, citrus 5 t/ha) are **SP-tuned** and need review before national use.

---

## 4. What gets written when the load runs

Per municipality per crop, in one transaction:

1. `municipality_timeseries` — production rows, `source_id='pam_1612'|'pam_1613'`
   (both already reserved in the schema), with `unit='t'`
2. `municipalities.{crop}_biomass_tons_year` — per the §2 semantics
3. `municipality_biomass_provenance` — one row, `quality='measured'`
4. rollups: `agricultural_biomass_tons_year` = sum of the 5;
   `total_biomass_tons_year` = agricultural + livestock + urban

Then the 8-gate battery (`backend/ingest/gates.py`) runs: schema, coverage per
UF, range, aggregation against IBGE's published national production, lineage,
idempotency and regression.

---

## 5. Quick reference — the numbers to expect

- **5,571** municipalities total
- crop provenance rows today: **3,225** (SP only); after a national load, up to
  ~**27,855** (5,571 × 5) minus genuinely-unsurveyed municipality/crop pairs
- agriculture is **~77%** of total modelled potential, so this load is the single
  largest remaining change to every headline number on the platform
