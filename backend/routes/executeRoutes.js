/**
 * ============================================================================
 * CODE EXECUTION ROUTES (executeRoutes.js)
 * ============================================================================
 *
 * Generic, config-driven code executor. The list of supported languages and
 * their compile/run commands live in backend/config/languages.js (`runConfig`).
 *
 * To support a new language for execution:
 *   1. Make sure the language exists in backend/config/languages.js
 *   2. Add a `runConfig` object to that language entry
 *   3. (Optional) Place a portable compiler in <project-root>/compilers/<key>/
 *
 * That's it — this file does not need to change.
 *
 * Endpoint:
 *   POST /api/execute  { language, code }
 * ============================================================================
 */

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const router = express.Router();

const { getInternalLanguage, getAllInternal } = require('./languageRoutes');

// ─── Bundled compiler discovery ──────────────────────────────────────────────
const COMPILERS_DIR = path.join(__dirname, '..', '..', 'compilers');

function bundled(relPath) {
    const full = path.join(COMPILERS_DIR, relPath);
    return fs.existsSync(full) ? full : null;
}

const BUNDLED = {
    python: bundled('python/python.exe'),
    javac:  bundled('java/bin/javac.exe'),
    java:   bundled('java/bin/java.exe'),
    gpp:    bundled('cpp/bin/g++.exe'),
    node:   process.execPath, // Node always available — running this server
};

// ─── Limits ──────────────────────────────────────────────────────────────────
const TIMEOUT         = 10000;  // 10s execution timeout
const MAX_OUTPUT      = 10000;  // max output chars
const MAX_CODE_LENGTH = 50000;  // 50KB max code

// ─── Security: dangerous pattern check (language-agnostic best-effort) ───────
const DANGEROUS_PATTERNS = [
    /\b(os\.system|subprocess|__import__|eval|exec)\b/i,
    /\b(Runtime\.getRuntime|ProcessBuilder)\b/,
    /\bsystem\s*\(/,
    /\bpopen\s*\(/,
    /\b(socket|urllib|requests|httplib|http\.client)\b/i,
    /\b(ServerSocket|URLConnection|HttpURLConnection)\b/,
    /\b(rmdir|unlink|remove|shutil\.rmtree)\b/i,
    /\b(File\.delete|Files\.delete|FileUtils)\b/,
    /\bchild_process\b/,
];

function checkDangerousPatterns(code) {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(code)) return `Code contains potentially dangerous operations. Pattern matched: ${pattern.source}`;
    }
    return null;
}

// ─── Temp dir helpers ────────────────────────────────────────────────────────
function createTempDir() {
    const dir = path.join(os.tmpdir(), 'codearena_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cleanupDir(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function truncate(str, max) {
    if (str && str.length > max) return str.slice(0, max) + '\n... (output truncated)';
    return str || '';
}

// ─── Try a list of commands until one resolves (handles ENOENT) ──────────────
function execWithFallback(commands, args, options) {
    return new Promise((resolve) => {
        let i = 0;
        const tryNext = () => {
            if (i >= commands.length) {
                resolve({ enoent: true });
                return;
            }
            const cmd = commands[i++];
            execFile(cmd, args, options, (error, stdout, stderr) => {
                if (error && error.code === 'ENOENT') return tryNext();
                resolve({ error, stdout, stderr });
            });
        };
        tryNext();
    });
}

// ─── Generic runner driven by runConfig ──────────────────────────────────────
async function executeWithConfig(lang, code, tempDir) {
    const cfg = lang.runConfig;
    if (!cfg) {
        return {
            success: false,
            output: '',
            stderr: `Execution is not configured for ${lang.name}.`,
            exitCode: 1,
        };
    }

    // 1. Resolve filename — for Java, derive from public class name in the code
    let filename  = cfg.filename;
    let className = null;
    if (cfg.classNameFromCode) {
        const m = code.match(/public\s+class\s+(\w+)/);
        className = m ? m[1] : 'Main';
        filename  = `${className}.${lang.extension}`;
    }
    if (!filename) filename = `main.${lang.extension}`;

    const srcPath = path.join(tempDir, filename);
    const outPath = cfg.outputFilename ? path.join(tempDir, cfg.outputFilename) : null;
    fs.writeFileSync(srcPath, code, 'utf8');

    // Build compile/run command lists (bundled first, then fallbacks)
    const compileCmds = [
        BUNDLED[cfg.bundledKey],
        ...(cfg.fallbackCmds || []),
    ].filter(Boolean);

    const runCmds = cfg.runBundledKey
        ? [BUNDLED[cfg.runBundledKey], ...(cfg.runFallbackCmds || [])].filter(Boolean)
        : compileCmds;

    const execOpts = { timeout: TIMEOUT, maxBuffer: 1024 * 1024 };

    // 2. Compile (if needed)
    if (cfg.compile) {
        const compileArgs = cfg.compile(srcPath, outPath, tempDir, className);
        const compileRes  = await execWithFallback(compileCmds, compileArgs, execOpts);
        if (compileRes.enoent) {
            return { success: false, output: '', stderr: cfg.errorHint || 'Compiler not installed.', exitCode: 1 };
        }
        if (compileRes.error) {
            return {
                success:  true,
                output:   '',
                stderr:   truncate(compileRes.stderr || compileRes.error.message, MAX_OUTPUT),
                exitCode: 1,
            };
        }
    }

    // 3. Run
    let runArgs;
    let runCmdList = runCmds;

    if (cfg.runBinary === 'output' && outPath) {
        // Run the compiled binary directly (e.g. C++)
        runCmdList = [outPath];
        runArgs    = [];
    } else {
        runArgs = cfg.run ? cfg.run(srcPath, outPath, tempDir, className) : [srcPath];
    }

    const runRes = await execWithFallback(runCmdList, runArgs, execOpts);
    if (runRes.enoent) {
        return { success: false, output: '', stderr: cfg.errorHint || 'Runtime not installed.', exitCode: 1 };
    }
    return {
        success:  true,
        output:   truncate(runRes.stdout, MAX_OUTPUT),
        stderr:   truncate(runRes.stderr, MAX_OUTPUT),
        exitCode: runRes.error ? (runRes.error.code || 1) : 0,
    };
}

// ─── POST /api/execute ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { language, code } = req.body;

    if (!language || !code) {
        return res.status(400).json({ success: false, message: 'Language and code are required.' });
    }
    if (code.length > MAX_CODE_LENGTH) {
        return res.status(400).json({ success: false, message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.` });
    }

    const lang = getInternalLanguage(language);
    if (!lang) {
        const supported = getAllInternal().filter(l => l.runConfig).map(l => l.code).join(', ');
        return res.status(400).json({
            success: false,
            message: `Unsupported language: ${language}. Supported: ${supported}`,
        });
    }
    if (!lang.runConfig) {
        return res.status(400).json({
            success: false,
            message: `${lang.name} is available for lessons but not for code execution.`,
        });
    }

    const dangerWarning = checkDangerousPatterns(code);
    if (dangerWarning) {
        return res.status(400).json({
            success: false,
            message: 'Code contains disallowed operations for security reasons.',
            detail:  dangerWarning,
        });
    }

    const tempDir = createTempDir();
    try {
        const result = await executeWithConfig(lang, code, tempDir);
        res.json({
            success:  result.success,
            output:   result.output,
            stderr:   result.stderr,
            exitCode: result.exitCode,
            language: lang.code,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Code execution failed unexpectedly.',
            output:  '',
            stderr:  err.message || 'Internal error',
        });
    } finally {
        cleanupDir(tempDir);
    }
});

module.exports = router;
