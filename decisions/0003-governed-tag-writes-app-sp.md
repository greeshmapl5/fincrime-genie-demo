# 0003 — Governed-tag writes run as the app service principal
- Date: 2026-11-06
- Status: proposed
- Deciders: PM + architect (to confirm); chosen by Copilot while the requester was unavailable

## Context
E1-S14 lets Catalog Manager assign `system.certification_status`, the `Financial Crime` domain tag and `class.*` column tags. Assigning a governed tag needs account-level ASSIGN on the tag policy plus `APPLY TAG` on the object. All other Catalog writes (comments, `classification`) already run as the app service principal.

## Decision
Governed-tag writes also run as the app service principal (`app-2a3ty8 catalog-manager`). The server allows only those three tag types and only values from the tag policy.

## Consequences
- One account-admin grant (ASSIGN to the app service principal) makes it work for every app user.
- Any app user can certify or tag objects; Unity Catalog records the service principal, not the person. Same gap as E1-S12.
- Alternative: run writes with the signed-in user's token (`sql` scope already declared). Each user's own ASSIGN would apply, but every editor needs ASSIGN. Revisit with E1-S12.
- Ask's identity model is a separate open decision (0002, HANDOVER action 8).
