# Database Audit Logging Configuration Guide

## Executive Summary

**Status:** ⚠️ **CRITICAL - MUST ENABLE BEFORE PRODUCTION**

Database audit logging provides forensic trails for:
- Security incident investigation
- Data modification tracking
- Compliance requirements (LGPD, GDPR)
- Performance monitoring
- Debugging production issues

## Why Audit Logging Is Critical

### For This Platform

Given that **lives and jobs depend on this platform**, you need audit trails for:

1. **Data Integrity Incidents**
   - Track unauthorized data modifications
   - Identify source of data corruption
   - Reconstruct timeline of changes

2. **Security Breaches**
   - Detect SQL injection attempts
   - Track unauthorized access patterns
   - Forensic analysis of attack vectors

3. **Compliance Requirements**
   - LGPD (Brazil): Article 48 - Security incident documentation
   - FAPESP Grant: Research data integrity requirements
   - Institutional audits

4. **Performance Debugging**
   - Identify slow queries in production
   - Track connection pool exhaustion
   - Monitor query patterns

## PostgreSQL Audit Logging Options

### Option 1: PostgreSQL Built-in Logging (Recommended)

Enable via Supabase Dashboard or SQL commands.

#### Log Levels

| Setting | What It Logs | Overhead | Recommendation |
|---------|--------------|----------|----------------|
| `log_statement = 'none'` | Nothing | None | ❌ Current (unsafe) |
| `log_statement = 'ddl'` | CREATE, ALTER, DROP | Minimal | 🟡 Basic |
| `log_statement = 'mod'` | INSERT, UPDATE, DELETE | Low | ✅ **Production** |
| `log_statement = 'all'` | All queries (SELECT too) | High | 🟡 Debugging only |

#### Configuration via Supabase Dashboard

**Step 1: Access Database Settings**
```
1. Go to: https://supabase.com/dashboard/project/zyuxkzfhkueeipokyhgw
2. Navigate to: Settings → Database
3. Scroll to: "Database Settings" or "Custom Postgres Config"
```

**Step 2: Enable Logging**

If using Supabase UI:
- Look for "Query Performance" or "Logging" section
- Enable "Query Logging"
- Set log level to "Modifications" or "mod"

**Step 3: Configure Retention**
```
- Set log retention: 7-30 days (balance storage vs compliance)
- Enable log export to external storage if available
```

#### Configuration via SQL (If Direct Access)

```sql
-- Enable logging for data modifications
ALTER SYSTEM SET log_statement = 'mod';

-- Log query duration (helps identify slow queries)
ALTER SYSTEM SET log_duration = on;

-- Log queries taking longer than 1 second
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- milliseconds

-- Log connections and disconnections
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Include application name in logs (helps trace backend requests)
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();
```

**Verify Configuration:**
```sql
-- Check current settings
SHOW log_statement;
SHOW log_duration;
SHOW log_min_duration_statement;

-- Expected output:
--   log_statement: 'mod'
--   log_duration: on
--   log_min_duration_statement: 1000ms
```

### Option 2: pgAudit Extension (Enterprise-Grade)

For more granular control, use the `pgAudit` extension.

**Check if Available:**
```sql
SELECT * FROM pg_available_extensions WHERE name = 'pgaudit';
```

**Enable pgAudit:**
```sql
-- Requires superuser or Supabase support
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure audit settings
ALTER SYSTEM SET pgaudit.log = 'write';  -- Log INSERT, UPDATE, DELETE
ALTER SYSTEM SET pgaudit.log_catalog = off;  -- Don't log system tables
ALTER SYSTEM SET pgaudit.log_level = 'log';
ALTER SYSTEM SET pgaudit.log_parameter = on;  -- Include query parameters

SELECT pg_reload_conf();
```

**pgAudit Log Classes:**
- `read` - SELECT, COPY FROM
- `write` - INSERT, UPDATE, DELETE, TRUNCATE, COPY TO
- `function` - Function calls
- `role` - GRANT, REVOKE
- `ddl` - CREATE, ALTER, DROP
- `misc` - VACUUM, CHECKPOINT, etc.

**Production Recommendation:**
```sql
ALTER SYSTEM SET pgaudit.log = 'write, ddl, role';
```

### Option 3: Application-Level Audit Logging

If PostgreSQL logging is insufficient, implement application-level auditing.

**Create Audit Table:**
```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE', 'SELECT'
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    endpoint TEXT,
    query_params JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Indexes for fast querying
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_action ON audit_log(table_name, action);
CREATE INDEX idx_audit_log_request_id ON audit_log(request_id);

-- Partition by month for large datasets
-- (Optional, for high-volume applications)
```

**Backend Integration:**
```python
# app/middleware/audit_logger.py
import logging
from fastapi import Request
from app.core.database import get_db

logger = logging.getLogger(__name__)

async def log_audit_event(
    user_id: str,
    action: str,
    table_name: str,
    record_id: str = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    """Log audit event to database"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_log (
                    user_id, user_email, user_role, action, table_name,
                    record_id, old_values, new_values, ip_address,
                    user_agent, endpoint
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                user_id,
                request.state.user.email if hasattr(request.state, 'user') else None,
                request.state.user.role if hasattr(request.state, 'user') else None,
                action,
                table_name,
                record_id,
                old_values,
                new_values,
                request.client.host if request and request.client else None,
                request.headers.get('user-agent') if request else None,
                request.url.path if request else None
            ))
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
        # Don't raise - audit logging failure shouldn't break the app
```

## Implementation Checklist

### Immediate Actions (Before Production)

