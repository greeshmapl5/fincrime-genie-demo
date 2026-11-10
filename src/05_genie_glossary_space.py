"""Point a Genie space at the business glossary maintained by the catalog-manager app (decision 0004).

Usage: py -3 src/05_genie_glossary_space.py <profile> <space_id> [--dry-run]
Adds fincrime.data_products.business_glossary, or moves an existing business_glossary entry from another schema and
keeps its column settings, then replaces the "Business glossary" instruction block.
Backs up the current serialized space to ./space_backup_<space_id>.json before updating. With --dry-run, writes the
result to ./space_preview_<space_id>.json instead of updating the space.
"""
import json
import subprocess
import sys
import tempfile

profile, space_id = sys.argv[1], sys.argv[2]
DRY_RUN = "--dry-run" in sys.argv[3:]
TABLE = "fincrime.data_products.business_glossary"

RULES = f"""
Business glossary (table {TABLE}):
- business_glossary holds business term definitions maintained by business users (term, definition, related_table, related_column, owner).
- When a question uses a business term, look it up in business_glossary (case-insensitive match on term) and use its definition and related_table / related_column to interpret the question.
- For questions such as "what does <term> mean", answer from the definition and mention the owner. If the term is not in the glossary, say so.
"""


def run(args):
    out = subprocess.run(["databricks", *args, "-p", profile, "-o", "json"], capture_output=True, encoding="utf-8")
    if out.returncode:
        sys.exit(out.stderr)
    return json.loads(out.stdout)


def is_glossary(table):
    return table["identifier"].rsplit(".", 1)[-1] == "business_glossary"


space = run(["genie", "get-space", space_id, "--include-serialized-space"])
with open(f"space_backup_{space_id}.json", "w", encoding="utf-8") as f:
    json.dump(space, f)
ss = json.loads(space["serialized_space"])

tables = ss["data_sources"]["tables"]
glossaries = [t for t in tables if is_glossary(t)]
current = [t for t in glossaries if t["identifier"] == TABLE]
entry = (current or glossaries or [{"description": ["Business glossary maintained from the catalog-manager app."]}])[0]
entry["identifier"] = TABLE
ss["data_sources"]["tables"] = sorted([t for t in tables if not is_glossary(t)] + [entry], key=lambda t: t["identifier"])

instr = ss["instructions"]["text_instructions"][0]["content"]
marker = next((i for i, line in enumerate(instr) if line.startswith("Business glossary")), None)
if marker is not None:
    del instr[marker:]
if instr and instr[-1].strip():
    instr.append("\n")
instr.extend(line + "\n" for line in RULES.strip("\n").split("\n"))

if DRY_RUN:
    with open(f"space_preview_{space_id}.json", "w", encoding="utf-8") as f:
        json.dump(ss, f, indent=2)
    print(f"dry run: wrote space_preview_{space_id}.json; the space was not updated")
    sys.exit()

with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump({"serialized_space": json.dumps(ss)}, f)
res = run(["genie", "update-space", space_id, "--json", f"@{f.name}"])
print("updated", res.get("space_id"), res.get("title"))
