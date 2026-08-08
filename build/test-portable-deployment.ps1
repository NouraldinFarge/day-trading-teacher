[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$testRoot = Join-Path $workspaceRoot "output\portable deployment regression with spaces"
$projectRoot = Join-Path $testRoot "project with spaces"
$releaseRoot = Join-Path $projectRoot "portable-builds"
$workRoot = Join-Path $projectRoot "work area"
$deployScript = Join-Path $PSScriptRoot "deploy-active-build.ps1"
$verifyScript = Join-Path $PSScriptRoot "verify-portable-build.ps1"
$warning = "Educational software only. This application does not provide investment advice, live buy/sell signals, order placement, or promises of trading outcomes."

function Write-TestGuiExecutable {
  param([Parameter(Mandatory = $true)][string]$Path)
  $bytes = [byte[]]::new(512)
  [System.BitConverter]::GetBytes([uint16]0x5A4D).CopyTo($bytes, 0)
  [System.BitConverter]::GetBytes([int32]0x80).CopyTo($bytes, 0x3C)
  [System.BitConverter]::GetBytes([uint32]0x00004550).CopyTo($bytes, 0x80)
  [System.BitConverter]::GetBytes([uint16]0x20B).CopyTo($bytes, 0x98)
  [System.BitConverter]::GetBytes([uint16]2).CopyTo($bytes, 0xDC)
  [System.IO.File]::WriteAllBytes($Path, $bytes)
}

function New-TestPortableFolder {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Version
  )
  New-Item -ItemType Directory -Force $Path | Out-Null
  foreach ($directory in "config", "data", "logs", "cache", "assets", "runtime", "licenses") {
    New-Item -ItemType Directory -Force (Join-Path $Path $directory) | Out-Null
  }
  Write-TestGuiExecutable -Path (Join-Path $Path "Day-Trading Teacher.exe")
  [System.IO.File]::WriteAllText((Join-Path $Path "launch-portable.bat"), "@echo off`r`n")
  [System.IO.File]::WriteAllText((Join-Path $Path "VERSION"), $Version)
  [System.IO.File]::WriteAllText((Join-Path $Path "README.txt"), $warning)
  [System.IO.File]::WriteAllText((Join-Path $Path "config\default-config.example"), "# placeholder only")
}

if (Test-Path -LiteralPath $testRoot) { throw "Portable deployment test staging already exists: $testRoot" }
New-Item -ItemType Directory -Force $releaseRoot, $workRoot | Out-Null

try {
  $activeBuild = Join-Path $projectRoot "active-build"
  New-TestPortableFolder -Path $activeBuild -Version "0.32.5"
  $state = '{"schemaVersion":1,"marker":"preserve-state"}'
  $credential = '{"api_key":"local-only-test-value"}'
  [System.IO.File]::WriteAllText((Join-Path $activeBuild "data\state.json"), $state)
  [System.IO.File]::WriteAllText((Join-Path $activeBuild "config\market-data-test.json"), $credential)

  $packageRoot = Join-Path $testRoot "package stage"
  $packageFolder = Join-Path $packageRoot "Day-Trading-Teacher-v0.32.6-windows-x64-portable"
  New-TestPortableFolder -Path $packageFolder -Version "0.32.6"
  $archive = Join-Path $releaseRoot "day-trading-teacher-v0.32.6-windows-x64-portable.zip"
  Compress-Archive -LiteralPath $packageFolder -DestinationPath $archive
  & $verifyScript -ArchivePath $archive
  & $deployScript -ArchivePath $archive -ProjectRoot $projectRoot -WorkDirectory $workRoot -ReleaseDirectory $releaseRoot

  if ((Get-Content -LiteralPath (Join-Path $activeBuild "VERSION") -Raw).Trim() -ne "0.32.6") { throw "Upgrade did not activate v0.32.6." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "data\state.json") -Raw) -ne $state) { throw "Upgrade did not preserve data/state.json." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "config\market-data-test.json") -Raw) -ne $credential) { throw "Upgrade did not preserve separate local configuration." }

  $privatePackageRoot = Join-Path $testRoot "private package stage"
  $privatePackage = Join-Path $privatePackageRoot "Day-Trading-Teacher-v0.32.6-windows-x64-portable"
  New-TestPortableFolder -Path $privatePackage -Version "0.32.6"
  [System.IO.File]::WriteAllText((Join-Path $privatePackage "data\state.json"), "must-not-ship")
  $privateArchive = Join-Path $testRoot "private-package.zip"
  Compress-Archive -LiteralPath $privatePackage -DestinationPath $privateArchive
  $rejected = $false
  try { & $verifyScript -ArchivePath $privateArchive } catch { $rejected = $_.Exception.Message -like "*local state or credential files*" }
  if (-not $rejected) { throw "Portable verification did not reject packaged local state." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "VERSION") -Raw).Trim() -ne "0.32.6") { throw "A rejected package changed the active build." }

  $rollbackPackageRoot = Join-Path $testRoot "rollback package stage"
  $rollbackPackage = Join-Path $rollbackPackageRoot "Day-Trading-Teacher-v0.32.7-windows-x64-portable"
  New-TestPortableFolder -Path $rollbackPackage -Version "0.32.7"
  $rollbackArchive = Join-Path $releaseRoot "day-trading-teacher-v0.32.7-windows-x64-portable.zip"
  Compress-Archive -LiteralPath $rollbackPackage -DestinationPath $rollbackArchive
  $env:DAY_TRADING_TEACHER_RELEASE_TEST = "1"
  $rolledBack = $false
  try {
    & $deployScript -ArchivePath $rollbackArchive -ProjectRoot $projectRoot -WorkDirectory $workRoot -ReleaseDirectory $releaseRoot -_TestFailAfterActivation
  } catch {
    $rolledBack = $_.Exception.Message -like "*Intentional post-activation failure*"
  } finally {
    Remove-Item Env:\DAY_TRADING_TEACHER_RELEASE_TEST -ErrorAction SilentlyContinue
  }
  if (-not $rolledBack) { throw "The deployment regression did not reach the intentional rollback point." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "VERSION") -Raw).Trim() -ne "0.32.6") { throw "Rollback did not restore the previous active version." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "data\state.json") -Raw) -ne $state) { throw "Rollback did not restore user state." }
  if ((Get-Content -LiteralPath (Join-Path $activeBuild "config\market-data-test.json") -Raw) -ne $credential) { throw "Rollback did not restore local configuration." }

  Write-Host "Portable deployment regression passed: spaced path, GUI subsystem, state/config migration, private-data rejection, transactional rollback, and unchanged state after rejection."
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    $resolvedOutput = (Resolve-Path (Join-Path $workspaceRoot "output")).Path
    $resolvedTest = (Resolve-Path $testRoot).Path
    if (-not $resolvedTest.StartsWith($resolvedOutput, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to clean portable deployment test data outside output/." }
    Remove-Item -LiteralPath $resolvedTest -Recurse -Force
  }
}
