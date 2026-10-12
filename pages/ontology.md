# Financial crime data ontology

- **Domain:** Financial Crime
- **Synonyms:** data model, glossary, entities
- **Description:** The business entities in the demo data, how they relate, and the words analysts use for them.
- **Related assets and sources:** `fincrime.gold.customer_360`, `fincrime.gold.transactions`, `fincrime.gold.alerts`, `fincrime.gold.counterparty_network`, `fincrime.gold.structuring_candidates`

## Definition

The data describes customers, their transactions, the counterparties that receive transfers, the alerts raised on customers, and the decisions investigators record.

## Business use

Entities and relationships
- A **customer** (customer_360) has many **transactions**.
- A **transaction** has one **counterparty**. Cash uses the counterparty CASH. Card and mobile payments go to merchants and utilities. Transfers go to individuals or businesses.
- An **alert** is raised on one customer and names a **typology**: structuring, rapid pass-through, mule account or unusual volume.
- A **case** is an alert with a recorded **decision**: Escalated or Closed - false positive. Alerts without a decision are Open. Decisions are recorded in Lakebase and read through the alerts view.

Words analysts use
- "Candidate" means a customer who meets the structuring rule (structuring_candidates).
- "Concentration" means the share of a customer's transfers that went to one recipient.
- "Shared counterparty" means a counterparty paid by 3 or more distinct customers (counterparty_network). Many ordinary recipients are paid by several customers, such as suppliers, landlords and utilities, so a shared counterparty is a reason to look closer, not a conclusion. Describe it neutrally and do not link it to coordination, laundering or other wrongdoing.
- "New account" means opened within the last 30 days.

Tone for every answer about this data: describe what the data shows, use "consistent with" for patterns, never say or imply that a customer is guilty, and avoid words such as suspicious, illicit, laundering or coordinated.

All names, numbers and rules are fictional. Not regulatory guidance.
