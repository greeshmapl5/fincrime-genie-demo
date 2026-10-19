"""Add fincrime.gold.policy_docs and policy rules to an existing Genie space (story E1-S9).

Usage: py -3 src/04_genie_policy_space.py <profile> <space_id>
Backs up the current serialized space to ./space_backup_<space_id>.json before updating.
"""
import json
import subprocess
import sys
import tempfile
import uuid

profile, space_id = sys.argv[1], sys.argv[2]
TABLE = "fincrime.gold.policy_docs"

POLICY_RULES = """
Policy questions (table fincrime.gold.policy_docs):
- policy_docs holds fictional policy documents, one row per section (document_title, section_title, section_number, content). For any question about a policy, procedure, rule, deadline, late request or escalation, answer only from policy_docs.
- Search policy_docs with broad keyword filters on content and section_title (for example LOWER(content) LIKE '%late%' or '%deadline%') before concluding that a topic is not covered. A question about a request submitted after the deadline is answered by the section Late requests.
- End every policy answer with a line in exactly this form: Source: <document_title>, section <section_title>. Use one such line per section used. Quote or closely paraphrase the content and do not add rules that are not in the table.
- Only if no section of policy_docs addresses the question, say that the policy documents do not cover it. Do not infer, invent or give general advice, and do not cite a policy section as evidence for an answer it does not give.
- Describe what a policy says in neutral, factual language. Do not characterise or blame the person asking.
- Policy answers are not regulatory guidance. Do not recommend filing a report.
"""

BENCHMARKS = [
    ("What does the escalation policy require?",
     "SELECT document_title, section_title, content FROM fincrime.gold.policy_docs WHERE section_title = 'Escalation'"),
    ("How soon must I submit an expense reimbursement request?",
     "SELECT document_title, section_title, content FROM fincrime.gold.policy_docs WHERE section_title = 'Submission deadline'"),
    ("What does the policy say about a request submitted after the deadline?",
     "SELECT document_title, section_title, content FROM fincrime.gold.policy_docs WHERE section_title = 'Late requests'"),
]


def run(args):
    out = subprocess.run(["databricks", *args, "-p", profile, "-o", "json"], capture_output=True, text=True)
    if out.returncode:
        sys.exit(out.stderr)
    return json.loads(out.stdout)


space = run(["genie", "get-space", space_id, "--include-serialized-space"])
with open(f"space_backup_{space_id}.json", "w", encoding="utf-8") as f:
    json.dump(space, f)
ss = json.loads(space["serialized_space"])

tables = ss["data_sources"]["tables"]
if not any(t["identifier"] == TABLE for t in tables):
    tables.append({"identifier": TABLE, "description": ["Fictional policy documents, one row per section. Cite document_title and section_title."]})
    tables.sort(key=lambda t: t["identifier"])

instr = ss["instructions"]["text_instructions"][0]["content"]
marker = next((i for i, line in enumerate(instr) if line.startswith("Policy questions")), len(instr))
del instr[marker:]
instr.append("\n")
instr.extend(line + "\n" for line in POLICY_RULES.strip("\n").split("\n"))

questions = ss.setdefault("benchmarks", {}).setdefault("questions", [])
have = {q["question"][0] for q in questions}
for text, sql in BENCHMARKS:
    if text not in have:
        questions.append({"id": uuid.uuid4().hex, "question": [text], "answer": [{"format": "SQL", "content": [sql]}]})
questions.sort(key=lambda q: q["id"])

with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump({"serialized_space": json.dumps(ss)}, f)
res = run(["genie", "update-space", space_id, "--json", f"@{f.name}"])
print("updated", res.get("space_id"), res.get("title"))
