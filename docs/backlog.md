# Backlog: epics and stories

Status as of 12 October 2026. All content is fictional and synthetic. Sizes are rough estimates for the squad to re-size.

**Goal labels:** **G1** video resources (no or low code), **G2** resources with code in one workspace, **G3** reusable code deployable in other workspaces.

**Sizes:** S = up to half a day, M = one to two days, L = three or more days.

**Definition of done:** the work runs in the workspace, the code is committed, it is described in the README or `docs/workspace-findings.md`, and it has a check (an assertion, a benchmark question, or a recorded demo run).

**Epics follow the squad's seven steps:** 1 data in Lakebase, 2 load into the lakehouse with watermarking, 3 data mesh catalogs, 4 final data product, 5 Genie agent and AI/BI dashboard, 6 domain, discovery, governed tags and Pages, 7 Agent Bricks on unstructured data.

## Overview

| Epic | Squad step | Status today |
|---|---|---|
| E1 Lakebase as source system | 1 | Case decisions table built and registered as a catalog |
| E2 Incremental load with watermarking | 2 | **Not built.** Only decisions flow from Lakebase. Synthetic bronze data is generated straight into Delta |
| E3 Data mesh structure and data products | 3, 4 | Gold tables and views done. Catalog layout still to align with last year's structure |
| E4 Genie and dashboard | 5 | Genie tested on four core questions. Dashboard on the new data pending |
| E5 Domain, discovery, tags and Pages | 6 | Domain and one page done. Full set pending |
| E6 Unstructured data and Agent Bricks | 7 | **Blocked.** Knowledge Assistant cannot answer on this workspace. Text AI fallback available |
| E7 Story, script and video | G1 | Not started |
| E8 Reusable deployment | G3 | Not started. The Databricks CLI cannot be installed on the team machine |
| E9 Risk, compliance and licence | all | Licence answer open, compliance review not scheduled |

## E1 Lakebase as source system (G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 1.1 | Lakebase project exists and is registered in Unity Catalog | `fincrime_source` can be queried from a serverless SQL warehouse | Done | |
| 1.2 | Case decisions table with seed history | 40 seeded decisions (20 Escalated, 20 Closed - false positive) | Done | |
| 1.3 | Operational entities live in Lakebase (customers, accounts, alerts), not only decisions | The generator output lands in Postgres tables (squad step 1) | Not started | M |
| 1.4 | Reset the demo between booth runs | A runbook restores decisions to the seed in under 2 minutes (Lakebase restore or a SQL reset) | Not started | S |

## E2 Incremental load with watermarking (G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 2.1 | Watermark columns on the source tables | Each source table has an `updated_at` or similar | Not started | S |
| 2.2 | Incremental load notebook | Reads from the registered Lakebase catalog (read-only, so no credentials needed), merges new rows into bronze, idempotent when re-run | Not started | M |
| 2.3 | Live arrival moment | Inserting a new batch in Lakebase makes a new alert appear in Genie and the dashboard after a load | Not started | M |
| 2.4 | Scheduled run | A job runs the load within Free Edition limits | Not started | S |

## E3 Data mesh structure and data products (G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 3.1 | Align the catalog layout with last year's structure | Matches the squad's pattern (needs their input) | Blocked on information | S |
| 3.2 | Gold tables and views with descriptions | All have table and column comments | Done | |
| 3.3 | Data product documentation | Owner, refresh behaviour, columns and certification tag, per product | In progress | S |
| 3.4 | Silver layer | Typed and cleaned tables between bronze and gold | Not started | S |
| 3.5 | Mask `national_id` | A second role sees masked values. Free Edition has one user, so a masked view may be the demonstration | Not started | M |

