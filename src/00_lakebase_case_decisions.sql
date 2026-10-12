-- Run this in the Lakebase project's SQL editor (database: databricks_postgres), NOT in the Databricks SQL Editor.
-- Lakebase is the operational system of record for investigator decisions.
-- The lakehouse reads it read-only through the Unity Catalog catalog `fincrime_source`.
-- All content is fictional demo data.

CREATE TABLE IF NOT EXISTS case_decisions (
  decision_id BIGSERIAL PRIMARY KEY,
  alert_id    TEXT        NOT NULL,
  decision    TEXT        NOT NULL CHECK (decision IN ('Escalated', 'Closed - false positive')),
  rationale   TEXT,
  decided_by  TEXT        NOT NULL DEFAULT 'investigator',
  decided_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_decisions_alert ON case_decisions (alert_id);

-- Seed decisions for the 60 historical alerts A0001..A0060 (see 01_generate_bronze_data.py).
-- i % 3 = 0 -> Escalated, i % 3 = 1 -> Closed - false positive, i % 3 = 2 -> stays Open (no row).
-- The planted demo alerts A0101..A0109 deliberately have no decision: the investigator records those live.
-- Safe to re-run: the seed is inserted only once.
INSERT INTO case_decisions (alert_id, decision, rationale, decided_by, decided_at)
SELECT 'A' || lpad(i::text, 4, '0'),
       CASE WHEN i % 3 = 0 THEN 'Escalated' ELSE 'Closed - false positive' END,
       CASE WHEN i % 3 = 0
            THEN 'Pattern consistent with a documented typology. Escalated to a senior investigator.'
            ELSE 'Activity explained by the customer profile. No further action.' END,
       'seed',
       now() - make_interval(days => i)
FROM generate_series(1, 60) AS i
WHERE i % 3 IN (0, 1)
  AND NOT EXISTS (SELECT 1 FROM case_decisions WHERE decided_by = 'seed');

-- Check: expect 40 rows (20 Escalated, 20 Closed - false positive)
SELECT decision, COUNT(*) FROM case_decisions GROUP BY decision;

-- The earlier connectivity test table can be removed once you no longer need it:
-- DROP TABLE IF EXISTS smoke_cases;
