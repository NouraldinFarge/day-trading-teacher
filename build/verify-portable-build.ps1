[CmdletBinding(DefaultParameterSetName = "Folder")]
param(
  [Parameter(Mandatory, ParameterSetName = "Folder")][string]$PortableFolder,
  [Parameter(Mandatory, ParameterSetName = "Archive")][string]$ArchivePath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$forbidden = '(?i)(\.msi$|\.msix$|\.appx$|setup\.exe$|(^|/|\\)(bundle|installers?)(/|\\|$))'
$required = @("Day-Trading Teacher.exe", "launch-portable.bat", "VERSION", "README.txt", "config", "data", "logs", "cache")
$curriculumPlan = "assets/curriculum-v7/evidence-to-execution-v7.dtlesson.json"
$curriculumCompanions = @(
  "assets/curriculum-v7/resources/README.md",
  "assets/curriculum-v7/resources/learner/glossary.md",
  "assets/curriculum-v7/resources/learner/open-practice-case-bank-v7.json"
)
$facilitatorOnly = '(?i)"(capstone_blueprint|required_outcome|accepted_decision|outcome_class|scoring_key|answer_key|reveal_material)"\s*:'

if ($PSCmdlet.ParameterSetName -eq "Folder") {
  $folder = (Resolve-Path -LiteralPath $PortableFolder).Path
  foreach ($item in $required) { if (-not (Test-Path -LiteralPath (Join-Path $folder $item))) { throw "Portable folder is missing: $item" } }
  $bad = Get-ChildItem -LiteralPath $folder -Recurse -Force | Where-Object { $_.FullName -match $forbidden }
  if ($bad) { throw "Portable folder contains prohibited installer content: $($bad.FullName -join ', ')" }
  $planPath = Join-Path $folder $curriculumPlan
  if (Test-Path -LiteralPath $planPath) {
    foreach ($item in $curriculumCompanions) {
      if (-not (Test-Path -LiteralPath (Join-Path $folder $item) -PathType Leaf)) {
        throw "Curriculum assets are incomplete: $item"
      }
    }
    $planRaw = Get-Content -LiteralPath $planPath -Raw
    if ($planRaw -match $facilitatorOnly) { throw "Learner curriculum contains facilitator-only outcome or scoring fields." }
    $plan = $planRaw | ConvertFrom-Json
    if ($plan.version -ne "7.1.1" -or @($plan.lessons).Count -ne 16) {
      throw "Learner curriculum identity or lesson count is invalid."
    }
  }
  Write-Host "Portable folder passed structural validation."
  return
}

$archive = (Resolve-Path -LiteralPath $ArchivePath).Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
try {
  $entries = $zip.Entries.FullName | ForEach-Object { $_.Replace('\', '/') }
  $root = ($entries | Select-Object -First 1).Split('/')[0]
  foreach ($item in $required) { if (-not ($entries -contains "$root/$item") -and -not ($entries | Where-Object { $_ -like "$root/$item/*" })) { throw "Portable archive is missing: $item" } }
  $bad = $entries | Where-Object { $_ -match $forbidden }
  if ($bad) { throw "Portable archive contains prohibited installer content: $($bad -join ', ')" }
  $planEntryName = "$root/$curriculumPlan"
  if ($entries -contains $planEntryName) {
    foreach ($item in $curriculumCompanions) {
      if ($entries -notcontains "$root/$item") { throw "Curriculum assets are incomplete: $item" }
    }
    $planEntry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq $planEntryName } | Select-Object -First 1
    $reader = [System.IO.StreamReader]::new($planEntry.Open())
    try { $planRaw = $reader.ReadToEnd() } finally { $reader.Dispose() }
    if ($planRaw -match $facilitatorOnly) { throw "Learner curriculum contains facilitator-only outcome or scoring fields." }
    $plan = $planRaw | ConvertFrom-Json
    if ($plan.version -ne "7.1.1" -or @($plan.lessons).Count -ne 16) {
      throw "Learner curriculum identity or lesson count is invalid."
    }
  }
} finally { $zip.Dispose() }
Write-Host "Portable archive passed structural validation."
