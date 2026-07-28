-- MyBingoCard persisted business-outcome scorecard.
-- Run only against an immutable/read-only SQLite connection.
-- Expected schema: documents(collection, object_id, ejson).

WITH windows(period, start_ms, end_ms) AS (
  VALUES
    ('prior',   1783321200000, 1783615080000),
    ('current', 1783926000000, 1784219880000)
),
users AS (
  SELECT
    object_id,
    CAST(json_extract(ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) AS created_ms,
    lower(coalesce(json_extract(ejson, '$.email'), '')) AS email,
    lower(coalesce(json_extract(ejson, '$.name'), '')) AS name,
    lower(coalesce(json_extract(ejson, '$.customerType'), '')) AS customer_type
  FROM documents
  WHERE collection = 'users'
),
reportable_users AS (
  SELECT *
  FROM users
  WHERE email <> ''
    AND email NOT LIKE '%guest%'
    AND email NOT LIKE '%test%'
    AND email NOT LIKE '%@example.%'
    AND email NOT LIKE '%admin%'
    AND email NOT LIKE '%@mybingocard.com'
    AND email NOT LIKE '%cory%'
    AND name NOT LIKE '%guest%'
    AND name NOT LIKE '%test%'
    AND name NOT LIKE '%admin%'
    AND name NOT LIKE '%mybingocard%'
    AND name NOT LIKE '%cory%'
    AND customer_type NOT IN ('guest', 'test', 'admin')
),
cards AS (
  SELECT
    object_id,
    CAST(json_extract(ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) AS created_ms,
    coalesce(
      json_extract(ejson, '$.userId."$oid"'),
      json_extract(ejson, '$.userId'),
      json_extract(ejson, '$.ownerId."$oid"'),
      json_extract(ejson, '$.ownerId')
    ) AS owner_id
  FROM documents
  WHERE collection = 'cards'
),
activity AS (
  SELECT
    object_id,
    CAST(json_extract(ejson, '$.createdAt."$date"."$numberLong"') AS INTEGER) AS created_ms,
    coalesce(json_extract(ejson, '$.event'), json_extract(ejson, '$.eventName')) AS event_name,
    lower(coalesce(json_extract(ejson, '$.source'), '')) AS event_source,
    coalesce(
      json_extract(ejson, '$.userId."$oid"'),
      json_extract(ejson, '$.userId')
    ) AS user_id
  FROM documents
  WHERE collection = 'activity_events'
)
SELECT
  w.period,
  (SELECT count(*) FROM reportable_users u
    WHERE u.created_ms >= w.start_ms AND u.created_ms < w.end_ms) AS reportable_accounts,
  (SELECT count(*) FROM cards c
    WHERE c.created_ms >= w.start_ms AND c.created_ms < w.end_ms) AS persisted_cards,
  (SELECT count(DISTINCT owner_id) FROM cards c
    WHERE c.created_ms >= w.start_ms AND c.created_ms < w.end_ms
      AND owner_id IS NOT NULL AND owner_id <> '') AS distinct_card_owners,
  (SELECT count(DISTINCT user_id) FROM activity a
    WHERE a.created_ms >= w.start_ms AND a.created_ms < w.end_ms
      AND a.event_name = 'card_created'
      AND a.event_source = 'server'
      AND a.user_id IS NOT NULL AND a.user_id <> '') AS server_card_created_users,
  (SELECT count(DISTINCT user_id) FROM activity a
    WHERE a.created_ms >= w.start_ms AND a.created_ms < w.end_ms
      AND a.event_name = 'first_card_created'
      AND a.event_source = 'server'
      AND a.user_id IS NOT NULL AND a.user_id <> '') AS server_first_card_created_users
FROM windows w
ORDER BY w.period;
