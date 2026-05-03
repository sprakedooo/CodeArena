/**
 * openaiService.js
 * Centralised OpenAI client for CodeArena.
 * Provides:
 *   generateQuestion(topic, difficulty, language, type) → question object
 *   generateFeedback(stats)                             → feedback string
 */

const OpenAI = require('openai');

// Lazy-initialise so the app still starts if no key is set
let _client = null;
function getClient() {
    if (!_client) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in your .env file.');
        }
        _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _client;
}

// ─── Question generation ──────────────────────────────────────────────────────
/**
 * Ask GPT to generate a classroom question.
 * Returns: { question_text, type, options, correct_answer, hint, difficulty, topic }
 */
async function generateQuestion({ topic, difficulty = 'beginner', language = 'python', type = 'mcq' }) {
    const client = getClient();

    const typeInstructions = {
        mcq: 'Generate a multiple-choice question with exactly 4 options labeled A, B, C, D. The correct_answer field must be the letter (A, B, C, or D).',
        fill_blank: 'Generate a fill-in-the-blank question where the student types the missing word or value. The correct_answer is the exact word/value.',
        output_pred: 'Generate a code snippet question asking "What is the output of this code?". The correct_answer is the exact console output.',
        ordering: 'Generate a code-ordering question with 4 lines of code that must be arranged correctly. The correct_answer is the correct order as letters, e.g. "B,A,D,C".',
    };

    const prompt = `You are a programming teacher creating a ${difficulty}-level ${language} quiz question about "${topic}".

${typeInstructions[type] || typeInstructions.mcq}

Respond with ONLY valid JSON matching this exact shape (no markdown, no extra text):
{
  "question_text": "...",
  "type": "${type}",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "...",
  "hint": "...",
  "difficulty": "${difficulty}",
  "topic": "${topic}"
}

For non-MCQ types, set "options" to an empty array [].`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
    });

    const raw = response.choices[0].message.content.trim();

    // Strip markdown code fences if GPT wraps in ```json ... ```
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

// ─── Feedback generation ──────────────────────────────────────────────────────
/**
 * Ask GPT to generate personalised written feedback.
 * @param {object} stats - { studentName, total, correct, accuracy, weakAreas, strongAreas, classroomName }
 * @returns {string} - 2–4 sentence personalised feedback paragraph
 */
async function generateFeedback(stats) {
    const client = getClient();

    const {
        studentName = 'the student',
        total = 0,
        correct = 0,
        accuracy = 0,
        weakAreas = [],
        strongAreas = [],
        classroomName = 'this classroom',
    } = stats;

    const weakList   = weakAreas.length   ? weakAreas.join(', ')   : 'none identified';
    const strongList = strongAreas.length ? strongAreas.join(', ') : 'none yet';

    const prompt = `You are a supportive programming teacher giving written feedback to a student.

Student: ${studentName}
Classroom: ${classroomName}
Questions answered: ${total}
Correct: ${correct} (${accuracy}% accuracy)
Weak topics: ${weakList}
Strong topics: ${strongList}

Write 2–4 sentences of warm, constructive, personalised feedback. Mention specific topics where relevant. Do NOT use bullet points — write as flowing prose. Be encouraging but honest.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
}

// ─── Live game hint (wrong answer) ───────────────────────────────────────────
/**
 * Generate a contextual hint when a student answers incorrectly.
 * Returns a 1-2 sentence hint string.
 */
async function generateLiveHint({ questionText, correctAnswer, selectedAnswer, topic, language, level }) {
    const client = getClient();

    const prompt = `A ${level}-level ${language} student just answered a quiz question incorrectly.

Question: "${questionText}"
Their answer: "${selectedAnswer}"
Correct answer: "${correctAnswer}"
Topic: ${topic}

Write a short, encouraging 1-2 sentence hint that:
1. Gently explains why their answer is wrong (without just giving away the answer)
2. Points them toward the correct concept
3. Stays friendly and supportive

Reply with ONLY the hint text, no labels or formatting.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 120,
    });

    return response.choices[0].message.content.trim();
}

