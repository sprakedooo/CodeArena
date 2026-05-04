@echo off
:: ============================================================================
:: CodeArena - Portable Compilers Setup Launcher
:: Double-click this file to download all portable compilers.
:: ============================================================================
echo ============================================================
echo  CodeArena - Portable Compiler Setup
echo ============================================================
echo.
echo  This will download portable compilers into the compilers/ folder:
echo    Python 3.12   (~12 MB)
echo    Java JDK 21   (~175 MB)
echo    GCC / g++ 14  (~160 MB)
echo.
echo  Total download: ~350 MB
echo  One-time setup - no installation or admin rights needed.
echo.
echo ============================================================
echo.
PAUSE

:: Run the PowerShell script, bypassing execution policy for this session only
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_compilers.ps1"

echo.
PAUSE
