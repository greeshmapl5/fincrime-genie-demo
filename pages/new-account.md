# New account

- **Domain:** Financial Crime
- **Synonyms:** recently opened account, new customer, new relationship
- **Description:** An account opened within the last 30 days.
- **Related assets and sources:** `fincrime.gold.customer_360`, `fincrime.gold.structuring_candidates`

## Definition

A new account is an account that was opened within the last 30 days. The 30 days are measured back from the latest transaction in the data, not from today.

## Business use

How it is measured in the data
- customer_360.opened_date holds the date the relationship started.
- In structuring_candidates, account_age_days is the number of days between opening and the latest transaction. An account with 30 or fewer days is a new account.

How to read it
- A new account is one factor in the structuring typology, together with deposits just below the threshold and activity above expected volume. It is not a conclusion on its own.

Common innocent explanations
- New businesses often start with mostly cash takings.
- New businesses often grow faster than their onboarding estimate.

Evidence to collect
- The account age and the date of the first transaction.
- Expected monthly volume compared with inflows (see the page on activity compared with expected volume).

Tone: describe what the data shows. Say "a pattern consistent with ..." and do not call a pattern a red flag. Do not describe a customer's intent or purpose. Avoid words and phrases such as deliberate, deliberately, to avoid detection, to evade, red flag, suspicious, suspicious activity, illicit, laundering, layering scheme or funnel. Do not add information, examples, risk factors or queries that are not on this Page.

This is fictional demo content, not regulatory guidance.
