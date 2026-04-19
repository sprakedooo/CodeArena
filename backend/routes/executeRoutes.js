/**
 * ============================================================================
 * CODE EXECUTION ROUTES (executeRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Executes student code locally using installed language runtimes.
 * Supports Python, Java, and C++.
 *
 * ENDPOINTS:
 * POST /api/execute - Execute code in a given language
 *
 * EXECUTION:
 * Uses Node.js child_process to run code via locally installed compilers:
 * - Python: py launcher (Windows) or python3/python
 * - Java: javac + java
 * - C++: g++
 * ============================================================================
 */

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLED COMPILER DETECTION
// Checks for portable compilers in <project-root>/compilers/ first.
// Falls back to system PATH if bundled compilers are not found.
// Run compilers/setup_compilers.bat once to download portable compilers.
// ─────────────────────────────────────────────────────────────────────────────
const COMPILERS_DIR = path.join(__dirname, '..', '..', 'compilers');

function bundled(relPath) {
    const full = path.join(COMPILERS_DIR, relPath);
    return fs.existsSync(full) ? full : null;
}

const BUNDLED = {
    python:  bundled('python/python.exe'),
    javac:   bundled('java/bin/javac.exe'),
    java:    bundled('java/bin/java.exe'),
    gpp:     bundled('cpp/bin/g++.exe'),
    // JavaScript always uses the same Node.js process that runs the server
    node:    process.execPath,
};

const TIMEOUT = 10000; // 10 second execution timeout
const MAX_OUTPUT = 10000; // Max output characters
const MAX_CODE_LENGTH = 50000; // 50KB max code size

// Dangerous patterns that should not appear in student code
const DANGEROUS_PATTERNS = [
    // File system access
    /\b(os\.system|subprocess|__import__|eval|exec)\b/i,
    /\b(Runtime\.getRuntime|ProcessBuilder)\b/,
    /\bsystem\s*\(/,
    /\bpopen\s*\(/,
    // Network access
    /\b(socket|urllib|requests|httplib|http\.client)\b/i,
    /\b(ServerSocket|URLConnection|HttpURLConnection)\b/,
    // Dangerous file operations
    /\b(rmdir|unlink|remove|shutil\.rmtree)\b/i,
    /\b(File\.delete|Files\.delete|FileUtils)\b/,
    // Process/command execution
    /\bchild_process\b/
];

/**
 * Check code for dangerous patterns
 * @returns {string|null} Warning message or null if safe
 */
function checkDangerousPatterns(code) {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(code)) {
            return `Code contains potentially dangerous operations. Pattern matched: ${pattern.source}`;
        }
    }
    return null;
}

/**
 * Create a unique temp directory for each execution
 */
function createTempDir() {
    const dir = path.join(os.tmpdir(), 'codearena_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * Clean up temp directory
 */
function cleanupDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        // Ignore cleanup errors
    }
}

/**
 * Truncate output if too long
 */
function truncate(str, max) {
    if (str && str.length > max) {
        return str.slice(0, max) + '\n... (output truncated)';
    }
    return str || '';
}

/**
 * Execute Python code
 */
function executePython(code, tempDir) {
    return new Promise((resolve) => {
        const filePath = path.join(tempDir, 'main.py');
        fs.writeFileSync(filePath, code, 'utf8');

        // Prefer bundled portable Python, then fall back to system PATH
        const commands = BUNDLED.python
            ? [BUNDLED.python]
            : ['py', 'python3', 'python'];
        let tried = 0;

        function tryNext() {
            if (tried >= commands.length) {
                resolve({
                    success: false,
                    output: '',
                    stderr: 'Python is not installed or not found in PATH. Run compilers/setup_compilers.bat to install portable Python.',
                    exitCode: 1
                });
                return;
            }

            const cmd = commands[tried];
            tried++;

            execFile(cmd, [filePath], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error && error.code === 'ENOENT') {
                    tryNext();
                    return;
                }

                resolve({
                    success: true,
                    output: truncate(stdout, MAX_OUTPUT),
                    stderr: truncate(stderr, MAX_OUTPUT),
                    exitCode: error ? error.code || 1 : 0
                });
            });
        }

        tryNext();
    });
}

/**
 * Execute JavaScript (Node.js) code
 * Always uses the same Node.js binary that runs this server — always available.
 */
function executeJavaScript(code, tempDir) {
    return new Promise((resolve) => {
        const filePath = path.join(tempDir, 'main.js');
        fs.writeFileSync(filePath, code, 'utf8');

        // BUNDLED.node = process.execPath (the running node binary) — never missing
        execFile(BUNDLED.node, [filePath], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            resolve({
                success: true,
                output: truncate(stdout, MAX_OUTPUT),
                stderr: truncate(stderr, MAX_OUTPUT),
                exitCode: error ? error.code || 1 : 0
            });
        });
    });
}

