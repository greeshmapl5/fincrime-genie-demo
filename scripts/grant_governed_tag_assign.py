# Databricks notebook source
# MAGIC %md
# MAGIC # Grant ASSIGN on governed tags to the Catalog Manager app (E1-S14)
# MAGIC
# MAGIC Run as an **account admin** (or a user with MANAGE on each tag). No Databricks CLI needed.
# MAGIC Same result as **Catalog › Govern › Governed Tags › tag › Permissions › Grant permissions › ASSIGN**.
# MAGIC There is no SQL `GRANT` for governed tags. CLI alternative: `scripts/grant-governed-tag-assign.ps1`.
# MAGIC
# MAGIC 1. Fill in `account_id` and run all with `dry_run = true`.
# MAGIC 2. Check the output, set `dry_run = false` and run all again.
# MAGIC 3. Wait about a minute, then retry the tag change in the app.

# COMMAND ----------

dbutils.widgets.text("account_id", "")
dbutils.widgets.text("app_name", "catalog-manager")
dbutils.widgets.text("tag_keys", "system.certification_status,Financial Crime,class.se_personnummer")
dbutils.widgets.dropdown("dry_run", "true", ["true", "false"])

# COMMAND ----------

ROLE = "roles/tagPolicy.assigner"  # ASSIGN in the Governed Tags UI
RULE_SETS = "/api/2.0/preview/accounts/access-control/rule-sets"


def with_assigner(grant_rules, principal):
    """Return grant_rules plus principal on ROLE, or None if it already has it.

    The update API replaces a tag's whole rule set, so existing rules are kept.
    """
    rules = [dict(r) for r in grant_rules or []]
    rule = next((r for r in rules if r.get("role") == ROLE), None)
    if rule is None:
        rules.append({"role": ROLE, "principals": [principal]})
    elif principal in rule.get("principals", []):
        return None
    else:
        rule["principals"] = [*rule.get("principals", []), principal]
    return rules

# COMMAND ----------

from databricks.sdk import WorkspaceClient

account_id = dbutils.widgets.get("account_id").strip()
tag_keys = [k.strip() for k in dbutils.widgets.get("tag_keys").split(",") if k.strip()]
dry_run = dbutils.widgets.get("dry_run") == "true"
assert account_id, "Fill in the account_id widget."

api = WorkspaceClient().api_client
app = api.do("GET", f"/api/2.0/apps/{dbutils.widgets.get('app_name').strip()}")
principal = f"servicePrincipals/{app['service_principal_client_id']}"
print(f"Principal: {principal} ({app['service_principal_name']})")

policies, token = {}, None
while True:
    page = api.do("GET", "/api/2.1/tag-policies", query={"page_token": token} if token else None)
    policies.update({p["tag_key"]: p["id"] for p in page.get("tag_policies", [])})
    token = page.get("next_page_token")
    if not token:
        break

for key in tag_keys:
    if key not in policies:
        print(f"{key}: no such governed tag, skipped")
        continue
    name = f"accounts/{account_id}/tagPolicies/{policies[key]}/ruleSets/default"
    current = api.do("GET", RULE_SETS, query={"name": name, "etag": ""})
    rules = with_assigner(current.get("grant_rules"), principal)
    if rules is None:
        print(f"{key}: already has ASSIGN")
    elif dry_run:
        print(f"{key}: would set grant_rules = {rules}")
    else:
        rule_set = {"name": name, "etag": current["etag"], "grant_rules": rules}
        api.do("PUT", RULE_SETS, body={"name": name, "rule_set": rule_set})
        print(f"{key}: ASSIGN granted")
print("Permission checks can take 30 seconds or more to propagate.")
