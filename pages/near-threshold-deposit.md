# Near-threshold deposit

- **Domain:** Financial Crime
- **Synonyms:** just-below-threshold deposit, near-limit cash deposit, near-threshold cash deposit
- **Description:** A cash deposit of at least 9,000 and below 10,000 SEK.
- **Related assets and sources:** `fincrime.gold.transactions`, `fincrime.gold.structuring_candidates`

## Definition

A near-threshold deposit is a cash deposit (channel = 'cash', direction = 'in') of at least 9,000 SEK and below 10,000 SEK. The internal review threshold is 10,000 SEK.

## Business use

How it is measured in the data
- In structuring_candidates, near_threshold_deposits counts these deposits over the last 14 days, and total_near_threshold_deposited adds up their amounts in SEK.
- The 14 days are measured back from the latest transaction in the data, not from today.
- A customer meets the structuring rule when they have 5 or more near-threshold deposits within 14 days (see the Structuring page).

How to describe it (approved wording)
- Say "a cash deposit just below the internal review threshold".
- Describe how many deposits, when, and how much. Do not say why they were made.
- Do not add anything that is not on this Page.

A single near-threshold deposit is not a pattern. Many customers make one occasionally.

This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
