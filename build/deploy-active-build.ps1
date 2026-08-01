[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ArchivePath,
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$WorkDirectory,
  [Parameter(Mandatory = $true)][string]$ReleaseDirectory
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$archive = (Resolve-Path -LiteralPath $ArchivePath).Path
$project = (Resolve-Path -LiteralPath $ProjectRoot).Path
$workRoot = (Resolve-Path -LiteralPath $WorkDirectory).Path
$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$activeBuild = Join-Path $project "active-build"
$deploymentRoot = Join-Path $workRoot "active-build-deployment"
$backupRoot = Join-Path $workRoot "active-build-previous"
$legacyPattern = '^Day-Trading-Teacher-v(?<version>\d+\.\d+\.\d+)-windows-x64-portable$'
$verifyScript = Join-Path $PSScriptRoot "verify-portable-build.ps1"

if ((Split-Path -Parent $activeBuild) -ne $project) { throw "Active build path escaped the project root." }
if (Test-Path -LiteralPath $deploymentRoot) { throw "Deployment staging already exists: $deploymentRoot" }
if (Test-Path -LiteralPath $backupRoot) { throw "Previous active-build backup still exists: $backupRoot" }

$legacyFolders = @(
  Get-ChildItem -LiteralPath $releaseRoot -Directory -Force | ForEach-Object {
    if ($_.Name -match $legacyPattern) {
      [pscustomobject]@{ Directory = $_; Version = [version]$Matches.version }
    }
  } | Sort-Object Version -Descending
)

$stateSource = if (Test-Path -LiteralPath $activeBuild) {
  Get-Item -LiteralPath $activeBuild
} elseif ($legacyFolders) {
  $legacyFolders[0].Directory
} else {
  $null
}

New-Item -ItemType Directory -Path $deploymentRoot | Out-Null
try {
  Expand-Archive -LiteralPath $archive -DestinationPath $deploymentRoot
  $expandedFolders = @(Get-ChildItem -LiteralPath $deploymentRoot -Directory -Force)
  if ($expandedFolders.Count -ne 1) { throw "Portable ZIP must contain exactly one top-level folder." }
  $nextBuild = $expandedFolders[0].FullName

  & $verifyScript -PortableFolder $nextBuild

  if ($stateSource) {
    $sourceData = Join-Path $stateSource.FullName "data"
    $targetData = Join-Path $nextBuild "data"
    if (Test-Path -LiteralPath $sourceData) {
      Get-ChildItem -LiteralPath $sourceData -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $targetData -Recurse -Force
      }
    }

    $sourceConfig = Join-Path $stateSource.FullName "config"
    $targetConfig = Join-Path $nextBuild "config"
    if (Test-Path -LiteralPath $sourceConfig) {
      Get-ChildItem -LiteralPath $sourceConfig -Force | Where-Object Name -ne "default-config.example" | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $targetConfig -Recurse -Force
      }
    }
  }

  & $verifyScript -PortableFolder $nextBuild

  if (Test-Path -LiteralPath $activeBuild) {
    $validatedActiveBuild = (Resolve-Path -LiteralPath $activeBuild).Path
    if ((Split-Path -Parent $validatedActiveBuild) -ne $project) { throw "Existing active build escaped the project root." }
    Move-Item -LiteralPath $validatedActiveBuild -Destination $backupRoot
  }

  Move-Item -LiteralPath $nextBuild -Destination $activeBuild
  & $verifyScript -PortableFolder $activeBuild

  foreach ($legacy in $legacyFolders) {
    $validatedLegacy = (Resolve-Path -LiteralPath $legacy.Directory.FullName).Path
    if ((Split-Path -Parent $validatedLegacy) -ne $releaseRoot) { throw "Legacy extraction escaped the release directory: $validatedLegacy" }
    if ((Split-Path -Leaf $validatedLegacy) -notmatch $legacyPattern) { throw "Unexpected legacy extraction: $validatedLegacy" }
    Remove-Item -LiteralPath $validatedLegacy -Recurse -Force
  }

  if (Test-Path -LiteralPath $backupRoot) { Remove-Item -LiteralPath $backupRoot -Recurse -Force }
  Write-Host "Active build deployed: $activeBuild"
} catch {
  if (Test-Path -LiteralPath $backupRoot) {
    if (Test-Path -LiteralPath $activeBuild) { Remove-Item -LiteralPath $activeBuild -Recurse -Force }
    Move-Item -LiteralPath $backupRoot -Destination $activeBuild
  }
  throw
} finally {
  if (Test-Path -LiteralPath $deploymentRoot) { Remove-Item -LiteralPath $deploymentRoot -Recurse -Force }
}
