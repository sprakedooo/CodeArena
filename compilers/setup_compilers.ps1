# ============================================================================
# CodeArena - Portable Compilers Setup
# Downloads portable (no-install) compilers into the compilers/ folder.
# Run once on any new computer - no admin rights needed.
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Write-Step($msg) { Write-Host "`n[$msg]" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "  SKIP: $msg (already exists)" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red }

function Download-File($url, $dest) {
    Write-Host "  Downloading $(Split-Path $dest -Leaf) ..." -NoNewline
    try {
        $client = New-Object System.Net.WebClient
        $client.DownloadFile($url, $dest)
        Write-Host " done." -ForegroundColor Green
    } catch {
        # Fallback to Invoke-WebRequest
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        Write-Host " done." -ForegroundColor Green
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# PYTHON (Embeddable Package ~12 MB)
# Portable Python that runs .py scripts without any installation.
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Setting up Python 3.12 (portable)"

if (Test-Path "$ScriptDir\python\python.exe") {
    Write-Skip "python\python.exe"
} else {
    $pyUrl  = "https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip"
    $pyZip  = "$ScriptDir\python_embed.zip"
    $pyDir  = "$ScriptDir\python"

    Download-File $pyUrl $pyZip

    Write-Host "  Extracting..."
    if (Test-Path $pyDir) { Remove-Item $pyDir -Recurse -Force }
    Expand-Archive -Path $pyZip -DestinationPath $pyDir -Force
    Remove-Item $pyZip

    # The embeddable package needs the stdlib zip on sys.path.
    # Uncomment the import path line in python312._pth so scripts can find modules.
    $pthFile = Get-ChildItem "$pyDir" -Filter "python*._pth" | Select-Object -First 1
    if ($pthFile) {
        (Get-Content $pthFile.FullName) -replace "#import site", "import site" |
            Set-Content $pthFile.FullName
    }

    Write-OK "python\python.exe ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# JAVA (OpenJDK 21 portable ZIP ~175 MB)
# Full JDK includes both javac (compiler) and java (runtime).
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Setting up Java 21 JDK (portable)"

if (Test-Path "$ScriptDir\java\bin\javac.exe") {
    Write-Skip "java\bin\javac.exe"
} else {
    # Adoptium OpenJDK 21 LTS - direct ZIP download
    $javaUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.zip"
    $javaZip = "$ScriptDir\jdk.zip"
    $javaDir = "$ScriptDir\java"

    Write-Host "  Note: Java JDK is ~175 MB. This will take a moment..."
    Download-File $javaUrl $javaZip

    Write-Host "  Extracting..."
    $tempDir = "$ScriptDir\_jdk_temp"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    Expand-Archive -Path $javaZip -DestinationPath $tempDir -Force
    Remove-Item $javaZip

    # The ZIP contains a single folder like jdk-21.0.5+11 — move its contents up
    $innerDir = Get-ChildItem $tempDir -Directory | Select-Object -First 1
    if (Test-Path $javaDir) { Remove-Item $javaDir -Recurse -Force }
    Move-Item $innerDir.FullName $javaDir
    Remove-Item $tempDir -Recurse -Force

    Write-OK "java\bin\javac.exe and java\bin\java.exe ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# C++ / GCC (WinLibs portable MinGW-w64 ~160 MB)
# Portable GCC for Windows — no MSYS2 or MinGW installer needed.
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "Setting up GCC 14.2.0 / g++ (portable)"

if (Test-Path "$ScriptDir\cpp\bin\g++.exe") {
    Write-Skip "cpp\bin\g++.exe"
} else {
    # WinLibs GCC 14.2.0 (POSIX threads, SEH, UCRT, no LLVM) — portable zip
    $gccUrl = "https://github.com/brechtsanders/winlibs_mingw/releases/download/14.2.0posix-18.1.8-12.0.0-ucrt-r1/winlibs-x86_64-posix-seh-gcc-14.2.0-mingw-w64ucrt-12.0.0-r1.zip"
    $gccZip = "$ScriptDir\gcc.zip"
    $cppDir = "$ScriptDir\cpp"

    Write-Host "  Note: GCC is ~160 MB. This will take a moment..."
    Download-File $gccUrl $gccZip

    Write-Host "  Extracting..."
    $tempDir = "$ScriptDir\_gcc_temp"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    Expand-Archive -Path $gccZip -DestinationPath $tempDir -Force
    Remove-Item $gccZip

    # ZIP contains a mingw64/ folder — rename it to cpp/
    $innerDir = Get-ChildItem $tempDir -Directory | Select-Object -First 1
    if (Test-Path $cppDir) { Remove-Item $cppDir -Recurse -Force }
    Move-Item $innerDir.FullName $cppDir
    Remove-Item $tempDir -Recurse -Force

    Write-OK "cpp\bin\g++.exe ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# DONE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  All portable compilers are ready!" -ForegroundColor Green
Write-Host "  Start the server normally: npm start" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
