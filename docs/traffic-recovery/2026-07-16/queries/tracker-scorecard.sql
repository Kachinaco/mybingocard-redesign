-- MyBingoCard Tracker Lite matched-window scorecard.
-- Run with sqlite3 -readonly against analytics.sqlite.
-- Behavioral timestamp: occurred_at. received_at is ingestion diagnostics only.

WITH windows(period, start_utc, end_utc) AS (
  VALUES
    ('prior',   '2026-07-06T07:00:00.000Z', '2026-07-09T16:38:00.000Z'),
    ('current', '2026-07-13T07:00:00.000Z', '2026-07-16T16:38:00.000Z')
),
base AS (
  SELECT
    w.period,
    r.id,
    r.event_type,
    r.pathname,
    r.anonymous_id,
    r.visitor_id,
    r.session_id,
    r.referrer,
    r.metadata_json,
    r.occurred_at,
    r.received_at,
    coalesce(s.audience, 'unclassified') AS audience,
    coalesce(r.user_agent, '') AS user_agent,
    CASE
      WHEN r.referrer IS NULL OR trim(r.referrer) IN ('', '-') THEN 'direct_or_unknown'
      WHEN lower(r.referrer) LIKE '%chatgpt%' OR lower(r.referrer) LIKE '%openai%' THEN 'chatgpt'
      WHEN lower(r.referrer) LIKE '%google.%' THEN 'google'
      WHEN lower(r.referrer) LIKE '%bing.%'
        OR lower(r.referrer) LIKE '%duckduckgo.%'
        OR lower(r.referrer) LIKE '%yahoo.%' THEN 'other_search'
      WHEN lower(r.referrer) LIKE '%mybingocard.com%' THEN 'internal'
      ELSE 'other_external'
    END AS referrer_bucket,
    lower(coalesce(
      json_extract(r.metadata_json, '$.utm.source'),
      json_extract(r.metadata_json, '$.utm_source'),
      ''
    )) AS utm_source,
    lower(coalesce(
      json_extract(r.metadata_json, '$.utm.medium'),
      json_extract(r.metadata_json, '$.utm_medium'),
      ''
    )) AS utm_medium
  FROM windows w
  JOIN raw_events r
    ON r.occurred_at >= w.start_utc
   AND r.occurred_at < w.end_utc
  JOIN sites site
    ON site.id = r.site_id
   AND site.domain = 'mybingocard.com'
  LEFT JOIN sessions s
    ON s.site_id = r.site_id
   AND s.session_id = r.session_id
),
classified_human AS (
  SELECT *
  FROM base
  WHERE audience IN ('known_user', 'public_unknown')
    AND lower(user_agent) NOT GLOB '*bot*'
    AND lower(user_agent) NOT GLOB '*crawl*'
    AND lower(user_agent) NOT GLOB '*spider*'
    AND lower(user_agent) NOT GLOB '*headless*'
),
classified_sessions AS (
  SELECT period, audience, count(DISTINCT session_id) AS sessions
  FROM base
  WHERE audience IN ('known_user', 'public_unknown', 'bot_like')
  GROUP BY period, audience
),
summary AS (
  SELECT
    period,
    count(*) FILTER (WHERE event_type IN ('pageview', 'page_view')) AS classified_human_pageviews,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND pathname = '/create'
    ) AS create_pageviews,
    count(DISTINCT CASE
      WHEN event_type IN ('pageview', 'page_view') AND pathname = '/create'
      THEN coalesce(visitor_id, anonymous_id)
    END) AS create_visitors,
    count(DISTINCT CASE
      WHEN event_type IN ('pageview', 'page_view') AND pathname = '/create'
      THEN session_id
    END) AS create_sessions,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND referrer_bucket = 'direct_or_unknown'
    ) AS direct_or_unknown_pageviews,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND referrer_bucket = 'chatgpt'
    ) AS chatgpt_pageviews,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND referrer_bucket = 'google'
    ) AS google_pageviews,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND utm_source = 'chatgpt.com'
    ) AS utm_chatgpt_pageviews,
    count(*) FILTER (
      WHERE event_type IN ('pageview', 'page_view') AND (utm_medium <> '' OR utm_source <> '')
    ) AS tagged_pageviews,
    count(*) FILTER (
      WHERE julianday(received_at) - julianday(occurred_at) > (5.0 / 1440.0)
    ) AS received_over_5m_late
  FROM classified_human
  GROUP BY period
),
bot_share AS (
  SELECT
    period,
    100.0 * sum(CASE WHEN audience = 'bot_like' THEN sessions ELSE 0 END)
      / nullif(sum(sessions), 0) AS bot_like_session_share_percent
  FROM classified_sessions
  GROUP BY period
)
SELECT s.*, round(b.bot_like_session_share_percent, 1) AS bot_like_session_share_percent
FROM summary s
JOIN bot_share b USING (period)
ORDER BY s.period;

-- First landing page per session. Run as a second statement when needed.
WITH windows(period, start_utc, end_utc) AS (
  VALUES
    ('prior',   '2026-07-06T07:00:00.000Z', '2026-07-09T16:38:00.000Z'),
    ('current', '2026-07-13T07:00:00.000Z', '2026-07-16T16:38:00.000Z')
),
ranked AS (
  SELECT
    w.period,
    r.session_id,
    r.pathname AS landing_page,
    coalesce(r.visitor_id, r.anonymous_id) AS visitor_key,
    CASE
      WHEN r.referrer IS NULL OR trim(r.referrer) IN ('', '-') THEN 'direct_or_unknown'
      WHEN lower(r.referrer) LIKE '%chatgpt%' OR lower(r.referrer) LIKE '%openai%' THEN 'chatgpt'
      WHEN lower(r.referrer) LIKE '%google.%' THEN 'google'
      WHEN lower(r.referrer) LIKE '%mybingocard.com%' THEN 'internal'
      ELSE 'other_external'
    END AS source_bucket,
    row_number() OVER (
      PARTITION BY w.period, r.session_id
      ORDER BY r.occurred_at, r.id
    ) AS rn
  FROM windows w
  JOIN raw_events r
    ON r.occurred_at >= w.start_utc
   AND r.occurred_at < w.end_utc
  JOIN sites site ON site.id = r.site_id AND site.domain = 'mybingocard.com'
  JOIN sessions s ON s.site_id = r.site_id AND s.session_id = r.session_id
  WHERE r.event_type IN ('pageview', 'page_view')
    AND s.audience IN ('known_user', 'public_unknown')
)
SELECT
  period,
  source_bucket,
  landing_page,
  count(*) AS landing_sessions,
  count(DISTINCT visitor_key) AS landing_visitors
FROM ranked
WHERE rn = 1
GROUP BY period, source_bucket, landing_page
ORDER BY period, landing_sessions DESC, landing_page;
