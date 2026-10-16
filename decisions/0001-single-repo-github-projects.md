# 0001 — Single private GitHub repo plus GitHub Projects
- Date: 2026-10-10
- Status: accepted
- Deciders: Project manager

## Context
We need one place for planning, documentation and demo code that works for people who may be replaced at short notice and for multiple Claude Code agents. Company stack is mainly Microsoft, but Teams alone has no agent-friendly backlog.

## Decision
- One **private** GitHub repository holds docs, backlog (Markdown), decisions and demo code.
- **GitHub Projects** provides the Scrum board, linked to the repo's issues.
- **Microsoft Teams** is used for human chat and notifications (GitHub app).
- Azure DevOps considered as a Microsoft-native alternative; not chosen because GitHub integrates more smoothly with Claude Code.

## Consequences
- Agents and humans share the same files and issues, so handovers are fast.
- If the demo code must later be shared publicly, copy `/demo` into a new repo.
- The board must be created once in the GitHub UI; its automation depends on each user's GitHub access.
