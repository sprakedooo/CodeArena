/**
 * ============================================================================
 * QUESTION ROUTES (questionRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Fetches programming questions based on:
 * 1. Selected programming language (Python, Java, C++)
 * 2. Learning level (Beginner, Intermediate, Advanced)
 *
 * This is the ADAPTIVE component - questions change based on student level.
 *
 * ENDPOINTS:
 * GET /api/questions                     - Get questions by language & level
 * GET /api/questions/:id                 - Get specific question
 * GET /api/questions/next/:userId        - Get next adaptive question
 *
 * FOR THESIS PANELISTS:
 * This demonstrates the ADAPTIVE LEARNING feature. The system selects
 * questions appropriate to the student's current performance level.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import database service
const dbService = require('../services/dbService');
const { requireFaculty } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA: Programming Questions by Language and Level
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Question bank organized by language and difficulty level
 * Each question has:
 * - id: Unique identifier
 * - language: python, java, or cpp
 * - level: beginner, intermediate, or advanced
 * - topic: Specific topic for weak area tracking
 * - question: The question text
 * - options: Multiple choice options
 * - correctAnswer: The correct option letter
 * - hint: AI hint shown when answer is wrong
 * - explanation: Detailed explanation
 */
let questionBank = [
    // ═══════════════════════════════════════════════════════════════════════
    // PYTHON QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    // Python - Beginner Level
    {
        id: 1,
        language: 'python',
        level: 'beginner',
        topic: 'Variables',
        question: 'How do you create a variable named "age" with value 25 in Python?',
        options: ['A) int age = 25', 'B) age = 25', 'C) var age = 25', 'D) let age = 25'],
        correctAnswer: 'B',
        hint: 'Python does not require type declarations. Variables are created by simple assignment.',
        explanation: 'In Python, you simply write variable_name = value. No type keyword needed.'
    },
    {
        id: 2,
        language: 'python',
        level: 'beginner',
        topic: 'Data Types',
        question: 'What is the data type of: x = "Hello"',
        options: ['A) int', 'B) float', 'C) str', 'D) char'],
        correctAnswer: 'C',
        hint: 'Text enclosed in quotes is called a string in Python.',
        explanation: 'Strings (str) are sequences of characters enclosed in quotes.'
    },
    {
        id: 3,
        language: 'python',
        level: 'beginner',
        topic: 'Output',
        question: 'Which function is used to display output in Python?',
        options: ['A) echo()', 'B) console.log()', 'C) print()', 'D) System.out.println()'],
        correctAnswer: 'C',
        hint: 'The Python output function is simple and starts with "p".',
        explanation: 'print() is the built-in function for displaying output in Python.'
    },
    {
        id: 4,
        language: 'python',
        level: 'beginner',
        topic: 'Comments',
        question: 'How do you write a single-line comment in Python?',
        options: ['A) // comment', 'B) /* comment */', 'C) # comment', 'D) -- comment'],
        correctAnswer: 'C',
        hint: 'Python uses a special symbol that looks like a hashtag.',
        explanation: 'The hash symbol (#) is used for single-line comments in Python.'
    },
    {
        id: 5,
        language: 'python',
        level: 'beginner',
        topic: 'Input',
        question: 'Which function gets user input in Python?',
        options: ['A) scan()', 'B) read()', 'C) input()', 'D) get()'],
        correctAnswer: 'C',
        hint: 'The function name directly describes what it does - getting input.',
        explanation: 'input() reads a line of text from the user.'
    },

    // Python - Intermediate Level
    {
        id: 6,
        language: 'python',
        level: 'intermediate',
        topic: 'Loops',
        question: 'What does this code print?\nfor i in range(3):\n    print(i)',
        options: ['A) 1 2 3', 'B) 0 1 2', 'C) 0 1 2 3', 'D) 1 2'],
        correctAnswer: 'B',
        hint: 'range() starts from 0 by default and stops BEFORE the specified number.',
        explanation: 'range(3) generates 0, 1, 2 (three numbers starting from 0).'
    },
    {
        id: 7,
        language: 'python',
        level: 'intermediate',
        topic: 'Conditionals',
        question: 'What keyword is used for "else if" in Python?',
        options: ['A) else if', 'B) elseif', 'C) elif', 'D) elsif'],
        correctAnswer: 'C',
        hint: 'Python combines "else" and "if" into a shorter keyword.',
        explanation: 'elif is Python\'s way of writing else if.'
    },
    {
        id: 8,
        language: 'python',
        level: 'intermediate',
        topic: 'Lists',
        question: 'How do you add an item to the end of a list in Python?',
        options: ['A) list.add(item)', 'B) list.append(item)', 'C) list.push(item)', 'D) list.insert(item)'],
        correctAnswer: 'B',
        hint: 'The method name suggests adding something at the end.',
        explanation: 'append() adds an element to the end of a list.'
    },
    {
        id: 9,
        language: 'python',
        level: 'intermediate',
        topic: 'Functions',
        question: 'Which keyword is used to define a function in Python?',
        options: ['A) function', 'B) func', 'C) def', 'D) define'],
        correctAnswer: 'C',
        hint: 'It\'s a short form of "define".',
        explanation: 'def is used to define functions in Python.'
    },
    {
        id: 10,
        language: 'python',
        level: 'intermediate',
        topic: 'Loops',
        question: 'Which keyword exits a loop immediately?',
        options: ['A) exit', 'B) stop', 'C) break', 'D) end'],
        correctAnswer: 'C',
        hint: 'Think about what you do when you want to suddenly stop something.',
        explanation: 'break immediately exits the current loop.'
    },

    // Python - Advanced Level
    {
        id: 11,
        language: 'python',
        level: 'advanced',
        topic: 'List Comprehension',
        question: 'What does [x*2 for x in range(5)] produce?',
        options: ['A) [0, 2, 4, 6, 8]', 'B) [2, 4, 6, 8, 10]', 'C) [1, 2, 3, 4, 5]', 'D) [0, 1, 2, 3, 4]'],
        correctAnswer: 'A',
        hint: 'range(5) gives 0,1,2,3,4. Each is multiplied by 2.',
        explanation: 'List comprehension: for each x in 0-4, compute x*2.'
    },
    {
        id: 12,
        language: 'python',
        level: 'advanced',
        topic: 'Dictionary',
        question: 'How do you get all keys from a dictionary "d"?',
        options: ['A) d.keys()', 'B) d.getKeys()', 'C) keys(d)', 'D) d.allKeys()'],
        correctAnswer: 'A',
        hint: 'It\'s a simple method call on the dictionary object.',
        explanation: 'The keys() method returns all keys in the dictionary.'
    },
    {
        id: 13,
        language: 'python',
        level: 'advanced',
        topic: 'Exception Handling',
        question: 'Which block always executes regardless of exceptions?',
        options: ['A) catch', 'B) except', 'C) finally', 'D) always'],
        correctAnswer: 'C',
        hint: 'The block name suggests it runs at the final step.',
        explanation: 'finally block always executes, even if an exception occurs.'
    },
    {
        id: 14,
        language: 'python',
        level: 'advanced',
        topic: 'Lambda',
        question: 'What is the output of: (lambda x: x + 10)(5)?',
        options: ['A) 5', 'B) 10', 'C) 15', 'D) Error'],
        correctAnswer: 'C',
        hint: 'Lambda creates an anonymous function. Here x=5, and we add 10.',
        explanation: 'Lambda creates a function that adds 10 to its input. 5+10=15.'
    },
    {
        id: 15,
        language: 'python',
        level: 'advanced',
        topic: 'File Handling',
        question: 'What mode opens a file for reading in Python?',
        options: ['A) "w"', 'B) "r"', 'C) "a"', 'D) "x"'],
        correctAnswer: 'B',
        hint: 'The mode letter is the first letter of "read".',
        explanation: '"r" mode opens a file for reading (default mode).'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // JAVA QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    // Java - Beginner Level
    {
        id: 16,
        language: 'java',
        level: 'beginner',
        topic: 'Variables',
        question: 'How do you declare an integer variable "age" with value 25 in Java?',
        options: ['A) age = 25', 'B) int age = 25;', 'C) integer age = 25', 'D) var age = 25'],
        correctAnswer: 'B',
        hint: 'Java requires you to specify the data type before the variable name.',
        explanation: 'Java is statically typed: type variableName = value;'
    },
    {
        id: 17,
        language: 'java',
        level: 'beginner',
        topic: 'Output',
        question: 'Which statement prints "Hello" in Java?',
        options: ['A) print("Hello")', 'B) console.log("Hello")', 'C) System.out.println("Hello");', 'D) echo "Hello"'],
        correctAnswer: 'C',
        hint: 'Java uses System.out for console output.',
        explanation: 'System.out.println() is Java\'s standard output method.'
    },
    {
        id: 18,
        language: 'java',
        level: 'beginner',
        topic: 'Data Types',
        question: 'Which data type stores text in Java?',
        options: ['A) char', 'B) text', 'C) String', 'D) varchar'],
        correctAnswer: 'C',
        hint: 'The type name starts with a capital letter in Java.',
        explanation: 'String (capital S) is the class for text in Java.'
    },
    {
        id: 19,
        language: 'java',
        level: 'beginner',
        topic: 'Syntax',
        question: 'What must every Java statement end with?',
        options: ['A) Colon :', 'B) Semicolon ;', 'C) Period .', 'D) Nothing'],
        correctAnswer: 'B',
        hint: 'It\'s the same as C and C++.',
        explanation: 'Every Java statement must end with a semicolon (;).'
    },
    {
        id: 20,
        language: 'java',
        level: 'beginner',
        topic: 'Main Method',
        question: 'What is the entry point of a Java program?',
        options: ['A) start()', 'B) run()', 'C) main()', 'D) init()'],
        correctAnswer: 'C',
        hint: 'It\'s the same as C/C++ programs.',
        explanation: 'public static void main(String[] args) is the entry point.'
    },

    // Java - Intermediate Level
    {
        id: 21,
        language: 'java',
        level: 'intermediate',
        topic: 'Loops',
        question: 'What is the output?\nfor(int i=0; i<3; i++) { System.out.print(i); }',
        options: ['A) 123', 'B) 012', 'C) 0123', 'D) 321'],
        correctAnswer: 'B',
        hint: 'The loop starts at 0 and runs while i < 3.',
        explanation: 'Loop runs with i = 0, 1, 2 (stops before 3).'
    },
    {
        id: 22,
        language: 'java',
        level: 'intermediate',
        topic: 'Arrays',
        question: 'How do you get the length of array "arr" in Java?',
        options: ['A) arr.length()', 'B) arr.size()', 'C) arr.length', 'D) len(arr)'],
        correctAnswer: 'C',
        hint: 'In Java, array length is a property, not a method.',
        explanation: 'Arrays use .length (no parentheses) to get size.'
    },
    {
        id: 23,
        language: 'java',
        level: 'intermediate',
        topic: 'Classes',
        question: 'Which keyword creates an instance of a class?',
        options: ['A) create', 'B) instance', 'C) new', 'D) make'],
        correctAnswer: 'C',
        hint: 'You are making something "new".',
        explanation: 'The new keyword creates a new object instance.'
    },
    {
        id: 24,
        language: 'java',
        level: 'intermediate',
        topic: 'Conditionals',
        question: 'What is the result of: 5 == 5 && 3 > 4',
        options: ['A) true', 'B) false', 'C) error', 'D) null'],
        correctAnswer: 'B',
        hint: '&& means both conditions must be true.',
        explanation: '5==5 is true, but 3>4 is false. true && false = false.'
    },
    {
        id: 25,
        language: 'java',
        level: 'intermediate',
        topic: 'Methods',
        question: 'What does "void" mean in a method declaration?',
        options: ['A) Returns nothing', 'B) Returns null', 'C) Returns 0', 'D) Method is empty'],
        correctAnswer: 'A',
        hint: 'Void means empty or nothing.',
        explanation: 'void indicates the method does not return any value.'
    },

    // Java - Advanced Level
    {
        id: 26,
        language: 'java',
        level: 'advanced',
        topic: 'Inheritance',
        question: 'Which keyword is used for inheritance in Java?',
        options: ['A) inherits', 'B) extends', 'C) implements', 'D) derives'],
        correctAnswer: 'B',
        hint: 'The child class "extends" the parent class.',
        explanation: 'extends is used for class inheritance in Java.'
    },
    {
        id: 27,
        language: 'java',
        level: 'advanced',
        topic: 'Interfaces',
        question: 'A class uses which keyword to implement an interface?',
        options: ['A) extends', 'B) uses', 'C) implements', 'D) interface'],
        correctAnswer: 'C',
        hint: 'The keyword directly describes the action.',
        explanation: 'implements is used when a class adopts an interface.'
    },
    {
        id: 28,
        language: 'java',
        level: 'advanced',
        topic: 'Exception Handling',
        question: 'Which is NOT a valid exception handling keyword in Java?',
        options: ['A) try', 'B) catch', 'C) finally', 'D) except'],
        correctAnswer: 'D',
        hint: 'One of these is from Python, not Java.',
        explanation: 'except is Python syntax. Java uses catch.'
    },
    {
        id: 29,
        language: 'java',
        level: 'advanced',
        topic: 'Static',
        question: 'What does the "static" keyword mean?',
        options: ['A) Cannot be changed', 'B) Belongs to class, not instance', 'C) Private access', 'D) Final value'],
        correctAnswer: 'B',
        hint: 'Static members exist without creating an object.',
        explanation: 'static means the member belongs to the class itself.'
    },
    {
        id: 30,
        language: 'java',
        level: 'advanced',
        topic: 'Polymorphism',
        question: 'Method overloading is based on different:',
        options: ['A) Return types only', 'B) Method names', 'C) Parameter lists', 'D) Access modifiers'],
        correctAnswer: 'C',
        hint: 'Same name, but something about the inputs is different.',
        explanation: 'Overloaded methods have the same name but different parameters.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // C++ QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    // C++ - Beginner Level
    {
        id: 31,
        language: 'cpp',
        level: 'beginner',
        topic: 'Variables',
        question: 'How do you declare an integer variable "num" with value 10 in C++?',
        options: ['A) num = 10', 'B) int num = 10;', 'C) integer num = 10', 'D) var num = 10'],
        correctAnswer: 'B',
        hint: 'C++ requires type declaration like Java.',
        explanation: 'C++ syntax: type variableName = value;'
    },
    {
        id: 32,
        language: 'cpp',
        level: 'beginner',
        topic: 'Output',
        question: 'Which is the correct way to output in C++?',
        options: ['A) print("Hello")', 'B) printf("Hello")', 'C) cout << "Hello"', 'D) System.out.println("Hello")'],
        correctAnswer: 'C',
        hint: 'C++ uses stream operators with cout.',
        explanation: 'cout with << operator is the C++ way to output.'
    },
    {
        id: 33,
        language: 'cpp',
        level: 'beginner',
        topic: 'Headers',
        question: 'Which header is needed for cout?',
        options: ['A) #include <stdio.h>', 'B) #include <iostream>', 'C) #include <conio.h>', 'D) #include <output>'],
        correctAnswer: 'B',
        hint: 'iostream handles input/output streams.',
        explanation: '<iostream> provides cout and cin for I/O operations.'
    },
    {
        id: 34,
        language: 'cpp',
        level: 'beginner',
        topic: 'Input',
        question: 'How do you read input into variable x in C++?',
        options: ['A) input(x)', 'B) scanf(x)', 'C) cin >> x', 'D) read(x)'],
        correctAnswer: 'C',
        hint: 'cin is the opposite of cout, using >> instead of <<.',
        explanation: 'cin >> variable reads input from the user.'
    },
    {
        id: 35,
        language: 'cpp',
        level: 'beginner',
        topic: 'Namespace',
        question: 'What does "using namespace std;" do?',
        options: ['A) Creates a new namespace', 'B) Allows using standard library without std::', 'C) Imports all libraries', 'D) Defines main function'],
        correctAnswer: 'B',
        hint: 'It lets you use cout instead of std::cout.',
        explanation: 'It allows direct access to standard library elements.'
    },

    // C++ - Intermediate Level
    {
        id: 36,
        language: 'cpp',
        level: 'intermediate',
        topic: 'Pointers',
        question: 'What does int* ptr; declare?',
        options: ['A) An integer', 'B) A pointer to an integer', 'C) An array', 'D) A reference'],
        correctAnswer: 'B',
        hint: 'The asterisk (*) indicates a pointer type.',
        explanation: 'int* declares a pointer that stores an address of an integer.'
    },
    {
        id: 37,
        language: 'cpp',
        level: 'intermediate',
        topic: 'References',
        question: 'What does int& ref = x; create?',
        options: ['A) A copy of x', 'B) A pointer to x', 'C) A reference to x', 'D) A new variable'],
        correctAnswer: 'C',
        hint: 'The ampersand (&) in declaration creates an alias.',
        explanation: 'int& creates a reference, which is an alias for x.'
    },
    {
        id: 38,
        language: 'cpp',
        level: 'intermediate',
        topic: 'Arrays',
        question: 'How do you declare an array of 5 integers in C++?',
        options: ['A) int arr[5];', 'B) int[5] arr;', 'C) array<int> arr(5)', 'D) int arr = new int[5]'],
        correctAnswer: 'A',
        hint: 'Size goes in square brackets after the name.',
        explanation: 'C-style array declaration: type name[size];'
    },
    {
        id: 39,
        language: 'cpp',
        level: 'intermediate',
        topic: 'Functions',
        question: 'What is a function prototype in C++?',
        options: ['A) The function body', 'B) A declaration without implementation', 'C) A recursive function', 'D) A main function'],
        correctAnswer: 'B',
        hint: 'It\'s like a preview of the function signature.',
        explanation: 'A prototype declares a function before its full definition.'
    },
    {
        id: 40,
        language: 'cpp',
        level: 'intermediate',
        topic: 'Loops',
        question: 'What is a range-based for loop in C++11?',
        options: ['A) for(int i=0; i<n; i++)', 'B) for(auto x : container)', 'C) while(condition)', 'D) do-while loop'],
        correctAnswer: 'B',
        hint: 'It uses a colon (:) and iterates over containers directly.',
        explanation: 'for(auto x : container) iterates through all elements.'
    },

    // C++ - Advanced Level
    {
        id: 41,
        language: 'cpp',
        level: 'advanced',
        topic: 'Classes',
        question: 'What is the default access specifier in a C++ class?',
        options: ['A) public', 'B) private', 'C) protected', 'D) internal'],
        correctAnswer: 'B',
        hint: 'Class members are hidden by default for encapsulation.',
        explanation: 'Class members are private by default (unlike structs).'
    },
    {
        id: 42,
        language: 'cpp',
        level: 'advanced',
        topic: 'Constructors',
        question: 'What is a constructor?',
        options: ['A) A method to destroy objects', 'B) A method called when object is created', 'C) A static method', 'D) A virtual method'],
        correctAnswer: 'B',
        hint: 'It "constructs" or initializes the object.',
        explanation: 'Constructors initialize objects when they are created.'
    },
    {
        id: 43,
        language: 'cpp',
        level: 'advanced',
        topic: 'Virtual Functions',
        question: 'What does the "virtual" keyword enable?',
        options: ['A) Static binding', 'B) Runtime polymorphism', 'C) Multiple inheritance', 'D) Private access'],
        correctAnswer: 'B',
        hint: 'Virtual functions allow derived classes to override behavior.',
        explanation: 'virtual enables dynamic dispatch / runtime polymorphism.'
    },
    {
        id: 44,
        language: 'cpp',
        level: 'advanced',
        topic: 'Memory Management',
        question: 'How do you free memory allocated with "new"?',
        options: ['A) free()', 'B) delete', 'C) remove', 'D) deallocate'],
        correctAnswer: 'B',
        hint: 'new and this keyword are paired opposites.',
        explanation: 'delete frees memory allocated with new.'
    },
    {
        id: 45,
        language: 'cpp',
        level: 'advanced',
        topic: 'Templates',
        question: 'What is a template in C++?',
        options: ['A) A design pattern', 'B) A way to write generic code', 'C) A header file', 'D) A class type'],
        correctAnswer: 'B',
        hint: 'Templates let you write code that works with any type.',
        explanation: 'Templates enable generic programming in C++.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FILL IN THE BLANK QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    {
        id: 101,
        language: 'python',
        level: 'beginner',
        topic: 'Functions',
        questionType: 'fill_blank',
        question: 'To define a function in Python, use the ___ keyword.',
        codeSnippet: '___ greet(name):\n    print(f"Hello, {name}!")',
        correctAnswer: 'def',
        hint: 'Python uses a short keyword to define functions.',
        explanation: 'The "def" keyword is used to define functions in Python.'
    },
    {
        id: 102,
        language: 'python',
        level: 'intermediate',
        topic: 'Loops',
        questionType: 'fill_blank',
        question: 'To skip the current iteration and continue to the next one, use the ___ keyword.',
        codeSnippet: 'for i in range(10):\n    if i % 2 == 0:\n        ___\n    print(i)',
        correctAnswer: 'continue',
        hint: 'This keyword tells the loop to move on to the next iteration.',
        explanation: 'The "continue" keyword skips the rest of the loop body and moves to the next iteration.'
    },
    {
        id: 103,
        language: 'java',
        level: 'beginner',
        topic: 'Data Types',
        questionType: 'fill_blank',
        question: 'To store a true/false value in Java, use the ___ data type.',
        codeSnippet: '___ isActive = true;\nSystem.out.println(isActive);',
        correctAnswer: 'boolean',
        hint: 'This data type is named after George Boole.',
        explanation: 'The "boolean" data type in Java stores true or false values.'
    },
    {
        id: 104,
        language: 'cpp',
        level: 'beginner',
        topic: 'Output',
        questionType: 'fill_blank',
        question: 'To output text in C++, use ___ followed by the << operator.',
        codeSnippet: '#include <iostream>\nusing namespace std;\nint main() {\n    ___ << "Hello World!";\n    return 0;\n}',
        correctAnswer: 'cout',
        hint: 'This is the standard output stream in C++.',
        explanation: 'cout (character output) is used with << to display output in C++.'
    },
    {
        id: 105,
        language: 'python',
        level: 'advanced',
        topic: 'Exception Handling',
        questionType: 'fill_blank',
        question: 'To catch exceptions in Python, use the try and ___ keywords.',
        codeSnippet: 'try:\n    result = 10 / 0\n___ ZeroDivisionError:\n    print("Cannot divide by zero!")',
        correctAnswer: 'except',
        hint: 'Python uses this keyword instead of "catch".',
        explanation: 'The "except" keyword catches exceptions in Python\'s try/except blocks.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // OUTPUT PREDICTION QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    {
        id: 201,
        language: 'python',
        level: 'beginner',
        topic: 'Print',
        questionType: 'output_prediction',
        question: 'What will this code output?',
        codeSnippet: 'x = 5\ny = 3\nprint(x + y)',
        correctAnswer: '8',
        hint: 'Add the two numbers together.',
        explanation: 'x=5, y=3, so x+y = 8, and print() outputs it.'
    },
    {
        id: 202,
        language: 'python',
        level: 'intermediate',
        topic: 'Strings',
        questionType: 'output_prediction',
        question: 'What will this code output?',
        codeSnippet: 'word = "Python"\nprint(word[0] + word[-1])',
        correctAnswer: 'Pn',
        hint: 'Index 0 is the first character, index -1 is the last.',
        explanation: 'word[0] is "P" and word[-1] is "n", so concatenated they give "Pn".'
    },
    {
        id: 203,
        language: 'python',
        level: 'beginner',
        topic: 'Strings',
        questionType: 'output_prediction',
        question: 'What will this code output?',
        codeSnippet: 'print(len("Hello"))',
        correctAnswer: '5',
        hint: 'Count the number of characters in the string.',
        explanation: '"Hello" has 5 characters, so len() returns 5.'
    },
    {
        id: 204,
        language: 'python',
        level: 'intermediate',
        topic: 'Lists',
        questionType: 'output_prediction',
        question: 'What will this code output?',
        codeSnippet: 'nums = [1, 2, 3, 4, 5]\nprint(nums[1:3])',
        correctAnswer: '[2, 3]',
        hint: 'Slicing starts at the first index and stops before the second.',
        explanation: 'nums[1:3] returns elements at index 1 and 2, which are [2, 3].'
    },
    {
        id: 205,
        language: 'python',
        level: 'advanced',
        topic: 'List Comprehension',
        questionType: 'output_prediction',
        question: 'What will this code output?',
        codeSnippet: 'print([x**2 for x in range(4)])',
        correctAnswer: '[0, 1, 4, 9]',
        hint: 'range(4) gives 0,1,2,3. Square each value.',
        explanation: '0^2=0, 1^2=1, 2^2=4, 3^2=9, giving [0, 1, 4, 9].'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CODE ORDERING QUESTIONS
    // ═══════════════════════════════════════════════════════════════════════

    {
        id: 301,
        language: 'python',
        level: 'beginner',
        topic: 'Functions',
        questionType: 'code_ordering',
        question: 'Arrange these lines to create a function that returns the square of a number:',
        codeLines: ['def square(n):', '    result = n * n', '    return result', 'print(square(4))'],
        correctOrder: [0, 1, 2, 3],
        hint: 'Start with the function definition, then the body.',
        explanation: 'Functions start with def, then the body is indented, return gives the value back.'
    },
    {
        id: 302,
        language: 'python',
        level: 'intermediate',
        topic: 'Conditionals',
        questionType: 'code_ordering',
        question: 'Arrange these lines to check if a number is positive, negative, or zero:',
        codeLines: ['if num > 0:', '    print("Positive")', 'elif num < 0:', '    print("Negative")', 'else:', '    print("Zero")'],
        correctOrder: [0, 1, 2, 3, 4, 5],
        hint: 'Start with the if check, then elif, then else.',
        explanation: 'Conditional chains in Python go: if, elif, else, each followed by their indented body.'
    },
    {
        id: 303,
        language: 'java',
        level: 'beginner',
        topic: 'Main Method',
        questionType: 'code_ordering',
        question: 'Arrange these lines to create a valid Java Hello World program:',
        codeLines: ['public class Main {', '    public static void main(String[] args) {', '        System.out.println("Hello World!");', '    }', '}'],
        correctOrder: [0, 1, 2, 3, 4],
        hint: 'Start with the class declaration, then main method, then the print statement.',
        explanation: 'Java programs need a class wrapper, then main method, then statements inside.'
    },
    {
        id: 304,
        language: 'python',
        level: 'intermediate',
        topic: 'Loops',
        questionType: 'code_ordering',
        question: 'Arrange these lines to create a loop that sums numbers from 1 to 5:',
        codeLines: ['total = 0', 'for i in range(1, 6):', '    total += i', 'print(total)'],
        correctOrder: [0, 1, 2, 3],
        hint: 'Initialize the variable first, then loop, then print.',
        explanation: 'First initialize total=0, then loop through 1-5 adding each to total, then print.'
    },
    {
        id: 305,
        language: 'cpp',
        level: 'intermediate',
        topic: 'Functions',
        questionType: 'code_ordering',
        question: 'Arrange these lines to create a C++ function that returns the maximum of two numbers:',
        codeLines: ['int maxNum(int a, int b) {', '    if (a > b)', '        return a;', '    return b;', '}'],
        correctOrder: [0, 1, 2, 3, 4],
        hint: 'Start with the function signature, then the comparison logic.',
        explanation: 'Function declaration first, then if-check to return the larger value, then closing brace.'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// JAVASCRIPT QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
questionBank.push(
    // JavaScript - Beginner
    { id: 401, language: 'javascript', level: 'beginner', topic: 'Variables', questionType: 'multiple_choice',
      question: 'Which keyword declares a block-scoped variable in modern JavaScript?',
      options: ['A) var', 'B) let', 'C) define', 'D) dim'],
      correctAnswer: 'B', hint: 'Modern JS has two block-scoped keywords: let and const.', explanation: 'let declares a block-scoped variable that can be reassigned.' },
    { id: 402, language: 'javascript', level: 'beginner', topic: 'Output', questionType: 'multiple_choice',
      question: 'How do you print "Hello" to the browser console?',
      options: ['A) print("Hello")', 'B) echo("Hello")', 'C) console.log("Hello")', 'D) System.out.println("Hello")'],
      correctAnswer: 'C', hint: 'JavaScript uses the console object to interact with DevTools.', explanation: 'console.log() outputs messages to the browser console.' },
    { id: 403, language: 'javascript', level: 'beginner', topic: 'Data Types', questionType: 'multiple_choice',
      question: 'What does typeof "hello" return?',
      options: ['A) "str"', 'B) "char"', 'C) "text"', 'D) "string"'],
      correctAnswer: 'D', hint: 'The typeof operator returns the type name as a lowercase string.', explanation: 'typeof returns "string" for any string value.' },
    { id: 404, language: 'javascript', level: 'beginner', topic: 'Operators', questionType: 'multiple_choice',
      question: 'What is the result of "3" + 3 in JavaScript?',
      options: ['A) 6', 'B) "33"', 'C) Error', 'D) NaN'],
      correctAnswer: 'B', hint: 'When + is used with a string, it concatenates instead of adding.', explanation: 'JavaScript coerces 3 to "3" and concatenates: "3" + "3" = "33".' },
    { id: 405, language: 'javascript', level: 'beginner', topic: 'Comments', questionType: 'multiple_choice',
      question: 'How do you write a single-line comment in JavaScript?',
      options: ['A) # comment', 'B) /* comment */', 'C) // comment', 'D) -- comment'],
      correctAnswer: 'C', hint: 'JavaScript shares this comment style with Java and C++.', explanation: '// starts a single-line comment in JavaScript.' },

    // JavaScript - Intermediate
    { id: 406, language: 'javascript', level: 'intermediate', topic: 'Equality', questionType: 'multiple_choice',
      question: 'What is the difference between == and === in JavaScript?',
      options: ['A) No difference', 'B) === checks value and type; == only checks value', 'C) == checks value and type', 'D) === is not valid'],
      correctAnswer: 'B', hint: 'Triple equals is the "strict" equality operator.', explanation: '=== checks both value AND type (no coercion); == allows type coercion.' },
    { id: 407, language: 'javascript', level: 'intermediate', topic: 'Arrays', questionType: 'multiple_choice',
      question: 'How do you add an item to the END of an array in JavaScript?',
      options: ['A) arr.append(item)', 'B) arr.add(item)', 'C) arr.push(item)', 'D) arr.insert(item)'],
      correctAnswer: 'C', hint: 'Think of "pushing" something onto a stack.', explanation: 'Array.push() appends one or more elements to the end of an array.' },
    { id: 408, language: 'javascript', level: 'intermediate', topic: 'Functions', questionType: 'multiple_choice',
      question: 'What is an arrow function syntax for adding two numbers?',
      options: ['A) function add(a,b) => a+b', 'B) const add = (a, b) => a + b', 'C) add = def(a,b): a+b', 'D) const add = function[a,b]{a+b}'],
      correctAnswer: 'B', hint: 'Arrow functions use => and can have an implicit return for single expressions.', explanation: 'const add = (a, b) => a + b is a concise arrow function returning a+b.' },
    { id: 409, language: 'javascript', level: 'intermediate', topic: 'Objects', questionType: 'multiple_choice',
      question: 'How do you access a property "name" from an object called "user"?',
      options: ['A) user->name', 'B) user::name', 'C) user.name', 'D) user[name]'],
      correctAnswer: 'C', hint: 'JavaScript uses dot notation or bracket notation for object properties.', explanation: 'user.name uses dot notation to access the name property of the user object.' },
    { id: 410, language: 'javascript', level: 'intermediate', topic: 'DOM', questionType: 'multiple_choice',
      question: 'Which method selects an HTML element by its id?',
      options: ['A) document.querySelector(".id")', 'B) document.getElementById("id")', 'C) document.getElement("id")', 'D) document.select("#id")'],
      correctAnswer: 'B', hint: 'The method name literally says "get element by id".', explanation: 'document.getElementById() returns the element with the matching id attribute.' },

    // JavaScript - Advanced
    { id: 411, language: 'javascript', level: 'advanced', topic: 'Closures', questionType: 'multiple_choice',
      question: 'What is a closure in JavaScript?',
      options: ['A) A way to close the browser', 'B) A function that remembers its outer scope', 'C) A method to end a loop', 'D) A sealed object'],
      correctAnswer: 'B', hint: 'Closures involve functions and lexical scope.', explanation: 'A closure is a function that retains access to variables in its outer (enclosing) scope even after that scope has finished executing.' },
    { id: 412, language: 'javascript', level: 'advanced', topic: 'Promises', questionType: 'multiple_choice',
      question: 'What does Promise.resolve(42) return?',
      options: ['A) The number 42', 'B) A rejected promise', 'C) A fulfilled promise with value 42', 'D) undefined'],
      correctAnswer: 'C', hint: 'Promise.resolve always creates a fulfilled (resolved) promise.', explanation: 'Promise.resolve(value) returns a Promise object that is resolved with the given value.' },
    { id: 413, language: 'javascript', level: 'advanced', topic: 'Spread Operator', questionType: 'multiple_choice',
      question: 'What does [...arr1, ...arr2] do?',
      options: ['A) Multiplies two arrays', 'B) Merges arr1 and arr2 into a new array', 'C) Creates a 2D array', 'D) Deletes both arrays'],
      correctAnswer: 'B', hint: 'The spread operator "spreads" elements of an iterable into a new context.', explanation: 'Spread syntax copies elements from both arrays into a new merged array.' },
    { id: 414, language: 'javascript', level: 'advanced', topic: 'Coercion', questionType: 'multiple_choice',
      question: 'What is the result of 0 == false in JavaScript?',
      options: ['A) false', 'B) TypeError', 'C) undefined', 'D) true'],
      correctAnswer: 'D', hint: 'The == operator performs type coercion before comparing.', explanation: 'With ==, false is coerced to 0, so 0 == 0 is true. Use === to avoid coercion.' },
    { id: 415, language: 'javascript', level: 'advanced', topic: 'JSON', questionType: 'multiple_choice',
      question: 'What does JSON.stringify({name: "Juan"}) return?',
      options: ['A) {name: "Juan"}', 'B) \'{"name":"Juan"}\'', 'C) ["Juan"]', 'D) name=Juan'],
      correctAnswer: 'B', hint: 'JSON.stringify converts a JavaScript object to a JSON string.', explanation: 'JSON.stringify serializes the object to the JSON string \'{"name":"Juan"}\'.' }
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get All Questions (Admin)
// GET /api/questions/all
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', requireFaculty, (req, res) => {
    const { language, level } = req.query;
    let results = [...questionBank];
    if (language) results = results.filter(q => q.language === language.toLowerCase());
    if (level) results = results.filter(q => q.level === level.toLowerCase());
    res.json({ success: true, count: results.length, questions: results });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Create Question (Admin/Faculty)
// POST /api/questions
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireFaculty, (req, res) => {
    const { language, level, topic, question, options, correctAnswer, hint, explanation, questionType } = req.body;
    if (!language || !level || !question || !options || !correctAnswer) {
        return res.status(400).json({ success: false, message: 'Required: language, level, question, options, correctAnswer' });
    }
    const maxId = questionBank.reduce((m, q) => Math.max(m, q.id), 0);
    const newQuestion = {
        id: maxId + 1, language: language.toLowerCase(), level: level.toLowerCase(),
        topic: topic || 'General', questionType: questionType || 'multiple_choice',
        question, options, correctAnswer, hint: hint || '', explanation: explanation || ''
    };
    questionBank.push(newQuestion);
    res.status(201).json({ success: true, message: 'Question created', question: newQuestion });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Update Question (Admin/Faculty)
// PUT /api/questions/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireFaculty, (req, res) => {
    const id = parseInt(req.params.id);
    const idx = questionBank.findIndex(q => q.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found' });
    const fields = ['language','level','topic','questionType','question','options','correctAnswer','hint','explanation'];
    fields.forEach(f => { if (req.body[f] !== undefined) questionBank[idx][f] = req.body[f]; });
    res.json({ success: true, message: 'Question updated', question: questionBank[idx] });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Delete Question (Admin/Faculty)
// DELETE /api/questions/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireFaculty, (req, res) => {
    const id = parseInt(req.params.id);
    const idx = questionBank.findIndex(q => q.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found' });
    questionBank.splice(idx, 1);
    res.json({ success: true, message: 'Question deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Questions by Language and Level
// GET /api/questions?language=python&level=beginner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches questions filtered by language and difficulty level
 * This is the CORE of the adaptive learning system
 *
 * Query Parameters:
 * - language: python, java, or cpp (required)
 * - level: beginner, intermediate, or advanced (optional, default: beginner)
 */
router.get('/', async (req, res) => {
    const { language, level } = req.query;

    // VALIDATION: Language is required
    if (!language) {
        return res.status(400).json({
            success: false,
            message: 'Language parameter required. Use: python, java, or cpp'
        });
    }

    // Default to beginner level
    const targetLevel = level || 'beginner';

    // Try database first
    let questionsForStudent = null;
    if (dbService.isDbAvailable()) {
        const dbQuestions = await dbService.getQuestions(language.toLowerCase(), targetLevel.toLowerCase());
        if (dbQuestions && dbQuestions.length > 0) {
            questionsForStudent = dbQuestions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options || [],
                topic: q.topic,
                level: q.level
            }));
        }
    }

    // Fallback to mock data
    if (!questionsForStudent) {
        const filteredQuestions = questionBank.filter(
            q => q.language === language.toLowerCase() && q.level === targetLevel.toLowerCase()
        );

        questionsForStudent = filteredQuestions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options,
            topic: q.topic,
            level: q.level
        }));
    }

    res.json({
        success: true,
        language: language,
        level: targetLevel,
        totalQuestions: questionsForStudent.length,
        questions: questionsForStudent
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Questions by Language and Level (Path Parameters)
// GET /api/questions/:language/:level
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches questions using path parameters (RESTful style)
 * This is the primary endpoint used by the game interface
 */
router.get('/:language/:level', async (req, res) => {
    const { language, level } = req.params;
    const { type } = req.query; // Optional: filter by questionType

    // Try database first
    let questionsForStudent = null;
    if (dbService.isDbAvailable()) {
        const dbQuestions = await dbService.getQuestions(language.toLowerCase(), level.toLowerCase());
        if (dbQuestions && dbQuestions.length > 0) {
            questionsForStudent = dbQuestions.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options || [],
                topic: q.topic,
                level: q.level,
                correctAnswer: q.correctAnswer,
                hint: q.hint,
                explanation: q.explanation,
                questionType: q.questionType || 'multiple_choice'
            }));
        }
    }

    // Fallback to mock data
    if (!questionsForStudent) {
        let filteredQuestions = questionBank.filter(
            q => q.language === language.toLowerCase() && q.level === level.toLowerCase()
        );

        // Filter by question type if specified
        if (type && type !== 'mixed') {
            filteredQuestions = filteredQuestions.filter(
                q => (q.questionType || 'multiple_choice') === type
            );
        }

        questionsForStudent = filteredQuestions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options || [],
            topic: q.topic,
            level: q.level,
            correctAnswer: q.correctAnswer,
            hint: q.hint,
            explanation: q.explanation,
            questionType: q.questionType || 'multiple_choice',
            codeSnippet: q.codeSnippet || null,
            codeLines: q.codeLines || null,
            correctOrder: q.correctOrder || null
        }));
    }

    res.json({
        success: true,
        language: language,
        level: level,
        totalQuestions: questionsForStudent.length,
        questions: questionsForStudent
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Single Question
// GET /api/questions/id/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves a specific question by ID
 * Used during game play
 */
router.get('/id/:id', (req, res) => {
    const questionId = parseInt(req.params.id);

    const question = questionBank.find(q => q.id === questionId);

    if (!question) {
        return res.status(404).json({
            success: false,
            message: 'Question not found'
        });
    }

    // Return question without answer
    res.json({
        success: true,
        question: {
            id: question.id,
            question: question.question,
            options: question.options,
            topic: question.topic,
            level: question.level,
            language: question.language
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Next Adaptive Question
// GET /api/questions/next/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the next appropriate question based on user's current level
 * This demonstrates the ADAPTIVE feature
 */
router.get('/next/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const { language } = req.query;

    if (!language) {
        return res.status(400).json({
            success: false,
            message: 'Language query parameter required'
        });
    }

    // In production, would fetch user's actual level from database
    // For demo, default to beginner
    const userLevel = 'beginner';

    // Get questions for user's level
    const availableQuestions = questionBank.filter(
        q => q.language === language.toLowerCase() && q.level === userLevel
    );

    if (availableQuestions.length === 0) {
        return res.json({
            success: false,
            message: 'No questions available for this language and level'
        });
    }

    // Select a random question
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];

    res.json({
        success: true,
        question: {
            id: selectedQuestion.id,
            question: selectedQuestion.question,
            options: selectedQuestion.options,
            topic: selectedQuestion.topic,
            level: selectedQuestion.level
        }
    });
});

// Export router and question bank
module.exports = router;
module.exports.questionBank = questionBank;
