[CmdletBinding()]
param(
  [string]$Version,
  [switch]$InventoryOnly,
  [switch]$NonInteractive,
  [switch]$AllowDowngrade,
  [switch]$CurrentWorkspace
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $workspaceRoot '..')).Path
$buildRoot = Join-Path $workspaceRoot 'build'
$inventoryScript = Join-Path $buildRoot 'version-inventory.ps1'
$hashScript = Join-Path $buildRoot 'file-hash.ps1'
$portableBuildScript = Join-Path $buildRoot 'build-portable.ps1'
$portableVerifyScript = Join-Path $buildRoot 'verify-portable-build.ps1'
$deployScript = Join-Path $buildRoot 'deploy-active-build.ps1'
$sourceVerifyScript = Join-Path $projectRoot 'scripts\verify-version-archive.ps1'

. $inventoryScript
. $hashScript

function Get-WorkspaceDisplayVersion {
  return (Get-Content -LiteralPath (Join-Path $workspaceRoot 'VERSION') -Raw).Trim()
}

function Assert-RegisteredArchiveChecksum {
  param(
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [Parameter(Mandatory = $true)][string]$LedgerPath,
    [Parameter(Mandatory = $true)][string]$RelativeArchivePath
  )

  if (-not (Test-Path -LiteralPath $LedgerPath)) {
    throw "Checksum ledger is missing: $LedgerPath"
  }

  $registeredHashes = [System.Collections.Generic.List[string]]::new()
  foreach ($line in Get-Content -LiteralPath $LedgerPath) {
    $parts = @($line.Trim() -split '\s+', 2)
    if ($parts.Count -eq 2 -and $parts[1].Replace('\', '/') -ieq $RelativeArchivePath) {
      $registeredHashes.Add($parts[0].ToLowerInvariant())
    }
  }
  if ($registeredHashes.Count -ne 1) {
    throw "Expected exactly one checksum registration for $RelativeArchivePath; found $($registeredHashes.Count)."
  }
  if ($registeredHashes[0] -notmatch '^[a-f0-9]{64}$') {
    throw "The registered checksum for $RelativeArchivePath is invalid."
  }

  $actualHash = Get-Sha256Hex -LiteralPath $ArchivePath
  if ($actualHash -ne $registeredHashes[0]) {
    throw "Checksum mismatch for $RelativeArchivePath. The archive may be incomplete or modified."
  }
  Write-Host "Recorded SHA-256 verified for $RelativeArchivePath."
}

function Test-DowngradeApproved {
  param(
    [Parameter(Mandatory = $true)][version]$SelectedVersion,
    [Parameter(Mandatory = $true)][version]$ActiveVersion
  )

  if ($SelectedVersion -ge $ActiveVersion) { return $true }
  if ($AllowDowngrade) { return $true }
  if ($NonInteractive) {
    throw "Selected version $SelectedVersion is older than active-build $ActiveVersion. Re-run with -AllowDowngrade to confirm the downgrade."
  }

  Write-Host ''
  Write-Host "Warning: this will replace active-build $ActiveVersion with older version $SelectedVersion." -ForegroundColor Yellow
  Write-Host 'Saved data and local provider configuration will still be migrated.' -ForegroundColor Yellow
  return (Read-Host 'Type DOWNGRADE to continue') -ceq 'DOWNGRADE'
}

function Register-PortableRelease {
  param(
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [Parameter(Mandatory = $true)][string]$DisplayVersion
  )

  $archiveName = Split-Path -Leaf $ArchivePath
  $checksumPath = Join-Path $projectRoot 'checksums\portable-builds.sha256'
  $metadataDirectory = Join-Path $projectRoot 'release-metadata'
  New-Item -ItemType Directory -Force (Split-Path -Parent $checksumPath), $metadataDirectory | Out-Null
  $relativeArchive = "portable-builds/$archiveName"
  $metadataPath = Join-Path $metadataDirectory "day-trading-teacher-v$DisplayVersion-windows-x64-portable.json"
  if (Test-Path -LiteralPath $metadataPath) {
    throw "Release metadata already exists for v$DisplayVersion. Refusing to overwrite it."
  }
  $existingChecksumLines = if (Test-Path -LiteralPath $checksumPath) {
    @(Get-Content -LiteralPath $checksumPath)
  } else {
    @()
  }
  if ($existingChecksumLines -match [regex]::Escape($relativeArchive)) {
    throw "Checksum registration already exists for $relativeArchive. Refusing to replace an immutable release."
  }

  $hash = Get-Sha256Hex -LiteralPath $ArchivePath
  $metadata = [ordered]@{
    application = 'Day-Trading Teacher'
    version = $DisplayVersion
    date = (Get-Date -Format 'yyyy-MM-dd')
    target_os = 'windows'
    architecture = 'x64'
    package = $archiveName
    active_build_directory = 'active-build/'
    deployment_policy = 'single-stable-active-build-with-data-migration'
    sha256 = $hash
    portable_data_root = 'data/'
    installer_generation = $false
  } | ConvertTo-Json
  try {
    Set-Content -LiteralPath $metadataPath -Value $metadata -Encoding utf8
    "$hash  $relativeArchive" | Add-Content -LiteralPath $checksumPath -Encoding utf8
  } catch {
    if (Test-Path -LiteralPath $metadataPath) { Remove-Item -LiteralPath $metadataPath -Force }
    throw
  }
}

function Deploy-PortableArchive {
  param(
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [Parameter(Mandatory = $true)][version]$SelectedVersion
  )

  $archiveName = Split-Path -Leaf $ArchivePath
  Assert-RegisteredArchiveChecksum `
    -ArchivePath $ArchivePath `
    -LedgerPath (Join-Path $projectRoot 'checksums\portable-builds.sha256') `
    -RelativeArchivePath "portable-builds/$archiveName"
  & $portableVerifyScript -ArchivePath $ArchivePath

  $activeVersionPath = Join-Path $projectRoot 'active-build\VERSION'
  if (Test-Path -LiteralPath $activeVersionPath) {
    $activeDisplayVersion = (Get-Content -LiteralPath $activeVersionPath -Raw).Trim()
    $activeVersion = ConvertTo-StableBuildVersion -Value $activeDisplayVersion -Source $activeVersionPath
    if ($activeVersion -eq $SelectedVersion) {
      & $portableVerifyScript -PortableFolder (Join-Path $projectRoot 'active-build')
      Write-Host "v$SelectedVersion is already built and active. No files were replaced." -ForegroundColor Green
      return
    }
    if (-not (Test-DowngradeApproved -SelectedVersion $SelectedVersion -ActiveVersion $activeVersion)) {
      Write-Host 'Downgrade cancelled. No files were changed.' -ForegroundColor Yellow
      return
    }
  }

  $outputDirectory = Join-Path $workspaceRoot 'output'
  $releaseDirectory = Join-Path $projectRoot 'portable-builds'
  New-Item -ItemType Directory -Force $outputDirectory, $releaseDirectory | Out-Null
  & $deployScript -ArchivePath $ArchivePath -ProjectRoot $projectRoot -WorkDirectory $outputDirectory -ReleaseDirectory $releaseDirectory
  Write-Host "v$SelectedVersion is now the active build. Existing data and local configuration were preserved." -ForegroundColor Green
}

function Build-WorkspaceVersion {
  param([Parameter(Mandatory = $true)][version]$SelectedVersion)

  $workspaceDisplayVersion = Get-WorkspaceDisplayVersion
  $workspaceVersion = ConvertTo-StableBuildVersion -Value $workspaceDisplayVersion -Source (Join-Path $workspaceRoot 'VERSION')
  if ($workspaceVersion -ne $SelectedVersion) {
    throw "Workspace is v$workspaceVersion, not selected v$SelectedVersion. Refusing to rewrite version metadata automatically."
  }

  Write-Host ''
  Write-Host "Building workspace v$workspaceDisplayVersion..." -ForegroundColor Cyan
  & $portableBuildScript
}

function Build-ArchivedVersion {
  param(
    [Parameter(Mandatory = $true)][object]$SourceArchive,
    [Parameter(Mandatory = $true)][version]$SelectedVersion
  )

  $displayVersion = $SourceArchive.DisplayVersion
  $sourceArchiveName = Split-Path -Leaf $SourceArchive.Path
  Assert-RegisteredArchiveChecksum `
    -ArchivePath $SourceArchive.Path `
    -LedgerPath (Join-Path $projectRoot 'checksums\versions.sha256') `
    -RelativeArchivePath "versions/$sourceArchiveName"
  & $sourceVerifyScript -ArchivePath $SourceArchive.Path

  $tempRoot = Join-Path $workspaceRoot 'temp'
  New-Item -ItemType Directory -Force $tempRoot | Out-Null
  $stagingRoot = Join-Path $tempRoot "selected-build-v$displayVersion-$([guid]::NewGuid().ToString('N'))"
  $resolvedTempRoot = (Resolve-Path -LiteralPath $tempRoot).Path
  New-Item -ItemType Directory -Path $stagingRoot | Out-Null
  $destinationArchive = $null
  $releaseRegistered = $false

  try {
    Write-Host ''
    Write-Host "Building archived source v$displayVersion in an isolated temporary workspace..." -ForegroundColor Cyan
    Expand-Archive -LiteralPath $SourceArchive.Path -DestinationPath $stagingRoot
    $snapshotFolders = @(Get-ChildItem -LiteralPath $stagingRoot -Directory -Force)
    if ($snapshotFolders.Count -ne 1) { throw 'Source ZIP must contain exactly one top-level snapshot folder.' }

    $restoredProject = $snapshotFolders[0].FullName
    $restoredWorkspace = Join-Path $restoredProject 'workspace'
    $restoredVersionPath = Join-Path $restoredWorkspace 'VERSION'
    if (-not (Test-Path -LiteralPath $restoredVersionPath)) { throw 'Restored source does not contain workspace/VERSION.' }
    $restoredDisplayVersion = (Get-Content -LiteralPath $restoredVersionPath -Raw).Trim()
    $restoredVersion = ConvertTo-StableBuildVersion -Value $restoredDisplayVersion -Source $restoredVersionPath
    if ($restoredVersion -ne $SelectedVersion) { throw "Restored source version $restoredVersion does not match selected $SelectedVersion." }

    $restoredBuildScript = Join-Path $restoredWorkspace 'build\build-portable.ps1'
    if (-not (Test-Path -LiteralPath $restoredBuildScript)) { throw 'Selected source archive has no portable build script.' }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $restoredBuildScript
    if ($LASTEXITCODE -ne 0) { throw "Archived source build failed for v$displayVersion." }

    $archiveName = "day-trading-teacher-v$displayVersion-windows-x64-portable.zip"
    $builtArchive = Join-Path $restoredProject "portable-builds\$archiveName"
    if (-not (Test-Path -LiteralPath $builtArchive)) { throw "Archived build did not create $archiveName." }

    $releaseDirectory = Join-Path $projectRoot 'portable-builds'
    New-Item -ItemType Directory -Force $releaseDirectory | Out-Null
    $destinationArchive = Join-Path $releaseDirectory $archiveName
    if (Test-Path -LiteralPath $destinationArchive) { throw "Portable v$displayVersion already exists; refusing to overwrite it." }
    Copy-Item -LiteralPath $builtArchive -Destination $destinationArchive
    & $portableVerifyScript -ArchivePath $destinationArchive
    Register-PortableRelease -ArchivePath $destinationArchive -DisplayVersion $displayVersion
    $releaseRegistered = $true
    return $destinationArchive
  } catch {
    if ($destinationArchive -and -not $releaseRegistered -and (Test-Path -LiteralPath $destinationArchive)) {
      Remove-Item -LiteralPath $destinationArchive -Force
    }
    throw
  } finally {
    if (Test-Path -LiteralPath $stagingRoot) {
      $resolvedStagingRoot = (Resolve-Path -LiteralPath $stagingRoot).Path
      if (-not $resolvedStagingRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clean a selected-build folder outside workspace/temp: $resolvedStagingRoot"
      }
      Remove-Item -LiteralPath $resolvedStagingRoot -Recurse -Force
    }
  }
}

function Invoke-SelectedVersion {
  param(
    [Parameter(Mandatory = $true)][string]$DisplayVersion,
    [Parameter(Mandatory = $true)][object[]]$Inventory
  )

  $selectedVersion = ConvertTo-StableBuildVersion -Value $DisplayVersion -Source 'selected version'
  $records = @($Inventory | Where-Object { $_.Version -eq $selectedVersion })
  if (-not $records.Count) { throw "Version $DisplayVersion was not found in workspace, versions, portable-builds, or active-build." }

  $portable = $records | Where-Object Kind -eq 'portable' | Select-Object -First 1
  if ($portable) {
    Write-Host "Portable v$DisplayVersion already exists; validating and activating it instead of overwriting an immutable release." -ForegroundColor Cyan
    Deploy-PortableArchive -ArchivePath $portable.Path -SelectedVersion $selectedVersion
    return
  }

  $workspaceSource = $records | Where-Object Location -eq 'workspace' | Select-Object -First 1
  if ($workspaceSource) {
    Build-WorkspaceVersion -SelectedVersion $selectedVersion
    return
  }

  $sourceArchive = $records | Where-Object Kind -eq 'source-archive' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($sourceArchive) {
    $newArchive = Build-ArchivedVersion -SourceArchive $sourceArchive -SelectedVersion $selectedVersion
    Deploy-PortableArchive -ArchivePath $newArchive -SelectedVersion $selectedVersion
    return
  }

  throw "v$DisplayVersion exists only as active-build and has no portable ZIP or buildable source. No safe build action is available."
}

function Invoke-NewestAvailableVersion {
  param([Parameter(Mandatory = $true)][object[]]$Inventory)

  if (-not $Inventory.Count) { throw 'No versions were found.' }
  $newestVersion = ($Inventory | Sort-Object Version -Descending | Select-Object -First 1).DisplayVersion
  Write-Host "Newest version found across all four locations: v$newestVersion" -ForegroundColor Cyan
  Invoke-SelectedVersion -DisplayVersion $newestVersion -Inventory $Inventory
}

function Select-VersionInteractively {
  param([Parameter(Mandatory = $true)][object[]]$Inventory)

  $summaries = @(Get-ProjectBuildVersionSummary -Inventory $Inventory)
  Write-Host ''
  Write-Host 'Select a version to build or activate:' -ForegroundColor Cyan
  for ($index = 0; $index -lt $summaries.Count; $index++) {
    $item = $summaries[$index]
    $locations = @()
    if ($item.Workspace -eq 'yes') { $locations += 'workspace source' }
    if ($item.SourceArchive -eq 'yes') { $locations += 'source ZIP' }
    if ($item.PortableZip -eq 'yes') { $locations += 'portable ZIP' }
    if ($item.ActiveBuild -eq 'yes') { $locations += 'active' }
    Write-Host ("  [{0}] v{1}  {2}" -f ($index + 1), $item.Version, ($locations -join ' · '))
  }
  Write-Host '  [Q] Cancel'
  $selection = (Read-Host 'Version').Trim()
  if ($selection -match '^[Qq]$') { return $null }
  $number = 0
  if (-not [int]::TryParse($selection, [ref]$number) -or $number -lt 1 -or $number -gt $summaries.Count) {
    throw "Invalid version selection '$selection'."
  }
  return $summaries[$number - 1].Version
}

try {
  $inventory = @(Get-ProjectBuildVersionInventory -ProjectRoot $projectRoot -WorkspaceRoot $workspaceRoot)
  Show-ProjectBuildVersionInventory -Inventory $inventory

  if ($InventoryOnly) {
    Write-Host 'Inventory only; no files were changed.' -ForegroundColor Green
    exit 0
  }

  if ($Version) {
    Invoke-SelectedVersion -DisplayVersion $Version -Inventory $inventory
    exit 0
  }

  if ($CurrentWorkspace) {
    Invoke-SelectedVersion -DisplayVersion (Get-WorkspaceDisplayVersion) -Inventory $inventory
    exit 0
  }

  if ($NonInteractive) {
    Invoke-NewestAvailableVersion -Inventory $inventory
    exit 0
  }

  Write-Host ''
  Write-Host 'One-click build options' -ForegroundColor Cyan
  Write-Host '  [1] Build or activate the newest available version (recommended)'
  Write-Host '  [2] Select a version to build or activate'
  Write-Host '  [3] Build or activate the current workspace version'
  Write-Host '  [4] Show inventory only'
  Write-Host '  [Q] Cancel'
  $choice = (Read-Host 'Choose (press Enter for 1)').Trim()
  if (-not $choice) { $choice = '1' }

  switch -Regex ($choice) {
    '^1$' { Invoke-NewestAvailableVersion -Inventory $inventory; break }
    '^2$' {
      $selected = Select-VersionInteractively -Inventory $inventory
      if ($selected) { Invoke-SelectedVersion -DisplayVersion $selected -Inventory $inventory }
      else { Write-Host 'Cancelled. No files were changed.' -ForegroundColor Yellow }
      break
    }
    '^3$' { Invoke-SelectedVersion -DisplayVersion (Get-WorkspaceDisplayVersion) -Inventory $inventory; break }
    '^4$' { Write-Host 'Inventory only; no files were changed.' -ForegroundColor Green; break }
    '^[Qq]$' { Write-Host 'Cancelled. No files were changed.' -ForegroundColor Yellow; break }
    default { throw "Invalid menu choice '$choice'." }
  }
} catch {
  Write-Host ''
  Write-Host "Build launcher stopped: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
