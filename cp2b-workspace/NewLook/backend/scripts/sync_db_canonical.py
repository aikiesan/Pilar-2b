#!/usr/bin/env python3
"""
sync_db_canonical.py
====================
Synchronizes the postgres 'municipalities' table with the aggregated values
from the 'residue_streams_sp2023' table (Option A).
This ensures that the main map/sidebar summary and the Advanced Analysis page
are fully consistent and show correct values from the updated database.
"""

import sys
import logging
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor

# Add backend to path so we can import app settings
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def get_db_connection():
    return psycopg2.connect(settings.DATABASE_URL)

def _potential_category(total_biogas: float) -> str:
    if total_biogas > 100_000_000:
        return "ALTO"
    if total_biogas > 10_000_000:
        return "MEDIO"
    if total_biogas > 0:
        return "BAIXO"
    return "SEM DADOS"

def _float(v):
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

def main():
    logger.info("Starting database synchronization (Option A)...")
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # 1. Fetch aggregated values per municipality from residue_streams_sp2023
    logger.info("Aggregating residue stream potentials from residue_streams_sp2023...")
    query = """
        SELECT 
            ibge_code::text as ibge_code,
            SUM(biogas_m3_yr) as total_biogas_m3_year,
            SUM(CASE WHEN sector = 'agricultural' THEN biogas_m3_yr ELSE 0 END) as agricultural_biogas_m3_year,
            SUM(CASE WHEN sector = 'livestock' THEN biogas_m3_yr ELSE 0 END) as livestock_biogas_m3_year,
            SUM(CASE WHEN sector = 'urban' THEN biogas_m3_yr ELSE 0 END) as urban_biogas_m3_year,
            SUM(CASE WHEN sector = 'forestry' THEN biogas_m3_yr ELSE 0 END) as forestry_biogas_m3_year,
            
            SUM(CASE WHEN residue_stream = 'sugarcane' THEN biogas_m3_yr ELSE 0 END) as sugarcane_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'soybean' THEN biogas_m3_yr ELSE 0 END) as soybean_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'corn' THEN biogas_m3_yr ELSE 0 END) as corn_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'coffee' THEN biogas_m3_yr ELSE 0 END) as coffee_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'citrus' THEN biogas_m3_yr ELSE 0 END) as citrus_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'cattle' THEN biogas_m3_yr ELSE 0 END) as cattle_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'swine' THEN biogas_m3_yr ELSE 0 END) as swine_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'poultry' THEN biogas_m3_yr ELSE 0 END) as poultry_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'aquaculture' THEN biogas_m3_yr ELSE 0 END) as aquaculture_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'rsu_organic' THEN biogas_m3_yr ELSE 0 END) as rsu_biogas_m3_year,
            SUM(CASE WHEN residue_stream = 'rpo_pruning' THEN biogas_m3_yr ELSE 0 END) as rpo_biogas_m3_year,
            
            SUM(CASE WHEN residue_stream = 'sugarcane' THEN residue_tons_yr ELSE 0 END) as sugarcane_residues_tons_year,
            SUM(CASE WHEN residue_stream = 'soybean' THEN residue_tons_yr ELSE 0 END) as soybean_residues_tons_year,
            SUM(CASE WHEN residue_stream = 'corn' THEN residue_tons_yr ELSE 0 END) as corn_residues_tons_year,
            SUM(CASE WHEN residue_stream = 'coffee' THEN residue_tons_yr ELSE 0 END) as coffee_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'citrus' THEN residue_tons_yr ELSE 0 END) as citrus_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'cattle' THEN residue_tons_yr ELSE 0 END) as cattle_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'swine' THEN residue_tons_yr ELSE 0 END) as swine_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'poultry' THEN residue_tons_yr ELSE 0 END) as poultry_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'aquaculture' THEN residue_tons_yr ELSE 0 END) as aquaculture_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'rsu_organic' THEN residue_tons_yr ELSE 0 END) as rsu_biomass_tons_year,
            SUM(CASE WHEN residue_stream = 'rpo_pruning' THEN residue_tons_yr ELSE 0 END) as rpo_biomass_tons_year,
            
            SUM(CASE WHEN sector = 'agricultural' THEN residue_tons_yr ELSE 0 END) as agricultural_biomass_tons_year,
            SUM(CASE WHEN sector = 'livestock' THEN residue_tons_yr ELSE 0 END) as livestock_biomass_tons_year,
            SUM(CASE WHEN sector = 'urban' THEN residue_tons_yr ELSE 0 END) as urban_biomass_tons_year,
            SUM(residue_tons_yr) as total_biomass_tons_year
        FROM residue_streams_sp2023
        GROUP BY ibge_code
    """
    
    cur.execute(query)
    rows = cur.fetchall()
    logger.info(f"Loaded aggregated data for {len(rows)} municipalities.")
    
    # 2. Update the municipalities table
    logger.info("Updating municipalities table...")
    update_count = 0
    
    for r in rows:
        ibge_code = r['ibge_code']
        total_biogas = _float(r['total_biogas_m3_year'])
        
        # Calculate derived energy and CO2 metrics
        # Methane conversion: 1 m3 CH4 = 9.97 kWh = 0.00997 MWh
        # (biogas_m3_yr column is actually biomethane/CH4 equivalent)
        energy_mwh = total_biogas * 0.00997
        co2_reduction = energy_mwh * 0.4
        
        # Calculate daily totals
        total_biogas_day = total_biogas / 365.0
        energy_kwh_day = (energy_mwh * 1000.0) / 365.0
        
        # Determine potential category
        cat = _potential_category(total_biogas)
        
        cur.execute("""
            UPDATE municipalities SET
                total_biogas_m3_year = %s,
                total_biogas_m3_day = %s,
                agricultural_biogas_m3_year = %s,
                livestock_biogas_m3_year = %s,
                urban_biogas_m3_year = %s,
                forestry_biogas_m3_year = %s,
                
                sugarcane_biogas_m3_year = %s,
                soybean_biogas_m3_year = %s,
                corn_biogas_m3_year = %s,
                coffee_biogas_m3_year = %s,
                citrus_biogas_m3_year = %s,
                cattle_biogas_m3_year = %s,
                swine_biogas_m3_year = %s,
                poultry_biogas_m3_year = %s,
                aquaculture_biogas_m3_year = %s,
                rsu_biogas_m3_year = %s,
                rpo_biogas_m3_year = %s,
                
                sugarcane_residues_tons_year = %s,
                sugarcane_biomass_tons_year = %s,
                soybean_residues_tons_year = %s,
                soybean_biomass_tons_year = %s,
                corn_residues_tons_year = %s,
                corn_biomass_tons_year = %s,
                coffee_biomass_tons_year = %s,
                citrus_biomass_tons_year = %s,
                cattle_biomass_tons_year = %s,
                swine_biomass_tons_year = %s,
                poultry_biomass_tons_year = %s,
                aquaculture_biomass_tons_year = %s,
                rsu_biomass_tons_year = %s,
                rpo_biomass_tons_year = %s,
                
                agricultural_biomass_tons_year = %s,
                livestock_biomass_tons_year = %s,
                urban_biomass_tons_year = %s,
                total_biomass_tons_year = %s,
                
                energy_potential_mwh_year = %s,
                energy_potential_kwh_day = %s,
                co2_reduction_tons_year = %s,
                potential_category = %s,
                updated_at = NOW()
            WHERE ibge_code = %s
        """, (
            total_biogas, total_biogas_day,
            _float(r['agricultural_biogas_m3_year']),
            _float(r['livestock_biogas_m3_year']),
            _float(r['urban_biogas_m3_year']),
            _float(r['forestry_biogas_m3_year']),
            
            _float(r['sugarcane_biogas_m3_year']),
            _float(r['soybean_biogas_m3_year']),
            _float(r['corn_biogas_m3_year']),
            _float(r['coffee_biogas_m3_year']),
            _float(r['citrus_biogas_m3_year']),
            _float(r['cattle_biogas_m3_year']),
            _float(r['swine_biogas_m3_year']),
            _float(r['poultry_biogas_m3_year']),
            _float(r['aquaculture_biogas_m3_year']),
            _float(r['rsu_biogas_m3_year']),
            _float(r['rpo_biogas_m3_year']),
            
            _float(r['sugarcane_residues_tons_year']),
            _float(r['sugarcane_residues_tons_year']),
            _float(r['soybean_residues_tons_year']),
            _float(r['soybean_residues_tons_year']),
            _float(r['corn_residues_tons_year']),
            _float(r['corn_residues_tons_year']),
            _float(r['coffee_biomass_tons_year']),
            _float(r['citrus_biomass_tons_year']),
            _float(r['cattle_biomass_tons_year']),
            _float(r['swine_biomass_tons_year']),
            _float(r['poultry_biomass_tons_year']),
            _float(r['aquaculture_biomass_tons_year']),
            _float(r['rsu_biomass_tons_year']),
            _float(r['rpo_biomass_tons_year']),
            
            _float(r['agricultural_biomass_tons_year']),
            _float(r['livestock_biomass_tons_year']),
            _float(r['urban_biomass_tons_year']),
            _float(r['total_biomass_tons_year']),
            
            energy_mwh, energy_kwh_day, co2_reduction,
            cat,
            ibge_code
        ))
        
        update_count += 1
        
    conn.commit()
    logger.info(f"Successfully synchronized {update_count} municipalities.")
    
    # 3. Print validation totals from municipalities table
    cur.execute("""
        SELECT 
            COUNT(*) as count,
            SUM(total_biogas_m3_year) as total_biogas,
            SUM(agricultural_biogas_m3_year) as agri_biogas,
            SUM(livestock_biogas_m3_year) as live_biogas,
            SUM(urban_biogas_m3_year) as urb_biogas,
            SUM(forestry_biogas_m3_year) as forestry_biogas
        FROM municipalities
    """)
    totals = cur.fetchone()
    logger.info("--- SYNC VALIDATION RESULTS ---")
    logger.info(f"Municipalities in DB: {totals['count']}")
    logger.info(f"Total Biogas (m3/yr):  {totals['total_biogas']:,.2f}")
    logger.info(f"  Agricultural:        {totals['agri_biogas']:,.2f}")
    logger.info(f"  Livestock:           {totals['live_biogas']:,.2f}")
    logger.info(f"  Urban:               {totals['urb_biogas']:,.2f}")
    logger.info(f"  Forestry:            {totals['forestry_biogas']:,.2f}")
    
    cur.close()
    conn.close()
    logger.info("Database synchronization finished successfully.")

if __name__ == "__main__":
    main()
