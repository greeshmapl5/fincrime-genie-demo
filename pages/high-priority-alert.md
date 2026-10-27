# High-priority alert

- **Domain:** Financial Crime
- **Synonyms:** urgent alert, top-priority alert, high-risk open alert
- **Description:** An open alert with a risk score of 0.8 or more.
- **Related assets and sources:** `fincrime.gold.alerts`

## Definition

A high-priority alert is an alert with a risk score of 0.8 or more and a status of Open.

## Business use

How it is measured in the data
- alerts.risk_score is a model score from 0 to 1. A higher score means the pattern is closer to the typology the alert was raised for.
- alerts.status must be Open. Escalated alerts and alerts closed as false positives are not counted.
- The MLRO dashboard counter "High priority open" uses this definition.

How to read it
- Priority is about the order in which alerts are reviewed. It is not a conclusion about the customer.
- The investigator decides the outcome.

Evidence to collect
- The risk score, the typology and the alert date.
- The customer's profile and the supporting data.

This is fictional demo content, not regulatory guidance.
