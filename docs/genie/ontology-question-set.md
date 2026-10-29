# Genie One ontology question set (task O3)

All data and rules are fictional and synthetic. Version 2, updated 29 October 2026 after the first full run (13 of 20 on the developer's sheet).

**Purpose.** A repeatable test of whether Genie One answers business questions using our Pages: the right wording, a source, no invented calculation or claim, and a neutral tone. It tests Genie One (the general chat), not the Genie space, which does not read Pages. The 22 benchmark questions in `docs/genie/benchmarks.md` test the space.

**Target.** At least 18 of 20 questions pass (90 percent), with no answer that misdescribes how a metric is calculated.

**Decision on tone (29 October 2026).** Tone is strict for every answer. A pattern is described as "consistent with" something. No answer may describe a customer's intent or purpose, even in a general definition.

## What changed in version 2

- Each question now has **must-have** and **nice-to-have** points. Check A passes when all must-have points are present. Genie One gives concise answers, so requiring every nuance made good answers fail.
- Check C is widened to **no invented calculation or claim**, and nothing that contradicts a Page (for example "today" instead of "the latest data").
- Check D lists the phrases seen in test answers.
- Three new Pages (Near-threshold deposit, Typology, and an updated Shared counterparty) are the sources for questions 2, 5 and 12.
- Scoring rules: two scorers, a note for every fail, and the exact words that caused it.

## How to run it

1. Delete old Genie One test chats first (Genie One reuses earlier chats and has no off switch).
2. Wait 10 to 15 minutes after publishing or editing any Page, and write down the publish time of every Page.
3. Ask each question in the **general Genie One chat**, in a **new chat every time**, typed exactly as written.
4. Save each answer (text or screenshot) with the date and time.
5. Score each answer with the checks below. Have a **second person** score at least the failures.
6. If an answer says "based on the conversation from earlier", or shows clock (history) icons instead of page icons, it reused an old chat. Delete that chat, rephrase the question slightly (for example "According to our glossary, ..."), and ask again.
7. For each failure, write the note: the check that failed and the exact words that caused it.
8. Fix the Page or the column description, wait, and re-run only the failures. Run each failing question **twice**, because answers vary.

## The five checks

| Check | Pass means |
|---|---|
| **A. Wording** | All the **must-have** points are present. Nice-to-have points do not affect the score |
| **B. Source** | The answer shows a link or citation to the right Page. A "knowledge snippet" alone does not count |
| **C. No invented calculation or claim** | Nothing about how a metric is calculated that the Page does not say. No example queries, risk factors, ownership statements or other claims that are on no Page. Nothing that contradicts a Page |
| **D. Neutral tone** | None of these words or ideas: deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme, funnel, coordination as a conclusion, intent or guilt. Patterns are "consistent with" something, and a measure is a reason to look closer |
| **E. Fresh lookup** | Not reused from an old chat (a validity check: if it fails, rerun the question, do not score it) |

A question **passes** when A, B, C and D all pass.

## The questions

### Definitions: what is X?

| # | Question | Must have | Nice to have | Page |
|---|---|---|---|---|
| 1 | What is structuring? | 5 or more cash deposits of at least 9,000 and below 10,000 SEK within 14 days. The internal review threshold is 10,000 SEK | Synonym deposit splitting. Meeting the rule means review, not wrongdoing. No reason or intent given | Structuring |
| 2 | What is a near-threshold deposit? | A cash deposit of at least 9,000 and below 10,000 SEK | Counted in the structuring rule (5 or more within 14 days). A single deposit is not a pattern | Near-threshold deposit |
| 3 | What is rapid pass-through? | At least 80 percent of funds received are sent onward within 48 hours. The measure used (outflow-to-inflow ratio) is a 14-day proxy that does not test the 48-hour timing (update after task O2) | Synonym flow-through. Innocent explanations | Rapid pass-through |
| 4 | What is concentration of transfers? | Share of a customer's transfers out in 14 days that went to the single largest recipient, 0 to 1 | Transfers only, not card, mobile or cash. The column names | Concentration of transfers |
| 5 | What is a shared counterparty? | A counterparty paid by 3 or more distinct customers | Over 30 days from the latest data. Ordinary recipients are paid by several customers. A reason to look closer | Shared counterparty |
| 6 | What is expected monthly volume? | The inflow value the customer said to expect at onboarding, in SEK | Held in customer_360 | Activity compared with expected volume |
| 7 | What does activity above expectation mean? | Inflows in the last 14 days above expected monthly volume. Inflows only | Never inflows plus outflows. The column inflows_exceed_expected_volume | Activity compared with expected volume |
| 8 | What is a new account? | An account opened within the last 30 days | Measured from the latest data. Not a conclusion on its own | New account |
| 9 | What does alert status mean? | Open, Escalated or Closed - false positive. No decision means Open | From the latest investigator decision in Lakebase | Alert status and case |
| 10 | What is a case? | An alert with a recorded decision (Escalated or Closed - false positive) | Alerts with no decision are not cases | Alert status and case |
| 11 | What is a high-priority alert? | A risk score of 0.8 or more and status Open | Priority is about the order of review, not a conclusion | High-priority alert |
| 12 | What is a typology? | The category of pattern an alert was raised for. The four in the data: structuring, rapid pass-through, mule account, unusual volume | Says mule account and unusual volume have no definition in this workspace | Typology |
| 13 | What are the steps in the investigation procedure? | Five steps. Escalation: a typology match with inflows above 90,000 SEK in 14 days goes to a senior investigator within 2 working days | The investigator decides | Investigation procedure and boundaries |

### How is it measured?

| # | Question | Must have | Nice to have | Page |
|---|---|---|---|---|
| 14 | How is concentration measured in the data? | Column top_onward_counterparty_share. Transfers out only, last 14 days | From the latest transaction. The recipient is top_onward_counterparty | Concentration of transfers |
| 15 | How is the outflow-to-inflow ratio calculated? | All money sent divided by all money received over the last 14 days. A proxy. It does not test the 48-hour timing (update after task O2) | A ratio of 0.8 or more is consistent with the definition, not confirmation | Rapid pass-through |
| 16 | How is account age calculated? | Days between the account opening date and the latest transaction (account_age_days). A new account is 30 days or fewer | Held in structuring_candidates | New account |
| 17 | How is alert status determined? | The latest investigator decision in Lakebase. No decision means Open | The latest decided_at wins | Alert status and case |
| 18 | How do we compare a customer's activity with expected volume? | Total inflows only, against expected_monthly_volume. Never add inflows and outflows. The column inflows_exceed_expected_volume | Sum of amounts over 14 days from the latest data. A reason to look closer. **Must not:** an example query, counting transactions instead of summing amounts, or using today's date | Activity compared with expected volume |

### Tone and boundaries

| # | Question | Must have | Nice to have | Page |
|---|---|---|---|---|
| 19 | Does a high concentration of transfers mean a customer is laundering money? | Does not say yes. A high value is a reason to look closer, not a conclusion | Innocent explanations (for example one supplier). The investigator decides | Concentration of transfers |
| 20 | Does a shared counterparty mean customers are working together? | Does not say yes. Ordinary recipients are paid by several customers. A reason to look closer. **Must not:** a section about what "might be suspicious", or risk factors that are on no Page | It does not show the customers are connected | Shared counterparty |

## Scoring sheet

Copy this table for each run.

**Run date:** ____  **Scorer 1:** ____  **Scorer 2:** ____

| # | Page publish time | Test time | A Wording | B Source | C No invented calc or claim | D Neutral tone | E Fresh lookup | Pass | Note (check failed and the exact words) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |
| 6 | | | | | | | | | |
| 7 | | | | | | | | | |
| 8 | | | | | | | | | |
| 9 | | | | | | | | | |
| 10 | | | | | | | | | |
| 11 | | | | | | | | | |
| 12 | | | | | | | | | |
| 13 | | | | | | | | | |
| 14 | | | | | | | | | |
| 15 | | | | | | | | | |
| 16 | | | | | | | | | |
| 17 | | | | | | | | | |
| 18 | | | | | | | | | |
| 19 | | | | | | | | | |
| 20 | | | | | | | | | |

**Result:** ____ of 20 passed. **Failures and fixes:** ____

## Agreement between scorers
After two people score the same run, compare their Pass column. Aim for the same result on at least 18 of 20 questions. Discuss any difference, and tighten the must-have points if they were unclear.

## Results log

| Run | Date | Passed | Notes |
|---|---|---|---|
| 1 | 28 Oct 2026 | 13 of 20 on the developer's sheet (15 of 20 when questions 5 and 8 are scored on substance) | Failures: 1, 2, 12, 18, 20. Causes: model's background knowledge on structuring, typology and shared counterparty; invented example query; scoring too strict |
| 2 | | | |

## Notes

- Questions 3 and 15 change once the real 48-hour measure exists (task O2).
- Must-have points come from the Page texts in `pages/`. If a Page changes, update this file.
- Questions 19 and 20 check tone, so score tone strictly.
- Record the answers (screenshots or text) for the failures, so they can be fixed.
