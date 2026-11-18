#!/usr/bin/env python3
"""
================================================================================
PILAR-2b Minas Gerais (853 Municipalities) — End-to-End Pipeline Runner
================================================================================
Author: Worker M5 (E2E Integration & Single-Invocation Runner)
Specification Reference: PROJECT.md § M5, TEST_INFRA.md § Feature 21, ORIGINAL_REQUEST.md § Acceptance Criteria
Methodology: Single-Invocation Automated Orchestration from Raw Data to Publication Artifacts.

Sequential Execution Stages:
  Stage 1: analysis/build_mg_master_residues.py (Ingestion & Feedstock Modeling)
  Stage 2: analysis/build_mg_biochemical_matching.py (C:N, Shannon, Co-Digestion)
  Stage 3: analysis/build_mg_empirical_validation.py (ANEEL GD & ANP Biomethane)
  Stage 4: analysis/build_mg_spatial_clustering_figures.py (K-Means, LISA, Maps, Visualizations)
  Stage 5: analysis/build_mg_paper_verification.py (Excel Workbook & Verification Artifacts)

Usage:
  python analysis/run_pilar2b_mg_pipeline.py
================================================================================
"""

import os
import sys
import time
import logging
from pathlib import Path
from typing import Dict, Any, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("PILAR2b-MG-Pipeline")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Stage imports
from analysis.build_mg_master_residues import build_mg_master_residues
from analysis.build_mg_biochemical_matching import (
    ensure_master_datasets,
    build_mg_biochemical_profiles,
    compute_spatial_pairing_matrix,
    export_deliverables as export_biochem_deliverables,
)
from analysis.build_mg_empirical_validation import main as run_empirical_validation
from analysis.build_mg_spatial_clustering_figures import execute_spatial_clustering_and_figures
from analysis.build_mg_paper_verification import build_paper_verification


def verify_file_exists_and_non_empty(file_path: Path, description: str):
    """Verifies that a generated file exists and has size > 0."""
    if not file_path.exists():
        raise FileNotFoundError(f"Missing required deliverable: {description} at {file_path}")
    size = file_path.stat().st_size
    if size == 0:
        raise ValueError(f"Generated deliverable is empty: {description} at {file_path}")
    logger.info(f"  [OK] {description}: {file_path.name} ({size:,} bytes)")


def run_pipeline() -> int:
    """Orchestrates the full sequential PILAR-2b Minas Gerais pipeline."""
    start_time = time.time()
    logger.info("=" * 80)
    logger.info("PILAR-2b MINAS GERAIS — SINGLE-INVOCATION AUTOMATED PIPELINE RUNNER")
    logger.info(f"Root Workspace: {BASE_DIR}")
    logger.info(f"Target Scope: 853 Municipalities (100% Minas Gerais State)")
    logger.info("=" * 80)

    try:
        # ----------------------------------------------------------------------
        # STAGE 1: 3-Sector Feedstock & Residue Ingestion Engine
        # ----------------------------------------------------------------------
        t0 = time.time()
        logger.info("\n>>> [STAGE 1/5] Ingesting Primary Data & Modeling Residue Streams (M1)...")
        df_master, df_summary = build_mg_master_residues()
        logger.info(f">>> [STAGE 1/5] Completed in {time.time() - t0:.2f}s.")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "data" / "01_master_residue_streams_MG_2023.csv", "Master Streams CSV")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "data" / "02_municipality_summary_MG_2023.csv", "Summary CSV")

        # ----------------------------------------------------------------------
        # STAGE 2: Spatial Co-Digestion & Biochemical Pairing Engine
        # ----------------------------------------------------------------------
        t0 = time.time()
        logger.info("\n>>> [STAGE 2/5] Running Spatial Co-Digestion & Biochemical Matching (M2)...")
        df_profile = build_mg_biochemical_profiles(df_summary)
        df_pairs_all, df_priority = compute_spatial_pairing_matrix(df_profile)
        export_biochem_deliverables(df_profile, df_pairs_all, df_priority)
        logger.info(f">>> [STAGE 2/5] Completed in {time.time() - t0:.2f}s.")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_biochemical_matching_all_853.csv", "Biochemical Matching All 853")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_top_priority_pairs_biochemical.csv", "Top Priority Pairs CSV")

        # ----------------------------------------------------------------------
        # STAGE 3: Empirical Bioenergy Ground-Truthing Layer
        # ----------------------------------------------------------------------
        t0 = time.time()
        logger.info("\n>>> [STAGE 3/5] Benchmarking Empirical Infrastructure (ANEEL GD & ANP Biomethane) (M3)...")
        empirical_results = run_empirical_validation()
        logger.info(f">>> [STAGE 3/5] Completed in {time.time() - t0:.2f}s.")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "data" / "05_biogas_plants_brazil.csv", "Biogas Plants Brazil CSV")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_empirical_realization_summary.csv", "Empirical Realization Summary")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_empirical_realization_rgint_summary.csv", "RGint Realization Summary")

        # ----------------------------------------------------------------------
        # STAGE 4: Spatial Clustering, LISA & Publication Figures
        # ----------------------------------------------------------------------
        t0 = time.time()
        logger.info("\n>>> [STAGE 4/5] Executing Spatial Clustering, LISA & Generating Figures (M4)...")
        m4_results = execute_spatial_clustering_and_figures()
        logger.info(f">>> [STAGE 4/5] Completed in {time.time() - t0:.2f}s.")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_spatial_clusters_853.csv", "Spatial Clusters CSV")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "outputs" / "MG_lisa_spatial_autocorrelation.csv", "LISA Spatial Autocorrelation CSV")
        for fig_path in (BASE_DIR / "analysis" / "outputs" / "figures").glob("*.png"):
            verify_file_exists_and_non_empty(fig_path, f"Figure {fig_path.name}")

        # ----------------------------------------------------------------------
        # STAGE 5: E2E Verification Artifacts (Excel, Markdown, Manifest)
        # ----------------------------------------------------------------------
        t0 = time.time()
        logger.info("\n>>> [STAGE 5/5] Synthesizing Paper Verification Artifacts & Manifest (M5)...")
        verif_results = build_paper_verification()
        logger.info(f">>> [STAGE 5/5] Completed in {time.time() - t0:.2f}s.")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "paper_verification" / "PILAR2b_MG_paper_verification.xlsx", "7-Tab Verification Workbook")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "paper_verification" / "MG_PAPER_DATA_VERIFICATION.md", "10-Section Verification Document")
        verify_file_exists_and_non_empty(BASE_DIR / "analysis" / "paper_verification" / "VERIFICATION_MANIFEST.json", "Verification JSON Manifest")

        total_elapsed = time.time() - start_time
        logger.info("=" * 80)
        logger.info(f"PILAR-2b MINAS GERAIS PIPELINE COMPLETED SUCCESSFULLY IN {total_elapsed:.2f}s")
        logger.info("All 853 municipalities ingested, harmonized, optimized, and verified.")
        logger.info("=" * 80)
        return 0

    except Exception as e:
        logger.exception(f"Pipeline execution failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = run_pipeline()
    sys.exit(exit_code)
