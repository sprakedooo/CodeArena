@echo off
:: ============================================================================
:: CODEARENA - MySQL Database Import Script
:: Run this on your NEW computer to restore all data
:: ============================================================================

echo ============================================================
echo  CodeArena - MySQL Database Import
echo ============================================================
echo.

:: Check if a .sql file was passed as argument
IF "%~1"=="" (
    echo  Usage: db_import.bat ^<backup_file.sql^>
    echo  Example: db_import.bat codearena_full_backup_20260301.sql
    echo.
    echo  Drag and drop your .sql backup file onto this script,
    echo  or run it from the command line with the filename.
    echo.

    :: Try to find any .sql backup file in the current directory
    FOR %%f IN (codearena_full_backup_*.sql) DO (
        SET FOUND_FILE=%%f
    )

    IF DEFINED FOUND_FILE (
        echo  Found backup file: %FOUND_FILE%
        SET SQL_FILE=%FOUND_FILE%
        echo  Using: %SQL_FILE%
        echo.
        GOTO PROCEED
    ) ELSE (
        echo  No backup file found in current directory.
        echo  Please place your .sql file here and re-run.
        pause
        EXIT /B 1
    )
) ELSE (
    SET SQL_FILE=%~1
)

:PROCEED
SET DB_HOST=localhost
SET DB_USER=root
SET DB_PASS=root

echo  Host     : %DB_HOST%
echo  User     : %DB_USER%
echo  File     : %SQL_FILE%
echo.
echo  WARNING: This will DROP and recreate the 'codearena' database!
echo  Any existing data on this machine will be replaced.
echo.
echo ============================================================
echo.
SET /P CONFIRM=  Are you sure? Type YES to continue:
IF /I NOT "%CONFIRM%"=="YES" (
    echo  Import cancelled.
    pause
    EXIT /B 0
)

echo.
echo  Importing... (this may take a moment)
echo.

mysql ^
    --host=%DB_HOST% ^
    --user=%DB_USER% ^
    --password=%DB_PASS% ^
    < %SQL_FILE%

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Import complete!
    echo.
    echo  The 'codearena' database has been restored with all data.
    echo  You can now start the CodeArena server: npm start
    echo.
) ELSE (
    echo.
    echo [ERROR] Import failed. Check that:
    echo  - MySQL Server is running on this machine
    echo  - Password "%DB_PASS%" matches your local MySQL root password
    echo  - The .sql file "%SQL_FILE%" is not corrupted
    echo.
    echo  If MySQL root password is different here, edit DB_PASS in this script.
    echo.
)

pause
