# App demo run sheet (live in Teams, with captions for a recorded version)

Local working file, not committed. All data, names and rules are fictional. Not regulatory guidance. Review before sharing outside the squad.

**One line:** an investigator asks in plain English, answers come from governed data and the bank's own definitions, with the source shown. Data is described, certified and tagged, access is requested and approved by a person, and the investigator always decides.

## Roles

| Who | Job |
|---|---|
| Xiang | Drives the app and shares the screen |
| Snehitha | Narrates, watches the clock, takes over if Xiang is stuck |
| Scrum master | Hosts, parks questions, keeps time, notes feedback and actions |

## Scenes (about 3 minutes if recorded, about 20 minutes live with talk)

| # | Screen | Action | Caption |
|---|---|---|---|
| 1 | Home | Hold on the headline | "Understand your data. Share its meaning." |
| 2 | Ask | Type: What is structuring? Hold on the answer and its citations | "Answers use the bank's own definitions" |
| 3 | Ask | New conversation. Type: Does a shared counterparty mean customers are working together? | "A reason to look closer, not a conclusion" |
| 4 | Catalog | Open alerts: description, classification, certified tag, Financial Crime tag | "Described, classified and certified" |
| 5 | Catalog (governed tags) | Open data_as_of. Set Certification to Certified, tick Tag with "Financial Crime". Hold as the tag chips appear. Then assign a data classification tag to one fictional column | "Governed tags make trust visible" |
| 6 | Catalog (access) | Show "You cannot read this data product yet" and the request box. Stop at the request box | "Access is requested, then approved by a person" |
| 7 | Glossary | Show the corrected Structuring term | "Definitions are kept in one place" |
| 8 | Prepare Pages export | Select the term and show the three steps | "Reviewed by a person before publishing" |
| 9 | End card | | "Governed. Explainable. The investigator decides." |

Fictional banner on the first and last frame: "All data, names and rules are fictional."

## Captions to add while editing (silent video)

Times are approximate for a 3-minute cut. Adjust them to the real clip lengths after trimming the waits.

| # | In | Out | Caption (on screen) | Placement |
|---|---|---|---|---|
| 0 | 0:00 | 0:03 | "All data, names and rules are fictional." | Banner across the top, first frame |
| 1 | 0:00 | 0:10 | "Understand your data. Share its meaning." | Lower third |
| 2 | 0:10 | 0:35 | "Answers use the bank's own definitions" | Lower third |
| 3 | 0:35 | 1:05 | "A reason to look closer, not a conclusion" | Lower third |
| 4 | 1:05 | 1:30 | "Described, classified and certified" | Lower third |
| 5 | 1:30 | 2:00 | "Governed tags make trust visible" | Lower third |
| 6 | 2:00 | 2:15 | "Access is requested, then approved by a person" | Lower third |
| 7 | 2:15 | 2:35 | "Definitions are kept in one place" | Lower third |
| 8 | 2:35 | 2:50 | "Reviewed by a person before publishing" | Lower third |
| 9 | 2:50 | 3:00 | "Governed. Explainable. The investigator decides." | Centre, on the end card |
| 10 | 2:50 | 3:00 | "All data, names and rules are fictional." | Banner across the top, last frame |

Caption rules:
- Keep each caption to about 8 words or fewer, in plain neutral wording.
- Hold every caption for at least 3 seconds so it can be read.
- Use one font, size and position throughout, with enough contrast on the dark app theme.
- Where the real wait in Ask is trimmed, keep the caption on screen until the answer appears.
- Never caption an answer as a conclusion about a customer. Say what the data shows.
- Do not let a caption cover the SQL, a table or a tag chip.
- Blur or crop any personal email address visible on screen. Use the demo account where possible.

## Live running order (about 20 minutes)

| Min | What | Notes |
|---|---|---|
| 0 to 1 | Home: the idea | |
| 1 to 5 | Ask: structuring, then shared counterparty | Fill the 15 to 30 second wait by explaining where the answer comes from |
| 5 to 9 | Catalog: alerts description, classification, certified tag | |
| 9 to 12 | Catalog: governed tags on data_as_of, then the access request box | The tag change is live and real |
| 12 to 16 | Glossary and Prepare Pages export | Show the steps and a result prepared earlier, labelled as such |
| 16 to 20 | What is next and the open questions | Scrum master leads |

## Before the meeting

### The day before
- [ ] Full dry run on the same machine, network and Teams setup. Run it twice.
- [ ] Glossary: replace the Structuring entry with neutral wording (suggestion below).
- [ ] Confirm with the developers whether Ask runs as the service principal or as the signed-in user, and fix the contradicting text in the app.
- [ ] Do not edit any Page in the last 15 minutes before the meeting, ideally not that morning.
- [ ] Governed tags scene: rehearse on data_as_of once, then undo the tag so the live run starts uncertified. Know the undo route (the app may have no remove button; an admin can unset the tag in SQL, check the syntax first).
- [ ] Use a demo account so no personal email shows on screen.
- [ ] Tidy the catalog list (smoke_test, demo_sandbox), or avoid scrolling that part.
- [ ] Never leave Deprecated on a demo table.
- [ ] Confirm the app's service principal has ASSIGN on the Financial Crime governed tag.
- [ ] Prepare the backup: a short recording of the Ask scenes plus screenshots of Catalog and Glossary, with no personal emails visible.

Suggested neutral Structuring text: "5 or more cash deposits of at least 9,000 SEK and below 10,000 SEK within 14 days. The internal review threshold is 10,000 SEK. It describes a pattern in the data and says nothing about why the deposits were made." Use a generic owner. The Page rule is not to say who maintains a definition.

### 30 minutes before
- [ ] Restart the app (apps stop after 24 hours) and run one question to warm it.
- [ ] Check the daily compute quota is not nearly used.
- [ ] Delete old chats and start a New conversation in Ask.
- [ ] Teams on Do Not Disturb. Close other apps and notifications.
- [ ] Browser zoom 110 to 125 percent, one theme, one window, bookmarks hidden.
- [ ] Tabs pre-opened in order: Home, Ask, Catalog, Glossary, Prepare Pages export.
- [ ] Backup files in one folder, ready to share.

### Sharing in Teams
- Share a window, not the whole screen.
- Check no personal email shows. Scroll past the access and grants lists, do not linger.
- If the meeting is recorded, tell attendees first and follow company recording rules. Ask Compliance if unsure.

## What to do live and what to stage
- **Live:** Ask answers, governed tags on data_as_of, browsing the catalog.
- **Staged (prepared earlier, say so out loud):** the before and after for a glossary change. It needs a Pages publish and a 10 to 15 minute wait.
- **Do not do live:** granting access to a real person, expected monthly volume, activity above expectation, alert status (raw pipes).

## If something goes wrong
- **Slow answer:** narrate ("it is reading the definitions and writing the SQL"). Give it 30 seconds.
- **Odd or loaded answer:** say "that is exactly what we are testing" and move on.
- **App down or errors:** switch to the backup straight away.

## Say this up front
It is a first version, the data is fictional, and answers can be wrong, so the investigator always checks the SQL and decides.

## Style rules
- Plain, neutral wording. Never say an account is guilty. Say what the data shows.
- Read from tables and the SQL, not the narrative: written counts have slipped in testing.
- Cuts are fine for waits in a recorded version, as long as the real answer is shown.