- [ ] **Enable PostgreSQL logging in Supabase**
  - [ ] Set `log_statement = 'mod'`
  - [ ] Set `log_duration = on`
  - [ ] Set `log_min_duration_statement = 1000`
  - [ ] Configure log retention (30 days minimum)

- [ ] **Verify Logging Is Working**
  ```sql
  -- Run a test query
  INSERT INTO municipalities (codigo_ibge, nome) VALUES ('9999999', 'Test City');

  -- Check logs (Supabase Dashboard → Logs)
  -- Should see: INSERT statement logged

  -- Clean up test
  DELETE FROM municipalities WHERE codigo_ibge = '9999999';
  ```

- [ ] **Document Access to Logs**
  - [ ] Who has access to Supabase dashboard?
  - [ ] How to export logs for compliance?
  - [ ] Incident response contact list

- [ ] **Set Up Log Monitoring** (Optional but Recommended)
  - [ ] Configure alerts for:
    - Failed authentication attempts (>10/minute)
    - Long-running queries (>10 seconds)
    - High error rates
  - [ ] Export logs to SIEM or log aggregation service:
    - Datadog
    - New Relic
    - Papertrail
    - CloudWatch (if on AWS)

### Post-Production Monitoring

- [ ] **Weekly Log Review**
  - Review slow query logs
  - Check for unusual patterns
  - Verify no unauthorized access

- [ ] **Monthly Compliance Export**
  - Export logs for LGPD compliance
  - Archive logs for retention requirements
  - Update incident response documentation

- [ ] **Quarterly Security Audit**
  - Review audit log coverage
  - Test log integrity
  - Verify retention policies

## Accessing Logs

### Supabase Dashboard

```
1. Go to: https://supabase.com/dashboard/project/zyuxkzfhkueeipokyhgw/logs
2. Select: "Database" or "Postgres" logs
3. Filter by:
   - Time range
   - Log level (ERROR, WARNING, INFO)
   - Query text search
4. Export: JSON or CSV for analysis
```

### SQL Queries (If Available)

```sql
-- View recent modifications (if pg_stat_statements enabled)
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%INSERT%' OR query LIKE '%UPDATE%' OR query LIKE '%DELETE%'
ORDER BY calls DESC
LIMIT 20;

-- View active connections
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = 'postgres'
ORDER BY query_start DESC;
```

## Cost Considerations

| Logging Level | Storage Cost | Performance Impact |
|---------------|--------------|-------------------|
| None | $0 | 0% |
| DDL only | ~$1-5/month | <0.1% |
| Modifications | ~$10-30/month | <1% |
| All queries | ~$50-200/month | 2-5% |

**Recommendation for Production:** Modifications + Duration
- Cost: ~$15-40/month
- Performance impact: <1%
- Compliance: ✅ Meets LGPD requirements
- Forensics: ✅ Sufficient for investigations

## Example Log Output

**Successful modification:**
```
2026-01-25 14:32:15 UTC [12345]: [1-1] user=postgres,db=postgres,app=cp2b_backend LOG:  duration: 2.451 ms  statement: INSERT INTO analysis_results (user_id, municipality_code, criteria_weights) VALUES ($1, $2, $3) RETURNING id
```

**Slow query warning:**
```
2026-01-25 14:33:42 UTC [12346]: [1-1] user=postgres,db=postgres,app=cp2b_backend LOG:  duration: 1523.892 ms  statement: SELECT ST_AsGeoJSON(geom) FROM municipalities WHERE ST_Intersects(geom, ST_Buffer(ST_MakePoint($1, $2)::geography, $3)::geometry)
```

**Failed query:**
```
2026-01-25 14:35:10 UTC [12347]: [1-1] user=postgres,db=postgres,app=cp2b_backend ERROR:  relation "non_existent_table" does not exist at character 15
2026-01-25 14:35:10 UTC [12347]: [1-2] user=postgres,db=postgres,app=cp2b_backend STATEMENT:  SELECT * FROM non_existent_table
```

## Compliance Mapping

### LGPD (Brazil Data Protection Law)

| Requirement | How Audit Logs Help |
|-------------|---------------------|
| Article 46: Security measures | Proves implementation of monitoring |
| Article 48: Security incident response | Forensic trail for investigations |
| Article 50: Data processing transparency | Track who accessed what data |

### FAPESP Research Grant

| Requirement | How Audit Logs Help |
|-------------|---------------------|
| Data integrity | Track modifications to research data |
| Reproducibility | Record data transformations |
| Institutional compliance | Meet university audit requirements |

## Emergency Response Procedure

**If Security Incident Detected:**

1. **Preserve Logs Immediately**
   ```bash
   # Export all logs for the incident period
   # Via Supabase dashboard or:
   pg_dump --schema=audit_log > incident_$(date +%Y%m%d).sql
   ```

2. **Analyze Attack Vector**
   - Review failed authentication attempts
   - Check for SQL injection patterns
   - Identify compromised accounts

3. **Containment**
   - Revoke compromised credentials
   - Block malicious IP addresses
   - Rotate JWT secret keys if needed

4. **Notification**
   - LGPD: Notify ANPD within 2 business days
   - Users: Notify affected users per Article 48
   - FAPESP: Report to grant coordinator

## References

- [PostgreSQL Logging Documentation](https://www.postgresql.org/docs/current/runtime-config-logging.html)
- [pgAudit Documentation](https://github.com/pgaudit/pgaudit)
- [Supabase Logging](https://supabase.com/docs/guides/platform/logs)
- [LGPD Article 48 - Security Incidents](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Sprint 4 Security Review**
**Status:** ⚠️ **ACTION REQUIRED - Enable before production**
**Priority:** CRITICAL
**Date:** 2026-01-25
