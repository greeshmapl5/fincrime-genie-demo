# Workspace findings: Databricks Free Edition smoke test

> All data, names and rules in this project are fictional and synthetic. Not regulatory guidance.

Observed on our Free Edition workspace on 8 and 9 October 2026 while testing the "No More Middleman" demo.
Features and menus change, especially Beta ones, so re-check before relying on any detail here.

**Evidence labels:** *Observed* = we saw it in our workspace. *Docs* = taken from Databricks documentation, not tested by us. *Unverified* = still open.

## Summary

| Area | Result | Notes |
|---|---|---|
| Unity Catalog: catalogs, schemas, comments, tags | Pass | Observed |
| Volumes and file upload | Pass | Observed |
| Serverless notebooks, `faker`, `dbldatagen` | Pass | Observed |
| SQL warehouse | Pass | Cold start not truly measured |
| Genie space ("Genie Agents") | Pass | Wording and counts need care, see below |
| Pages (Discover) | Pass, with conditions | Beta. Needed a domain. Used by general Genie chat, not obviously by a space |
| AI/BI dashboard, filter, publish | Pass | |
| Dashboard export and import (`.lvdash.json`) | Pass | |
| Lakebase Postgres project | Pass | Autoscaling, Postgres 17, scale to zero |
| Lakebase registered as Unity Catalog catalog | Pass | Read-only from the lakehouse |
| Write in Lakebase, read in dashboard and Genie | Pass | The core operational-to-analytical loop |
| Agent Bricks: Create Agent page | Available | Agent types listed |
| Knowledge Assistant | Created and synced, **answering fails** | Error `NO_AVAILABLE_PHAROS_DEPLOYMENTS`, repeated after a retry |
| `ai_classify`, `ai_summarize` | Pass | |
| Asset Bundles / Databricks CLI | Not possible here | CLI cannot be installed on the team machine |
| Teams integration | Not tested | Treated as roadmap and mock-up only |

## Environment and restrictions

- Free Edition is serverless only, with quotas. Observed region in Lakebase: AWS us-east-2.
- The Claude in Chrome extension is disabled by the organisation, so browser automation is unavailable.
- The Databricks CLI cannot be installed, so Asset Bundle deployment is replaced by manual setup steps and importable notebooks.
- *Docs:* Free Edition is for non-commercial use, has no SLA, and exceeding quota shuts compute down for the rest of the day. The licence and sponsor-workspace question is open with Legal and Databricks.

## Unity Catalog

- Creating a catalog works (`CREATE CATALOG fincrime`) with `bronze`, `silver` and `gold` schemas.
- Table comments, column comments and tags (`certified`, `sensitivity`) all work.
- A domain is created as a governed tag (source "New tag"). Its description field is prefilled with finance wording: replace it.

## Notebooks and compute

- First serverless notebook cell took about 36 seconds including start-up.
- `%pip install faker dbldatagen` worked, so outbound package installs are available at least for these.
- Warehouse timings of 0.26 s (first) and 0.07 s (repeat) look like a warm warehouse plus result cache. Real cold-start time is unmeasured. Plan a pre-warm query before the booth opens.

## Genie ("Genie Agents")

- The space is created from the **Genie Agents** area. The box has **Agent** and **Chat** modes. We used Agent mode throughout. Chat mode speed and accuracy are not compared yet.
- Focused questions took roughly 15 to 30 seconds. An open-ended "tell me about this customer" question took about a minute and produced a multi-section report with charts. That is too slow to run live.
- Every answer offers visible SQL (**Show code** or **Show generated code**), a thought process, and named sources. This supports the explainability message.
- **Written counts are unreliable.** The summary sentences miscounted in three of the questions we scored, while tables and SQL were correct. Lead with tables, put logic into gold views, and rehearse exact prompts.
- **Instructions change behaviour.** A neutral-language instruction removed words implying intent ("deliberate", "suspicious") and the "escalate for reporting" suggestion.
- **Ambiguous words get resolved their own way.** "Cases" was matched to `alerts.status` until the Lakebase table was added and asked about by name. Define terms in descriptions and instructions.
- A space does not obviously read Pages. A "zebra rating" test term defined only on a page was not found when asked inside the space.
- The dashboard has an embedded **Ask Genie anything** bar. Not tested yet.
- Benchmarks tab exists. Masking behaviour in answers is untested.

## Pages and domains (Beta)

