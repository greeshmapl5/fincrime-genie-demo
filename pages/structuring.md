# Structuring

- **Domain:** Financial Crime
- **Synonyms:** smurfing, deposit splitting, threshold avoidance
- **Description:** Repeated cash deposits just below the internal review threshold within a short window.
- **Related assets and sources:** `fincrime.gold.transactions`, `fincrime.gold.alerts`, `fincrime.gold.customer_360`, `fincrime.gold.structuring_candidates`

## Definition

5 or more cash deposits (channel = 'cash', direction = 'in') of at least 9,000 SEK and below 10,000 SEK within 14 days. The internal review threshold is 10,000 SEK.

## Business use

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
