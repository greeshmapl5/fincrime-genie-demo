# No More Middleman: financial crime analytics demo

> All data, names and rules in this repository are fictional and synthetic.
> This is not legal, financial or regulatory guidance.

## Purpose
A 3-minute booth demo for Databricks Data & AI World Tour Stockholm 2026.
An investigator asks questions in plain language (Genie), answers are grounded
in the bank's own definitions (Pages) and built on governed data products
(Unity Catalog). The investigator records the decision in Lakebase, and the
oversight dashboard updates within seconds.

## Start here
1. `docs/handover.md`: the overview, file map, rebuild steps, design decisions and known issues.
2. `docs/workspace-findings.md`: what works on our Databricks workspace, what does not, and the quirks.
3. `docs/backlog.md`: epics and stories, with sizes and status.

## Architecture
```
Synthetic data generator (notebook 01)
        -> bronze tables (Delta, Unity Catalog)
        -> gold data products (tables and views, with descriptions)
Investigator decision -> Lakebase (case_decisions)
        -> read-only catalog (fincrime_source) -> joined into the gold alerts view
Gold data products -> MLRO dashboard, Genie space, Genie One chat grounded by Pages
```
Not working or not built yet: the Knowledge Assistant (Agent Bricks) fails to answer on our workspace,
Microsoft Teams is roadmap only, and the Lakebase to lakehouse load with watermarking is not built.

## Repository layout
- `src/`: the Lakebase SQL and the two notebooks that build the data
- `docs/`: handover notes, findings, backlog, Genie instructions and benchmarks, load procedure
- `pages/`: source text for the five Pages
- `dashboards/`: exported dashboard JSON
- `video/`: storyboard, captions, cards and recording checklist
- `resources/`: reserved and empty. Deployment is manual because the Databricks CLI cannot be installed on the team machine

## How to rebuild
There is no one-command deployment. Follow section 4 of `docs/handover.md`, in order:
1. Run `src/00_lakebase_case_decisions.sql` in the Lakebase SQL editor.
2. Register the Lakebase project as the catalog `fincrime_source`.
3. Run notebook `src/01_generate_bronze_data.py`, then `src/02_build_gold_data_products.py` (the last cell must print "All checks passed").
4. Set up the Genie space from `docs/genie/`, publish the pages from `pages/`, import the dashboard from `dashboards/`.

The procedure for loading the data into Lakebase (a planned story) is a template in `docs/load-procedure.md`.

## Rules for everyone
- Keep every dataset, page and document fictional. No client names or details.
- Never put credentials or tokens in the repo, in commits or in chat.
- Work on a branch and open a pull request. Have a person review anything before it leaves the squad.

## Status
Foundation built and verified on a Databricks Free Edition workspace. Under further development by the demo squad.
