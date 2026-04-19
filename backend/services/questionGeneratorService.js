/**
 * Question Generator Service
 * Generates dynamic programming questions using Claude API (when key is set)
 * or a template-based variation engine as fallback.
 */

// Track recently generated questions per session to avoid repetition
const recentlyGenerated = new Map(); // sessionKey → Set of question hashes

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API GENERATION (requires ANTHROPIC_API_KEY env var)
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithClaude(language, level, type, count) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const typeInstructions = {
        multiple_choice: `Create ${count} multiple-choice questions. Each must have:
- "question": clear question text
- "options": array of 4 strings like ["A) ...", "B) ...", "C) ...", "D) ..."]
- "correctAnswer": single letter "A", "B", "C", or "D"`,
        fill_blank: `Create ${count} fill-in-the-blank questions. Each must have:
- "question": question text describing what to fill in
- "codeSnippet": code with ___ where the blank is
- "correctAnswer": the exact word/symbol to fill in`,
        output_prediction: `Create ${count} output prediction questions. Each must have:
- "question": "What will this code output?"
- "codeSnippet": a short runnable code snippet
- "correctAnswer": the exact console output (trim trailing whitespace)`,
        code_ordering: `Create ${count} code ordering questions. Each must have:
- "question": description of what the arranged code should do
- "codeLines": array of code line strings (already shuffled in a wrong order)
- "correctOrder": array of indices showing the correct arrangement of codeLines`
    };

    const prompt = `You are a programming education expert. Generate ${count} ${level} ${language} programming questions of type "${type}".

Rules:
- ${typeInstructions[type] || typeInstructions.multiple_choice}
- "topic": short topic name (e.g., "Loops", "Functions", "Variables")
- "hint": a short hint for struggling students
- "explanation": a clear explanation of the correct answer
- Level guide: beginner=basic syntax, intermediate=logic/data structures, advanced=oop/algorithms/patterns
- Questions must be unique, educational, and appropriate for ${level} learners
- All code must be syntactically correct ${language}

Respond with ONLY a valid JSON array, no markdown, no explanation. Example format:
[{"topic":"Variables","question":"...","correctAnswer":"...","hint":"...","explanation":"..."}]`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        // Extract JSON array from response
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return null;

        const questions = JSON.parse(match[0]);

        // Normalize to our schema
        return questions.map((q, idx) => ({
            id: `ai_${Date.now()}_${idx}`,
            language,
            level,
            topic: q.topic || 'General',
            questionType: type,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            codeSnippet: q.codeSnippet || null,
            codeLines: q.codeLines || null,
            correctOrder: q.correctOrder || null,
            hint: q.hint || 'Think carefully about the syntax.',
            explanation: q.explanation || 'Review this concept in your lessons.',
            isAIGenerated: true
        }));
    } catch (err) {
        console.error('Claude API generation failed:', err.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE-BASED GENERATION (always available, no API key needed)
// ─────────────────────────────────────────────────────────────────────────────

const templates = {
    python: {
        beginner: {
            multiple_choice: [
                { q: 'What is the correct way to assign the value {val} to variable x?', opts: ['A) x := {val}', 'B) x = {val}', 'C) let x = {val}', 'D) var x = {val}'], ans: 'B', topic: 'Variables', hint: 'Python uses simple = for assignment.' },
                { q: 'Which function converts a string to an integer in Python?', opts: ['A) str()', 'B) float()', 'C) int()', 'D) num()'], ans: 'C', topic: 'Type Conversion', hint: 'The function name matches the type.' },
                { q: 'What will print(type({val})) output?', opts: ['A) <class \'number\'>', 'B) <class \'int\'>', 'C) integer', 'D) Number'], ans: 'B', topic: 'Data Types', hint: 'Python type names are lowercase.' },
                { q: 'Which symbol is used for integer division in Python?', opts: ['A) /', 'B) //', 'C) %', 'D) div'], ans: 'B', topic: 'Operators', hint: 'Two forward slashes perform floor division.' },
                { q: 'What does len([1, 2, 3, {val}]) return?', opts: ['A) 3', 'B) {lenVal}', 'C) 5', 'D) Error'], ans: 'B', topic: 'Lists', hint: 'Count the elements in the list.' },
            ],
            fill_blank: [
                { q: 'Complete to print "Hello":',        code: '___("Hello")',              ans: 'print',  topic: 'Output' },
                { q: 'Complete to get input from user:',  code: 'name = ___("Your name: ")', ans: 'input',  topic: 'Input' },
                { q: 'Complete to find string length:',   code: 'print(___("Python"))',       ans: 'len',    topic: 'Strings' },
                { q: 'Complete to convert to int:',       code: 'x = ___("42")',             ans: 'int',    topic: 'Type Conversion' },
                { q: 'Complete the variable assignment:', code: 'score ___ 100',             ans: '=',      topic: 'Variables' },
            ],
            output_prediction: [
                { code: 'x = {a}\ny = {b}\nprint(x + y)',                     ans: (a,b) => String(a+b),   topic: 'Arithmetic' },
                { code: 'print("{word}" * {n})',                                ans: (w,n) => w.repeat(n),   topic: 'Strings' },
                { code: 'nums = [1, 2, 3]\nprint(len(nums))',                  ans: () => '3',              topic: 'Lists' },
                { code: 'print(10 > 5)',                                        ans: () => 'True',           topic: 'Booleans' },
                { code: 'x = {val}\nprint(type(x).__name__)',                  ans: () => 'int',            topic: 'Data Types' },
            ]
        },
        intermediate: {
            multiple_choice: [
                { q: 'Which method adds an element to the end of a list?', opts: ['A) add()', 'B) push()', 'C) append()', 'D) insert()'], ans: 'C', topic: 'Lists', hint: 'The method name means "to attach at end".' },
                { q: 'What does the "in" keyword check?', opts: ['A) Variable declaration', 'B) Membership in a sequence', 'C) Equality', 'D) Loop end'], ans: 'B', topic: 'Operators', hint: 'Think about checking if something belongs.' },
                { q: 'What is the correct way to define a function?', opts: ['A) function greet():', 'B) def greet():', 'C) func greet():', 'D) define greet():'], ans: 'B', topic: 'Functions', hint: '"def" is short for define.' },
                { q: 'What does dict.get(key, default) return if key is missing?', opts: ['A) Error', 'B) None', 'C) default', 'D) False'], ans: 'C', topic: 'Dictionaries', hint: 'The second argument is the fallback value.' },
                { q: 'Which statement exits a loop immediately?', opts: ['A) exit', 'B) return', 'C) stop', 'D) break'], ans: 'D', topic: 'Loops', hint: 'Think of breaking out of the loop.' },
            ]
        },
        advanced: {
            multiple_choice: [
                { q: 'What does @property do in a Python class?', opts: ['A) Marks a class as abstract', 'B) Makes a method callable like an attribute', 'C) Creates a static method', 'D) Declares a class variable'], ans: 'B', topic: 'Classes', hint: 'It changes how a method is accessed.' },
                { q: 'What is a generator in Python?', opts: ['A) A class that creates objects', 'B) A function that uses yield to produce values lazily', 'C) A module that generates code', 'D) A decorator'], ans: 'B', topic: 'Generators', hint: 'Think about lazy evaluation.' },
                { q: 'What does __str__ define for a class?', opts: ['A) The class name', 'B) How the object is printed', 'C) The constructor', 'D) Class comparison'], ans: 'B', topic: 'Magic Methods', hint: 'It controls the string representation.' },
            ]
        }
    },
    javascript: {
        beginner: {
            multiple_choice: [
                { q: 'Which keyword declares a block-scoped variable?', opts: ['A) var', 'B) let', 'C) define', 'D) scope'], ans: 'B', topic: 'Variables', hint: 'Introduced in ES6 alongside const.' },
                { q: 'How do you log a message to the console?', opts: ['A) print("msg")', 'B) log("msg")', 'C) console.log("msg")', 'D) System.log("msg")'], ans: 'C', topic: 'Output', hint: 'JavaScript uses the console object.' },
                { q: 'What does === check?', opts: ['A) Type only', 'B) Value only', 'C) Value and type', 'D) Reference only'], ans: 'C', topic: 'Operators', hint: 'Triple equals is strict equality.' },
            ]
        }
    },
    java: {
        beginner: {
            multiple_choice: [
                { q: 'What keyword declares an integer in Java?', opts: ['A) integer', 'B) int', 'C) number', 'D) num'], ans: 'B', topic: 'Data Types', hint: 'Java uses short lowercase type names.' },
                { q: 'How do you print in Java?', opts: ['A) print("text")', 'B) console.log("text")', 'C) System.out.println("text")', 'D) echo "text"'], ans: 'C', topic: 'Output', hint: 'Java uses System.out for standard output.' },
            ]
        }
    },
    cpp: {
        beginner: {
            multiple_choice: [
                { q: 'Which header is needed for cout?', opts: ['A) <stdio>', 'B) <iostream>', 'C) <output>', 'D) <console>'], ans: 'B', topic: 'Headers', hint: 'iostream handles input/output streams.' },
                { q: 'How do you output text in C++?', opts: ['A) print("text")', 'B) cout << "text"', 'C) echo "text"', 'D) output("text")'], ans: 'B', topic: 'Output', hint: 'C++ uses stream operators.' },
            ]
        }
    }
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTemplateQuestions(language, level, type, count, staticQuestions = []) {
    const lang = templates[language]?.[level] || templates.python.beginner;
    const typeTemplates = lang[type] || lang.multiple_choice || [];

    const results = [];
    const existingTexts = new Set(staticQuestions.map(q => q.question));
    const used = new Set();

    // Random parameters for variation
    const words = ['code', 'loop', 'data', 'value', 'item'];
    const vals = [3, 5, 7, 10, 15, 20];
    const ns = [2, 3, 4];

    for (const tmpl of typeTemplates) {
        if (results.length >= count) break;
        if (used.has(tmpl.q || tmpl.code)) continue;
        used.add(tmpl.q || tmpl.code);

        const a = vals[getRandomInt(0, vals.length - 1)];
        const b = vals[getRandomInt(0, vals.length - 1)];
        const n = ns[getRandomInt(0, ns.length - 1)];
        const word = words[getRandomInt(0, words.length - 1)];

        let question, correctAnswer, options, codeSnippet;

        if (type === 'multiple_choice') {
            question = (tmpl.q || '').replace(/\{val\}/g, a).replace(/\{lenVal\}/g, 4).replace(/\{n\}/g, n);
            if (existingTexts.has(question)) continue;
            options = (tmpl.opts || []).map(o => o.replace(/\{val\}/g, a).replace(/\{lenVal\}/g, 4));
            correctAnswer = tmpl.ans;
        } else if (type === 'fill_blank') {
            question = tmpl.q || 'Fill in the blank:';
            codeSnippet = (tmpl.code || '').replace(/\{val\}/g, a);
            if (existingTexts.has(question + codeSnippet)) continue;
            correctAnswer = tmpl.ans;
        } else if (type === 'output_prediction') {
            const rawCode = tmpl.code || 'print(1)';
            codeSnippet = rawCode.replace(/\{a\}/g, a).replace(/\{b\}/g, b).replace(/\{n\}/g, n).replace(/\{word\}/g, word).replace(/\{val\}/g, a);
            if (existingTexts.has(codeSnippet)) continue;
            question = 'What will this code output?';
            try {
                correctAnswer = typeof tmpl.ans === 'function' ? String(tmpl.ans(a, b, word, n)) : tmpl.ans;
            } catch {
                correctAnswer = String(a + b);
            }
        }

        results.push({
            id: `gen_${Date.now()}_${results.length}`,
            language,
            level,
            topic: tmpl.topic || 'General',
            questionType: type,
            question,
            options: options || [],
            correctAnswer: String(correctAnswer || ''),
            codeSnippet: codeSnippet || null,
            codeLines: null,
            correctOrder: null,
            hint: tmpl.hint || 'Think about the syntax carefully.',
            explanation: `The correct answer is: ${correctAnswer}`,
            isAIGenerated: true
        });
    }

    // Pad with simple variation if not enough
    while (results.length < count && type === 'output_prediction') {
        const a = getRandomInt(1, 20);
        const b = getRandomInt(1, 20);
        if (!existingTexts.has(`print(${a} + ${b})`)) {
            results.push({
                id: `gen_pad_${Date.now()}_${results.length}`,
                language, level,
                topic: 'Arithmetic',
                questionType: 'output_prediction',
                question: 'What will this code output?',
                options: [],
                correctAnswer: String(a + b),
                codeSnippet: `print(${a} + ${b})`,
                codeLines: null,
                correctOrder: null,
                hint: 'Add the two numbers.',
                explanation: `${a} + ${b} = ${a + b}`,
                isAIGenerated: true
            });
        }
    }

    return results.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

async function generateQuestions({ language, level, type, count = 5, staticQuestions = [] }) {
    const lang = (language || 'python').toLowerCase();
    const lvl = (level || 'beginner').toLowerCase();
    const qType = type || 'multiple_choice';
    const n = Math.min(parseInt(count) || 5, 10);

    // Try Claude API first
    const aiQuestions = await generateWithClaude(lang, lvl, qType, n);
    if (aiQuestions && aiQuestions.length > 0) {
        return aiQuestions;
    }

    // Fall back to template-based generation
    return generateTemplateQuestions(lang, lvl, qType, n, staticQuestions);
}

module.exports = { generateQuestions };
