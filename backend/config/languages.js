/**
 * ============================================================================
 * LANGUAGES CONFIG — Single source of truth for all programming languages
 * ============================================================================
 *
 * To ADD A NEW LANGUAGE:
 *   1. Add an entry to DEFAULT_LANGUAGES below with full metadata.
 *   2. (Optional) Add a runConfig if you want code execution support.
 *   3. Restart the backend. The new language is automatically picked up by:
 *        • GET /api/languages           (frontend reads this)
 *        • POST /api/execute            (run config drives execution)
 *        • All language tabs/dropdowns  (frontend renders dynamically)
 *
 * Or use the admin CMS to add/remove languages at runtime — those go to
 * data/languages.json and override this file.
 * ============================================================================
 */

const path = require('path');

const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

/**
 * Each language has the following shape:
 * {
 *   code:         string  // unique identifier ('python','javascript',…)
 *   name:         string  // display name ('Python','JavaScript',…)
 *   description:  string  // short marketing description
 *   icon:         string  // emoji fallback when devicon fails to load
 *   devicon:      string  // CDN URL to colored SVG logo
 *   color:        string  // hex brand color
 *   aceMode:      string  // Ace editor mode name
 *   extension:    string  // file extension (no dot)
 *   difficulty:   string  // 'Recommended' | 'Beginner Friendly' | 'Intermediate' | 'Advanced'
 *   topics:       string[]
 *   template:     string  // default starter code in the playground
 *   enabled:      boolean // can be disabled without deleting
 *   featured:     boolean // shows the 'Recommended' / featured badge
 *   runConfig:    {       // optional — execution support
 *     filename:   string  // e.g. 'main.py'
 *     compile:    [cmd, ...argsFn(srcPath, outPath)]   OR null
 *     run:        [cmd, ...argsFn(srcPath, outPath, tempDir)]
 *     bundledKey: string  // key in BUNDLED for bundled compiler lookup
 *     errorHint:  string  // shown when interpreter/compiler is missing
 *     // Java needs class detection — set classNameFromCode: true
 *   }
 * }
 */
const DEFAULT_LANGUAGES = [
    {
        code: 'python',
        name: 'Python',
        description: 'A beginner-friendly language with clean, readable syntax. Perfect for your first language.',
        icon: '🐍',
        devicon: `${DEVICON_BASE}/python/python-original.svg`,
        color: '#3776AB',
        aceMode: 'python',
        extension: 'py',
        difficulty: 'Recommended',
        topics: ['Variables', 'Data Types', 'Loops', 'Functions', 'Lists', 'OOP'],
        template: '# Welcome to Python\nprint("Hello, World!")\n',
        enabled: true,
        featured: true,
        runConfig: {
            filename:   'main.py',
            bundledKey: 'python',
            fallbackCmds: ['py', 'python3', 'python'],
            compile:    null,
            run:        (src) => [src],
            errorHint:  'Python is not installed. Run compilers/setup_compilers.bat to install portable Python.',
        },
    },
    {
        code: 'javascript',
        name: 'JavaScript',
        description: 'The language of the web. Build interactive sites, apps, and servers.',
        icon: '🌐',
        devicon: `${DEVICON_BASE}/javascript/javascript-original.svg`,
        color: '#F7DF1E',
        aceMode: 'javascript',
        extension: 'js',
        difficulty: 'Beginner Friendly',
        topics: ['Variables', 'Functions', 'Arrays', 'Objects', 'DOM', 'Async'],
        template: '// Welcome to JavaScript\nconsole.log("Hello, World!");\n',
        enabled: true,
        featured: false,
        runConfig: {
            filename:   'main.js',
            bundledKey: 'node',
            fallbackCmds: ['node'],
            compile:    null,
            run:        (src) => [src],
            errorHint:  'Node.js is not installed.',
        },
    },
    {
        code: 'java',
        name: 'Java',
        description: 'Industry-standard OOP language for enterprise apps and Android development.',
        icon: '☕',
        devicon: `${DEVICON_BASE}/java/java-original.svg`,
        color: '#E76F00',
        aceMode: 'java',
        extension: 'java',
        difficulty: 'Intermediate',
        topics: ['OOP', 'Generics', 'Collections', 'Streams', 'Concurrency'],
        template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
        enabled: true,
        featured: false,
        runConfig: {
            filename:           null,            // computed from class name
            bundledKey:         'javac',
            fallbackCmds:       ['javac'],
            classNameFromCode:  true,
            compile:            (src) => [src],
            run:                (src, out, tempDir, className) => ['-cp', tempDir, className],
            runBundledKey:      'java',
            runFallbackCmds:    ['java'],
            errorHint:          'Java compiler (javac) is not installed. Run compilers/setup_compilers.bat to install portable Java.',
        },
    },
    {
        code: 'cpp',
        name: 'C++',
        description: 'High-performance language for systems programming, games, and competitive coding.',
        icon: '⚡',
        devicon: `${DEVICON_BASE}/cplusplus/cplusplus-original.svg`,
        color: '#659AD2',
        aceMode: 'c_cpp',
        extension: 'cpp',
        difficulty: 'Advanced',
        topics: ['Pointers', 'Memory', 'Templates', 'STL', 'OOP'],
        template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
        enabled: true,
        featured: false,
        runConfig: {
            filename:        'main.cpp',
            outputFilename:  'main.exe',
            bundledKey:      'gpp',
            fallbackCmds:    ['g++'],
            compile:         (src, out) => ['-static', src, '-o', out],
            run:             (src, out) => [],
            runBinary:       'output',  // run the compiled binary directly
            errorHint:       'C++ compiler (g++) is not installed. Run compilers/setup_compilers.bat to install portable GCC.',
        },
    },

    // ─── EXAMPLE: How to add a new language ───────────────────────────────────
    // Uncomment and customize. The frontend will pick it up automatically.
    //
    // {
    //     code: 'ruby',
    //     name: 'Ruby',
    //     description: 'Elegant, productive language famous for Rails web framework.',
    //     icon: '💎',
    //     devicon: `${DEVICON_BASE}/ruby/ruby-original.svg`,
    //     color: '#CC342D',
    //     aceMode: 'ruby',
    //     extension: 'rb',
    //     difficulty: 'Intermediate',
    //     topics: ['Variables', 'Blocks', 'Classes', 'Metaprogramming'],
    //     template: '# Welcome to Ruby\nputs "Hello, World!"\n',
    //     enabled: true,
    //     featured: false,
    //     runConfig: {
    //         filename:     'main.rb',
    //         bundledKey:   null,
    //         fallbackCmds: ['ruby'],
    //         compile:      null,
    //         run:          (src) => [src],
    //         errorHint:    'Ruby is not installed.',
    //     },
    // },
];

module.exports = {
    DEFAULT_LANGUAGES,
    /**
     * Get a sanitized "public" version of the languages — strips internal
     * runConfig (which contains functions and bundled-compiler keys) so the
     * data is JSON-serializable for the frontend.
     */
    toPublic: (languages) => languages.map(l => ({
        code:        l.code,
        name:        l.name,
        description: l.description,
        icon:        l.icon,
        devicon:     l.devicon,
        color:       l.color,
        aceMode:     l.aceMode,
        extension:   l.extension,
        difficulty:  l.difficulty,
        topics:      l.topics || [],
        template:    l.template || '',
        enabled:     l.enabled !== false,
        featured:    !!l.featured,
        runnable:    !!l.runConfig,
    })),
};
