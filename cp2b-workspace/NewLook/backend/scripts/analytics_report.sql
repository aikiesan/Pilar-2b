-- analytics_report.sql — audience report, read-only.
--
-- On the VM, from cp2b-workspace/NewLook/backend:
--   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
--   PGOPTIONS='-c default_transaction_read_only=on' psql "$DB" -X -P pager=off \
--       -v days=30 -f scripts/analytics_report.sql
--
-- Two layers (app/api/v1/endpoints/analytics.py):
--   analytics_page_counts, analytics_page_time  every visit; anonymous daily
--                                                totals (migration 038)
--   analytics_pageviews                         only with "Accept all"; random
--                                                visitor and session ids (036)
-- The browser sends both on the same route change, so consented views over all
-- views is the share of visitors who accept statistics. Dividing the consented
-- visitors and sessions by that share estimates them for everyone, assuming
-- those who accept browse like those who do not. The estimate covers only days
-- with anonymous counts (from the day migration 038 went live).

\if :{?days}
\else
\set days 30
\endif

\echo
\echo '== Per day: all visits and views (anonymous), and the consented share'
WITH a AS (
    SELECT day, sum(views) FILTER (WHERE entry) AS visits, sum(views) AS views
    FROM analytics_page_counts
    WHERE day > current_date - :days
    GROUP BY 1
), c AS (
    SELECT (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
           count(*) AS views, count(DISTINCT visitor_id) AS visitors
    FROM analytics_pageviews
    WHERE occurred_at > now() - make_interval(days => :days)
    GROUP BY 1
)
SELECT day,
       coalesce(a.visits, 0) AS visits,
       coalesce(a.views, 0) AS views,
       coalesce(c.views, 0) AS consented_views,
       coalesce(c.visitors, 0) AS consented_visitors,
       round(100.0 * c.views / nullif(a.views, 0), 1) AS pct_consent
FROM a FULL JOIN c USING (day)
ORDER BY day DESC;

\echo
\echo '== Period: consent share and estimated visitors'
WITH since AS (
    SELECT greatest(current_date - :days + 1, min(day)) AS day FROM analytics_page_counts
), a AS (
    SELECT coalesce(sum(views) FILTER (WHERE entry), 0) AS visits, coalesce(sum(views), 0) AS views
    FROM analytics_page_counts WHERE day >= (SELECT day FROM since)
), c AS (
    SELECT count(*) AS views, count(DISTINCT visitor_id) AS visitors,
           count(DISTINCT session_id) AS sessions
    FROM analytics_pageviews
    WHERE (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date >= (SELECT day FROM since)
)
SELECT (SELECT day FROM since) AS since,
       a.visits, a.views,
       round(a.views::numeric / nullif(a.visits, 0), 2) AS pages_per_visit,
       c.views AS consented_views,
       round(100.0 * c.views / nullif(a.views, 0), 1) AS pct_consent,
       c.visitors AS consented_visitors,
       round(c.visitors * a.views::numeric / nullif(c.views, 0)) AS estimated_visitors,
       round(c.sessions * a.views::numeric / nullif(c.views, 0)) AS estimated_sessions
FROM a, c;

\echo
\echo '== Pages: views and average visible time (all visitors)'
WITH v AS (
    SELECT path, sum(views) AS views, coalesce(sum(views) FILTER (WHERE entry), 0) AS entries
    FROM analytics_page_counts WHERE day > current_date - :days GROUP BY 1
), t AS (
    SELECT path, sum(seconds) AS seconds
    FROM analytics_page_time WHERE day > current_date - :days GROUP BY 1
)
SELECT path, views, entries,
       round(coalesce(t.seconds, 0)::numeric / views) AS avg_visible_s
FROM v LEFT JOIN t USING (path)
ORDER BY views DESC, path
LIMIT 25;

\echo
\echo '== Where visits come from (all visitors; entries only)'
SELECT CASE WHEN referrer_host = '' THEN '(direct)' ELSE referrer_host END AS origin,
       sum(views) AS visits
FROM analytics_page_counts
WHERE entry AND day > current_date - :days
GROUP BY 1
ORDER BY 2 DESC, 1
LIMIT 15;

\echo
\echo '== Device and language (all visitors; visits)'
SELECT device, locale, sum(views) AS visits
FROM analytics_page_counts
WHERE entry AND day > current_date - :days
GROUP BY 1, 2
ORDER BY 3 DESC;

\echo
\echo '== Consented sessions: pages per session, share that saw one page, duration of the others'
WITH s AS (
    SELECT session_id, count(*) AS n,
           extract(epoch FROM max(occurred_at) - min(occurred_at)) AS dur
    FROM analytics_pageviews
    WHERE occurred_at > now() - make_interval(days => :days)
    GROUP BY 1
), m AS (SELECT dur FROM s WHERE n > 1)
SELECT (SELECT count(*) FROM s) AS sessions,
       (SELECT round(avg(n), 2) FROM s) AS pages_per_session,
       (SELECT round(100.0 * avg((n = 1)::int), 1) FROM s) AS pct_one_page,
       (SELECT round((percentile_cont(0.5) WITHIN GROUP (ORDER BY dur))::numeric / 60, 1) FROM m) AS median_min,
       (SELECT round((percentile_cont(0.75) WITHIN GROUP (ORDER BY dur))::numeric / 60, 1) FROM m) AS p75_min;

\echo
\echo '== Returning visitors (consented): visitors seen on more than one day'
SELECT count(*) AS visitors,
       count(*) FILTER (WHERE days > 1) AS returning,
       round(100.0 * avg((days > 1)::int), 1) AS pct_returning
FROM (
    SELECT visitor_id, count(DISTINCT (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date) AS days
    FROM analytics_pageviews
    WHERE occurred_at > now() - make_interval(days => :days)
    GROUP BY 1
) v;
