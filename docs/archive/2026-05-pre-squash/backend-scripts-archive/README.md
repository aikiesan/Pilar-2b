# Archived Scripts - PILAR-2b V3

This directory contains scripts that were used during the initial setup and development of the project but are no longer needed for regular operations.

**Archive Date**: December 11, 2025
**Reason**: Codebase cleanup to remove one-time setup scripts

---

## 📁 Directory Structure

### `migrations/`
One-time data migration scripts that transferred data from PILAR-2b V2 to V3.

**Files:**
- `import_panorama_data.py` - Imported Panorama Biogas data
- `import_v2_data.py` - Main V2 to V3 migration script
- `import_v2_data_supabase_sdk.py` - Supabase SDK version of migration
- `load_shapefiles.py` - Initial shapefile loading

**Status:** ✅ Migrations completed successfully. Files archived for reference.

### `setup/`
One-time setup scripts for data generation and database initialization.

**Files:**
- `compute_brazil_distance_matrix.py` - Computed distance matrix for Brazil municipalities
- `create_brazil_sample_data.py` - Generated sample data for testing
- `extract_sample_data.py` - Extracted subset of data for development
- `generate_brazil_sql_simple.py` - Generated SQL for Brazil data
- `generate_distance_matrix_simple.py` - Simplified distance matrix generation
- `generate_sql_from_excel.py` - Excel to SQL conversion
- `import_panorama_data.py` - Panorama data import (duplicate)
- `optimize_br_regions.py` - Regional data optimization

**Status:** ✅ Setup completed. Data in production database.

---

## 🔄 Re-running Scripts

If you need to re-run any of these scripts:

1. **Check dependencies**: Ensure required packages are installed
2. **Backup database**: Always backup before running migration scripts
3. **Review script**: Check for hardcoded paths or outdated config
4. **Test on sample data**: Test on a small dataset first

### Example:
```bash
# Backup first
pg_dump $DATABASE_URL > backup.sql

# Run script
cd backend/scripts/archive/migrations
python import_v2_data.py

# Verify results
psql $DATABASE_URL -c "SELECT COUNT(*) FROM municipalities;"
```

---

## 📊 What's Still Active

**Active scripts** (in `backend/scripts/`)
- `check_tech_tables.py` - Verify technology tables
- `load_economic_data.py` - Refresh economic data
- `seed_tech_data.py` - Seed technology data
- `seed_tech_data_simple.py` - Simple technology seeding

---

## 🗑️ Deletion Policy

These archived scripts can be safely deleted after:
1. ✅ Verifying production database is stable (6+ months)
2. ✅ Confirming no migration rollback is needed
3. ✅ Documenting the migration process elsewhere

**Recommended retention**: 1 year from archive date (until December 2026)

---

**Last Updated**: December 11, 2025
