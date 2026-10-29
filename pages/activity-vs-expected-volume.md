# Activity compared with expected volume

- **Domain:** Financial Crime
- **Synonyms:** unusual volume, above expectation, expected monthly volume
- **Description:** How to compare a customer's activity with the expected monthly volume captured at onboarding.
- **Related assets and sources:** `fincrime.gold.customer_360`, `fincrime.gold.transactions`, `fincrime.gold.structuring_candidates`

## Definition

Compare total inflows only (direction = 'in') over the period with expected_monthly_volume in customer_360. Never add inflows and outflows together, because that counts the same money twice.

## Business use

How it is measured in the data
- The comparison is already calculated in structuring_candidates, in the column inflows_exceed_expected_volume. Use that column.
- It adds up the **amounts** of all inflows (direction = 'in') over the last 14 days, and checks whether the total is above expected_monthly_volume. It does not count transactions, and it does not scale the 14 days to a month.
- The 14 days are measured back from the latest transaction in the data, not from today.
- expected_monthly_volume is the inflow value the customer said to expect at onboarding, in SEK.

How to read it
- A customer whose inflows are above expected_monthly_volume has activity above expectation.
- Above expectation is a reason to look closer, not a conclusion. New businesses often grow faster than their onboarding estimate.

Do not add example queries, other calculations or other thresholds. If a different calculation is needed, say it is not defined on this Page.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
