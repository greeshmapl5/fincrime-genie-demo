# Grants ASSIGN on governed tags to the Catalog Manager app service principal (E1-S14).
# Run as an account admin (or a user with MANAGE on each tag). Same result as
# Catalog > Govern > Governed Tags > <tag> > Permissions > Grant permissions > ASSIGN.
# No Databricks CLI? Run the notebook scripts/grant_governed_tag_assign.py in the workspace instead.
#
#   .\scripts\grant-governed-tag-assign.ps1 -AccountId <ACCOUNT_ID> -Profile <CLI_PROFILE> [-DryRun]
#
# The update API replaces a tag's whole rule set, so the script reads the current rules
# (with their etag), adds the principal to roles/tagPolicy.assigner and writes them back.
param(
  [Parameter(Mandatory = $true)][string]$AccountId,
  [string]$Profile = 'dario-ws',
  [string]$AppName = 'catalog-manager',
  [string[]]$TagKeys = @('system.certification_status', 'Financial Crime', 'class.se_personnummer'),
  [switch]$DryRun
)

$Role = 'roles/tagPolicy.assigner'
$RuleSetsApi = '/api/2.0/preview/accounts/access-control/rule-sets'

function Invoke-Cli([string[]]$CliArgs) {
  $out = & databricks @CliArgs -p $Profile 2>&1
  if ($LASTEXITCODE -ne 0) { throw "databricks $($CliArgs -join ' ') failed: $out" }
  return ($out | Out-String)
}

function Add-Assigner($GrantRules, [string]$Principal) {
  $rules = @($GrantRules | Where-Object { $_ })
  $rule = $rules | Where-Object { $_.role -eq $Role } | Select-Object -First 1
  if ($rule -and @($rule.principals) -contains $Principal) { return $null }
  if ($rule) { $rule.principals = @($rule.principals) + $Principal }
  else { $rules += [pscustomobject]@{ role = $Role; principals = @($Principal) } }
  return , $rules
}

$app = Invoke-Cli @('apps', 'get', $AppName, '-o', 'json') | ConvertFrom-Json
$principal = "servicePrincipals/$($app.service_principal_client_id)"
"Principal: $principal ($($app.service_principal_name))"

$policies = @(); $token = ''
do {
  $path = '/api/2.1/tag-policies' + $(if ($token) { "?page_token=$([uri]::EscapeDataString($token))" } else { '' })
  $page = Invoke-Cli @('api', 'get', $path) | ConvertFrom-Json
  $policies += $page.tag_policies; $token = $page.next_page_token
} while ($token)

foreach ($key in $TagKeys) {
  $policy = $policies | Where-Object { $_.tag_key -eq $key } | Select-Object -First 1
  if (-not $policy) { Write-Warning "No governed tag '$key'; skipped."; continue }
  $name = "accounts/$AccountId/tagPolicies/$($policy.id)/ruleSets/default"
  $current = Invoke-Cli @('api', 'get', "$RuleSetsApi`?name=$([uri]::EscapeDataString($name))&etag=") | ConvertFrom-Json
  $rules = Add-Assigner $current.grant_rules $principal
  if ($null -eq $rules) { "${key}: already has ASSIGN"; continue }
  $body = @{ name = $name; rule_set = @{ name = $name; etag = $current.etag; grant_rules = $rules } } | ConvertTo-Json -Depth 6
  if ($DryRun) { "${key}: would PUT`n$body"; continue }
  $file = [IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $file -Value $body -Encoding ascii
    $null = Invoke-Cli @('api', 'put', $RuleSetsApi, '--json', "@$file")
    "${key}: ASSIGN granted"
  } finally { Remove-Item $file -ErrorAction SilentlyContinue }
}
'Permission checks can take 30 seconds or more to propagate.'
