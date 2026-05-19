# Database Migrations - PILAR-2b V3

This directory contains database migration scripts for schema changes and performance optimizations.

## Migration List

### 001 - Performance Optimization (2025-11-17)
**Files:**
- `001_add_performance_indexes.sql` - Add indexes for query optimization
- `001_rollback.sql` - Rollback script

**What it does:**
- Creates 12 indexes on municipalities and biogas_plants tables
- Adds spatial indexes (GIST) for geometry operations
- Creates monitoring views for index usage and query performance
- Updates table statistics for query planner

**Performance Impact:**
- Expected 5-8x speedup for common queries
- Improves filtering by biogas, region, and population
- Optimizes spatial queries and proximity analysis

## Running Migrations

### Prerequisites
Ensure you have:
- PostgreSQL client (psql) installed
- Database credentials configured
- Backup of the database

### Apply Migration

```bash
# 1. Create backup (IMPORTANT!)
pg_dump -U cp2b_user -d cp2b_maps > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
psql -U cp2b_user -d cp2b_maps -f 001_add_performance_indexes.sql

# 3. Verify indexes were created
psql -U cp2b_user -d cp2b_maps -c "SELECT * FROM v_index_usage;"
```

### Rollback Migration

If you need to revert the migration:

```bash
# Run rollback script
psql -U cp2b_user -d cp2b_maps -f 001_rollback.sql
```

### Test Performance

Before migration:
```bash
psql -U cp2b_user -d cp2b_maps -c "
EXPLAIN ANALYZE
SELECT * FROM municipalities
WHERE total_biogas_m3_year > 0
AND administrative_region = 'Campinas'
ORDER BY total_biogas_m3_year DESC
LIMIT 100;
"
```

After migration (should show index usage):
```bash
# Same query - should show "Index Scan using idx_municipalities_region_biogas"
psql -U cp2b_user -d cp2b_maps -c "
EXPLAIN ANALYZE
SELECT * FROM municipalities
WHERE total_biogas_m3_year > 0
AND administrative_region = 'Campinas'
ORDER BY total_biogas_m3_year DESC
LIMIT 100;
"
```

## Monitoring

### Check Index Usage
```sql
-- View index usage statistics
SELECT * FROM v_index_usage;

-- Find unused indexes
SELECT * FROM v_index_usage WHERE index_scans = 0;
```

### Check Query Performance
```sql
-- View slow queries (if pg_stat_statements is enabled)
SELECT * FROM v_query_performance;
```

### Check Index Size
```sql
-- View total index sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Expected Results

### Before Migration
- Query time: 500-800ms for 645 municipalities
- Sequential scans on most queries
- No index usage

### After Migration
- Query time: 50-100ms for 645 municipalities (5-8x faster)
- Index scans for filtered queries
- Spatial queries using GIST indexes

## Troubleshooting

### Migration fails with "index already exists"
This is safe to ignore - the script uses `IF NOT EXISTS` to handle this.

### Out of disk space
Indexes require additional storage. Estimate:
- ~10-20 MB for all indexes on 645 municipalities
- Check available space: `df -h`

### Slow migration
Migration should complete in <30 seconds for 645 municipalities.
If slower, check:
- Database load (other active queries)
- Available memory
- Disk I/O performance

## Notes

- Migrations are applied manually (no auto-migration framework)
- Always backup before running migrations
- Test migrations in development/staging first
- Document any custom migrations in this README
- Keep migration scripts in version control
