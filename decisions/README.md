# Decision log

Short records of decisions that someone new would otherwise ask about. One file per decision: `NNNN-short-title.md`. Never delete; supersede instead.

## Template
```markdown
# NNNN — Title
- Date: YYYY-MM-DD
- Status: proposed | accepted | superseded by NNNN
- Deciders: names

## Context
What problem or question?

## Decision
What we chose.

## Consequences
Trade-offs, follow-ups.
```

## Index
| # | Title | Status |
|---|---|---|
| 0001 | Single private GitHub repo plus GitHub Projects | accepted |
| 0002 | Ask uses Genie One MCP with signed-in user identity | proposed (live app differs; HANDOVER action 8) |
| 0003 | Governed-tag writes run as the app service principal | proposed |
| 0004 | Catalog Manager uses a `data_products` schema, not the medallion layers | proposed |
| 0005 | Access requests: approvals run as the approver, requests in a Delta table | proposed |
