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

module.exports = { generateQuestion, generateFeedback, generateLesson, generateLiveHint, generateCorrectMessage };
