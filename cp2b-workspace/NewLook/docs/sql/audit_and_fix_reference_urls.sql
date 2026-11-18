-- =============================================================================
-- Reference URL audit & cleanup — referencias_unificadas (cp2b-maps-v3)
-- Operative access field = `url` (the project navigates to papers by URL, not DOI).
-- Run the SELECTs first (read-only health report). Apply UPDATEs only after review.
-- Take a backup first:  CREATE TABLE referencias_unificadas_bkp AS SELECT * FROM referencias_unificadas;
-- =============================================================================

-- ── 1. URL HEALTH OVERVIEW ───────────────────────────────────────────────────
SELECT
  count(*)                                                              AS total,
  count(*) FILTER (WHERE url IS NOT NULL AND btrim(url) <> '')          AS has_url,
  count(*) FILTER (WHERE url IS NULL OR btrim(url) = '')                AS missing_url,
  count(*) FILTER (WHERE url ~ '[>"<)\s]\.?\s*$')                       AS url_trailing_junk,
  count(*) FILTER (WHERE url !~* '^https?://')                          AS url_not_http,
  count(*) FILTER (WHERE (url IS NULL OR btrim(url)='')
                    AND doi IS NOT NULL AND btrim(doi) <> '')           AS recoverable_from_doi
FROM referencias_unificadas;

-- ── 2. ROWS NEEDING ATTENTION (export this as the worklist) ──────────────────
SELECT id, codigo_residuo, origem_dados, ano, url, doi,
       left(coalesce(referencia_texto, titulo, autores), 90) AS ref_preview,
       CASE
         WHEN url ~ '[>"<)\s]\.?\s*$'                       THEN 'A_TRAILING_JUNK'
         WHEN (url IS NULL OR btrim(url)='')
              AND doi IS NOT NULL AND btrim(doi)<>''        THEN 'D_FILL_FROM_DOI'
         WHEN (url IS NULL OR btrim(url)='')
              AND referencia_texto ~* 'https?://'           THEN 'D_FILL_FROM_TEXT'
         WHEN (url IS NULL OR btrim(url)='')                THEN 'MISSING_URL'
         WHEN url !~* '^https?://'                          THEN 'MALFORMED_URL'
         ELSE 'OK'
       END AS issue
FROM referencias_unificadas
WHERE url IS NULL OR btrim(url)='' OR url ~ '[>"<)\s]\.?\s*$' OR url !~* '^https?://'
ORDER BY issue, codigo_residuo;

-- Also flag the same trailing-junk artifact on the doi column (for resolver links built from it):
-- e.g. '10.1016/j.jclepro.2014.10.035>.'  '10.4025/actascitechnol.v39i2.29167>.'
SELECT id, codigo_residuo, doi
FROM referencias_unificadas
WHERE doi ~ '[>"<)\s]\.?\s*$'
ORDER BY codigo_residuo;

-- ── 3. MECHANICAL FIXES (deterministic, safe) ────────────────────────────────
-- 3a. Strip trailing markup junk ( > " ) . and whitespace ) from url and doi.
UPDATE referencias_unificadas
SET url = regexp_replace(btrim(url), '[>"<)\s.]+$', '')
WHERE url ~ '[>"<)\s]\.?\s*$';

UPDATE referencias_unificadas
SET doi = regexp_replace(btrim(doi), '[>"<)\s.]+$', '')
WHERE doi ~ '[>"<)\s]\.?\s*$';

-- 3b. Back-fill url from a clean doi when url is missing.
UPDATE referencias_unificadas
SET url = 'https://doi.org/' || btrim(doi)
WHERE (url IS NULL OR btrim(url) = '')
  AND doi IS NOT NULL AND btrim(doi) <> ''
  AND doi ~* '^10\.';

-- 3c. Back-fill url by extracting the first http(s) link embedded in referencia_texto.
UPDATE referencias_unificadas
SET url = regexp_replace(
            (regexp_match(referencia_texto, 'https?://[^\s<>")]+'))[1],
            '[>"<)\s.]+$', '')
WHERE (url IS NULL OR btrim(url) = '')
  AND referencia_texto ~* 'https?://';

-- ── 4. NEEDS-HUMAN worklist (DO NOT auto-edit — verify the real paper URL) ───
-- url/doi present but the cited title may not match the link (e.g. AG_MILHO_PALHA Tumuluru row,
-- PEC_DEJETOS_LIQUIDOS_SUINO EMBRAPA row), and placeholder rows (PC_BOVINOS_001, author-only rows).
SELECT id, codigo_residuo, ano, url, doi,
       left(coalesce(referencia_texto, titulo), 120) AS ref_preview
FROM referencias_unificadas
WHERE (titulo IS NULL AND autores IS NOT NULL AND referencia_texto IS NULL)   -- author-only stubs
   OR referencia_texto ILIKE '%Methane production from cattle manure under Brazilian conditions%'
   OR (doi IS NOT NULL AND referencia_texto ~* 'DOI:\s*https?://doi\.org/(?!.*' || regexp_replace(doi,'[().]','','g') || ')')
ORDER BY codigo_residuo;

-- ── 5. POST-FIX VERIFICATION ─────────────────────────────────────────────────
SELECT count(*) FILTER (WHERE url ~ '[>"<)\s]\.?\s*$')        AS still_trailing,
       count(*) FILTER (WHERE url IS NULL OR btrim(url)='')   AS still_missing_url
FROM referencias_unificadas;
