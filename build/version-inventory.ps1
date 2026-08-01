Set-StrictMode -Version Latest

function ConvertTo-StableBuildVersion {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Source
  )

  $trimmed = $Value.Trim()
  if ($trimmed -notmatch '^\d+\.\d+\.\d+$') {
    throw "Invalid semantic version '$trimmed' in $Source. Expected MAJOR.MINOR.PATCH."
  }
  return [version]$trimmed
}

function Get-ProjectBuildVersionInventory {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [Parameter(Mandatory = $true)][string]$WorkspaceRoot
  )

  $records = [System.Collections.Generic.List[object]]::new()
  $workspaceVersionPath = Join-Path $WorkspaceRoot 'VERSION'
  if (Test-Path -LiteralPath $workspaceVersionPath) {
    $displayVersion = (Get-Content -LiteralPath $workspaceVersionPath -Raw).Trim()
    $records.Add([pscustomobject]@{
        DisplayVersion = $displayVersion
        Version        = ConvertTo-StableBuildVersion -Value $displayVersion -Source $workspaceVersionPath
        Location       = 'workspace'
        Kind           = 'source'
        Path           = $WorkspaceRoot
        LastWriteTime  = (Get-Item -LiteralPath $workspaceVersionPath).LastWriteTime
      })
  }

  $activeVersionPath = Join-Path $ProjectRoot 'active-build\VERSION'
  if (Test-Path -LiteralPath $activeVersionPath) {
    $displayVersion = (Get-Content -LiteralPath $activeVersionPath -Raw).Trim()
    $records.Add([pscustomobject]@{
        DisplayVersion = $displayVersion
        Version        = ConvertTo-StableBuildVersion -Value $displayVersion -Source $activeVersionPath
        Location       = 'active-build'
        Kind           = 'active'
        Path           = (Split-Path -Parent $activeVersionPath)
        LastWriteTime  = (Get-Item -LiteralPath $activeVersionPath).LastWriteTime
      })
  }

  $portableRoot = Join-Path $ProjectRoot 'portable-builds'
  if (Test-Path -LiteralPath $portableRoot) {
    Get-ChildItem -LiteralPath $portableRoot -File -Filter '*.zip' | ForEach-Object {
      if ($_.Name -match '^day-trading-teacher-v(?<version>\d+\.\d+\.\d+)-windows-x64-portable\.zip$') {
        $displayVersion = $Matches.version
        $records.Add([pscustomobject]@{
            DisplayVersion = $displayVersion
            Version        = ConvertTo-StableBuildVersion -Value $displayVersion -Source $_.FullName
            Location       = 'portable-builds'
            Kind           = 'portable'
            Path           = $_.FullName
            LastWriteTime  = $_.LastWriteTime
          })
      }
    }
  }

  $versionsRoot = Join-Path $ProjectRoot 'versions'
  if (Test-Path -LiteralPath $versionsRoot) {
    Get-ChildItem -LiteralPath $versionsRoot -File -Filter '*.zip' | ForEach-Object {
      if ($_.Name -match '^day-trading-teacher-v(?<version>\d+\.\d+\.\d+)-\d{4}-\d{2}-\d{2}-source\.zip$') {
        $displayVersion = $Matches.version
        $records.Add([pscustomobject]@{
            DisplayVersion = $displayVersion
            Version        = ConvertTo-StableBuildVersion -Value $displayVersion -Source $_.FullName
            Location       = 'versions'
            Kind           = 'source-archive'
            Path           = $_.FullName
            LastWriteTime  = $_.LastWriteTime
          })
      }
    }
  }

  return @($records | Sort-Object Version, LastWriteTime -Descending)
}

function Get-ProjectBuildVersionSummary {
  param([Parameter(Mandatory = $true)][object[]]$Inventory)

  $versions = @($Inventory | Select-Object -ExpandProperty DisplayVersion -Unique)
  return @(
    foreach ($displayVersion in $versions) {
      $records = @($Inventory | Where-Object DisplayVersion -eq $displayVersion)
      [pscustomobject]@{
        Version       = $displayVersion
        Workspace     = if ($records.Location -contains 'workspace') { 'yes' } else { '-' }
        SourceArchive = if ($records.Location -contains 'versions') { 'yes' } else { '-' }
        PortableZip   = if ($records.Location -contains 'portable-builds') { 'yes' } else { '-' }
        ActiveBuild   = if ($records.Location -contains 'active-build') { 'yes' } else { '-' }
      }
    }
  ) | Sort-Object { [version]$_.Version } -Descending
}

function Show-ProjectBuildVersionInventory {
  param([Parameter(Mandatory = $true)][object[]]$Inventory)

  Write-Host ''
  Write-Host 'Version inventory' -ForegroundColor Cyan
  Get-ProjectBuildVersionSummary -Inventory $Inventory |
    Format-Table Version, Workspace, SourceArchive, PortableZip, ActiveBuild -AutoSize |
    Out-Host
  Write-Host 'Workspace/source archives are buildable. Portable ZIPs are already-built releases; active-build is the installed extraction.' -ForegroundColor DarkGray
}
