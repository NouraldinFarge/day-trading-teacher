[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectRoot = (Resolve-Path (Join-Path $workspaceRoot "..")).Path
. (Join-Path $PSScriptRoot "file-hash.ps1")
$version = (Get-Content -LiteralPath (Join-Path $workspaceRoot "VERSION") -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "VERSION must contain a semantic version." }

foreach ($tool in "npm", "cargo") {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Required build tool '$tool' was not found on PATH." }
}

$versionFiles = @(
  (Join-Path $workspaceRoot "package.json"),
  (Join-Path $workspaceRoot "apps\day-trading-teacher\desktop\package.json"),
  (Join-Path $workspaceRoot "Cargo.toml"),
  (Join-Path $workspaceRoot "apps\day-trading-teacher\desktop\src-tauri\tauri.conf.json")
)
foreach ($file in $versionFiles) {
  if ((Get-Content -LiteralPath $file -Raw) -notmatch [regex]::Escape($version)) { throw "Version mismatch: $file does not contain $version." }
}

$tauriConfig = Get-Content -LiteralPath (Join-Path $workspaceRoot "apps\day-trading-teacher\desktop\src-tauri\tauri.conf.json") -Raw
if ($tauriConfig -notmatch '"active"\s*:\s*false') { throw "Portable builds require Tauri bundle.active to be false." }
if ($tauriConfig -match '"targets"\s*:') { throw "Installer targets must not be configured." }

$cargoManifestPath = Join-Path $workspaceRoot "apps\day-trading-teacher\desktop\src-tauri\Cargo.toml"
$cargoManifest = Get-Content -LiteralPath $cargoManifestPath -Raw
if ($cargoManifest -notmatch '(?ms)^\[features\].*?^custom-protocol\s*=\s*\[\s*"tauri/custom-protocol"\s*\]') {
  throw "Portable releases must declare the Tauri custom-protocol feature so bundled frontend assets are loaded instead of devUrl."
}
$desktopPackage = Get-Content -LiteralPath (Join-Path $workspaceRoot "apps\day-trading-teacher\desktop\package.json") -Raw | ConvertFrom-Json
if ($desktopPackage.scripts.'portable:binary' -notmatch '--release\s+--features\s+custom-protocol') {
  throw "The portable binary command must enable Tauri custom-protocol in release mode."
}

$releaseDirectory = Join-Path $projectRoot "portable-builds"
$metadataDirectory = Join-Path $projectRoot "release-metadata"
$checksumPath = Join-Path $projectRoot "checksums\portable-builds.sha256"
$checksumDirectory = Split-Path -Parent $checksumPath
$outputDirectory = Join-Path $workspaceRoot "output"
New-Item -ItemType Directory -Force $releaseDirectory, $metadataDirectory, $checksumDirectory, $outputDirectory | Out-Null

$archiveName = "day-trading-teacher-v$version-windows-x64-portable.zip"
$archivePath = Join-Path $releaseDirectory $archiveName
$portableFolderName = "Day-Trading-Teacher-v$version-windows-x64-portable"
$activeBuildRoot = Join-Path $projectRoot "active-build"
if (Test-Path -LiteralPath $archivePath) { throw "Refusing to overwrite existing portable build: $archivePath" }

Push-Location $workspaceRoot
try {
  $dependencySentinels = @(
    (Join-Path $workspaceRoot "node_modules\.bin\prettier.cmd"),
    (Join-Path $workspaceRoot "node_modules\.bin\vite.cmd"),
    (Join-Path $workspaceRoot "node_modules\.bin\vitest.cmd"),
    (Join-Path $workspaceRoot "node_modules\typescript\package.json")
  )
  $dependenciesComplete = -not ($dependencySentinels | Where-Object { -not (Test-Path -LiteralPath $_) })
  if (-not $dependenciesComplete) {
    Write-Host "Dependencies are missing or incomplete; restoring the locked dependency tree..." -ForegroundColor Cyan
    & npm ci --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw "Dependency restore failed." }
    $missingSentinels = @($dependencySentinels | Where-Object { -not (Test-Path -LiteralPath $_) })
    if ($missingSentinels.Count) { throw "Dependency restore completed without required build tools: $($missingSentinels -join ', ')" }
  }
  & npm run verify
  if ($LASTEXITCODE -ne 0) { throw "Verification failed; portable package was not created." }
  & npm run portable:binary
  if ($LASTEXITCODE -ne 0) { throw "Portable executable build failed." }
} finally {
  Pop-Location
}

