# 0002: Ask uses Genie One MCP with signed-in user identity

Date: 2026-11-05

## Decision
At the user's request, replace the single-space Genie MCP restriction with
`system.ai.genie_one_mcp`. Forward only the signed-in user's OAuth token on
each request; never fall back to app service-principal credentials.

## Consequences
- Genie One may use the user's accessible data and published Pages, not just
  Investigations Analyst's configured tables.
- Require the `ai-gateway` user scope and service/domain/data access. Existing
  users may need browser re-consent.
- Preserve generated SQL, Page citations, conversation IDs and Genie deep links.
- Context is more comparable to workspace Genie One, but identical answers
  cannot be guaranteed.
- This supersedes the 2026-10-29 space-restriction choice recorded in E1-S11.
