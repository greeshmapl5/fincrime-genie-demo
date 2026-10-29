# Concentration of transfers

- **Domain:** Financial Crime
- **Synonyms:** concentration, top counterparty share, share to one recipient, recipient concentration
- **Description:** How much of a customer's outgoing transfers went to a single recipient.
- **Related assets and sources:** `fincrime.gold.structuring_candidates`, `fincrime.gold.transactions`, `fincrime.gold.counterparty_network`

## Definition

Concentration is the share of a customer's transfers out, over the last 14 days, that went to the single largest recipient, from 0 to 1. A value of 0.94 means 94 percent of the money sent by transfer went to one recipient.

## Business use

How it is measured in the data
- In structuring_candidates, the column top_onward_counterparty_share holds the share, and top_onward_counterparty names the recipient.
- Only transfers out are counted (channel = 'transfer', direction = 'out'). Card, mobile and cash payments are not included.
- The 14 days are measured back from the latest transaction in the data, not from today.

How to read it
- A value close to 1 means the customer's transfers are concentrated on one recipient.
- A low value means the transfers are spread across several recipients.

Common innocent explanations
- A business that pays one main supplier or landlord.
- A reseller or consultancy that collects customer invoices and pays one supplier shortly after.

Evidence to collect
- The share, and who the recipient is.
- Whether other customers also pay the same recipient (see shared counterparty in the ontology page).
- The timing of the transfers compared with the deposits.

Concentration is a reason to look closer, not a conclusion.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
