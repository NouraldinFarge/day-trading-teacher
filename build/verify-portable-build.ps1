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
$requiredWarning = 'Educational software only. This application does not provide investment advice, live buy/sell signals, order placement, or promises of trading outcomes.'

function Assert-WindowsGuiExecutable {
  param(
    [Parameter(Mandatory = $true)][System.IO.Stream]$Stream,
    [Parameter(Mandatory = $true)][string]$Source
  )

  $ownedStream = $null
  if (-not $Stream.CanSeek) {
    $ownedStream = [System.IO.MemoryStream]::new()
    $Stream.CopyTo($ownedStream)
    $ownedStream.Position = 0
    $Stream = $ownedStream
  }
  try {
    $reader = [System.IO.BinaryReader]::new($Stream, [System.Text.Encoding]::ASCII, $true)
    try {
      if ($Stream.Length -lt 256 -or $reader.ReadUInt16() -ne 0x5A4D) { throw "$Source is not a valid Windows executable." }
      $Stream.Position = 0x3C
      $peOffset = $reader.ReadInt32()
      if ($peOffset -lt 0 -or $peOffset + 94 -gt $Stream.Length) { throw "$Source has an invalid PE header." }
      $Stream.Position = $peOffset
      if ($reader.ReadUInt32() -ne 0x00004550) { throw "$Source has an invalid PE signature." }
      $optionalHeader = $peOffset + 24
      $Stream.Position = $optionalHeader
      $magic = $reader.ReadUInt16()
      if ($magic -notin 0x10B, 0x20B) { throw "$Source has an unsupported PE optional header." }
      $Stream.Position = $optionalHeader + 68
      if ($reader.ReadUInt16() -ne 2) { throw "$Source is not marked as a Windows GUI application and may open a terminal." }
    } finally {
      $reader.Dispose()
    }
  } finally {
    if ($ownedStream) { $ownedStream.Dispose() }
  }
}

function Test-RequiresReleaseWarning {
  param([Parameter(Mandatory = $true)][string]$Version)
  try { return ([version]$Version -ge [version]'0.32.6') } catch { throw "Portable VERSION is not semantic: $Version" }
}

if ($PSCmdlet.ParameterSetName -eq "Folder") {
  $folder = (Resolve-Path -LiteralPath $PortableFolder).Path
  foreach ($item in $required) { if (-not (Test-Path -LiteralPath (Join-Path $folder $item))) { throw "Portable folder is missing: $item" } }
  $bad = Get-ChildItem -LiteralPath $folder -Recurse -Force | Where-Object { $_.FullName -match $forbidden }
  if ($bad) { throw "Portable folder contains prohibited installer content: $($bad.FullName -join ', ')" }
  $executableStream = [System.IO.File]::OpenRead((Join-Path $folder "Day-Trading Teacher.exe"))
  try { Assert-WindowsGuiExecutable -Stream $executableStream -Source "Day-Trading Teacher.exe" } finally { $executableStream.Dispose() }
  $portableVersion = (Get-Content -LiteralPath (Join-Path $folder "VERSION") -Raw).Trim()
  if ((Test-RequiresReleaseWarning -Version $portableVersion) -and (Get-Content -LiteralPath (Join-Path $folder "README.txt") -Raw) -notlike "*$requiredWarning*") {
    throw "Portable README is missing the educational and financial-safety warning."
  }
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
  $privateEntries = $entries | Where-Object {
    ($_ -like "$root/data/*" -and $_ -ne "$root/data/") -or
    ($_ -like "$root/config/*" -and $_ -notin "$root/config/", "$root/config/default-config.example")
  }
  if ($privateEntries) { throw "Portable archive contains local state or credential files: $($privateEntries -join ', ')" }
  $executableEntry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq "$root/Day-Trading Teacher.exe" } | Select-Object -First 1
  $executableStream = $executableEntry.Open()
  try { Assert-WindowsGuiExecutable -Stream $executableStream -Source "Day-Trading Teacher.exe" } finally { $executableStream.Dispose() }
  $versionEntry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq "$root/VERSION" } | Select-Object -First 1
  $reader = [System.IO.StreamReader]::new($versionEntry.Open())
  try { $portableVersion = $reader.ReadToEnd().Trim() } finally { $reader.Dispose() }
  if (Test-RequiresReleaseWarning -Version $portableVersion) {
    $readmeEntry = $zip.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq "$root/README.txt" } | Select-Object -First 1
    $reader = [System.IO.StreamReader]::new($readmeEntry.Open())
    try { $readmeText = $reader.ReadToEnd() } finally { $reader.Dispose() }
    if ($readmeText -notlike "*$requiredWarning*") { throw "Portable README is missing the educational and financial-safety warning." }
  }
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
