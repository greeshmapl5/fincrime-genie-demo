# Alert status and case

- **Domain:** Financial Crime
- **Synonyms:** decision, outcome, case status, investigated alert
- **Description:** What the status of an alert means, and what a case is.
- **Related assets and sources:** `fincrime.gold.alerts`

## Definition

Alert status is one of three values: **Open**, **Escalated** or **Closed - false positive**. It comes from the latest investigator decision recorded in Lakebase. An alert with no decision is Open.

A **case** is an alert with a recorded decision, that is, an alert whose status is Escalated or Closed - false positive.

## Business use

How it is measured in the data
- The alerts view takes each alert from the monitoring data and joins the most recent decision for that alert (the latest decided_at wins).
- The columns are status, decision_rationale (the reason the investigator recorded) and decided_at (when).
- Counts of open alerts, escalated alerts and closed alerts use the status column.

What each status means
- Open: no decision has been recorded yet.
- Escalated: the investigator passed the alert to a senior investigator.
- Closed - false positive: the investigator found the activity explained by the customer's profile, and no further action is needed.

Note on wording
- In everyday speech "case" sometimes means any alert. In this data it means an alert with a recorded decision.
- The assistant gives analysis only. The investigator records the decision.

Evidence to collect
- The status, the rationale and the date of the decision.
- The typology and risk score of the alert.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
