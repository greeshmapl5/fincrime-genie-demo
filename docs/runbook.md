# Runbook

How to set up, run and troubleshoot the demo. Written so a new person can follow it cold.

> Never write secret values here. Name them and say where they are stored.

## 1. Access checklist
| System | Who grants access | Status |
|---|---|---|
| GitHub repo (this one) | PM | _TBD_ |
| Databricks workspace | _TBD_ | _TBD_ |
| Claude Code subscription | own company licence | _TBD_ |
| Teams channel | PM | _TBD_ |

## 2. Local setup
```bash
git clone https://github.com/dariocapgemini-droid/Daiwt2026.git
cd Daiwt2026
gh auth login        # GitHub CLI, needed for agents to read/update issues and PRs
claude               # run Claude Code from the repo root
```
_Add demo-specific setup (CLI, Python env, Databricks profile) as it is defined._

## 3. Run the demo
_TBD — numbered steps from cold start to finished demo._

## 4. Record the demo video
_TBD — tool, resolution, script, where the final file is stored._

## 5. Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| _TBD_ | | |

## 6. Booth day checklist
- [ ] Laptop charged, backup laptop ready
- [ ] Offline fallback (video) tested
- [ ] Credentials valid and tested the day before
- [ ] Demo reset script run
