# Shared counterparty

- **Domain:** Financial Crime
- **Synonyms:** shared recipient, common recipient, recipient paid by several customers
- **Description:** A recipient that several different customers send transfers to.
- **Related assets and sources:** `fincrime.gold.counterparty_network`, `fincrime.gold.transactions`, `fincrime.gold.structuring_candidates`

## Definition

A shared counterparty is a counterparty that receives transfers from 3 or more distinct customers over the last 30 days. The 30 days are measured back from the latest transaction in the data, not from today.

## Business use

How it is measured in the data
- In counterparty_network, the column distinct_customers_paying counts the different customers who sent transfers to the counterparty. A counterparty is shared when distinct_customers_paying is 3 or more.
- Only transfers out are counted. Card and mobile payments to merchants are not included.
- Other columns: counterparty_id, counterparty_type (Individual or Business), payment_count (transfers received) and total_received (in SEK).

How to read it
- Many ordinary recipients are paid by several customers, such as suppliers, landlords and pooled payment services.
- A shared counterparty is a reason to look closer. It is not a conclusion.

What this does not show
- It does not show that the paying customers are connected to each other.
- It does not show why any customer made a transfer.
- This Page does not list other risk factors. Do not add a section on what "might be suspicious" or any other list of factors that is not on this Page.

Evidence to collect
- Who the counterparty is, and its type.
- How many customers pay it, how often, and how much in total.
- What the paying customers have in common, such as sector or account age.
- How much of each customer's transfers goes to this counterparty (see concentration of transfers).
- The timing of the transfers compared with the customers' deposits.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
