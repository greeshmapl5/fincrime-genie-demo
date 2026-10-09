# Backlog

Epics and stories as Markdown files. They are mirrored by GitHub Issues on the Project board. **If Markdown and issue differ, the Markdown file wins.**

```
backlog/
  epics.md            overview table of all epics
  epics/              one file per epic      (E1-name.md)
  stories/            one file per story     (E1-S1-name.md)
  _templates/         copy these to create new items
```

## How to add a story
1. Copy `_templates/story.md` to `stories/E?-S?-short-name.md`.
2. Fill in the front-matter and acceptance criteria.
3. Open a PR (or ask a Claude agent to). Create the matching GitHub issue using the *Story* issue template and put the issue number in the front-matter.
4. When it meets the Definition of Ready (see `docs/working-agreement.md`), set `status: ready`.

## Status values
`backlog` · `ready` · `in-progress` · `review` · `done` · `blocked`