// ─── Live game correct-answer message ────────────────────────────────────────
/**
 * Generate a brief celebratory message + fun fact when a student answers correctly.
 * Returns a 1-2 sentence string.
 */
async function generateCorrectMessage({ questionText, correctAnswer, topic, language, level }) {
    const client = getClient();

    const prompt = `A ${level}-level ${language} student just correctly answered a quiz question about "${topic}".

Question: "${questionText}"
Correct answer: "${correctAnswer}"

Write a short 1-2 sentence response that:
1. Celebrates their correct answer enthusiastically (use an emoji)
2. Adds one interesting/useful related fact about the concept

Reply with ONLY the message text, no labels or formatting.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 100,
    });

    return response.choices[0].message.content.trim();
}

// ─── Lesson generation ────────────────────────────────────────────────────────
/**
 * Ask GPT to generate a full lesson.
 * Returns: { title, description, difficulty, content (HTML string) }
 */
async function generateLesson({ topic, language = 'python', difficulty = 'beginner' }) {
    const client = getClient();

    const prompt = `You are an experienced programming teacher creating a ${difficulty}-level ${language} lesson about "${topic}".

Generate a structured lesson with rich HTML content. Respond with ONLY valid JSON (no markdown, no extra text):
{
  "title": "A clear lesson title",
  "description": "One-sentence description of what the student will learn",
  "difficulty": "${difficulty}",
  "content": "<HTML string with the full lesson content>"
}

For the "content" HTML, include:
- An introductory <p> paragraph explaining the concept
- At least 2 <h2> section headings with <p> explanations
- At least 2 code examples inside <div class="code-block"><pre><code>...</code></pre></div>
- At least 1 tip inside <div class="info-box tip"><strong>💡 Tip:</strong> ...</div>
- A summary <div class="info-box"><strong>📌 Key Takeaway:</strong> ...</div>

Keep the code examples practical and relevant to ${language}. Escape all HTML special characters inside code blocks properly.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
    });

    const raw = response.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

// ─── Coding assignment generation ────────────────────────────────────────────
/**
 * Ask GPT to generate a full coding assignment with test cases.
 * Returns: { title, description, starterCode, testCases: [{label, input, expectedOutput, isHidden}] }
 */
async function generateCodingAssignment({ topic, language = 'python', difficulty = 'beginner' }) {
    const client = getClient();

    const prompt = `You are an experienced programming teacher creating a ${difficulty}-level ${language} coding assignment about "${topic}".

Generate a practical coding problem that students must solve by writing a complete program that reads from stdin and writes to stdout.

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "title": "A concise assignment title",
  "description": "Clear problem statement that explains:\\n- What the program should do\\n- Input format (what will be provided via stdin)\\n- Output format (what should be printed to stdout)\\n- Constraints and examples",
  "starterCode": "Starter code with comments showing where students should write their solution. Must read from stdin.",
  "testCases": [
    { "label": "Basic case", "input": "exact stdin input here", "expectedOutput": "exact stdout output here", "isHidden": false },
    { "label": "Edge case", "input": "...", "expectedOutput": "...", "isHidden": false },
    { "label": "Hidden test 1", "input": "...", "expectedOutput": "...", "isHidden": true },
    { "label": "Hidden test 2", "input": "...", "expectedOutput": "...", "isHidden": true },
    { "label": "Hidden test 3", "input": "...", "expectedOutput": "...", "isHidden": true }
  ]
}

Rules:
- The starter code MUST use stdin (e.g. input() for Python, Scanner for Java, cin for C++, readline for JS)
- Provide exactly 2 visible test cases and 3 hidden test cases
- expectedOutput must match EXACTLY what the program prints (no trailing spaces, correct newlines)
- Make the problem appropriate for ${difficulty} level ${language} programmers
- The hidden test cases should cover edge cases that basic solutions miss`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1200,
    });

    const raw     = response.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

