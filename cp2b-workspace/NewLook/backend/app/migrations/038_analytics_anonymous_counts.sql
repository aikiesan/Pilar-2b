-- 038_analytics_anonymous_counts.sql
--
-- Anonymous page counts for EVERY visit, beside the consented page views of
-- migration 036. The browser sends them with no cookie, no identifier and
-- nothing stored on the device, and the backend keeps only daily totals: no row
-- can be tied to a person (LGPD art. 12: anonymised data is not personal data).
-- No IP address, no user agent, no query string, no visitor or session id.
--
--   analytics_page_counts  per day, page, language, device class, whether the
--                          view opened the visit (`entry`: the first page of a
--                          page load) and, for entries, the referring site
--                          ('' = none, or not an entry): how many views.
--                          Entries count visits; views / entries is pages per
--                          visit.
--   analytics_page_time    per day and page: seconds the page stayed visible in
--                          the browser, summed over all its views. Average time
--                          on a page = seconds / views of that page that day.
--
-- Both layers are sent by the same route change in the browser, so the share
-- of views that carry consent (036 over these counts) is the share of visitors
-- who accept statistics, and the consented visitor count divided by that share
-- estimates all visitors (scripts/analytics_report.sql).
--
-- Totals are kept as a time series: they hold no personal data, so the 036
-- retention period (ANALYTICS_RETENTION_DAYS) does not apply to them.
--
-- Safe to re-run: CREATE ... IF NOT EXISTS.
--
-- Apply:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--        -f app/migrations/038_analytics_anonymous_counts.sql
-- Check:
--   SELECT day, sum(views) AS views, sum(views) FILTER (WHERE entry) AS visits
--   FROM analytics_page_counts GROUP BY 1 ORDER BY 1 DESC LIMIT 7;

CREATE TABLE IF NOT EXISTS analytics_page_counts (
    day           DATE    NOT NULL,
    path          TEXT    NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
    locale        TEXT    NOT NULL CHECK (locale IN ('pt-BR', 'en')),
    device        TEXT    NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
    entry         BOOLEAN NOT NULL,
    referrer_host TEXT    NOT NULL DEFAULT '' CHECK (char_length(referrer_host) <= 253),
    views         INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    PRIMARY KEY (day, path, locale, device, entry, referrer_host),
    CHECK (entry OR referrer_host = '')
);

CREATE TABLE IF NOT EXISTS analytics_page_time (
    day     DATE   NOT NULL,
    path    TEXT   NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
    seconds BIGINT NOT NULL DEFAULT 0 CHECK (seconds >= 0),
    PRIMARY KEY (day, path)
);

COMMENT ON TABLE analytics_page_counts IS
    'Anonymous daily page views of every visit (no cookie, no identifier, no IP): views per day, page, language, device class, visit entry and referring site.';
COMMENT ON TABLE analytics_page_time IS
    'Anonymous daily visible time per page (no cookie, no identifier, no IP), in seconds summed over all views.';
