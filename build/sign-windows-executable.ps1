[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [Parameter(Mandatory = $true)][string]$CertificateBase64,
  [Parameter(Mandatory = $true)][string]$CertificatePassword,
  [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$executable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$outputRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\output")).Path
$certificatePath = Join-Path $outputRoot ("signing-certificate-{0}.pfx" -f [guid]::NewGuid().ToString("N"))
$signTool = Get-Command signtool.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $signTool) {
  $kitsRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
  if (Test-Path -LiteralPath $kitsRoot) {
    $signTool = Get-ChildItem -LiteralPath $kitsRoot -Filter signtool.exe -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
      Sort-Object FullName -Descending |
      Select-Object -ExpandProperty FullName -First 1
  }
}
if (-not $signTool) { throw "Windows SignTool was not found. Install the Windows SDK signing tools." }

try {
  $bytes = [Convert]::FromBase64String($CertificateBase64.Trim())
  [System.IO.File]::WriteAllBytes($certificatePath, $bytes)
  & $signTool sign /fd SHA256 /td SHA256 /tr $TimestampUrl /f $certificatePath /p $CertificatePassword $executable
  if ($LASTEXITCODE -ne 0) { throw "Authenticode signing failed." }
  & $signTool verify /pa /all $executable
  if ($LASTEXITCODE -ne 0) { throw "Authenticode verification failed after signing." }
  $signature = Get-AuthenticodeSignature -LiteralPath $executable
  if ($signature.Status -ne "Valid") { throw "Signed executable status is $($signature.Status), not Valid." }
  Write-Host "Authenticode signature and timestamp verified." -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $certificatePath) {
    Remove-Item -LiteralPath $certificatePath -Force
  }
}