$sourceExecutable = Join-Path $workspaceRoot "target\release\day-trading-teacher-desktop.exe"
if (-not (Test-Path -LiteralPath $sourceExecutable)) { throw "Portable executable was not created: $sourceExecutable" }

$stageRoot = Join-Path $outputDirectory $portableFolderName
if (Test-Path -LiteralPath $stageRoot) { throw "Refusing to overwrite existing staged portable folder: $stageRoot" }
New-Item -ItemType Directory -Force $stageRoot | Out-Null
foreach ($directory in "config", "data", "logs", "cache", "assets", "runtime", "licenses") {
  New-Item -ItemType Directory -Force (Join-Path $stageRoot $directory) | Out-Null
}
Copy-Item -LiteralPath $sourceExecutable -Destination (Join-Path $stageRoot "Day-Trading Teacher.exe")
Copy-Item -LiteralPath (Join-Path $workspaceRoot "VERSION") -Destination (Join-Path $stageRoot "VERSION")
Copy-Item -LiteralPath (Join-Path $workspaceRoot "release\PORTABLE-README.txt") -Destination (Join-Path $stageRoot "README.txt")
Copy-Item -LiteralPath (Join-Path $workspaceRoot "release\launch-portable.bat") -Destination (Join-Path $stageRoot "launch-portable.bat")
Copy-Item -LiteralPath (Join-Path $workspaceRoot ".env.example") -Destination (Join-Path $stageRoot "config\default-config.example")
$curriculumAssetRoot = Join-Path $stageRoot "assets\curriculum-v7"
New-Item -ItemType Directory -Force $curriculumAssetRoot | Out-Null
Copy-Item `
  -LiteralPath (Join-Path $workspaceRoot "content\lesson-plans\evidence-to-execution-v7.dtlesson.json") `
  -Destination (Join-Path $curriculumAssetRoot "evidence-to-execution-v7.dtlesson.json")
Copy-Item `
  -LiteralPath (Join-Path $workspaceRoot "content\lesson-plans\evidence-to-execution-v7-resources") `
  -Destination (Join-Path $curriculumAssetRoot "resources") `
  -Recurse

& (Join-Path $workspaceRoot "build\verify-portable-build.ps1") -PortableFolder $stageRoot
if ($LASTEXITCODE -ne 0) { throw "Portable folder verification failed." }

Compress-Archive -LiteralPath $stageRoot -DestinationPath $archivePath -CompressionLevel Optimal
& (Join-Path $workspaceRoot "build\verify-portable-build.ps1") -ArchivePath $archivePath
if ($LASTEXITCODE -ne 0) { throw "Portable archive verification failed." }

try {
  & (Join-Path $workspaceRoot "build\deploy-active-build.ps1") -ArchivePath $archivePath -ProjectRoot $projectRoot -WorkDirectory $outputDirectory -ReleaseDirectory $releaseDirectory
} catch {
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  throw
}

$hash = Get-Sha256Hex -LiteralPath $archivePath
"$hash  portable-builds/$archiveName" | Add-Content -LiteralPath $checksumPath -Encoding utf8
$metadata = [ordered]@{
  application = "Day-Trading Teacher"
  version = $version
  date = (Get-Date -Format "yyyy-MM-dd")
  target_os = "windows"
  architecture = "x64"
  package = $archiveName
  active_build_directory = "active-build/"
  deployment_policy = "single-stable-active-build-with-data-migration"
  sha256 = $hash
  portable_data_root = "data/"
  installer_generation = $false
} | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $metadataDirectory "day-trading-teacher-v$version-windows-x64-portable.json") -Value $metadata -Encoding utf8

$resolvedOutputDirectory = (Resolve-Path -LiteralPath $outputDirectory).Path
$resolvedStageRoot = (Resolve-Path -LiteralPath $stageRoot).Path
if ($resolvedStageRoot -eq $resolvedOutputDirectory -or -not $resolvedStageRoot.StartsWith($resolvedOutputDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to clean a staging folder outside the workspace output directory: $resolvedStageRoot"
}
Remove-Item -LiteralPath $resolvedStageRoot -Recurse -Force

Write-Host ""
Write-Host "Portable build completed: $archivePath" -ForegroundColor Green
Write-Host "Active portable app: $activeBuildRoot" -ForegroundColor Green
Write-Host "SHA-256: $hash"