// ─── Phase 1: Code Analyzer ──────────────────────────────────────────────────
/**
 * Analyze student-submitted code and return structured feedback.
 * NEVER gives the full solution. Guides thinking instead.
 *
 * @param {object} opts
 *   - code          {string}  student's code
 *   - language      {string}  python | javascript | java | cpp
 *   - level         {string}  beginner | intermediate | advanced
 *   - topic         {string}  e.g. "For Loops"
 *   - taskDesc      {string}  what the assignment asks for
 *   - expectedOutput{string}  expected program output (optional)
 *   - actualOutput  {string}  actual program output (optional)
 * @returns {object} { summary, issues[], strengths[], hint, encouragement }
 */
async function analyzeCode({ code, language, level = 'beginner', topic = '', taskDesc = '', expectedOutput = '', actualOutput = '' }) {
    const client = getClient();

    const prompt = `You are a programming tutor AI for CodeArena, an educational platform.
Your role is to GUIDE students, NOT give them the full solution.

STUDENT CONTEXT:
- Level: ${level}
- Language: ${language}
- Topic being practiced: ${topic || 'General programming'}
- Task description: ${taskDesc || 'General coding exercise'}

SUBMITTED CODE:
\`\`\`${language}
${code}
\`\`\`

${expectedOutput ? `Expected output: ${expectedOutput}` : ''}
${actualOutput   ? `Actual output:   ${actualOutput}`   : ''}

RULES:
1. NEVER write the corrected code for the student
2. Identify specific errors or inefficiencies
3. Explain WHY something is wrong conceptually
4. Give a clear, actionable hint (not the answer)
5. Match language complexity to student level (${level})
6. Be encouraging and supportive

Respond with ONLY valid JSON (no markdown):
{
  "summary": "1-2 sentence overview of the code quality",
  "issues": [
    { "line": "approximate line or area", "problem": "what is wrong", "concept": "the underlying concept to review" }
  ],
  "strengths": ["what the student did well"],
  "hint": "One clear hint pointing toward the fix without giving it away",
  "encouragement": "A short motivating sentence"
}

If the code is correct, set issues to [] and give positive feedback.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 600,
    });

    const raw     = response.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

// ─── Phase 1: Progressive 3-Level Hints ──────────────────────────────────────
/**
 * Return a hint at a specific level (1, 2, or 3).
 * Level 1 → conceptual nudge
 * Level 2 → point to the specific problem
 * Level 3 → near-solution with a gap (still no full answer)
 *
 * @param {object} opts
 *   - questionText  {string}
 *   - topic         {string}
 *   - language      {string}
 *   - level         {string}  student level
 *   - hintLevel     {number}  1 | 2 | 3
 *   - studentAnswer {string}  what the student tried (optional)
 * @returns {string} hint text
 */
async function getProgressiveHint({ questionText, topic, language, level = 'beginner', hintLevel = 1, studentAnswer = '' }) {
    const client = getClient();

    const hintInstructions = {
        1: `Give a CONCEPTUAL hint only. Remind the student of the relevant concept without mentioning the specific problem. Do NOT reference their answer. Max 2 sentences.`,
        2: `Point to the SPECIFIC problem area. Mention what part of their approach is incorrect and what concept to reconsider. Still do NOT give the answer. Max 2 sentences.`,
        3: `Give a NEAR-SOLUTION hint. Describe the correct approach step-by-step but leave out the final key detail the student must figure out. Max 3 sentences.`,
    };

    const prompt = `You are a patient programming tutor for a ${level}-level ${language} student.

Question: "${questionText}"
Topic: ${topic}
${studentAnswer ? `Student's attempt: "${studentAnswer}"` : ''}

Hint Level ${hintLevel} of 3:
${hintInstructions[hintLevel] || hintInstructions[1]}

CRITICAL: Never give the full answer or write complete code.
Reply with ONLY the hint text — no labels, no formatting.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.65,
        max_tokens: 150,
    });

    return response.choices[0].message.content.trim();
}

