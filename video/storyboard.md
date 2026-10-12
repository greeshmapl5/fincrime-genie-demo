# Storyboard: "No More Middleman" (3 minutes, silent loop with captions)

All data, names and rules are fictional and synthetic. Not regulatory guidance. Review before sharing outside the squad.

**Story in one line:** an investigator asks questions in plain English, the answer comes from governed data and the bank's own definitions, the investigator records the decision, and the oversight dashboard changes within seconds. The investigator stays in control.

**Why captions:** last year's video had no audio, so a viewer at the booth cannot follow the "why" unless the screen says it. Every scene has an on-screen caption. A voiceover version can be added later.

**The one contrast to land (scene 3):** seven accounts meet the same structuring rule. Six send 89 to 98 percent of their transfers to one recipient. One, an established seasonal florist, sends 27 percent.

## Scenes

| # | Time | Screen | What happens | Caption (max about 8 words) |
|---|---|---|---|---|
| 1 | 0:00 to 0:20 | Title card, then the Genie space | Problem statement on a card, fade to the Genie space | "Investigators wait days for data answers" then "Now they just ask" |
| 2 | 0:20 to 0:50 | Genie space | Ask the structuring question. Show the table of seven candidates and click **Show code** briefly | "Seven accounts meet the structuring rule" and "Every answer shows its SQL" |
| 3 | 0:50 to 1:25 | Genie space | Ask for the concentration chart. Hold on the bar chart: six at 89 to 98 percent, the florist at 27 percent | "Same rule. Very different story." and "Data, not a hunch" |
| 4 | 1:25 to 1:55 | Genie One chat | New chat: "What is structuring?" The answer uses the bank's wording, with synonyms and innocent explanations | "Answers use the bank's own definitions" and "Policy lives in Pages" |
| 5 | 1:55 to 2:20 | Lakebase SQL editor | Run the INSERT that closes the florist's alert as a false positive | "The investigator records the decision" and "Stored in Lakebase" |
| 6 | 2:20 to 2:45 | MLRO dashboard | Refresh. Open alerts 29 to 28, closed as false positive 20 to 21, the alert leaves the queue | "Oversight updates within seconds" |
| 7 | 2:45 to 3:00 | Discover (domain and data product), then end card | Brief view of the Financial Crime domain, then the end card | "Governed. Explainable. The investigator decides." |

**Optional scene (only if time allows):** "Which counterparties received money from several customers?" gives one row: X9001, six customers. Caption: "One recipient behind six accounts". Insert between 3 and 4, and trim elsewhere.

## Exact prompts and commands (rehearse these word for word)

Scene 2, Genie space (Agent mode), new chat:
```
Which customers look like structuring candidates?
```

Scene 3, same space, new chat. Test the timing of the short form first:
```
Show how concentrated each structuring candidate's transfers are on one recipient. Show a bar chart.
```
Fallback longer form, which worked in testing:
```
Compare the structuring candidates by account age, outflow ratio and how concentrated their transfers are on one recipient. Show a bar chart of the concentration.
```

Scene 4, **Genie One chat** (not the space), new chat:
```
What is structuring?
```

Scene 5, Lakebase SQL editor, project `fincrime-source`, database `databricks_postgres`:
```sql
INSERT INTO case_decisions (alert_id, decision, rationale, decided_by)
VALUES ('A0107', 'Closed - false positive', 'Activity matches the seasonal trading profile of a florist.', 'investigator');
```

Reset before every take:
```sql
DELETE FROM case_decisions WHERE alert_id = 'A0107';
```

## Style rules
- Plain, neutral wording. Never say the florist or any account is guilty. Say what the data shows.
- Read from the table and chart, not the paragraph: written counts in Genie's narrative have slipped in testing.
- Fictional banner on the first and last frame: "All data, names and rules are fictional."
- Cuts are fine. Waiting for Genie (15 to 30 seconds) can be trimmed or sped up in the edit, as long as nothing misleading is implied. Show the real answer.
- One consistent browser zoom, theme and window size across all scenes.

## Open points
- Confirm the Structuring page no longer contains the "zebra rating" test line. It would appear in the scene 4 answer.
- Decide Agent or Chat mode for the Genie space from the timings.
- Decide whether the Discover scene shows lineage, if it is clear enough at video resolution.
