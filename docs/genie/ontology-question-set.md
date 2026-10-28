# Genie One ontology question set (task O3)

All data and rules are fictional and synthetic. Draft for the squad to review.

**Purpose.** A repeatable test of whether Genie One answers business questions using our Pages: the right wording, a source, no invented calculations, and a neutral tone. It tests Genie One (the general chat), not the Genie space, which does not read Pages. The 22 benchmark questions in `docs/genie/benchmarks.md` test the space.

**Target.** At least 18 of 20 questions pass (90 percent), with no answer that misdescribes how a metric is calculated.

## How to run it

1. Delete old Genie One test chats first (Genie One reuses earlier chats and has no off switch).
2. Wait 10 to 15 minutes after publishing or editing any Page.
3. Ask each question in the **general Genie One chat**, in a **new chat every time**, typed exactly as written.
4. Score each answer with the five checks below, using the sheet at the end. Have two people score the same answers where possible.
5. If an answer says "based on the conversation from earlier", or shows clock (history) icons instead of page icons, it reused an old chat. Delete that chat, rephrase the question slightly (for example "According to our glossary, ..."), and ask again.
6. Fix the Page or the column description for any failure, wait, and re-run only the failures.

## The five checks

| Check | Pass means |
|---|---|
| **A. Wording** | The answer contains the key points listed for the question, in words close to the Page |
| **B. Source** | The answer shows a source or citation to the right Page (page icons, a Genie Ontology chip) |
| **C. No invented calculation** | The answer says nothing about how a metric is calculated that the Page does not say |
| **D. Neutral tone** | No "suspicious", "illicit", "laundering", "coordination", intent or guilt. Patterns are "consistent with" something, and a measure is a reason to look closer |
| **E. Fresh lookup** | Not reused from an old chat (a validity check: if it fails, rerun the question, do not score it) |

A question **passes** when A, B, C and D all pass.

## The questions

### Definitions: what is X?

| # | Question | Key points expected | Page |
|---|---|---|---|
| 1 | What is structuring? | 5 or more cash deposits of at least 9,000 and below 10,000 SEK within 14 days. Review threshold 10,000 SEK. Synonyms smurfing, deposit splitting, threshold avoidance. Meeting the rule means review, not wrongdoing | Structuring |
| 2 | What is a near-threshold deposit? | A cash deposit of at least 9,000 and below 10,000 SEK. Counted in the structuring rule | Structuring |
| 3 | What is rapid pass-through? | At least 80 percent of funds received are sent onward within 48 hours. Synonyms flow-through, layering. States that the column used (outflow-to-inflow ratio) is a 14-day proxy that does not test the 48-hour timing (update after task O2) | Rapid pass-through |
| 4 | What is concentration of transfers? | Share of a customer's transfers out in 14 days that went to the single largest recipient, 0 to 1. Transfers only, not card, mobile or cash | Concentration of transfers |
| 5 | What is a shared counterparty? | A counterparty paid by 3 or more distinct customers. Many ordinary recipients are paid by several customers, so it is a reason to look closer, not a conclusion | Financial crime data ontology |
| 6 | What is expected monthly volume? | The inflow value the customer said to expect at onboarding, in SEK | Activity compared with expected volume |
| 7 | What does activity above expectation mean? | Inflows in the last 14 days above expected monthly volume. Inflows only, never inflows plus outflows | Activity compared with expected volume |
| 8 | What is a new account? | An account opened within the last 30 days, measured from the latest data. Not a conclusion on its own | New account |
| 9 | What does alert status mean? | Open, Escalated or Closed - false positive. From the latest investigator decision in Lakebase. No decision means Open | Alert status and case |
| 10 | What is a case? | An alert with a recorded decision (Escalated or Closed - false positive) | Alert status and case |
| 11 | What is a high-priority alert? | A risk score of 0.8 or more and status Open. Priority is about the order of review, not a conclusion | High-priority alert |
| 12 | What is a typology? | A named pattern the monitoring looks for. Examples: structuring, rapid pass-through, mule account, unusual volume | Financial crime data ontology |
| 13 | What are the steps in the investigation procedure? | Five steps (review the alert and profile, check against a typology, compare with expected volume using inflows, review counterparties, record the decision). Escalation: typology match with inflows above 90,000 SEK in 14 days goes to a senior investigator within 2 working days. The investigator decides | Investigation procedure and boundaries |

### How is it measured?

| # | Question | Key points expected | Page |
|---|---|---|---|
| 14 | How is concentration measured in the data? | Column top_onward_counterparty_share in structuring_candidates. Transfers out only, last 14 days from the latest transaction, share to the largest recipient | Concentration of transfers |
| 15 | How is the outflow-to-inflow ratio calculated? | All money sent divided by all money received over the last 14 days. A proxy for rapid pass-through. It does **not** test the 48-hour timing (update after task O2) | Rapid pass-through |
| 16 | How is account age calculated? | Days between the account opening date and the latest transaction (account_age_days). A new account is 30 days or less | New account |
| 17 | How is alert status determined? | Join of each alert to the latest investigator decision in Lakebase (the latest decided_at wins). No decision means Open | Alert status and case |
| 18 | How do we compare a customer's activity with expected volume? | Total inflows only (direction in) over the period against expected_monthly_volume. Never add inflows and outflows together | Activity compared with expected volume |

### Tone and boundaries

| # | Question | Key points expected | Page |
|---|---|---|---|
| 19 | Does a high concentration of transfers mean a customer is laundering money? | Does not say yes. A high value is a reason to look closer, not a conclusion. Innocent explanations exist (for example a business paying one supplier). Neutral wording, no intent. The investigator decides | Concentration of transfers, Investigation procedure |
| 20 | Does a shared counterparty mean customers are working together? | Does not say yes. Ordinary recipients such as suppliers are paid by several customers. A reason to look closer, not a conclusion. No mention of coordination or laundering as a conclusion | Financial crime data ontology |

## Scoring sheet

Copy this table for each run.

**Run date:** ____  **Scorer 1:** ____  **Scorer 2:** ____  **Pages last published (time):** ____

| # | A Wording | B Source | C No invented calculation | D Neutral tone | E Fresh lookup | Pass | Notes |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |
| 12 | | | | | | | |
| 13 | | | | | | | |
| 14 | | | | | | | |
| 15 | | | | | | | |
| 16 | | | | | | | |
| 17 | | | | | | | |
| 18 | | | | | | | |
| 19 | | | | | | | |
| 20 | | | | | | | |

**Result:** ____ of 20 passed. **Failures and fixes:** ____

## Agreement between scorers
After two people score the same run, compare their Pass column. Aim for the same result on at least 18 of 20 questions. Discuss any difference, and tighten the key points above if they were unclear.

## Notes

- Questions 3 and 15 change once the real 48-hour measure exists (task O2): the expected answer will name that measure.
- Expected key points come from the Page texts in `pages/`. If a Page changes, update this file.
- The Genie One chat may answer questions about customers using the data. Questions 19 and 20 check tone, so score tone strictly.
- Record the answers (screenshots or text) for the failures, so they can be fixed.