// ─── Phase 1: Global AI Assistant ────────────────────────────────────────────
/**
 * The floating AI assistant accessible anywhere in the app.
 * Answers programming questions and guides navigation — never does homework.
 *
 * @param {object} opts
 *   - message          {string}  student's question
 *   - studentName      {string}
 *   - level            {string}
 *   - language         {string}
 *   - lastLesson       {string}  title of last completed lesson
 *   - weakTopics       {string[]}
 *   - conversationHistory {Array}  [{role, content}] for context
 * @returns {string} assistant reply
 */
async function globalAssistant({ message, studentName = 'there', level = 'beginner', language = 'python', lastLesson = '', weakTopics = [], conversationHistory = [] }) {
    const client = getClient();

    const systemPrompt = `You are CodeArena's friendly AI learning guide — a helpful, encouraging programming tutor.

STUDENT PROFILE:
- Name: ${studentName}
- Level: ${level}
- Primary language: ${language}
- Last completed lesson: ${lastLesson || 'none yet'}
- Known weak topics: ${weakTopics.length ? weakTopics.join(', ') : 'none detected yet'}

YOUR RULES:
1. Be warm, friendly, and encouraging
2. Match explanation complexity to the student's level (${level})
3. NEVER write complete solutions to homework or assignments
4. If asked for an answer, give pseudocode or partial examples only
5. If the student seems stuck, ask a guiding question back
6. Keep responses concise — aim for 3-5 sentences unless a detailed explanation is needed
7. Use simple code snippets only to illustrate concepts, not to solve tasks
8. If the student asks about navigation or features, guide them helpfully`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6), // keep last 3 exchanges for context
        { role: 'user', content: message },
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.75,
        max_tokens: 350,
    });

    return response.choices[0].message.content.trim();
}

// ─── Phase 1: Faculty AI Assistant ───────────────────────────────────────────
/**
 * AI assistant for faculty users — focused on teaching strategies, course design,
 * and educator recommendations rather than student-facing tutoring.
 *
 * @param {object} opts
 *   - message            {string}
 *   - facultyName        {string}
 *   - classrooms         {Array}   list of classroom names
 *   - totalStudents      {number}
 *   - conversationHistory {Array}  [{role, content}]
 * @returns {string} assistant reply
 */
async function facultyAssistant({ message, facultyName = 'Professor', classrooms = [], totalStudents = 0, conversationHistory = [] }) {
    const client = getClient();

    const classroomList = classrooms.length
        ? classrooms.join(', ')
        : 'no courses created yet';

    const systemPrompt = `You are CodeArena's AI Teaching Advisor — a knowledgeable, practical assistant for programming educators.

FACULTY PROFILE:
- Name: ${facultyName}
- Courses: ${classroomList}
- Total enrolled students: ${totalStudents}

YOUR PURPOSE:
You help this faculty member become a more effective programming educator. You do NOT tutor students — you advise the teacher.

YOUR EXPERTISE AREAS:
1. Teaching strategies for programming concepts (loops, functions, OOP, algorithms, etc.)
2. Course design: lesson sequencing, pacing, scaffolding difficulty
3. Assessment design: quiz question writing, rubric creation, formative vs summative assessment
4. Student engagement and motivation techniques
5. Identifying and supporting at-risk or struggling students
6. Active learning methods: pair programming, code review, project-based learning
7. Classroom management for coding sessions
8. CodeArena platform tips: sessions, challenges, lessons, analytics

YOUR RULES:
1. Always address the faculty as an educator and professional — never as a learner
2. Give concrete, actionable recommendations (not vague advice)
3. Keep responses focused and practical — 3-5 sentences unless detail is needed
4. When discussing student struggles, frame advice around what the TEACHER can do
5. Suggest specific teaching techniques by name when relevant (e.g. "think-aloud modeling", "worked examples", "interleaving")
6. Be collegial and respectful — this is a peer conversation, not a tutoring session`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: message },
    ];

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
}

