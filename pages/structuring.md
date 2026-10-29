# Structuring

- **Domain:** Financial Crime
- **Synonyms:** deposit splitting, near-threshold deposit pattern, just-below-threshold deposits
- **Description:** A pattern in deposit data: repeated cash deposits just below the internal review threshold within a short window. It says nothing about why the deposits were made.
- **Related assets and sources:** `fincrime.gold.transactions`, `fincrime.gold.alerts`, `fincrime.gold.customer_360`, `fincrime.gold.structuring_candidates`

## Definition

5 or more cash deposits (channel = 'cash', direction = 'in') of at least 9,000 SEK and below 10,000 SEK within 14 days. The internal review threshold is 10,000 SEK.

## Business use

How to describe it (approved wording)
- Say "a pattern in the data consistent with structuring", or "the customer meets the structuring rule".
- Say "internal review threshold", not "reporting threshold".
- Describe the deposits: how many, when and how much. Do not say why they were made.
- Do not say who maintains this definition, and do not add anything that is not on this Page.

Typical indicators
- Several deposits close together in time, each just below the threshold
- A new account, or activity well above its expected monthly volume
- Funds moved onward soon after deposit

Common innocent explanations
- Seasonal retail or hospitality businesses with regular cash takings
- Event or market traders with predictable cash patterns

Evidence to collect
- Number, dates and amounts of deposits
- Total inflows compared with expected monthly volume
- Counterparties receiving funds afterwards

Meeting the rule means the case needs review. It does not mean wrongdoing. This is fictional demo content, not regulatory guidance.

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.
