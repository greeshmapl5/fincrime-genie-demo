# Creating the Pages in Databricks

Instructions for whoever creates the Pages (Beta) in the workspace. All content is fictional and synthetic. Not regulatory guidance.

**What you are doing.** Each file in `pages/` is the source text for one Page in Discover. You copy its fields into the Page form, publish it, wait, and check it in Genie One. The files are the source of truth: if a definition changes, change the file first, then the Page.

## 1. Before you start

- [ ] You can open **Discover** in the workspace and create a Page.
- [ ] The domain **Financial Crime** exists. A Page cannot be published without a domain.
- [ ] The data products the Pages refer to exist in Unity Catalog: `fincrime.gold.transactions`, `alerts`, `customer_360`, `structuring_candidates`, `counterparty_network`.
- [ ] Old Genie One test chats are deleted (Genie One remembers earlier chats and has no off switch, which can hide your changes).
- [ ] Open one existing Page (for example Structuring) to see the layout.

## 2. The pages to create

Create them in this order. The first five already exist, so only edit them if their file changed.

| # | File | Page title | Status |
|---|---|---|---|
| 1 | `pages/structuring.md` | Structuring | Exists |
| 2 | `pages/rapid-pass-through.md` | Rapid pass-through | Exists |
| 3 | `pages/activity-vs-expected-volume.md` | Activity compared with expected volume | Exists |
| 4 | `pages/investigation-procedure.md` | Investigation procedure and boundaries | Exists |
| 5 | `pages/ontology.md` | Financial crime data ontology | Exists |
| 6 | `pages/concentration.md` | Concentration of transfers | **New** |
| 7 | `pages/alert-status-and-case.md` | Alert status and case | **New** |
| 8 | `pages/new-account.md` | New account | **New** |
| 9 | `pages/high-priority-alert.md` | High-priority alert | **New** |
| 10 | `pages/shared-counterparty.md` | Shared counterparty | Created, **updated** |
| 11 | `pages/near-threshold-deposit.md` | Near-threshold deposit | **New** |
| 12 | `pages/typology.md` | Typology | **New** |

**Update of 29 October 2026.** Testing showed Genie One adding intent and suspicion wording ("to avoid detection", "deliberately", "suspicious activity"), example queries and risk factors that are on no Page. All twelve files now end with a stronger, identical **Tone** line, and the Pages for structuring, typology, near-threshold deposit, activity versus expected volume and shared counterparty also carry approved wording or "do not add" statements. For the Pages that already exist, copy the changed text from the files into the workspace Pages and republish. In particular:
- **Structuring:** the synonyms "smurfing" and "threshold avoidance" are removed, the Description is new, and an "approved wording" section is added.
- **Activity compared with expected volume:** now states that the comparison sums inflow amounts over 14 days from the latest data, and that no example queries should be added.
- **Shared counterparty:** now has a "What this does not show" section.
- **All Pages:** replace the old tone sentence with the new Tone line.

## 3. How each file maps to the Page form

| In the file | In the Page form |
|---|---|
| The first heading (`# ...`) | **Page name** (click "Click to set page name") |
| `Domain` | **Domain**: Financial Crime |
| `Synonyms` | **Synonyms**: add each word or phrase as its own entry |
| `Description` | **Description** (one short sentence) |
| `## Definition` | The **Definition** section of the body |
| `## Business use` | The **Business use** section of the body |
| `Related assets and sources` | **Related Assets** and **Sources**: add each table or view named. Add the same ones in both |
| Owner | Leave as the creator. Do not change it |

Do not paste the `-` bullet markers as plain text if the editor turns them into lists. Use the editor's bullet button, and keep the sub-headings ("How it is measured in the data", "Common innocent explanations", "Evidence to collect") as plain lines.

## 4. Steps for each page

1. In **Discover**, create a new Page.
2. Set the **page name**, choose the **domain** Financial Crime, add the **synonyms** and the **description**.
3. Paste the **Definition** text, then the **Business use** text, from the file.
4. Under **Related Assets** and **Sources**, add the tables and views listed in the file.
5. Click **Publish** (not "Save as draft", because only published pages are available in Genie One chat). If Publish stays disabled, check that the domain and the page name are set.
6. Note the time you published.

## 5. Wait, then test

Wait **10 to 15 minutes** after the last publish. Then test each Page in the general **Genie One chat** (not the Genie space, which does not read Pages), **in a new chat for every question**.

| Page | Ask in Genie One | Look for |
|---|---|---|
| Concentration of transfers | What is concentration of transfers? | Share of transfers out in 14 days to the largest recipient, 0 to 1; transfers only; the columns `top_onward_counterparty_share` and `top_onward_counterparty` |
| Alert status and case | What does alert status mean, and what is a case? | Open, Escalated, Closed - false positive; from the latest Lakebase decision; a case is an alert with a recorded decision |
| New account | What is a new account? | Opened within 30 days, measured from the latest data; `account_age_days` |
| High-priority alert | What is a high-priority alert? | Risk score 0.8 or more and status Open |
| Shared counterparty | What is a shared counterparty? | 3 or more distinct customers over 30 days; ordinary recipients are paid by several customers; a reason to look closer, with no mention of laundering or layering. The source should be the Shared counterparty Page, not only a knowledge snippet |
| Near-threshold deposit | What is a near-threshold deposit? | A cash deposit of at least 9,000 and below 10,000 SEK. No mention of intent ("deliberately", "to avoid") |
| Typology | What is a typology? | The category of pattern an alert was raised for; the four in the data; says mule account and unusual volume have no definition here; no "suspicious activity pattern" |

For each answer, check:
- It uses the Page wording and shows a **source or citation**. Page icons and a **Genie Ontology** chip mean a fresh lookup. "Based on the conversation from earlier" or clock icons mean it reused an old chat: delete that chat and ask again with the question worded a little differently, for example "According to our glossary, what is ...?".
- It does **not** say anything about how a metric is calculated that the Page does not say.
- Its tone is neutral: no "suspicious", "illicit", "laundering", intent or guilt.

Record the result for each Page (pass or fail, the time, and what was wrong) in your task notes.

## 6. If something goes wrong

| Symptom | Likely cause | What to do |
|---|---|---|
| Publish is disabled | No domain, or no page name | Set both |
| Genie One does not know the term | The Page is still a draft, or you tested too soon | Check it is published, wait 15 minutes, ask in a new chat |
| The answer repeats an old, wrong answer | Chat memory | Delete the old chat, rephrase the question, ask again in a new chat |
| The answer describes the calculation differently from the Page | The model added its own reading | State the calculation more plainly on the Page, and check the SQL |
| The answer uses loaded words not on the Page | The model added them | Add the neutral-language sentence to the Page, and retest |
| The Page cannot find a table in Related Assets | A missing grant or a renamed table | Check the table exists and that you have access |

## 7. After you finish

- Make sure no stray draft or test Pages are left in Discover (delete them).
- If you changed any wording in the Page, copy the change back into the file in `pages/`, and tell the team so the repo stays the source of truth.
- Attach the new Pages to the Financial Crime domain, and check Discover lists them when filtered by it.

## 8. Rules

- Keep every Page fictional. Page data is stored in plain text and may be replicated globally, so never put real policy, personal data or client information in a Page.
- No credentials or tokens in Pages, files or chat.
- A person reviews each Page before it is relied on in the demo.

## Alternative: the catalog-manager app

If the `catalog-manager` app's "Discover Pages" feature can import terms from these files and publish them after review, use it. Confirm with the developer first how it publishes, and check the result in Discover the same way (sections 5 and 6).
