# Rapid pass-through

- **Domain:** Financial Crime
- **Synonyms:** layering, funds in and out, flow-through
- **Description:** Funds received are sent onward within a short time.
- **Related assets and sources:** `fincrime.gold.transactions`, `fincrime.gold.structuring_candidates`, `fincrime.gold.counterparty_network`

## Definition

At least 80 percent of funds received are sent onward within 48 hours.

## Business use

Typical indicators
- Outgoing transfers soon after incoming deposits
- Transfers concentrated on one recipient, shown by the share of transfers going to the top counterparty
- Very little balance retained

Common innocent explanations
- A reseller or consultancy that collects customer invoices and pays one supplier shortly after
- Payroll or pooled payments handled on behalf of others

How it is measured in the data
- In structuring_candidates, outflow_to_inflow_ratio divides all money sent by all money received over the last 14 days. It is a proxy for rapid pass-through. It does not test the 48-hour timing, so a ratio of 0.8 or more means the pattern is consistent with the definition, not that it has been confirmed.

Evidence to collect
- Outflow divided by inflow over the period
- Which counterparty received the largest share of transfers
- Whether the recipient is paid by several unrelated customers

Describe what the data shows in neutral language. Do not describe a customer's purpose or intent, and avoid words such as suspicious or illicit. This is fictional demo content, not regulatory guidance.
