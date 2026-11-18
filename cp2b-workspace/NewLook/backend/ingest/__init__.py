"""
PILAR-2b data-ingestion framework ("the ingestion contract").

Every external data source enters the platform through the same four steps:

    fetch    -> immutable raw snapshot under data/raw/<source_id>/<year>/
    load     -> typed pandas DataFrame keyed on ibge_code / cod_rgint / uf
    validate -> the standard 8-gate battery (ingest.gates) + source checks
    promote  -> staging.* -> public.* in one transaction, with a written report

See ingest/README.md and docs/data/INGESTION_GUIDE.md for the step-by-step
process, and docs/planning/BRAZIL_EXPANSION_ROADMAP.md (section 5) for the
gate definitions this package implements.
"""

__all__ = ["contract", "gates", "ibge", "report", "runner"]
