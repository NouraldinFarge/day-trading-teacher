@echo off
setlocal
title Day-Trading Teacher - Version-aware build
set "workspaceRoot=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%workspaceRoot%BUILD-LATEST.ps1" %*
set "buildExitCode=%ERRORLEVEL%"
if not "%buildExitCode%"=="0" (
  echo.
  echo Build launcher stopped. Review the message above; no unsafe overwrite was performed.
) else (
  echo.
  echo Build launcher completed successfully.
)
pause
exit /b %buildExitCode%
