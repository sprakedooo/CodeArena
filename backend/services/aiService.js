/**
 * ============================================================================
 * AI SERVICE (aiService.js)
 * MOCK IMPLEMENTATION - Rule-Based Adaptive Learning Logic
 * ============================================================================
 *
 * PURPOSE:
 * Provides AI-powered features for the game-based learning system:
 * 1. Hint generation when answers are wrong
 * 2. Feedback generation on weak areas
 * 3. Encouragement messages
 * 4. Points calculation
 * 5. Study recommendations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FOR THESIS PANELISTS - IMPORTANT EXPLANATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WHY IS THIS CONSIDERED "AI-POWERED"?
 *
 * This module implements RULE-BASED ARTIFICIAL INTELLIGENCE, which is a
 * fundamental AI approach that uses predefined rules to make decisions.
 *
 * Current Implementation:
 * - IF score < 50% THEN generate beginner-level hints
 * - IF topic = "Loops" AND wrong THEN suggest loop-specific review
 * - IF consecutive_correct >= 5 THEN advance difficulty
 *
 * This demonstrates the AI LOGIC and INTERFACE that will later be enhanced
 * with machine learning models or external AI APIs (like GPT-4).
 *
 * FUTURE ENHANCEMENT PATH:
 * 1. Replace rule-based hints with natural language generation (NLG)
 * 2. Use ML to predict struggling areas before they become problems
 * 3. Implement collaborative filtering for personalized question selection
 * 4. Add conversational AI tutoring via API integration
 *
 * The current mock allows DEMONSTRATION and TESTING without API costs.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// HINT GENERATION - Core AI Feature
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a contextual hint based on the topic and language
 *
 * @param {string} topic - The question topic (e.g., 'Loops', 'Variables')
 * @param {string} language - Programming language (python, java, cpp)
 * @param {string} level - Difficulty level
 * @returns {string} AI-generated hint
 *
 * THIS IS THE CORE AI HINT GENERATION LOGIC
 */