## E4 Genie and dashboard (G1, G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 4.1 | Genie space with instructions and example SQL | Text committed in `docs/genie` | Done | |
| 4.2 | 25 benchmark questions at 90 percent or better | Benchmarks tab populated, pass rate recorded | In progress (four core questions answered) | M |
| 4.3 | Rehearsed live prompts with timings | Each booth prompt answers in under 30 seconds, three consecutive runs | Not started | S |
| 4.4 | MLRO dashboard on the new data | Queue by typology, decisions, time to decision and the concentration chart, published | Not started | M |
| 4.5 | Dashboard's embedded Genie bar | Tested with two questions | Not started | S |
| 4.6 | Chat versus Agent mode decision | Speed and accuracy recorded for the booth prompts | Not started | S |

## E5 Domain, discovery, tags and Pages (G1, G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 5.1 | Domain `Financial Crime` with assets attached | The Agents and Catalog domain filters list the space and tables | In progress | S |
| 5.2 | Pages set | Structuring, rapid pass-through, activity versus expected volume, procedure and ontology, all published | One of five | M |
| 5.3 | Pages grounding repeatable in Genie One | A page edit changes the answer, with a citation, following a written procedure | Proven once | S |
| 5.4 | Governed tags | `certified`, `sensitivity` and domain on tables and views | In progress | S |
| 5.5 | Discovery walk-through | A scripted 30-second tour of Discover, lineage and a data product page | Not started | S |

## E6 Unstructured data and Agent Bricks (G1, G2)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 6.1 | Report the Knowledge Assistant error to Databricks | Message sent, answer recorded | Not started | S |
| 6.2 | Retest the Knowledge Assistant periodically | Result logged in `docs/workspace-findings.md` | Ongoing | S |
| 6.3 | Fallback: note classification and summary | A gold view with `ai_classify` and `ai_summarize` over `case_notes`, within quota | Not started | M |
| 6.4 | If it works elsewhere, record the segment | Clip captured and labelled | Blocked | M |

## E7 Story, script and video (G1)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 7.1 | Three-minute storyboard with on-screen captions | Works silently on a loop, since last year's video had no audio | Not started | M |
| 7.2 | Presenter script with exact prompts | One-page script with timings | Not started | S |
| 7.3 | Record and edit | OBS Studio to record, Kdenlive or Shotcut to edit, under 3 minutes | Not started | M |
| 7.4 | Fallback assets | A recorded video and screenshots in case compute is unavailable | Not started | S |

## E8 Reusable deployment (G3)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 8.1 | Manual setup guide | A README listing the order, imports and prerequisites, tested from scratch by someone else | Not started | M |
| 8.2 | Parameterised notebooks | Catalog name, seed and as-of date are widgets | Done | |
| 8.3 | Deployment alternatives without the local CLI | Options assessed: workspace UI deploy, or a colleague with the CLI | Not started | S |
| 8.4 | Deploy in a second workspace | Whole demo rebuilt by following the guide | Not started | L |

## E9 Risk, compliance and licence (cross-cutting)

| ID | Story | Acceptance criteria | Status | Size |
|---|---|---|---|---|
| 9.1 | Licence and sponsor-workspace answer | Written reply from Legal and Databricks | Open | S |
| 9.2 | Compliance and Data Privacy Officer review | Concept, data and wording reviewed | Not scheduled | S |
| 9.3 | Booth-day quota plan | Pre-warm routine, usage monitoring and fallback switch | Not started | M |
| 9.4 | Review of external materials | Anything sent outside the squad is reviewed by a person | Ongoing | S |

## Dependencies

- E2 depends on 1.3, because the incremental load needs source tables in Lakebase.
- 4.4 (dashboard) and 4.3 (rehearsal) feed E7 (video).
- 5.2 (Pages) should finish before 4.2 and 4.3, so the prompts are tested against final wording.
- 8.4 depends on 8.1 and on access to another workspace.

## Suggested first sprint

For the video resources (G1), the stories that matter most are 4.4, 5.2, 4.3, 7.1 and 9.1. They deliver the visible story, and 9.1 removes the biggest outside risk. E2 and E8 can follow, since they serve G2 and G3.

## Caveats

- Sizes are estimates and depend on the squad's pace.
- Stories 3.1, 8.3 and 8.4 depend on information and access that are not yet available.
- Product behaviour changes, especially for Beta features such as Pages. See `docs/workspace-findings.md` for what was observed and when.
