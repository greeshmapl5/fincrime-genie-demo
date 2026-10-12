-- Example SQL for the Genie space (Configure > Instructions > SQL queries / examples).
-- Add each query with the question in the comment as its title. All data is fictional.

-- Question: Which customers look like structuring candidates?
SELECT customer_id, segment, sector, account_age_days, near_threshold_deposits,
       total_near_threshold_deposited, outflow_to_inflow_ratio,
       top_onward_counterparty, top_onward_counterparty_share,
       inflows_exceed_expected_volume, open_alert_id
FROM fincrime.gold.structuring_candidates
ORDER BY near_threshold_deposits DESC;

-- Question: Which counterparties received money from several customers?
SELECT counterparty_id, counterparty_type, distinct_customers_paying, payment_count, total_received
FROM fincrime.gold.counterparty_network
WHERE distinct_customers_paying >= 3
ORDER BY distinct_customers_paying DESC;

-- Question: Which open alerts are highest priority?
SELECT a.alert_id, a.customer_id, c.segment, c.sector, a.typology, a.risk_score, a.alert_date
FROM fincrime.gold.alerts a
JOIN fincrime.gold.customer_360 c ON a.customer_id = c.customer_id
WHERE a.status = 'Open' AND a.risk_score >= 0.8
ORDER BY a.risk_score DESC;

-- Question: How many alerts are open, escalated and closed as false positive?
SELECT status, COUNT(*) AS alerts
FROM fincrime.gold.alerts
GROUP BY status
ORDER BY alerts DESC;