function generateHint(topic, language, level) {
    // Topic-specific hints organized by language
    const hintDatabase = {
        python: {
            'Variables': [
                'Remember: Python variables are created with a simple assignment (=). No type keyword needed!',
                'Think of variables as labeled containers. The label is the name, the container holds the value.',
                'In Python, you can change a variable\'s type anytime. x = 5, then x = "hello" is valid!'
            ],
            'Data Types': [
                'The four basic types: int (whole numbers), float (decimals), str (text), bool (True/False).',
                'Strings are always in quotes. Numbers without quotes are int or float.',
                'Use type() function to check any variable\'s type: type(x) will tell you what x is.'
            ],
            'Loops': [
                'for loops iterate over sequences. range(5) gives you 0,1,2,3,4 - five numbers starting from 0.',
                'while loops continue until the condition becomes False. Watch out for infinite loops!',
                'Remember: range(start, stop) stops BEFORE reaching stop. range(1,5) gives 1,2,3,4.'
            ],
            'Functions': [
                'Functions start with def, then the name, then parentheses for parameters.',
                'Use return to send a value back. Without return, the function returns None.',
                'Parameters are inputs. Arguments are the actual values you pass when calling.'
            ],
            'Conditionals': [
                'if checks a condition. elif (else if) adds more conditions. else catches everything else.',
                'Indentation matters in Python! Everything inside if must be indented.',
                'Comparison operators: == (equals), != (not equals), <, >, <=, >='
            ],
            'Lists': [
                'Lists are ordered collections: my_list = [1, 2, 3]. First item is index 0!',
                'append() adds to end. insert(index, item) adds at specific position.',
                'Access items with square brackets: my_list[0] gets the first item.'
            ]
        },
        java: {
            'Variables': [
                'Java requires type declaration: int age = 25; The type comes first!',
                'Remember the semicolon (;) at the end of every statement.',
                'String has a capital S in Java. It\'s a class, not a primitive type.'
            ],
            'Data Types': [
                'Primitives: int, double, boolean, char. Classes: String, Integer, etc.',
                'double is for decimals, int is for whole numbers only.',
                'boolean is lowercase and only holds true or false (also lowercase).'
            ],
            'Loops': [
                'for(int i=0; i<5; i++) - initialization; condition; increment - separated by semicolons.',
                'i++ means i = i + 1. It\'s called the increment operator.',
                'The loop runs while the condition is true. It stops when false.'
            ],
            'Classes': [
                'Every Java file should have a class with the same name as the file.',
                'public static void main(String[] args) is where your program starts.',
                'new keyword creates an object: MyClass obj = new MyClass();'
            ],
            'Methods': [
                'Method structure: accessModifier returnType methodName(parameters)',
                'void means the method doesn\'t return anything.',
                'static methods belong to the class itself, not to instances.'
            ]
        },
        cpp: {
            'Variables': [
                'C++ requires type declaration like Java: int num = 10;',
                'Don\'t forget the semicolon at the end of statements!',
                'C++ has both C-style strings (char arrays) and C++ strings (std::string).'
            ],
            'Pointers': [
                'A pointer stores a memory address. int* ptr declares a pointer to int.',
                '& gets the address: &variable. * dereferences: *ptr gets the value.',
                'Pointers are powerful but be careful - wrong addresses cause crashes!'
            ],
            'Output': [
                'cout << "text" outputs text. The << is the insertion operator.',
                'endl creates a new line. You can also use "\\n".',
                'Include <iostream> at the top to use cout and cin.'
            ],
            'Classes': [
                'Class members are private by default in C++. Use public: to make them accessible.',
                'Constructors have the same name as the class and no return type.',
                'Use the :: scope resolution operator to define methods outside the class.'
            ],
            'Arrays': [
                'C++ arrays have fixed size: int arr[5]; declares an array of 5 integers.',
                'Array indexing starts at 0. arr[0] is the first element.',
                'Arrays don\'t know their own size. You need to track it separately or use sizeof().'
            ]
        }
    };

    // Get hints for this language and topic
    const languageHints = hintDatabase[language] || hintDatabase.python;
    const topicHints = languageHints[topic];

    if (topicHints && topicHints.length > 0) {
        // Return a random hint from available hints
        const randomIndex = Math.floor(Math.random() * topicHints.length);
        return topicHints[randomIndex];
    }

    // Fallback generic hint
    return `Review the ${topic} section in your ${language} lessons. ` +
           `Understanding ${topic} is important for building your programming foundation.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCOURAGEMENT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an encouraging message for wrong answers
 * Gamification element to maintain motivation
 */
function getEncouragementMessage() {
    const messages = [
        "Don't worry! Mistakes are how we learn. Try again!",
        "Almost there! Check the hint and give it another shot.",
        "Keep going! Every wrong answer brings you closer to understanding.",
        "That's okay! Learning takes practice. You've got this!",
        "Nice try! Review the hint and you'll get it next time.",
        "Programming is challenging - your persistence will pay off!",
        "Not quite, but you're learning! That's what matters.",
        "Every expert was once a beginner. Keep practicing!"
    ];

    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Returns a celebration message for correct answers
 */
function getCorrectAnswerMessage() {
    const messages = [
        "Excellent! You got it right!",
        "Perfect! Great job!",
        "Correct! You're making progress!",
        "Awesome! Keep up the good work!",
        "That's right! You're on fire!",
        "Brilliant! Your hard work is paying off!",
        "Spot on! You really understand this!",
        "Yes! Another point earned!"
    ];

    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Returns encouragement for feedback page based on weak areas count
 */
function getEncouragementForFeedback(weakAreaCount) {
    if (weakAreaCount === 0) {
        return "Amazing! You have no weak areas. You're mastering this language!";
    } else if (weakAreaCount === 1) {
        return "Great progress! Just one area to focus on. You're almost there!";
    } else if (weakAreaCount <= 3) {
        return "Good effort! A few areas need practice, but you're improving!";
    } else {
        return "Keep going! Everyone starts somewhere. Consistent practice will help!";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates points for correct answers based on difficulty
 *
 * @param {string} level - Question difficulty level
 * @returns {number} Points to award
 */
function calculatePoints(level) {
    const pointsMap = {
        'beginner': 10,
        'intermediate': 20,
        'advanced': 30
    };

    return pointsMap[level] || 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEAK AREA FEEDBACK GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a message about a weak area
 *
 * @param {string} topic - The struggling topic
 * @param {string} language - Programming language
 * @param {number} accuracy - Current accuracy percentage
 * @returns {string} AI-generated weak area message
 */
function generateWeakAreaMessage(topic, language, accuracy) {
    const languageNames = {
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++'
    };

    const langName = languageNames[language] || language;

    if (accuracy < 30) {
        return `You are finding ${topic} in ${langName} quite challenging (${accuracy}% accuracy). ` +
               `This is a fundamental concept - let's focus on building a strong foundation here.`;
    } else if (accuracy < 50) {
        return `${topic} in ${langName} needs more practice (${accuracy}% accuracy). ` +
               `You understand some concepts but need reinforcement.`;
    } else {
        return `You're getting better at ${topic} in ${langName} (${accuracy}% accuracy), ` +
               `but there's room for improvement.`;
    }
}

