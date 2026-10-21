"""Add fincrime.gold.business_glossary (maintained by the catalog-manager app) to a Genie space.

Usage: py -3 src/05_genie_glossary_space.py <profile> <space_id>
Backs up the current serialized space to ./space_backup_<space_id>.json before updating.
"""
import json
import subprocess
import sys
import tempfile

profile, space_id = sys.argv[1], sys.argv[2]
TABLE = "fincrime.gold.business_glossary"

RULES = """
Business glossary (table fincrime.gold.business_glossary):
- business_glossary holds business term definitions maintained by business users (term, definition, related_table, related_column, owner).
- When a question uses a business term, look it up in business_glossary (case-insensitive match on term) and use its definition and related_table / related_column to interpret the question.
- For questions such as "what does <term> mean", answer from the definition and mention the owner. If the term is not in the glossary, say so.
"""


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
    tables.append({"identifier": TABLE, "description": ["Business glossary maintained from the catalog-manager app."]})
    tables.sort(key=lambda t: t["identifier"])

instr = ss["instructions"]["text_instructions"][0]["content"]
marker = next((i for i, line in enumerate(instr) if line.startswith("Business glossary")), None)
if marker is not None:
    del instr[marker:]
instr.append("\n")
instr.extend(line + "\n" for line in RULES.strip("\n").split("\n"))

with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump({"serialized_space": json.dumps(ss)}, f)
res = run(["genie", "update-space", space_id, "--json", f"@{f.name}"])
print("updated", res.get("space_id"), res.get("title"))
