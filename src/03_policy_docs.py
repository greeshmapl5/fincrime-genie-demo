"""Create the fictional policy_docs table used by the Genie policy Q&A (story E1-S9).

Genie Agents replace the retired Knowledge Assistant: each policy section is one row,
so the answer can cite document title and section.

Usage: py -3 src/03_policy_docs.py <profile> <warehouse_id> [catalog.schema]
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

profile, warehouse = sys.argv[1], sys.argv[2]
target = sys.argv[3] if len(sys.argv) > 3 else "fincrime.gold"

INV = "Investigation Procedure"
EXP = "Expense Reimbursement Policy"
SECTIONS = [
    (INV, "Step 1: Review alert", 1, "Review the alert and the customer profile."),
    (INV, "Step 2: Check typology", 2, "Check whether the activity meets a documented typology (structuring, rapid pass-through, mule account)."),
    (INV, "Step 3: Compare with expected volume", 3, "Compare activity with expected monthly volume using inflows only."),
    (INV, "Step 4: Review counterparties", 4, "Review counterparties that received funds."),
    (INV, "Step 5: Record decision", 5, "Record the decision and rationale: escalate, or close as a false positive with a reason."),
    (INV, "Escalation", 6, "A case with a typology match and total inflows above 90,000 SEK in 14 days is escalated to a senior investigator within 2 working days."),
    (INV, "Boundaries", 7, 'The assistant provides analysis only. The investigator decides. Use neutral language such as "consistent with". Do not suggest filing a report.'),
    (EXP, "Eligible expenses", 1, "Employees may request reimbursement for reasonable business travel expenses that were approved by their manager before the trip. Receipts are required for every expense."),
    (EXP, "Submission deadline", 2, "Submit an expense reimbursement request within 30 calendar days after the expense was incurred. Include the receipt and the manager's approval."),
    (EXP, "Review and payment", 3, "Finance reviews complete requests. Approved reimbursements are paid through the next regular expense-payment cycle."),
    (EXP, "Late requests", 4, "Requests submitted more than 30 calendar days after an expense require Finance review. Approval is not guaranteed. The policy does not specify an exception process or an appeal process."),
    (EXP, "Policy scope", 5, "This document covers expense reimbursement only. It does not provide guidance about personal safety, travel emergencies, immigration documents, or other employee policies."),
]


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


rows = ",\n".join(f"({q(d)}, {q(s)}, {n}, {q(c)})" for d, s, n, c in SECTIONS)
stmts = [
    f"CREATE OR REPLACE TABLE {target}.policy_docs AS SELECT * FROM VALUES\n{rows}\n"
    "AS t(document_title, section_title, section_number, content)",
    f"COMMENT ON TABLE {target}.policy_docs IS 'Fictional policy documents, one row per section. "
    "Cite document_title and section_title. Not regulatory guidance.'",
]

databricks = "databricks"
for stmt in stmts:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump({"warehouse_id": warehouse, "statement": stmt, "wait_timeout": "30s"}, f)
    out = subprocess.run(
        [databricks, "api", "post", "/api/2.0/sql/statements", "-p", profile, "--json", f"@{f.name}"],
        capture_output=True, text=True,
    )
    state = json.loads(out.stdout)["status"]
    print(state)
    if state["state"] != "SUCCEEDED":
        sys.exit(1)
