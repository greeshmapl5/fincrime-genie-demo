# Activity compared with expected volume

- **Domain:** Financial Crime
- **Synonyms:** unusual volume, above expectation, expected monthly volume
- **Description:** How to compare a customer's activity with the expected monthly volume captured at onboarding.
- **Related assets and sources:** `fincrime.gold.customer_360`, `fincrime.gold.transactions`, `fincrime.gold.structuring_candidates`

## Definition

Compare total inflows only (direction = 'in') over the period with expected_monthly_volume in customer_360. Never add inflows and outflows together, because that counts the same money twice.

## Business use

- expected_monthly_volume is the inflow value the customer said to expect at onboarding, in SEK.
- A customer whose inflows in the last 14 days are above expected_monthly_volume has activity above expectation. In structuring_candidates this is the column inflows_exceed_expected_volume.
- Above expectation is a reason to look closer, not a conclusion. New businesses often grow faster than their onboarding estimate.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Do not describe a customer's intent or purpose, and do not call a pattern a red flag. Avoid words such as deliberate, red flag, suspicious, illicit, laundering, layering scheme or funnel.