// ─── Phase 1: Teaching Insights ──────────────────────────────────────────────
/**
 * Generate AI teaching insights for a faculty member.
 * Analyzes class data and returns actionable recommendations.
 *
 * @param {object} opts
 *   - facultyName      {string}
 *   - classrooms       {Array}   [{ name, studentCount, avgAccuracy, completionRate }]
 *   - weakTopics       {Array}   [{ topic, language, errorRate }]
 *   - atRiskCount      {number}
 *   - totalStudents    {number}
 *   - improvedCount    {number}
 * @returns {object} { summary, recommendations[], topicInsights[], teachingTip }
 */
async function generateTeachingInsights({ facultyName = 'Professor', classrooms = [], weakTopics = [], atRiskCount = 0, totalStudents = 0, improvedCount = 0 }) {
    const client = getClient();

    const classroomSummary = classrooms.map(c =>
        `  - ${c.name}: ${c.studentCount} students, ${c.avgAccuracy}% avg accuracy, ${c.completionRate}% completion`
    ).join('\n') || '  - No classrooms yet';

    const topicSummary = weakTopics.slice(0, 5).map(t =>
        `  - ${t.topic} (${t.language}): ${t.errorRate}% error rate`
    ).join('\n') || '  - No weak topics detected yet';

    const prompt = `You are an AI analytics assistant for a programming education platform.
Analyze the following teaching data and provide actionable insights.

FACULTY: ${facultyName}
TOTAL STUDENTS: ${totalStudents}
AT-RISK STUDENTS: ${atRiskCount}
STUDENTS IMPROVED THIS MONTH: ${improvedCount}

CLASSROOMS:
${classroomSummary}

TOP WEAK TOPICS ACROSS ALL CLASSES:
${topicSummary}

IMPORTANT: Write ALL text in second person, directly addressing the faculty as "you" / "your". Never refer to them by name or say "Faculty [name]". Use "you have", "your students", "you can", etc.

Respond with ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence overview written in second person (e.g. 'You have demonstrated...')",
  "recommendations": [
    { "action": "specific action written in second person (e.g. 'Consider focusing on...')", "reason": "why this matters", "priority": "high|medium|low" }
  ],
  "topicInsights": [
    { "topic": "topic name", "insight": "observation written in second person", "suggestion": "what you can do about it" }
  ],
  "teachingTip": "One practical tip written in second person (e.g. 'Try using...')"
}

Limit to 3 recommendations and 3 topic insights. Be specific and actionable, not generic.`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 700,
    });

    const raw     = response.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

// ─── Phase 1: AI Next Task Recommendation ────────────────────────────────────
/**
 * Recommend the student's next learning task based on their progress and weaknesses.
 * @returns {object} { nextAction, reason, link, type }
 */
async function recommendNextTask({ studentName, level, language, lastLesson, weakTopics = [], completedLessons = 0, totalLessons = 0 }) {
    const client = getClient();

    const prompt = `You are an adaptive learning AI for a programming education platform.
Based on this student's profile, recommend their most valuable next action.

STUDENT: ${studentName}
LEVEL: ${level}
LANGUAGE: ${language}
LAST LESSON COMPLETED: ${lastLesson || 'none'}
PROGRESS: ${completedLessons} of ${totalLessons} lessons done
WEAK TOPICS: ${weakTopics.length ? weakTopics.join(', ') : 'none detected'}

Choose ONE of these action types:
- "continue_lesson" — continue to the next lesson in their path
- "review_topic"    — revisit a weak topic before advancing
- "practice"        — do a practice exercise on a weak area
- "daily_challenge" — take today's daily challenge if they haven't

Respond with ONLY valid JSON (no markdown):
{
  "nextAction": "short action title, max 6 words",
  "reason": "1 sentence explaining why this is recommended",
  "type": "continue_lesson|review_topic|practice|daily_challenge"
}`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 150,
    });

    const raw     = response.choices[0].message.content.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(jsonStr);
}

module.exports = {
    // Existing
    generateQuestion,
    generateFeedback,
    generateLesson,
    generateLiveHint,
    generateCorrectMessage,
    generateCodingAssignment,
    // Phase 1
    analyzeCode,
    getProgressiveHint,
    globalAssistant,
    facultyAssistant,
    generateTeachingInsights,
    recommendNextTask,
};