/**
 * Execute Java code
 */
function executeJava(code, tempDir) {
    return new Promise((resolve) => {
        // Java requires the class name to match the filename
        // Extract public class name or default to Main
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        const className = classMatch ? classMatch[1] : 'Main';
        const filePath = path.join(tempDir, className + '.java');
        fs.writeFileSync(filePath, code, 'utf8');

        // Prefer bundled javac, fall back to system PATH
        const javacCmd = BUNDLED.javac || 'javac';
        const javaCmd  = BUNDLED.java  || 'java';

        // Compile
        execFile(javacCmd, [filePath], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (compileErr, compileOut, compileStderr) => {
            if (compileErr) {
                if (compileErr.code === 'ENOENT') {
                    resolve({
                        success: false,
                        output: '',
                        stderr: 'Java compiler (javac) is not installed or not found in PATH. Run compilers/setup_compilers.bat to install portable Java.',
                        exitCode: 1
                    });
                    return;
                }
                resolve({
                    success: true,
                    output: '',
                    stderr: truncate(compileStderr || compileErr.message, MAX_OUTPUT),
                    exitCode: 1
                });
                return;
            }

            // Run
            execFile(javaCmd, ['-cp', tempDir, className], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (runErr, stdout, stderr) => {
                resolve({
                    success: true,
                    output: truncate(stdout, MAX_OUTPUT),
                    stderr: truncate(stderr, MAX_OUTPUT),
                    exitCode: runErr ? runErr.code || 1 : 0
                });
            });
        });
    });
}

/**
 * Execute C++ code
 */
function executeCpp(code, tempDir) {
    return new Promise((resolve) => {
        const srcPath = path.join(tempDir, 'main.cpp');
        const outPath = path.join(tempDir, 'main.exe');
        fs.writeFileSync(srcPath, code, 'utf8');

        // Prefer bundled g++, fall back to system PATH
        const gppCmd = BUNDLED.gpp || 'g++';

        // Compile with g++ using execFile (safer than exec)
        execFile(gppCmd, ['-static', srcPath, '-o', outPath], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (compileErr, compileOut, compileStderr) => {
            if (compileErr) {
                if (compileErr.code === 'ENOENT') {
                    resolve({
                        success: false,
                        output: '',
                        stderr: 'C++ compiler (g++) is not installed or not found in PATH. Run compilers/setup_compilers.bat to install portable GCC.',
                        exitCode: 1
                    });
                    return;
                }
                resolve({
                    success: true,
                    output: '',
                    stderr: truncate(compileStderr || compileErr.message, MAX_OUTPUT),
                    exitCode: 1
                });
                return;
            }

            // Run the compiled executable using execFile (safer than exec)
            execFile(outPath, [], { timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (runErr, stdout, stderr) => {
                resolve({
                    success: true,
                    output: truncate(stdout, MAX_OUTPUT),
                    stderr: truncate(stderr, MAX_OUTPUT),
                    exitCode: runErr ? runErr.code || 1 : 0
                });
            });
        });
    });
}

/**
 * POST /api/execute
 * Execute code locally using installed language runtimes
 *
 * Request Body:
 * {
 *   "language": "python" | "java" | "cpp",
 *   "code": "print('Hello')"
 * }
 */
router.post('/', async (req, res) => {
    const { language, code } = req.body;

    if (!language || !code) {
        return res.status(400).json({
            success: false,
            message: 'Language and code are required.'
        });
    }

    const supported = ['python', 'javascript', 'java', 'cpp'];
    if (!supported.includes(language)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported language: ${language}. Use python, javascript, java, or cpp.`
        });
    }

    // SECURITY: Code length limit
    if (code.length > MAX_CODE_LENGTH) {
        return res.status(400).json({
            success: false,
            message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.`
        });
    }

    // SECURITY: Check for dangerous patterns
    const dangerWarning = checkDangerousPatterns(code);
    if (dangerWarning) {
        return res.status(400).json({
            success: false,
            message: 'Code contains disallowed operations for security reasons.',
            detail: dangerWarning
        });
    }

    const tempDir = createTempDir();

    try {
        let result;

        switch (language) {
            case 'python':
                result = await executePython(code, tempDir);
                break;
            case 'javascript':
                result = await executeJavaScript(code, tempDir);
                break;
            case 'java':
                result = await executeJava(code, tempDir);
                break;
            case 'cpp':
                result = await executeCpp(code, tempDir);
                break;
        }

        res.json({
            success: result.success,
            output: result.output,
            stderr: result.stderr,
            exitCode: result.exitCode,
            language: language
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Code execution failed unexpectedly.',
            output: '',
            stderr: err.message || 'Internal error'
        });
    } finally {
        cleanupDir(tempDir);
    }
});

module.exports = router;