/**
 * Generates study recommendations for a weak topic
 *
 * @param {string} topic - The topic needing improvement
 * @param {string} language - Programming language
 * @returns {string} Study recommendation
 */
function generateStudyRecommendation(topic, language) {
    const recommendations = {
        'Variables': 'Practice creating and modifying different types of variables. Try storing your name, age, and favorite number.',
        'Data Types': 'Create examples of each data type. Practice converting between types.',
        'Loops': 'Write a loop that counts from 1 to 10. Then try printing only even numbers.',
        'Functions': 'Create a simple function that greets a user by name. Then make one that adds two numbers.',
        'Conditionals': 'Write an if-else that checks if a number is positive, negative, or zero.',
        'Classes': 'Create a simple class representing a real object like a Car or Student.',
        'Pointers': 'Practice with simple pointer operations. Draw memory diagrams to visualize.',
        'Arrays': 'Create an array and practice accessing, modifying, and iterating through elements.',
        'Lists': 'Practice adding, removing, and finding items in lists.',
        'Methods': 'Write methods that take parameters and return values. Start simple.',
        'Output': 'Practice printing different types of data. Try formatting your output neatly.',
        'Input': 'Write programs that ask the user for information and respond to it.'
    };

    return recommendations[topic] ||
           `Review the lesson on ${topic} and try the practice exercises. ` +
           `Focus on understanding WHY each concept works, not just memorizing syntax.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERALL ASSESSMENT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates overall assessment based on performance
 *
 * @param {string} language - Programming language
 * @param {number} weakCount - Number of weak areas
 * @param {number} strongCount - Number of strong areas
 * @returns {string} Overall assessment
 */
function generateOverallAssessment(language, weakCount, strongCount) {
    const languageNames = {
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++'
    };

    const langName = languageNames[language] || language;

    if (weakCount === 0 && strongCount > 0) {
        return `Outstanding performance in ${langName}! You're showing strong understanding ` +
               `across all topics. Consider moving to more advanced challenges.`;
    } else if (weakCount <= strongCount) {
        return `Good progress in ${langName}! You have more strengths than weaknesses. ` +
               `Focus on the areas identified below to achieve mastery.`;
    } else if (strongCount > 0) {
        return `You're making progress in ${langName}. You have some strong areas to build on. ` +
               `Let's work on strengthening the weaker topics.`;
    } else {
        return `You're still building your ${langName} foundation. This is completely normal! ` +
               `Focus on one topic at a time and practice regularly.`;
    }
}

/**
 * Generates actionable next steps based on weak areas
 *
 * @param {array} weakAreas - Array of weak area objects
 * @param {string} language - Programming language
 * @returns {array} Array of next step suggestions
 */
function generateNextSteps(weakAreas, language) {
    const steps = [];

    if (weakAreas.length === 0) {
        steps.push('Try more advanced level questions');
        steps.push('Help others learn to reinforce your knowledge');
        steps.push('Explore related programming concepts');
        return steps;
    }

    // Add step for weakest area
    if (weakAreas[0]) {
        steps.push(`Review the lesson on ${weakAreas[0].topic}`);
        steps.push(`Practice 5 more ${weakAreas[0].topic} questions`);
    }

    // Generic helpful steps
    steps.push('Take short breaks between practice sessions');
    steps.push('Try explaining concepts out loud to yourself');

    if (weakAreas.length > 2) {
        steps.push('Focus on one topic at a time for better retention');
    }

    return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    generateHint,
    getEncouragementMessage,
    getCorrectAnswerMessage,
    getEncouragementForFeedback,
    calculatePoints,
    generateWeakAreaMessage,
    generateStudyRecommendation,
    generateOverallAssessment,
    generateNextSteps
};
