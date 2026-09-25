-- 035_analytics_pageviews.sql
--
-- Page views for the site's own audience statistics, kept in the platform's
-- database on the UNICAMP VM: no third-party analytics service. The browser
-- sends one only after the visitor chose "Accept all" in the cookie banner
-- (LGPD art. 7 I: consent).
--
-- Pseudonymous and minimised: visitor_id is a random value kept in a
-- first-party cookie (about 13 months), session_id a random value per browser
-- tab. No IP address, no user-agent string, no query string: only the page
-- path without its language prefix, the language, the host of the referring
-- site and a device class.
--
-- The backend deletes rows older than ANALYTICS_RETENTION_DAYS (default 395
-- days, about 13 months).
--
-- Safe to re-run: CREATE ... IF NOT EXISTS.
--
-- Check:
--   SELECT (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
--          count(*) AS views, count(DISTINCT visitor_id) AS visitors
--   FROM analytics_pageviews GROUP BY 1 ORDER BY 1 DESC LIMIT 7;

CREATE TABLE IF NOT EXISTS analytics_pageviews (
    id            BIGSERIAL PRIMARY KEY,
    visitor_id    UUID NOT NULL,
    session_id    UUID NOT NULL,
    path          TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
    locale        TEXT NOT NULL CHECK (locale IN ('pt-BR', 'en')),
    referrer_host TEXT CHECK (char_length(referrer_host) <= 253),
    device        TEXT NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_time ON analytics_pageviews (occurred_at);

COMMENT ON TABLE analytics_pageviews IS
    'First-party audience statistics, recorded only with the visitor''s consent. Pseudonymous (random visitor/session ids), no IP, no user agent. Rows past ANALYTICS_RETENTION_DAYS are deleted by the backend.';