- Pages live under **Discover**. A page needs a **Domain** before it can be published, otherwise Publish stays disabled.
- Fields: domain, owner, synonyms, description, body (template sections Definition and Business use), related assets, sources.
- *Docs:* Pages are Beta and feed the Genie Ontology used by **Genie One**. Published pages are available in Genie One chat, drafts only to the owner. Page data is stored in plain text, may be replicated globally, and should not contain PII or regulated data. [Pages](https://learn.microsoft.com/en-us/azure/databricks/uc-semantics/pages), [Chat in Genie One](https://learn.microsoft.com/en-us/azure/databricks/genie-one/chat).
- *Docs:* general Genie One chat routes a question to a relevant Genie space if one matches, otherwise to data assets. Our first tests went to the space, which explains the early misses.
- *Observed:* after the domain existed and was attached, the general chat answered "What is structuring?" using our page wording, including synonyms and a test rule that existed only on the page, and applied the rule to customer data. The exact trigger (domain attached, waiting, or entry point) was not isolated.
- The Agents list can be filtered by domain. The space only appears after it is assigned to the domain.

## Dashboards

- Create via **SQL > Dashboards**. Datasets are SQL, charts are added on the canvas, filters link to datasets.
- Publish dialog: "Share data permission" (viewers use the publisher's credentials, shared cache) is the default. Individual permission is the stricter option for real deployments. We kept the default and left "Notify viewers" and "Materialize datasets" off.
- **Gotcha:** putting the date field into the chart's colour or group-by splits every date into its own series, which draws an empty line chart. Keep the date on the X axis only.
- **Export:** open the dashboard, **Edit draft**, then the **kebab menu (top right) > File Actions > Export** downloads a `.lvdash.json` file. Import also works.

## Lakebase

- Create from the Lakebase app: Autoscaling project, Postgres 17, branch `production`, 1 CU, 2 GB RAM, scale to zero, database `databricks_postgres`.
- The project has **Tables** (browse and edit rows), **SQL Editor**, **Branches**, **Backup & Restore**, **Genie** and **Data API** entries.
- Row edits work both in the Tables view and by SQL.
- **Register as a catalog:** Catalog > **+** > **Create a catalog** > type **Lakebase Postgres** > **Autoscaling** > project, branch, database. Use an underscore name (`fincrime_source`): hyphens force backticks in every query. [Register a Lakebase database in Unity Catalog](https://docs.databricks.com/aws/en/oltp/projects/register-uc).
- *Docs:* the registered catalog is **read-only** from the lakehouse and needs a serverless SQL warehouse. So decisions are written in Lakebase and read everywhere else.
- Observed: a change made in Lakebase was visible from the SQL Editor and the published dashboard. Genie answered correctly from the Lakebase table once it was added to the space and named explicitly.

## Agent Bricks and AI functions

- **AI/ML > Agents > Create Agent** lists: Supervisor Agent, Knowledge Assistant, Information Extraction (`ai_extract`), Document Parsing (`ai_parse_document`), Text Classification (`ai_classify`), Code your own agent, Genie Agent. This is despite the Free Edition limitations page listing Agent Bricks as unsupported, so the docs may be out of date for our workspace.
- Knowledge Assistant names allow only letters, numbers and dashes. Source type "Files in a Volume", plus a description of the content that the agent uses to decide when to consult it.
- The UI says the first file usually takes about 15 minutes to process. Our run took noticeably longer (not timed), so create and sync well before any recording.
- **Answering fails on this workspace.** After the sync completed, the first question in the Playground returned: `[ERROR] Vector search failed for index 'policy-docs': Model is unavailable for clientId ai-builder-interactive. Failed check: EDC. Error Code: NO_AVAILABLE_PHAROS_DEPLOYMENTS`, followed by `500 Internal error`. A retry about 3 minutes later gave the identical error. The index was built, but no model deployment was available to serve the search. We cannot tell from the message whether this is a Free Edition limit, a regional capacity problem or temporary. We did not test the other agent types. The Supervisor Agent probably depends on the same machinery, so we did not spend quota on it.
- Fallback for the unstructured-data moment: `ai_classify` and `ai_summarize` over the `case_notes` table, plus Pages for procedure text. Both work without the Knowledge Assistant.
- `ai_classify` returned the expected label. `ai_summarize` shortened a case but replaced "ten deposits" with "multiple". Treat summaries as drafts.

## Synthetic data pipeline and Genie results on the gold views

- Pipeline: `src/00_lakebase_case_decisions.sql` (Lakebase), `src/01_generate_bronze_data.py`, `src/02_build_gold_data_products.py`. Run in that order. The verification cell at the end of 02 passed on Databricks.
- The MLRO dashboard (`dashboards/financial-crime-oversight.lvdash.json`) reads the gold views. Recording a decision in Lakebase (an `INSERT` into `case_decisions`) was reflected on the published dashboard within seconds of a refresh. To import it: Dashboards list, then the import option, then choose the file. The datasets reference `fincrime.gold`, so run the data notebooks first.
- A first version of 02 produced a wrong share (1.0 for every customer) because the window function ran after the row filter. The built-in assertions caught it. Check the assertions after any change.
- With the logic in gold views (`structuring_candidates`, `counterparty_network`, `alerts`), Genie answered correctly in all four demo questions: seven structuring candidates, the ring versus the seasonal florist (89 to 98 percent of transfers to one recipient against 27 percent), X9001 as the only shared counterparty (6 customers), and alert status counts of 29 open, 20 escalated and 20 closed.
- Written counts in the narrative still slipped once ("five of six" where the data shows six). Tables and charts were right. Read from them, not from the paragraph.
- Residual intent-style wording appeared ("accounts may be opened for specific short-term activity") even after the neutral-language instruction. The instruction list in `docs/genie/instructions.md` was extended.
- `docs/genie/` holds the final instructions and example SQL for the space.

## Decisions taken from these findings

1. Decisions and case state live in **Lakebase**. `gold.alerts` is a view that joins them, so there is one source of truth.
2. Key logic (structuring candidates, ratios, flags) is built into **gold views**, not left to Genie to compute.
3. Pages shows the governed business definitions. Genie instructions keep the same text until Pages grounding in the demo flow is proven.
4. Demo prompts are focused single questions that return a table, rehearsed exactly.
5. Teams stays roadmap and mock-up. The Knowledge Assistant cannot answer on this workspace, so Agent Bricks is not part of the live demo here. If a squad workspace has it working, that segment can be recorded there and labelled honestly.

## Open items

- Licence and sponsor-workspace answer from Legal and Databricks.
- Knowledge Assistant: ask Databricks whether `NO_AVAILABLE_PHAROS_DEPLOYMENTS` is a known Free Edition limit or a temporary capacity issue, and whether a squad workspace has it working.
- Chat versus Agent mode comparison for speed and accuracy.
- Masking test for `national_id` in Genie answers, Benchmarks tab, dashboard "Ask Genie" bar.
- First run of the new data notebooks and their built-in checks.
- Confirm Pages behaviour again after any workspace or feature change, as it is Beta.
