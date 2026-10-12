# Recording and editing checklist

All content is fictional and synthetic. Free and open source tools where possible.

## Tools
- **Record:** OBS Studio (open source). Fallback if install is blocked: the built-in Windows screen recorder (Win+Shift+R in the Snipping Tool) or Xbox Game Bar (Win+G). Check with the squad before using a non-open-source editor.
- **Edit:** Kdenlive or Shotcut (open source).
- **Export:** MP4, H.264, 1920x1080, 30 fps.

## Before the first take
- [ ] Licence and sponsor-workspace question answered, or the squad has agreed to proceed.
- [ ] Data notebooks have run, and the last cell of `02_build_gold_data_products` printed "All checks passed".
- [ ] Lakebase decisions at seed: `SELECT decision, COUNT(*) FROM case_decisions GROUP BY decision;` returns 20 and 20, and no row for A0107.
- [ ] `fincrime_source` catalog refreshed in Catalog (refresh schema icon).
- [ ] Genie space instructions match `docs/genie/instructions.md`, and the data list is correct.
- [ ] Structuring page published, no "zebra rating" line, domain attached.
- [ ] MLRO dashboard published and refreshed: 29 open, 20 closed as false positive, 7 candidates.
- [ ] Warm up: run one query in the SQL Editor and one question in the Genie space about 15 minutes before recording.
- [ ] Daily quota fresh. Do not record near the end of a heavy testing day.
- [ ] Genie One has chat memory and no setting to turn it off. Delete old test chats (sidebar, chat menu, Delete) so stale answers cannot reappear.
- [ ] Do a dry run of the scene 4 question. Page icons and a Genie Ontology chip mean a fresh lookup. "Based on the conversation from earlier" or clock icons mean memory: delete that chat and retry.
- [ ] Publish and edit pages well before recording and wait at least 15 minutes. Never edit a page just before a take.

## Screen setup
- [ ] Browser window at a fixed size (for example 1920x1080), zoom 110 to 125 percent so text reads on a small screen.
- [ ] Close other tabs, hide bookmarks bar and notifications. No email or chat visible.
- [ ] One theme (dark or light) throughout.
- [ ] No personal email or account names visible: check the top-right profile and the Owner fields.
- [ ] Pre-open the tabs in scene order: Genie space, Genie One, Lakebase SQL editor, dashboard, Discover.
- [ ] OBS: capture the browser window only, with hotkeys to start and stop.

## Rehearse (target: 3 clean runs in a row)
- [ ] Each Genie prompt answers in under 30 seconds. Note the actual times.
- [ ] Prompts typed exactly as in `video/storyboard.md`.
- [ ] Scene 6 refresh shows 28 open and 21 closed.
- [ ] Reset after each run: `DELETE FROM case_decisions WHERE alert_id = 'A0107';` then refresh the dashboard to 29 and 20.

## Recording
- Record each scene as its own clip, so a failed answer means one retake, not the whole video.
- Hold on each result for at least 3 seconds so captions can be read.
- Keep the mouse still while an answer is on screen.
- Do two takes per scene and keep the better one.

## Editing
- [ ] Assemble clips in scene order, trim waiting time, add captions (large, high contrast, one or two lines each).
- [ ] First frame and last frame show: "All data, names and rules are fictional."
- [ ] Final length 3:00 or slightly less.
- [ ] Export a version with captions only. A voiceover version can follow.
- [ ] Check no credentials, tokens, personal emails or workspace URLs are visible in any frame.

## Review before sharing outside the squad
- [ ] A person reviews wording and captions: neutral language, no intent or guilt, no claims beyond what was shown.
- [ ] Compliance and Data Privacy Officer review of the concept and video.
- [ ] Pages is Beta and the Knowledge Assistant is blocked: do not imply either is production-ready or shown if not shown.
- [ ] Licence and sponsor-workspace answer recorded.

## Fallback plan
- Keep the final MP4, plus screenshots of each scene, available offline for the booth.
- If compute is unavailable on the day, play the video.
