-- Clean first-party application pageview acquisition decomposition.
-- Run only against an immutable/read-only application SQLite connection.
-- Correct UTM path: $.metadata.utm.source.

WITH windows(period, start_ms, end_ms) AS (
  VALUES
    ('prior',   1783321200000, 1783615080000),
    ('current', 1783926000000, 1784219880000)
),
events AS (
  SELECT
    w.period,
    d.object_id,
    CAST(json_extract(d.ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) AS created_ms,
    coalesce(json_extract(d.ejson, '$.event'), json_extract(d.ejson, '$.eventName')) AS event_name,
    coalesce(json_extract(d.ejson, '$.sessionId'), json_extract(d.ejson, '$.metadata.sessionId')) AS session_id,
    coalesce(json_extract(d.ejson, '$.anonymousId'), json_extract(d.ejson, '$.metadata.anonymousId')) AS anonymous_id,
    lower(coalesce(json_extract(d.ejson, '$.metadata.userAgent'), '')) AS user_agent,
    lower(coalesce(json_extract(d.ejson, '$.metadata.referrer'), '')) AS referrer,
    lower(coalesce(
      json_extract(d.ejson, '$.metadata.utm.source'),
      json_extract(d.ejson, '$.metadata.utm_source'),
      ''
    )) AS utm_source,
    lower(coalesce(
      json_extract(d.ejson, '$.metadata.utm.medium'),
      json_extract(d.ejson, '$.metadata.utm_medium'),
      ''
    )) AS utm_medium,
    lower(coalesce(
      json_extract(d.ejson, '$.metadata.utm.campaign'),
      json_extract(d.ejson, '$.metadata.utm_campaign'),
      ''
    )) AS utm_campaign,
    lower(coalesce(json_extract(d.ejson, '$.email'), '')) AS email,
    lower(coalesce(json_extract(d.ejson, '$.name'), '')) AS name
  FROM windows w
  JOIN documents d
    ON d.collection = 'activity_events'
   AND CAST(json_extract(d.ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) >= w.start_ms
   AND CAST(json_extract(d.ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) < w.end_ms
),
clean_pageviews AS (
  SELECT *,
    CASE
      WHEN referrer = '' THEN 'direct_or_unknown'
      WHEN referrer LIKE '%chatgpt%' OR referrer LIKE '%openai%' THEN 'chatgpt'
      WHEN referrer LIKE '%google.%' THEN 'google'
      WHEN referrer LIKE '%bing.%' THEN 'bing'
      WHEN referrer LIKE '%mybingocard.com%' THEN 'internal'
      WHEN referrer LIKE '%youtube.%' THEN 'youtube'
      WHEN referrer LIKE '%baidu.%' THEN 'baidu'
      ELSE 'other_external'
    END AS referrer_bucket
  FROM events
  WHERE event_name = 'page_view'
    AND user_agent NOT LIKE '%bot%'
    AND user_agent NOT LIKE '%crawl%'
    AND user_agent NOT LIKE '%spider%'
    AND user_agent NOT LIKE '%headless%'
    AND user_agent NOT LIKE '%lighthouse%'
    AND user_agent NOT LIKE '%pagespeed%'
    AND user_agent NOT LIKE '%monitor%'
    AND email NOT LIKE '%test%'
    AND email NOT LIKE '%@example.%'
    AND email NOT LIKE '%@mybingocard.com'
    AND email NOT LIKE '%cory%'
    AND name NOT LIKE '%test%'
    AND name NOT LIKE '%cory%'
)
SELECT
  period,
  count(*) AS clean_pageviews,
  count(DISTINCT anonymous_id) AS anonymous_ids,
  count(DISTINCT session_id) AS sessions,
  count(*) FILTER (WHERE referrer_bucket = 'direct_or_unknown') AS direct_or_unknown_pageviews,
  count(*) FILTER (WHERE referrer_bucket = 'chatgpt') AS chatgpt_referrer_pageviews,
  count(*) FILTER (WHERE referrer_bucket = 'google') AS google_pageviews,
  count(*) FILTER (WHERE referrer_bucket = 'bing') AS bing_pageviews,
  count(*) FILTER (WHERE referrer_bucket = 'internal') AS internal_pageviews,
  count(*) FILTER (WHERE utm_source = 'chatgpt.com') AS chatgpt_utm_pageviews,
  count(*) FILTER (WHERE utm_medium <> '' OR utm_campaign <> '') AS paid_or_campaign_pageviews
FROM clean_pageviews
GROUP BY period
ORDER BY period;

-- Referrer detail. Keep aggregate-only output.
WITH windows(period, start_ms, end_ms) AS (
  VALUES
    ('prior',   1783321200000, 1783615080000),
    ('current', 1783926000000, 1784219880000)
)
SELECT
  w.period,
  lower(coalesce(json_extract(d.ejson, '$.metadata.referrer'), '')) AS referrer,
  count(*) AS pageviews,
  count(DISTINCT coalesce(
    json_extract(d.ejson, '$.sessionId'),
    json_extract(d.ejson, '$.metadata.sessionId')
  )) AS sessions
FROM windows w
JOIN documents d
  ON d.collection = 'activity_events'
 AND coalesce(json_extract(d.ejson, '$.event'), json_extract(d.ejson, '$.eventName')) = 'page_view'
 AND CAST(json_extract(d.ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) >= w.start_ms
 AND CAST(json_extract(d.ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) < w.end_ms
GROUP BY w.period, referrer
ORDER BY w.period, pageviews DESC;
