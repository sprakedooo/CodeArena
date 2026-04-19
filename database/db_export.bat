@echo off
:: ============================================================================
:: CODEARENA - MySQL Full Database Export Script
:: Run this on your CURRENT computer to export all data
:: ============================================================================

SET DB_HOST=localhost
SET DB_USER=root
SET DB_PASS=gigatt0702
SET DB_NAME=codearena
SET OUTPUT_FILE=codearena_full_backup_%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.sql

echo ============================================================
echo  CodeArena - MySQL Full Database Export
echo ============================================================
echo.
echo  Host     : %DB_HOST%
echo  Database : %DB_NAME%
echo  User     : %DB_USER%
echo  Output   : %OUTPUT_FILE%
echo.
echo  This will export: schema + all table data (users, questions,
echo  answers, progress, rewards, feedback)
echo.
echo ============================================================
echo.

:: Run mysqldump - exports schema + all data
mysqldump ^
    --host=%DB_HOST% ^
    --user=%DB_USER% ^
    --password=%DB_PASS% ^
    --databases %DB_NAME% ^
    --add-drop-database ^
    --add-drop-table ^
    --create-options ^
    --extended-insert ^
    --single-transaction ^
    --routines ^
    --triggers ^
    --set-gtid-purged=OFF ^
    --column-statistics=0 ^
    > %OUTPUT_FILE%

IF %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Export complete!
    echo.
    echo  File saved: %OUTPUT_FILE%
    echo.
    echo  Next steps:
    echo  1. Copy "%OUTPUT_FILE%" to your other computer
    echo  2. Run "db_import.bat" on the other computer
    echo     (or run: mysql -u root -p ^< %OUTPUT_FILE%)
    echo.
) ELSE (
    echo [ERROR] Export failed. Check that:
    echo  - MySQL Server is running
    echo  - mysqldump is in your PATH (usually in C:\Program Files\MySQL\MySQL Server X.X\bin)
    echo  - Password "%DB_PASS%" is correct
    echo.
    echo  If mysqldump is not in PATH, use the full path, e.g.:
    echo  "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" ...
    echo.
)

pause
