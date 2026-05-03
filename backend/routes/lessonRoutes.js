/**
 * LESSON ROUTES (lessonRoutes.js)
 * GET    /api/lessons          - Get all lessons (filter with ?language=python)
 * GET    /api/lessons/:id      - Get lesson by ID
 * POST   /api/lessons          - Create a new lesson
 * PUT    /api/lessons/:id      - Update a lesson
 * DELETE /api/lessons/:id      - Delete a lesson
 */

const express = require('express');
const router = express.Router();
const { requireFaculty } = require('../middleware/authMiddleware');
const openaiService = require('../services/openaiService');

let mockLessons = [

// ═══════════════════════════════════════════════════════════════════
// PYTHON LESSONS (IDs 1–6)
// ═══════════════════════════════════════════════════════════════════

{
    id: 1, language: 'python', title: 'Getting Started with Python',
    description: 'Write your first Python program and understand Python\'s clean, readable syntax.',
    difficulty: 'beginner', orderNumber: 1, createdBy: 1,
    topics: ['Hello World', 'print()', 'Comments', 'Indentation'],
    content: `
        <h2>What is Python?</h2>
        <p>Python is a beginner-friendly programming language known for its clean, readable syntax. It reads almost like plain English, making it perfect for learning programming fundamentals.</p>

        <div class="info-box">
            <div class="info-box-title">Why Python?</div>
            <p>Python powers web apps (Instagram, YouTube), data science, AI/ML, and automation. It's the #1 language for beginners worldwide — and one of the most in-demand by employers.</p>
        </div>

        <h2>Your First Python Program</h2>
        <p>The <code>print()</code> function outputs text to the screen. This is the classic first program every programmer writes:</p>
        <pre class="code-block"><code><span class="comment"># This is a comment — Python ignores it</span>
<span class="function">print</span>(<span class="string">"Hello, World!"</span>)   <span class="comment"># Output: Hello, World!</span>

<span class="comment"># print() can display multiple values</span>
<span class="function">print</span>(<span class="string">"Python"</span>, <span class="string">"is"</span>, <span class="string">"awesome"</span>)  <span class="comment"># Python is awesome</span>
<span class="function">print</span>(<span class="number">2</span> + <span class="number">3</span>)                          <span class="comment"># 5</span></code></pre>

        <h2>Python's Indentation Rule</h2>
        <p>Python uses indentation (spaces) to define code blocks — no curly braces needed. Consistent 4-space indentation is the standard.</p>
        <pre class="code-block"><code><span class="comment"># Correct: 4-space indentation</span>
<span class="keyword">if</span> <span class="keyword">True</span>:
    <span class="function">print</span>(<span class="string">"This is indented correctly"</span>)
    <span class="function">print</span>(<span class="string">"Same block = same indentation"</span>)</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It in Python!</div>
            <p>Modify the code to print your name and your favourite number.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Getting Started with Python\nprint(&quot;Hello, World!&quot;)\n\n# Print multiple things\nprint(&quot;Python&quot;, &quot;is&quot;, &quot;awesome&quot;)\nprint(2 + 3)', 'python', 'Getting Started with Python')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 2, language: 'python', title: 'Variables & Data Types',
    description: 'Learn how Python handles variables and its core data types — no type declarations needed.',
    difficulty: 'beginner', orderNumber: 2, createdBy: 1,
    topics: ['Variables', 'int', 'float', 'str', 'bool', 'type()'],
    content: `
        <h2>Variables in Python</h2>
        <p>A variable is a named container for storing data. In Python, you don't declare types — just assign a value and Python figures out the type automatically (dynamic typing).</p>

        <div class="info-box">
            <div class="info-box-title">Dynamic Typing</div>
            <p>Python is dynamically typed: the same variable can hold an integer today and a string tomorrow. The type belongs to the <em>value</em>, not the variable name.</p>
        </div>

        <h2>Core Data Types</h2>
        <pre class="code-block"><code><span class="comment"># Integer — whole numbers</span>
age = <span class="number">20</span>
score = <span class="number">-5</span>

<span class="comment"># Float — decimal numbers</span>
gpa = <span class="number">3.85</span>
temperature = <span class="number">-12.5</span>

<span class="comment"># String — text (single or double quotes both work)</span>
name = <span class="string">"Alice"</span>
course = <span class="string">'Computer Science'</span>

<span class="comment"># Boolean — True or False (capital T and F!)</span>
is_enrolled = <span class="keyword">True</span>
has_graduated = <span class="keyword">False</span>

<span class="comment"># Check the type of any variable</span>
<span class="function">print</span>(<span class="function">type</span>(age))        <span class="comment"># &lt;class 'int'&gt;</span>
<span class="function">print</span>(<span class="function">type</span>(gpa))        <span class="comment"># &lt;class 'float'&gt;</span>
<span class="function">print</span>(<span class="function">type</span>(name))       <span class="comment"># &lt;class 'str'&gt;</span>
<span class="function">print</span>(<span class="function">type</span>(is_enrolled)) <span class="comment"># &lt;class 'bool'&gt;</span></code></pre>

        <h2>String Operations</h2>
        <pre class="code-block"><code>first = <span class="string">"Hello"</span>
last = <span class="string">"World"</span>
<span class="function">print</span>(first + <span class="string">" "</span> + last)  <span class="comment"># Hello World  (concatenation)</span>
<span class="function">print</span>(first * <span class="number">3</span>)           <span class="comment"># HelloHelloHello</span>
<span class="function">print</span>(<span class="function">len</span>(first))          <span class="comment"># 5</span>
<span class="function">print</span>(first.<span class="function">upper</span>())      <span class="comment"># HELLO</span>
<span class="function">print</span>(first.<span class="function">lower</span>())      <span class="comment"># hello</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Create variables for your name, age, GPA, and student status. Print each one with its type.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Variables and Data Types\nname = &quot;Alice&quot;\nage = 20\ngpa = 3.85\nis_student = True\n\nprint(name, age, gpa, is_student)\nprint(type(name), type(age))', 'python', 'Variables & Data Types')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 3, language: 'python', title: 'Control Flow: if / elif / else',
    description: 'Make your programs smarter by executing different code based on conditions.',
    difficulty: 'beginner', orderNumber: 3, createdBy: 1,
    topics: ['if', 'elif', 'else', 'Comparison Operators', 'Logical Operators'],
    content: `
        <h2>Making Decisions in Code</h2>
        <p>Control flow lets your program choose which code to run based on conditions. Python uses <code>if</code>, <code>elif</code> (else-if), and <code>else</code> for branching.</p>

        <div class="info-box">
            <div class="info-box-title">Comparison Operators</div>
            <p><code>==</code> equal &nbsp;|&nbsp; <code>!=</code> not equal &nbsp;|&nbsp; <code>&gt;</code> greater &nbsp;|&nbsp; <code>&lt;</code> less &nbsp;|&nbsp; <code>&gt;=</code> greater/equal &nbsp;|&nbsp; <code>&lt;=</code> less/equal</p>
        </div>

        <h2>if / elif / else</h2>
        <pre class="code-block"><code>score = <span class="number">78</span>

<span class="keyword">if</span> score >= <span class="number">90</span>:
    <span class="function">print</span>(<span class="string">"Grade: A — Excellent!"</span>)
<span class="keyword">elif</span> score >= <span class="number">80</span>:
    <span class="function">print</span>(<span class="string">"Grade: B — Good job!"</span>)
<span class="keyword">elif</span> score >= <span class="number">70</span>:
    <span class="function">print</span>(<span class="string">"Grade: C — Passing"</span>)   <span class="comment"># This runs (78 >= 70)</span>
<span class="keyword">else</span>:
    <span class="function">print</span>(<span class="string">"Grade: F — Study more!"</span>)</code></pre>

        <h2>Logical Operators: and, or, not</h2>
        <pre class="code-block"><code>age = <span class="number">20</span>
has_id = <span class="keyword">True</span>

<span class="comment"># and — both conditions must be True</span>
<span class="keyword">if</span> age >= <span class="number">18</span> <span class="keyword">and</span> has_id:
    <span class="function">print</span>(<span class="string">"Access granted"</span>)

<span class="comment"># or — at least one must be True</span>
is_admin = <span class="keyword">False</span>
<span class="keyword">if</span> is_admin <span class="keyword">or</span> age >= <span class="number">18</span>:
    <span class="function">print</span>(<span class="string">"Allowed"</span>)

<span class="comment"># not — reverses the boolean</span>
<span class="keyword">if</span> <span class="keyword">not</span> has_id:
    <span class="function">print</span>(<span class="string">"ID required"</span>)</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write a grade checker and try different scores. Can you add an A+ for scores above 97?</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Control Flow\nscore = 78\n\nif score >= 90:\n    print(&quot;Grade: A&quot;)\nelif score >= 80:\n    print(&quot;Grade: B&quot;)\nelif score >= 70:\n    print(&quot;Grade: C&quot;)\nelse:\n    print(&quot;Grade: F&quot;)', 'python', 'Control Flow')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 4, language: 'python', title: 'Loops: for and while',
    description: 'Repeat code efficiently with Python\'s for and while loops — the backbone of iteration.',
    difficulty: 'intermediate', orderNumber: 4, createdBy: 1,
    topics: ['for loop', 'while loop', 'range()', 'break', 'continue'],
    content: `
        <h2>Why Use Loops?</h2>
        <p>Without loops, printing numbers 1–100 requires 100 lines. With a loop, it takes 2. Loops are one of the most powerful programming tools.</p>

        <h2>The for Loop</h2>
        <pre class="code-block"><code><span class="comment"># Loop over a range of numbers</span>
<span class="keyword">for</span> i <span class="keyword">in</span> <span class="function">range</span>(<span class="number">5</span>):          <span class="comment"># 0, 1, 2, 3, 4</span>
    <span class="function">print</span>(i)

<span class="comment"># range(start, stop, step)</span>
<span class="keyword">for</span> i <span class="keyword">in</span> <span class="function">range</span>(<span class="number">1</span>, <span class="number">10</span>, <span class="number">2</span>):   <span class="comment"># 1, 3, 5, 7, 9</span>
    <span class="function">print</span>(i)

<span class="comment"># Loop over a list directly</span>
fruits = [<span class="string">"apple"</span>, <span class="string">"banana"</span>, <span class="string">"mango"</span>]
<span class="keyword">for</span> fruit <span class="keyword">in</span> fruits:
    <span class="function">print</span>(<span class="string">"I like"</span>, fruit)</code></pre>

        <h2>The while Loop</h2>
        <pre class="code-block"><code><span class="comment"># Repeats while the condition is True</span>
count = <span class="number">0</span>
<span class="keyword">while</span> count < <span class="number">5</span>:
    <span class="function">print</span>(<span class="string">"Count:"</span>, count)
    count += <span class="number">1</span>    <span class="comment"># Must update! Else infinite loop.</span></code></pre>

        <h2>break and continue</h2>
        <pre class="code-block"><code><span class="comment"># break — exit the loop immediately</span>
<span class="keyword">for</span> i <span class="keyword">in</span> <span class="function">range</span>(<span class="number">10</span>):
    <span class="keyword">if</span> i == <span class="number">5</span>:
        <span class="keyword">break</span>           <span class="comment"># Stop at 5</span>
    <span class="function">print</span>(i)            <span class="comment"># Prints 0, 1, 2, 3, 4</span>

<span class="comment"># continue — skip current iteration</span>
<span class="keyword">for</span> i <span class="keyword">in</span> <span class="function">range</span>(<span class="number">10</span>):
    <span class="keyword">if</span> i % <span class="number">2</span> == <span class="number">0</span>:
        <span class="keyword">continue</span>        <span class="comment"># Skip even numbers</span>
    <span class="function">print</span>(i)            <span class="comment"># Prints 1, 3, 5, 7, 9</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Use a for loop with range() to calculate the sum of numbers 1 to 100. Answer: 5050.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Loops in Python\ntotal = 0\nfor i in range(1, 101):\n    total += i\nprint(&quot;Sum 1-100:&quot;, total)\n\n# Loop over a list\nfruits = [&quot;apple&quot;, &quot;banana&quot;, &quot;mango&quot;]\nfor fruit in fruits:\n    print(fruit)', 'python', 'Loops')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 5, language: 'python', title: 'Functions',
    description: 'Organize reusable code into functions — the building blocks of clean, maintainable programs.',
    difficulty: 'intermediate', orderNumber: 5, createdBy: 1,
    topics: ['def', 'Parameters', 'Return Values', 'f-strings', 'Default Arguments'],
    content: `
        <h2>What is a Function?</h2>
        <p>A function is a named block of reusable code. Define it once, call it anywhere. Functions make programs shorter, cleaner, and easier to debug.</p>

        <div class="info-box">
            <div class="info-box-title">DRY Principle</div>
            <p><strong>Don't Repeat Yourself.</strong> If you write the same logic more than once, put it in a function. This is one of the most important rules in software development.</p>
        </div>

        <h2>Defining and Calling Functions</h2>
        <pre class="code-block"><code><span class="comment"># Define with 'def', then the function name and parameters</span>
<span class="keyword">def</span> <span class="function">greet</span>(name):
    <span class="function">print</span>(<span class="string">f"Hello, {name}! Welcome to Python."</span>)

<span class="comment"># Call the function with different arguments</span>
<span class="function">greet</span>(<span class="string">"Alice"</span>)    <span class="comment"># Hello, Alice! Welcome to Python.</span>
<span class="function">greet</span>(<span class="string">"Bob"</span>)      <span class="comment"># Hello, Bob! Welcome to Python.</span></code></pre>

        <h2>Return Values & Default Arguments</h2>
        <pre class="code-block"><code><span class="comment"># Use 'return' to send a value back to the caller</span>
<span class="keyword">def</span> <span class="function">add</span>(a, b):
    <span class="keyword">return</span> a + b

result = <span class="function">add</span>(<span class="number">3</span>, <span class="number">4</span>)
<span class="function">print</span>(result)       <span class="comment"># 7</span>

<span class="comment"># Default argument — used when not provided by caller</span>
<span class="keyword">def</span> <span class="function">power</span>(base, exp=<span class="number">2</span>):
    <span class="keyword">return</span> base ** exp

<span class="function">print</span>(<span class="function">power</span>(<span class="number">5</span>))       <span class="comment"># 25  (exp defaults to 2)</span>
<span class="function">print</span>(<span class="function">power</span>(<span class="number">2</span>, <span class="number">10</span>))   <span class="comment"># 1024</span></code></pre>

        <h2>f-Strings for Formatted Output</h2>
        <pre class="code-block"><code>name = <span class="string">"Alice"</span>
score = <span class="number">95</span>
<span class="comment"># Prefix string with f, embed variables in { }</span>
<span class="function">print</span>(<span class="string">f"Student: {name}, Score: {score}/100"</span>)
<span class="function">print</span>(<span class="string">f"Grade: {'A' if score >= 90 else 'B'}"</span>)
<span class="function">print</span>(<span class="string">f"Pi = {3.14159:.2f}"</span>)  <span class="comment"># Pi = 3.14 (2 decimal places)</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write a <code>bmi(weight, height)</code> function that calculates BMI = weight / height². Print the result formatted to 2 decimal places.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Functions in Python\ndef greet(name):\n    return f&quot;Hello, {name}!&quot;\n\ndef power(base, exp=2):\n    return base ** exp\n\nprint(greet(&quot;Alice&quot;))\nprint(power(5))\nprint(power(2, 10))', 'python', 'Functions')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 6, language: 'python', title: 'Lists & Dictionaries',
    description: 'Master Python\'s most-used data structures for storing collections of data.',
    difficulty: 'advanced', orderNumber: 6, createdBy: 1,
    topics: ['Lists', 'Slicing', 'List Methods', 'Dictionaries', 'dict Methods', 'List Comprehension'],
    content: `
        <h2>Lists — Ordered, Mutable Collections</h2>
        <p>A list stores multiple values in order. Items are accessed by index (starting at 0). Lists are <strong>mutable</strong> — you can add, remove, and modify items after creation.</p>

        <pre class="code-block"><code><span class="comment"># Create a list with square brackets</span>
fruits = [<span class="string">"apple"</span>, <span class="string">"banana"</span>, <span class="string">"mango"</span>, <span class="string">"orange"</span>]

<span class="comment"># Access by index (0-based)</span>
<span class="function">print</span>(fruits[<span class="number">0</span>])       <span class="comment"># apple  (first)</span>
<span class="function">print</span>(fruits[-<span class="number">1</span>])      <span class="comment"># orange (last)</span>
<span class="function">print</span>(fruits[<span class="number">1</span>:<span class="number">3</span>])     <span class="comment"># ['banana', 'mango'] (slicing)</span>

<span class="comment"># Modifying lists</span>
fruits.<span class="function">append</span>(<span class="string">"grape"</span>)   <span class="comment"># Add to end</span>
fruits.<span class="function">remove</span>(<span class="string">"banana"</span>) <span class="comment"># Remove by value</span>
fruits.<span class="function">sort</span>()            <span class="comment"># Sort alphabetically in place</span>
<span class="function">print</span>(<span class="function">len</span>(fruits))       <span class="comment"># Count of items</span></code></pre>

        <h2>Dictionaries — Key-Value Pairs</h2>
        <pre class="code-block"><code><span class="comment"># Create with curly braces, key: value pairs</span>
student = {
    <span class="string">"name"</span>: <span class="string">"Alice"</span>,
    <span class="string">"age"</span>: <span class="number">20</span>,
    <span class="string">"gpa"</span>: <span class="number">3.9</span>,
    <span class="string">"courses"</span>: [<span class="string">"CS101"</span>, <span class="string">"MATH201"</span>]
}

<span class="function">print</span>(student[<span class="string">"name"</span>])           <span class="comment"># Alice</span>
<span class="function">print</span>(student.<span class="function">get</span>(<span class="string">"gpa"</span>, <span class="number">0</span>))    <span class="comment"># 3.9 (safe access)</span>
student[<span class="string">"grade"</span>] = <span class="string">"A"</span>           <span class="comment"># Add new key</span>

<span class="comment"># Iterate over key-value pairs</span>
<span class="keyword">for</span> key, value <span class="keyword">in</span> student.<span class="function">items</span>():
    <span class="function">print</span>(<span class="string">f"{key}: {value}"</span>)</code></pre>

        <h2>List Comprehension (Pythonic Shortcut)</h2>
        <pre class="code-block"><code>nums = [<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>, <span class="number">4</span>, <span class="number">5</span>]
squares = [x**<span class="number">2</span> <span class="keyword">for</span> x <span class="keyword">in</span> nums]     <span class="comment"># [1, 4, 9, 16, 25]</span>
evens   = [x <span class="keyword">for</span> x <span class="keyword">in</span> nums <span class="keyword">if</span> x % <span class="number">2</span> == <span class="number">0</span>]  <span class="comment"># [2, 4]</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Create a contact book: a dictionary where each key is a name and each value is a phone number. Print all contacts.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('# Lists and Dictionaries\nfruits = [&quot;apple&quot;, &quot;banana&quot;, &quot;mango&quot;]\nfruits.append(&quot;orange&quot;)\nprint(fruits)\n\nstudent = {&quot;name&quot;: &quot;Alice&quot;, &quot;gpa&quot;: 3.9}\nfor k, v in student.items():\n    print(f&quot;{k}: {v}&quot;)', 'python', 'Lists & Dictionaries')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

// ═══════════════════════════════════════════════════════════════════
// JAVASCRIPT LESSONS (IDs 101–106)
// ═══════════════════════════════════════════════════════════════════

{
    id: 101, language: 'javascript', title: 'Getting Started with JavaScript',
    description: 'Discover JavaScript — the language of the web — and write your first JS program.',
    difficulty: 'beginner', orderNumber: 1, createdBy: 1,
    topics: ['console.log()', 'Comments', 'let & const', 'Arithmetic'],
    content: `
        <h2>What is JavaScript?</h2>
        <p>JavaScript (JS) is the only programming language that runs natively in web browsers. It powers interactive websites, web apps, mobile apps (React Native), and servers (Node.js).</p>

        <div class="info-box">
            <div class="info-box-title">JS vs Python Syntax</div>
            <p>JavaScript uses curly braces <code>{ }</code> for code blocks, semicolons <code>;</code> at line ends (optional but recommended), and <code>camelCase</code> naming convention. Case matters!</p>
        </div>

        <h2>Your First JavaScript Program</h2>
        <pre class="code-block"><code><span class="comment">// Single-line comment</span>
<span class="comment">/* Multi-line
   comment */</span>

<span class="comment">// Output to the browser console</span>
console.<span class="function">log</span>(<span class="string">"Hello, World!"</span>);

<span class="comment">// let = changeable variable, const = fixed value</span>
<span class="keyword">let</span> name = <span class="string">"Alice"</span>;         <span class="comment">// Can be reassigned later</span>
<span class="keyword">const</span> PI = <span class="number">3.14159</span>;       <span class="comment">// Cannot be changed</span>

console.<span class="function">log</span>(<span class="string">"Hello,"</span>, name);
console.<span class="function">log</span>(<span class="string">"Pi ="</span>, PI);</code></pre>

        <h2>Arithmetic & Operators</h2>
        <pre class="code-block"><code>console.<span class="function">log</span>(<span class="number">10</span> + <span class="number">5</span>);    <span class="comment">// 15</span>
console.<span class="function">log</span>(<span class="number">10</span> - <span class="number">3</span>);    <span class="comment">// 7</span>
console.<span class="function">log</span>(<span class="number">10</span> * <span class="number">4</span>);    <span class="comment">// 40</span>
console.<span class="function">log</span>(<span class="number">10</span> / <span class="number">3</span>);    <span class="comment">// 3.333...</span>
console.<span class="function">log</span>(<span class="number">10</span> % <span class="number">3</span>);    <span class="comment">// 1 (remainder)</span>
console.<span class="function">log</span>(<span class="number">2</span> ** <span class="number">8</span>);    <span class="comment">// 256 (exponentiation)</span>

<span class="comment">// Shorthand assignment operators</span>
<span class="keyword">let</span> x = <span class="number">10</span>;
x += <span class="number">5</span>;   <span class="comment">// x = 15</span>
x++;       <span class="comment">// x = 16 (increment)</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It in JavaScript!</div>
            <p>Declare your name and age with let/const, then log a greeting. Try some arithmetic too!</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Getting Started with JavaScript\nconsole.log(&quot;Hello, World!&quot;);\n\nlet name = &quot;Alice&quot;;\nconst age = 20;\nconsole.log(&quot;Name:&quot;, name, &quot;Age:&quot;, age);\nconsole.log(2 ** 10);', 'javascript', 'Getting Started with JavaScript')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 102, language: 'javascript', title: 'Variables & Data Types',
    description: 'Explore JavaScript\'s type system — from primitives to template literals and type coercion.',
    difficulty: 'beginner', orderNumber: 2, createdBy: 1,
    topics: ['Primitives', 'typeof', 'null vs undefined', 'Template Literals', 'Type Coercion'],
    content: `
        <h2>JavaScript's Primitive Types</h2>
        <p>JavaScript has seven primitive data types. Unlike Python, JS differentiates between <code>null</code> (intentional empty) and <code>undefined</code> (no value assigned).</p>

        <pre class="code-block"><code><span class="keyword">let</span> age = <span class="number">25</span>;             <span class="comment">// Number (int AND float use same type)</span>
<span class="keyword">let</span> price = <span class="number">9.99</span>;         <span class="comment">// Number</span>
<span class="keyword">let</span> name = <span class="string">"Alice"</span>;       <span class="comment">// String</span>
<span class="keyword">let</span> active = <span class="keyword">true</span>;        <span class="comment">// Boolean (lowercase in JS!)</span>
<span class="keyword">let</span> score = <span class="keyword">null</span>;         <span class="comment">// null — intentionally empty</span>
<span class="keyword">let</span> result;               <span class="comment">// undefined — not yet assigned</span>

<span class="comment">// typeof operator — check any value's type</span>
console.<span class="function">log</span>(<span class="keyword">typeof</span> age);    <span class="comment">// "number"</span>
console.<span class="function">log</span>(<span class="keyword">typeof</span> name);   <span class="comment">// "string"</span>
console.<span class="function">log</span>(<span class="keyword">typeof</span> active); <span class="comment">// "boolean"</span>
console.<span class="function">log</span>(<span class="keyword">typeof</span> result); <span class="comment">// "undefined"</span></code></pre>

        <div class="info-box">
            <div class="info-box-title">=== vs == in JavaScript</div>
            <p>Always use <code>===</code> (strict equality) — it checks value AND type. <code>==</code> does type coercion, causing bugs: <code>"5" == 5</code> is <code>true</code>, but <code>"5" === 5</code> is <code>false</code>.</p>
        </div>

        <h2>Template Literals</h2>
        <pre class="code-block"><code><span class="keyword">const</span> name = <span class="string">"Alice"</span>;
<span class="keyword">const</span> score = <span class="number">95</span>;

<span class="comment">// Old way — concatenation with +</span>
console.<span class="function">log</span>(<span class="string">"Student: "</span> + name + <span class="string">", Score: "</span> + score);

<span class="comment">// Template literal — use backticks and \${}</span>
console.<span class="function">log</span>(<span class="string">\`Student: \${name}, Score: \${score}/100\`</span>);

<span class="comment">// Expressions inside template literals</span>
console.<span class="function">log</span>(<span class="string">\`Grade: \${score >= 90 ? 'A' : 'B'}\`</span>);

<span class="comment">// Multi-line strings (no \\n needed)</span>
<span class="keyword">const</span> msg = <span class="string">\`Hello \${name}!
Welcome to JavaScript.\`</span>;</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Use template literals to build a profile string: "Alice is 20 years old and loves coding."</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Variables and Data Types\nlet name = &quot;Alice&quot;;\nlet age = 20;\nconst PI = 3.14159;\n\nconsole.log(typeof name);\nconsole.log(typeof age);\nconsole.log("Hello " + name + ", you are " + age + " years old");', 'javascript', 'Variables & Data Types')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 103, language: 'javascript', title: 'Control Flow',
    description: 'Control program execution with if/else, switch, and the ternary operator in JavaScript.',
    difficulty: 'beginner', orderNumber: 3, createdBy: 1,
    topics: ['if/else', 'switch', 'Ternary Operator', 'Truthy/Falsy', 'Logical Operators'],
    content: `
        <h2>if / else if / else</h2>
        <p>JavaScript control flow uses curly braces <code>{ }</code> for blocks instead of Python's colon-and-indent style. Parentheses around conditions are required.</p>

        <pre class="code-block"><code><span class="keyword">let</span> score = <span class="number">82</span>;

<span class="keyword">if</span> (score >= <span class="number">90</span>) {
    console.<span class="function">log</span>(<span class="string">"Grade: A"</span>);
} <span class="keyword">else if</span> (score >= <span class="number">80</span>) {
    console.<span class="function">log</span>(<span class="string">"Grade: B"</span>);    <span class="comment">// This runs (82 >= 80)</span>
} <span class="keyword">else if</span> (score >= <span class="number">70</span>) {
    console.<span class="function">log</span>(<span class="string">"Grade: C"</span>);
} <span class="keyword">else</span> {
    console.<span class="function">log</span>(<span class="string">"Grade: F"</span>);
}</code></pre>

        <h2>Ternary Operator & switch</h2>
        <pre class="code-block"><code><span class="comment">// Ternary: condition ? valueIfTrue : valueIfFalse</span>
<span class="keyword">const</span> age = <span class="number">20</span>;
<span class="keyword">const</span> status = age >= <span class="number">18</span> ? <span class="string">"adult"</span> : <span class="string">"minor"</span>;
console.<span class="function">log</span>(status);   <span class="comment">// "adult"</span>

<span class="comment">// switch — cleaner than long if/else chains</span>
<span class="keyword">const</span> day = <span class="string">"Monday"</span>;
<span class="keyword">switch</span> (day) {
    <span class="keyword">case</span> <span class="string">"Saturday"</span>:
    <span class="keyword">case</span> <span class="string">"Sunday"</span>:
        console.<span class="function">log</span>(<span class="string">"Weekend!"</span>); <span class="keyword">break</span>;
    <span class="keyword">default</span>:
        console.<span class="function">log</span>(<span class="string">"Weekday"</span>);   <span class="comment">// This runs</span>
}</code></pre>

        <h2>Truthy & Falsy</h2>
        <pre class="code-block"><code><span class="comment">// These values are FALSY (act like false in if)</span>
<span class="comment">// false, 0, "", null, undefined, NaN</span>

<span class="keyword">if</span> (<span class="number">0</span>) {
    console.<span class="function">log</span>(<span class="string">"never runs"</span>);
} <span class="keyword">else</span> {
    console.<span class="function">log</span>(<span class="string">"0 is falsy"</span>);  <span class="comment">// This runs</span>
}

<span class="keyword">let</span> username = <span class="string">""</span>;
<span class="keyword">if</span> (!username) {
    console.<span class="function">log</span>(<span class="string">"Please enter a name"</span>); <span class="comment">// Runs (empty string is falsy)</span>
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Use a ternary operator to check if a number is even or odd, then log the result.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Control Flow\nlet score = 82;\nif (score >= 90) {\n    console.log(&quot;A&quot;);\n} else if (score >= 80) {\n    console.log(&quot;B&quot;);\n} else {\n    console.log(&quot;F&quot;);\n}\n\nconst n = 7;\nconst result = n % 2 === 0 ? &quot;even&quot; : &quot;odd&quot;;\nconsole.log(n, &quot;is&quot;, result);', 'javascript', 'Control Flow')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 104, language: 'javascript', title: 'Loops & Iteration',
    description: 'Master JavaScript\'s loop types — for, while, for...of, and functional forEach.',
    difficulty: 'intermediate', orderNumber: 4, createdBy: 1,
    topics: ['for loop', 'while', 'for...of', 'forEach', 'break/continue'],
    content: `
        <h2>The Classic for Loop</h2>
        <pre class="code-block"><code><span class="comment">// for (initialization; condition; update)</span>
<span class="keyword">for</span> (<span class="keyword">let</span> i = <span class="number">0</span>; i &lt; <span class="number">5</span>; i++) {
    console.<span class="function">log</span>(i);    <span class="comment">// 0, 1, 2, 3, 4</span>
}

<span class="comment">// Count down with step</span>
<span class="keyword">for</span> (<span class="keyword">let</span> i = <span class="number">10</span>; i &gt; <span class="number">0</span>; i -= <span class="number">2</span>) {
    console.<span class="function">log</span>(i);    <span class="comment">// 10, 8, 6, 4, 2</span>
}</code></pre>

        <h2>for...of and while</h2>
        <pre class="code-block"><code><span class="comment">// for...of — iterate over arrays (modern ES6)</span>
<span class="keyword">const</span> colors = [<span class="string">"red"</span>, <span class="string">"green"</span>, <span class="string">"blue"</span>];
<span class="keyword">for</span> (<span class="keyword">const</span> color <span class="keyword">of</span> colors) {
    console.<span class="function">log</span>(color);
}

<span class="comment">// while — runs while condition is true</span>
<span class="keyword">let</span> count = <span class="number">0</span>;
<span class="keyword">while</span> (count &lt; <span class="number">3</span>) {
    console.<span class="function">log</span>(<span class="string">"Count:"</span>, count);
    count++;               <span class="comment">// Must update to avoid infinite loop!</span>
}</code></pre>

        <h2>Array.forEach (Functional Style)</h2>
        <pre class="code-block"><code><span class="keyword">const</span> scores = [<span class="number">85</span>, <span class="number">92</span>, <span class="number">78</span>, <span class="number">96</span>];

<span class="comment">// forEach runs a callback for each element</span>
scores.<span class="function">forEach</span>((score, index) =&gt; {
    console.<span class="function">log</span>(<span class="string">\`Score \${index + 1}: \${score}\`</span>);
});

<span class="comment">// break/continue only work in for/while (not forEach!)</span>
<span class="keyword">for</span> (<span class="keyword">const</span> s <span class="keyword">of</span> scores) {
    <span class="keyword">if</span> (s &gt; <span class="number">90</span>) <span class="keyword">continue</span>;   <span class="comment">// skip high scores</span>
    console.<span class="function">log</span>(<span class="string">"Below 90:"</span>, s);
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Print the multiplication table for 7: "7 x 1 = 7" through "7 x 10 = 70".</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Loops in JavaScript\nfor (let i = 1; i &lt;= 10; i++) {\n    console.log("7 x " + i + " = " + (7 * i));\n}\n\nconst fruits = [&quot;apple&quot;, &quot;banana&quot;, &quot;mango&quot;];\nfor (const fruit of fruits) {\n    console.log(fruit);\n}', 'javascript', 'Loops & Iteration')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 105, language: 'javascript', title: 'Functions & Arrow Functions',
    description: 'Write reusable functions using both traditional and modern ES6 arrow syntax.',
    difficulty: 'intermediate', orderNumber: 5, createdBy: 1,
    topics: ['function keyword', 'Arrow Functions', 'Parameters', 'Return', 'map/filter/reduce'],
    content: `
        <h2>Traditional Functions</h2>
        <pre class="code-block"><code><span class="comment">// Function declaration — hoisted (usable before defined)</span>
<span class="keyword">function</span> <span class="function">greet</span>(name) {
    <span class="keyword">return</span> <span class="string">\`Hello, \${name}!\`</span>;
}

<span class="comment">// Function expression — stored in a variable</span>
<span class="keyword">const</span> <span class="function">add</span> = <span class="keyword">function</span>(a, b) {
    <span class="keyword">return</span> a + b;
};

console.<span class="function">log</span>(<span class="function">greet</span>(<span class="string">"Alice"</span>));   <span class="comment">// Hello, Alice!</span>
console.<span class="function">log</span>(<span class="function">add</span>(<span class="number">3</span>, <span class="number">4</span>));         <span class="comment">// 7</span></code></pre>

        <h2>Arrow Functions (ES6)</h2>
        <pre class="code-block"><code><span class="comment">// Single-line: implicit return (no return keyword needed)</span>
<span class="keyword">const</span> <span class="function">square</span> = n =&gt; n * n;
<span class="keyword">const</span> <span class="function">multiply</span> = (a, b) =&gt; a * b;

<span class="comment">// Multi-line: needs { } and explicit return</span>
<span class="keyword">const</span> <span class="function">getGrade</span> = (score) =&gt; {
    <span class="keyword">if</span> (score >= <span class="number">90</span>) <span class="keyword">return</span> <span class="string">"A"</span>;
    <span class="keyword">if</span> (score >= <span class="number">80</span>) <span class="keyword">return</span> <span class="string">"B"</span>;
    <span class="keyword">return</span> <span class="string">"C"</span>;
};

console.<span class="function">log</span>(<span class="function">square</span>(<span class="number">5</span>));        <span class="comment">// 25</span>
console.<span class="function">log</span>(<span class="function">getGrade</span>(<span class="number">85</span>));    <span class="comment">// "B"</span></code></pre>

        <h2>Higher-Order Functions</h2>
        <pre class="code-block"><code><span class="keyword">const</span> nums = [<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>, <span class="number">4</span>, <span class="number">5</span>];

<span class="comment">// map — transform each element into a new array</span>
<span class="keyword">const</span> doubled = nums.<span class="function">map</span>(n =&gt; n * <span class="number">2</span>);
console.<span class="function">log</span>(doubled);   <span class="comment">// [2, 4, 6, 8, 10]</span>

<span class="comment">// filter — keep only elements matching condition</span>
<span class="keyword">const</span> evens = nums.<span class="function">filter</span>(n =&gt; n % <span class="number">2</span> === <span class="number">0</span>);
console.<span class="function">log</span>(evens);    <span class="comment">// [2, 4]</span>

<span class="comment">// reduce — accumulate into a single value</span>
<span class="keyword">const</span> sum = nums.<span class="function">reduce</span>((acc, n) =&gt; acc + n, <span class="number">0</span>);
console.<span class="function">log</span>(sum);      <span class="comment">// 15</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Use <code>map()</code> to convert Celsius temps to Fahrenheit: <code>F = C * 9/5 + 32</code>. Try [0, 20, 37, 100].</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Arrow Functions and HOFs\nconst greet = name =&gt; "Hello, " + name + "!";\nconsole.log(greet(&quot;Alice&quot;));\n\nconst nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n =&gt; n * 2);\nconst evens = nums.filter(n =&gt; n % 2 === 0);\nconsole.log(doubled);\nconsole.log(evens);', 'javascript', 'Functions & Arrow Functions')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 106, language: 'javascript', title: 'Arrays & Objects',
    description: 'Work with JavaScript\'s core data structures — dynamic arrays and flexible objects.',
    difficulty: 'advanced', orderNumber: 6, createdBy: 1,
    topics: ['Arrays', 'Array Methods', 'Objects', 'Destructuring', 'Spread Operator'],
    content: `
        <h2>Arrays — Dynamic Lists</h2>
        <pre class="code-block"><code><span class="keyword">const</span> fruits = [<span class="string">"apple"</span>, <span class="string">"banana"</span>, <span class="string">"mango"</span>];

<span class="comment">// Add / remove elements</span>
fruits.<span class="function">push</span>(<span class="string">"orange"</span>);     <span class="comment">// Add to end → ["apple","banana","mango","orange"]</span>
fruits.<span class="function">pop</span>();              <span class="comment">// Remove from end</span>
fruits.<span class="function">unshift</span>(<span class="string">"grape"</span>);  <span class="comment">// Add to start</span>
fruits.<span class="function">shift</span>();             <span class="comment">// Remove from start</span>

<span class="comment">// Search and info</span>
console.<span class="function">log</span>(fruits.<span class="function">includes</span>(<span class="string">"banana"</span>));  <span class="comment">// true</span>
console.<span class="function">log</span>(fruits.<span class="function">indexOf</span>(<span class="string">"mango"</span>));   <span class="comment">// 1</span>
console.<span class="function">log</span>(fruits.<span class="function">join</span>(<span class="string">", "</span>));          <span class="comment">// "banana, mango"</span></code></pre>

        <h2>Objects — Key-Value Maps</h2>
        <pre class="code-block"><code><span class="keyword">const</span> student = {
    name: <span class="string">"Alice"</span>,
    age: <span class="number">20</span>,
    gpa: <span class="number">3.9</span>,
    <span class="function">greet</span>() {                         <span class="comment">// Method inside object</span>
        <span class="keyword">return</span> <span class="string">\`Hi, I'm \${this.name}\`</span>;
    }
};

console.<span class="function">log</span>(student.name);         <span class="comment">// Alice  (dot notation)</span>
console.<span class="function">log</span>(student[<span class="string">"gpa"</span>]);      <span class="comment">// 3.9   (bracket notation)</span>
console.<span class="function">log</span>(student.<span class="function">greet</span>());     <span class="comment">// Hi, I'm Alice</span></code></pre>

        <h2>Destructuring & Spread</h2>
        <pre class="code-block"><code><span class="comment">// Array destructuring</span>
<span class="keyword">const</span> [first, second, ...rest] = [<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>, <span class="number">4</span>];
console.<span class="function">log</span>(first, second, rest);   <span class="comment">// 1  2  [3, 4]</span>

<span class="comment">// Object destructuring</span>
<span class="keyword">const</span> { name, age } = student;
console.<span class="function">log</span>(name, age);             <span class="comment">// Alice  20</span>

<span class="comment">// Spread — copy/merge arrays or objects</span>
<span class="keyword">const</span> a = [<span class="number">1</span>, <span class="number">2</span>], b = [<span class="number">3</span>, <span class="number">4</span>];
<span class="keyword">const</span> merged = [...a, ...b];         <span class="comment">// [1, 2, 3, 4]</span>

<span class="keyword">const</span> updated = { ...student, age: <span class="number">21</span> };  <span class="comment">// Copy + override age</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Create a <code>book</code> object with title, author, year, and a <code>summary()</code> method. Log the summary.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('// Arrays and Objects\nconst fruits = [&quot;apple&quot;, &quot;banana&quot;, &quot;mango&quot;];\nfruits.push(&quot;orange&quot;);\nconsole.log(fruits);\n\nconst student = { name: &quot;Alice&quot;, gpa: 3.9 };\nconst { name, gpa } = student;\nconsole.log(name, gpa);', 'javascript', 'Arrays & Objects')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

// ═══════════════════════════════════════════════════════════════════
// JAVA LESSONS (IDs 201–206)
// ═══════════════════════════════════════════════════════════════════

{
    id: 201, language: 'java', title: 'Getting Started with Java',
    description: 'Set up your first Java program and understand Java\'s strict, object-oriented structure.',
    difficulty: 'beginner', orderNumber: 1, createdBy: 1,
    topics: ['Hello World', 'main method', 'System.out.println', 'Class Structure', 'Compilation'],
    content: `
        <h2>What is Java?</h2>
        <p>Java is a statically-typed, object-oriented language famous for its "write once, run anywhere" philosophy. Java code compiles to bytecode that runs on the Java Virtual Machine (JVM) — on any OS.</p>

        <div class="info-box">
            <div class="info-box-title">Java's Strict Structure</div>
            <p>Every Java program must have at least one <strong>class</strong>. Execution always starts in the <code>public static void main(String[] args)</code> method. Every statement ends with a <strong>semicolon</strong> <code>;</code> — this is mandatory!</p>
        </div>

        <h2>Your First Java Program</h2>
        <pre class="code-block"><code><span class="comment">// File must be saved as HelloWorld.java</span>
<span class="keyword">public class</span> <span class="function">HelloWorld</span> {

    <span class="comment">// Entry point — Java always starts here</span>
    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {

        <span class="comment">// System.out.println prints and adds a newline</span>
        System.out.<span class="function">println</span>(<span class="string">"Hello, World!"</span>);

        <span class="comment">// All variables must have a declared type</span>
        String name = <span class="string">"Alice"</span>;
        <span class="keyword">int</span> age = <span class="number">20</span>;

        System.out.<span class="function">println</span>(<span class="string">"Name: "</span> + name);
        System.out.<span class="function">println</span>(<span class="string">"Age: "</span> + age);
    }
}</code></pre>

        <h2>print vs println vs printf</h2>
        <pre class="code-block"><code>System.out.<span class="function">println</span>(<span class="string">"Line 1"</span>);       <span class="comment">// Adds newline at end</span>
System.out.<span class="function">print</span>(<span class="string">"No newline"</span>);    <span class="comment">// No newline — cursor stays</span>
System.out.<span class="function">printf</span>(<span class="string">"Name: %s, Age: %d%n"</span>, <span class="string">"Alice"</span>, <span class="number">20</span>);
<span class="comment">// %s = string, %d = integer, %f = float, %n = newline</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It in Java!</div>
            <p>Declare variables for your name, age, and GPA. Print them with System.out.println.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    public static void main(String[] args) {\n        System.out.println(&quot;Hello, World!&quot;);\n        String name = &quot;Alice&quot;;\n        int age = 20;\n        System.out.println(&quot;Name: &quot; + name);\n        System.out.println(&quot;Age: &quot; + age);\n    }\n}', 'java', 'Getting Started with Java')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 202, language: 'java', title: 'Variables & Primitive Types',
    description: 'Learn Java\'s strict type system — eight primitive types and the String reference type.',
    difficulty: 'beginner', orderNumber: 2, createdBy: 1,
    topics: ['int', 'double', 'char', 'boolean', 'String', 'Type Casting', 'final'],
    content: `
        <h2>Java's 8 Primitive Types</h2>
        <p>Unlike Python, Java requires you to declare the type of every variable. There are 8 primitive types — the most common four are:</p>

        <pre class="code-block"><code><span class="keyword">public class</span> <span class="function">DataTypes</span> {
    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {

        <span class="keyword">int</span>     count   = <span class="number">100</span>;          <span class="comment">// 4 bytes, -2B to 2B</span>
        <span class="keyword">long</span>    bigNum  = <span class="number">9876543210L</span>;  <span class="comment">// 8 bytes (needs L suffix)</span>
        <span class="keyword">double</span>  price   = <span class="number">9.99</span>;        <span class="comment">// 64-bit decimal (preferred)</span>
        <span class="keyword">float</span>   temp    = <span class="number">98.6f</span>;       <span class="comment">// 32-bit decimal (needs f suffix)</span>
        <span class="keyword">char</span>    grade   = <span class="string">'A'</span>;         <span class="comment">// Single character (single quotes!)</span>
        <span class="keyword">boolean</span> active  = <span class="keyword">true</span>;        <span class="comment">// Only true or false</span>

        <span class="comment">// String is a class (reference type), not primitive</span>
        String  name = <span class="string">"Alice"</span>;

        System.out.<span class="function">println</span>(count + <span class="string">" "</span> + price + <span class="string">" "</span> + grade);
    }
}</code></pre>

        <h2>Type Casting & Constants</h2>
        <pre class="code-block"><code><span class="comment">// Widening (automatic) — smaller to larger type</span>
<span class="keyword">int</span> x = <span class="number">42</span>;
<span class="keyword">double</span> d = x;           <span class="comment">// int → double automatically</span>
System.out.<span class="function">println</span>(d);  <span class="comment">// 42.0</span>

<span class="comment">// Narrowing (manual) — cast with (type)</span>
<span class="keyword">double</span> pi = <span class="number">3.14159</span>;
<span class="keyword">int</span> truncated = (<span class="keyword">int</span>) pi;  <span class="comment">// Truncates decimal</span>
System.out.<span class="function">println</span>(truncated);  <span class="comment">// 3</span>

<span class="comment">// Constants use 'final' keyword</span>
<span class="keyword">final double</span> PI = <span class="number">3.14159265</span>;
<span class="comment">// PI = 3.0; // ERROR — cannot change final</span>

<span class="comment">// String to int</span>
String numStr = <span class="string">"42"</span>;
<span class="keyword">int</span> num = Integer.<span class="function">parseInt</span>(numStr);
System.out.<span class="function">println</span>(num + <span class="number">1</span>);  <span class="comment">// 43</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Declare all four common types (int, double, char, boolean), then try casting a double to int.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    public static void main(String[] args) {\n        int count = 100;\n        double price = 9.99;\n        char grade = \\'A\\';\n        boolean active = true;\n        System.out.println(count + &quot; &quot; + price + &quot; &quot; + grade + &quot; &quot; + active);\n        int truncated = (int) price;\n        System.out.println(&quot;Truncated: &quot; + truncated);\n    }\n}', 'java', 'Variables & Primitive Types')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 203, language: 'java', title: 'Control Flow in Java',
    description: 'Write decision-making code in Java using if/else, switch, and the ternary operator.',
    difficulty: 'beginner', orderNumber: 3, createdBy: 1,
    topics: ['if/else', 'switch', 'Ternary', 'Relational Operators', 'Logical Operators'],
    content: `
        <h2>if / else if / else</h2>
        <p>Java's if/else requires parentheses around conditions and curly braces around code blocks. The logic is identical to JavaScript.</p>

        <pre class="code-block"><code><span class="keyword">public class</span> <span class="function">GradeChecker</span> {
    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {
        <span class="keyword">int</span> score = <span class="number">85</span>;

        <span class="keyword">if</span> (score >= <span class="number">90</span>) {
            System.out.<span class="function">println</span>(<span class="string">"Grade: A"</span>);
        } <span class="keyword">else if</span> (score >= <span class="number">80</span>) {
            System.out.<span class="function">println</span>(<span class="string">"Grade: B"</span>);   <span class="comment">// This runs</span>
        } <span class="keyword">else if</span> (score >= <span class="number">70</span>) {
            System.out.<span class="function">println</span>(<span class="string">"Grade: C"</span>);
        } <span class="keyword">else</span> {
            System.out.<span class="function">println</span>(<span class="string">"Grade: F"</span>);
        }
    }
}</code></pre>

        <h2>switch & Ternary</h2>
        <pre class="code-block"><code><span class="keyword">int</span> day = <span class="number">3</span>;
<span class="keyword">switch</span> (day) {
    <span class="keyword">case</span> <span class="number">1</span>: System.out.<span class="function">println</span>(<span class="string">"Monday"</span>);    <span class="keyword">break</span>;
    <span class="keyword">case</span> <span class="number">2</span>: System.out.<span class="function">println</span>(<span class="string">"Tuesday"</span>);   <span class="keyword">break</span>;
    <span class="keyword">case</span> <span class="number">3</span>: System.out.<span class="function">println</span>(<span class="string">"Wednesday"</span>); <span class="keyword">break</span>;  <span class="comment">// Runs</span>
    <span class="keyword">default</span>: System.out.<span class="function">println</span>(<span class="string">"Other day"</span>);
}

<span class="comment">// Ternary: condition ? trueValue : falseValue</span>
<span class="keyword">int</span> age = <span class="number">20</span>;
String status = (age >= <span class="number">18</span>) ? <span class="string">"Adult"</span> : <span class="string">"Minor"</span>;
System.out.<span class="function">println</span>(status);   <span class="comment">// Adult</span>

<span class="comment">// Logical operators: &amp;&amp; (and), || (or), ! (not)</span>
<span class="keyword">if</span> (age >= <span class="number">18</span> &amp;&amp; age &lt; <span class="number">65</span>) {
    System.out.<span class="function">println</span>(<span class="string">"Working age"</span>);
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write a switch statement that prints the season based on a month number (1=Jan, 12=Dec).</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    public static void main(String[] args) {\n        int score = 85;\n        if (score >= 90) {\n            System.out.println(&quot;A&quot;);\n        } else if (score >= 80) {\n            System.out.println(&quot;B&quot;);\n        } else {\n            System.out.println(&quot;F&quot;);\n        }\n        String result = (score >= 70) ? &quot;Pass&quot; : &quot;Fail&quot;;\n        System.out.println(result);\n    }\n}', 'java', 'Control Flow in Java')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 204, language: 'java', title: 'Loops in Java',
    description: 'Repeat code with Java\'s for, while, do-while loops and the enhanced for-each.',
    difficulty: 'intermediate', orderNumber: 4, createdBy: 1,
    topics: ['for loop', 'while', 'do-while', 'Enhanced for-each', 'break/continue'],
    content: `
        <h2>The for Loop</h2>
        <pre class="code-block"><code><span class="keyword">public class</span> <span class="function">Loops</span> {
    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {

        <span class="comment">// Classic for loop</span>
        <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">0</span>; i &lt; <span class="number">5</span>; i++) {
            System.out.<span class="function">print</span>(i + <span class="string">" "</span>);    <span class="comment">// 0 1 2 3 4</span>
        }
        System.out.<span class="function">println</span>();

        <span class="comment">// Nested loops: 3x3 multiplication table</span>
        <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">1</span>; i &lt;= <span class="number">3</span>; i++) {
            <span class="keyword">for</span> (<span class="keyword">int</span> j = <span class="number">1</span>; j &lt;= <span class="number">3</span>; j++) {
                System.out.<span class="function">printf</span>(<span class="string">"%4d"</span>, i * j);
            }
            System.out.<span class="function">println</span>();
        }
    }
}</code></pre>

        <h2>while, do-while, and for-each</h2>
        <pre class="code-block"><code><span class="comment">// while — check condition first</span>
<span class="keyword">int</span> count = <span class="number">0</span>;
<span class="keyword">while</span> (count &lt; <span class="number">3</span>) {
    System.out.<span class="function">println</span>(<span class="string">"Count: "</span> + count++);
}

<span class="comment">// do-while — runs at least once, checks after</span>
<span class="keyword">int</span> n = <span class="number">10</span>;
<span class="keyword">do</span> {
    System.out.<span class="function">println</span>(n--);
} <span class="keyword">while</span> (n &gt; <span class="number">8</span>);      <span class="comment">// Prints: 10, 9</span>

<span class="comment">// Enhanced for-each — clearest way to loop arrays</span>
<span class="keyword">int</span>[] scores = {<span class="number">85</span>, <span class="number">92</span>, <span class="number">78</span>, <span class="number">96</span>};
<span class="keyword">for</span> (<span class="keyword">int</span> score : scores) {
    System.out.<span class="function">println</span>(<span class="string">"Score: "</span> + score);
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Use nested for loops to print a star pyramid: row 1 has 1 star, row 5 has 5 stars.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i &lt;= 5; i++) {\n            for (int j = 0; j &lt; i; j++) {\n                System.out.print(&quot;* &quot;);\n            }\n            System.out.println();\n        }\n    }\n}', 'java', 'Loops in Java')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 205, language: 'java', title: 'Methods in Java',
    description: 'Define and call methods — Java\'s functions — with explicit return types and overloading.',
    difficulty: 'intermediate', orderNumber: 5, createdBy: 1,
    topics: ['Method Declaration', 'Parameters', 'Return Types', 'void', 'Method Overloading', 'static'],
    content: `
        <h2>Defining Methods</h2>
        <p>In Java, all functions are called <strong>methods</strong> and must live inside a class. You must declare the return type, name, and parameter types — no exceptions.</p>

        <pre class="code-block"><code><span class="keyword">public class</span> <span class="function">Methods</span> {

    <span class="comment">// void — returns nothing</span>
    <span class="keyword">public static void</span> <span class="function">greet</span>(String name) {
        System.out.<span class="function">println</span>(<span class="string">"Hello, "</span> + name + <span class="string">"!"</span>);
    }

    <span class="comment">// int — returns an integer</span>
    <span class="keyword">public static int</span> <span class="function">add</span>(<span class="keyword">int</span> a, <span class="keyword">int</span> b) {
        <span class="keyword">return</span> a + b;
    }

    <span class="comment">// double — compute average of an array</span>
    <span class="keyword">public static double</span> <span class="function">average</span>(<span class="keyword">int</span>[] nums) {
        <span class="keyword">int</span> sum = <span class="number">0</span>;
        <span class="keyword">for</span> (<span class="keyword">int</span> n : nums) sum += n;
        <span class="keyword">return</span> (<span class="keyword">double</span>) sum / nums.length;
    }

    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {
        <span class="function">greet</span>(<span class="string">"Alice"</span>);                        <span class="comment">// Hello, Alice!</span>
        System.out.<span class="function">println</span>(<span class="function">add</span>(<span class="number">3</span>, <span class="number">4</span>));         <span class="comment">// 7</span>
        <span class="keyword">int</span>[] scores = {<span class="number">80</span>, <span class="number">90</span>, <span class="number">70</span>};
        System.out.<span class="function">println</span>(<span class="function">average</span>(scores));   <span class="comment">// 80.0</span>
    }
}</code></pre>

        <h2>Method Overloading</h2>
        <pre class="code-block"><code><span class="comment">// Same name, different parameter types or count</span>
<span class="keyword">public static int</span>    <span class="function">multiply</span>(<span class="keyword">int</span> a, <span class="keyword">int</span> b)           { <span class="keyword">return</span> a * b; }
<span class="keyword">public static double</span> <span class="function">multiply</span>(<span class="keyword">double</span> a, <span class="keyword">double</span> b)   { <span class="keyword">return</span> a * b; }
<span class="keyword">public static int</span>    <span class="function">multiply</span>(<span class="keyword">int</span> a, <span class="keyword">int</span> b, <span class="keyword">int</span> c) { <span class="keyword">return</span> a*b*c; }

<span class="comment">// Java picks the correct version automatically</span>
System.out.<span class="function">println</span>(<span class="function">multiply</span>(<span class="number">3</span>, <span class="number">4</span>));       <span class="comment">// 12</span>
System.out.<span class="function">println</span>(<span class="function">multiply</span>(<span class="number">2.5</span>, <span class="number">4.0</span>)); <span class="comment">// 10.0</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write an <code>isPrime(int n)</code> method that returns boolean. Test it for numbers 1–20 in a loop.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    public static void greet(String name) {\n        System.out.println(&quot;Hello, &quot; + name);\n    }\n    public static int add(int a, int b) {\n        return a + b;\n    }\n    public static void main(String[] args) {\n        greet(&quot;Alice&quot;);\n        System.out.println(add(3, 4));\n    }\n}', 'java', 'Methods in Java')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 206, language: 'java', title: 'Classes & Objects',
    description: 'Build your own classes with fields, constructors, and methods — the heart of Java OOP.',
    difficulty: 'advanced', orderNumber: 6, createdBy: 1,
    topics: ['Class', 'Constructor', 'Fields', 'Methods', 'this keyword', 'Encapsulation', 'new'],
    content: `
        <h2>Object-Oriented Programming</h2>
        <p>Java is built on OOP. A <strong>class</strong> is a blueprint; an <strong>object</strong> is an instance created from that blueprint. Properties are <em>fields</em>; behaviors are <em>methods</em>.</p>

        <pre class="code-block"><code><span class="keyword">public class</span> <span class="function">Student</span> {

    <span class="comment">// Fields (private = only accessible inside this class)</span>
    <span class="keyword">private</span> String name;
    <span class="keyword">private</span> <span class="keyword">int</span> grade;

    <span class="comment">// Constructor — called when you use 'new Student(...)'</span>
    <span class="keyword">public</span> <span class="function">Student</span>(String name, <span class="keyword">int</span> grade) {
        <span class="keyword">this</span>.name = name;    <span class="comment">// 'this' = current object</span>
        <span class="keyword">this</span>.grade = grade;
    }

    <span class="comment">// Getters — controlled access to private fields</span>
    <span class="keyword">public</span> String <span class="function">getName</span>()  { <span class="keyword">return</span> name; }
    <span class="keyword">public int</span>    <span class="function">getGrade</span>() { <span class="keyword">return</span> grade; }

    <span class="comment">// Instance method — uses the object's own data</span>
    <span class="keyword">public</span> String <span class="function">getInfo</span>() {
        <span class="keyword">return</span> name + <span class="string">" scored "</span> + grade + <span class="string">"/100"</span>;
    }

    <span class="keyword">public static void</span> <span class="function">main</span>(String[] args) {
        <span class="comment">// Create objects with 'new'</span>
        Student s1 = <span class="keyword">new</span> <span class="function">Student</span>(<span class="string">"Alice"</span>, <span class="number">95</span>);
        Student s2 = <span class="keyword">new</span> <span class="function">Student</span>(<span class="string">"Bob"</span>, <span class="number">82</span>);

        System.out.<span class="function">println</span>(s1.<span class="function">getInfo</span>());  <span class="comment">// Alice scored 95/100</span>
        System.out.<span class="function">println</span>(s2.<span class="function">getName</span>()); <span class="comment">// Bob</span>
    }
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Create a <code>Rectangle</code> class with <code>width</code> and <code>height</code> fields, and methods <code>area()</code> and <code>perimeter()</code>.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('public class Main {\n    private String name;\n    private int grade;\n    public Main(String name, int grade) {\n        this.name = name;\n        this.grade = grade;\n    }\n    public String getInfo() {\n        return name + &quot; scored &quot; + grade;\n    }\n    public static void main(String[] args) {\n        Main s = new Main(&quot;Alice&quot;, 95);\n        System.out.println(s.getInfo());\n    }\n}', 'java', 'Classes & Objects')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

// ═══════════════════════════════════════════════════════════════════
// C++ LESSONS (IDs 301–306)
// ═══════════════════════════════════════════════════════════════════

{
    id: 301, language: 'cpp', title: 'Getting Started with C++',
    description: 'Write your first C++ program and understand #include, cout, and the main() structure.',
    difficulty: 'beginner', orderNumber: 1, createdBy: 1,
    topics: ['Hello World', '#include', 'cout', 'endl', 'main()', 'namespace'],
    content: `
        <h2>What is C++?</h2>
        <p>C++ is a powerful, high-performance language built on top of C. It's used for operating systems, game engines (Unreal Engine), embedded systems, and anything where speed is critical.</p>

        <div class="info-box">
            <div class="info-box-title">Compiled Language</div>
            <p>C++ must be <strong>compiled</strong> into machine code before running. The compiler translates your code directly into CPU instructions — making C++ programs 10-100x faster than interpreted languages like Python.</p>
        </div>

        <h2>Your First C++ Program</h2>
        <pre class="code-block"><code><span class="comment">// Include standard I/O library</span>
<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>

<span class="comment">// Use standard namespace (avoids typing std:: everywhere)</span>
<span class="keyword">using namespace</span> std;

<span class="comment">// Every C++ program starts at main()</span>
<span class="keyword">int</span> <span class="function">main</span>() {

    <span class="comment">// cout = character output stream, &lt;&lt; inserts data</span>
    cout &lt;&lt; <span class="string">"Hello, World!"</span> &lt;&lt; endl;

    <span class="comment">// Variables must be typed</span>
    string name = <span class="string">"Alice"</span>;
    <span class="keyword">int</span> age = <span class="number">20</span>;

    cout &lt;&lt; <span class="string">"Name: "</span> &lt;&lt; name &lt;&lt; <span class="string">", Age: "</span> &lt;&lt; age &lt;&lt; endl;

    <span class="keyword">return</span> <span class="number">0</span>;   <span class="comment">// 0 = program finished successfully</span>
}</code></pre>

        <h2>cout and cin</h2>
        <pre class="code-block"><code><span class="comment">// cout — output to screen (&lt;&lt; = insertion operator)</span>
cout &lt;&lt; <span class="string">"Enter your name: "</span>;

<span class="comment">// cin — read input from keyboard (&gt;&gt; = extraction operator)</span>
string name;
cin &gt;&gt; name;
cout &lt;&lt; <span class="string">"Hello, "</span> &lt;&lt; name &lt;&lt; <span class="string">"!"</span> &lt;&lt; endl;</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It in C++!</div>
            <p>Print your name, age, and favourite language using cout &lt;&lt; variables &lt;&lt; endl.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\nusing namespace std;\n\nint main() {\n    cout &lt;&lt; &quot;Hello, World!&quot; &lt;&lt; endl;\n    string name = &quot;Alice&quot;;\n    int age = 20;\n    cout &lt;&lt; &quot;Name: &quot; &lt;&lt; name &lt;&lt; endl;\n    cout &lt;&lt; &quot;Age: &quot; &lt;&lt; age &lt;&lt; endl;\n    return 0;\n}', 'cpp', 'Getting Started with C++')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 302, language: 'cpp', title: 'Variables & Data Types',
    description: 'Understand C++\'s type system — primitives, sizeof(), auto type inference, and constants.',
    difficulty: 'beginner', orderNumber: 2, createdBy: 1,
    topics: ['int', 'double', 'char', 'bool', 'string', 'sizeof', 'auto', 'const'],
    content: `
        <h2>C++ Data Types</h2>
        <p>C++ is strictly typed — every variable must have a declared type. The type determines memory usage and allowed operations.</p>

        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">#include</span> <span class="string">&lt;string&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="keyword">int</span> <span class="function">main</span>() {
    <span class="keyword">int</span>    count  = <span class="number">100</span>;       <span class="comment">// 4 bytes, -2B to +2B</span>
    <span class="keyword">long</span>   bigNum = <span class="number">9876543L</span>; <span class="comment">// 8 bytes on most systems</span>
    <span class="keyword">double</span> price  = <span class="number">9.99</span>;     <span class="comment">// 8-byte decimal (prefer over float)</span>
    <span class="keyword">float</span>  temp   = <span class="number">98.6f</span>;   <span class="comment">// 4-byte decimal (needs 'f' suffix)</span>
    <span class="keyword">char</span>   grade  = <span class="string">'A'</span>;     <span class="comment">// 1 byte, single character</span>
    <span class="keyword">bool</span>   active = <span class="keyword">true</span>;    <span class="comment">// 1 byte, true or false</span>
    string name   = <span class="string">"C++"</span>;   <span class="comment">// std::string (variable length)</span>

    <span class="comment">// sizeof() shows bytes used by a type</span>
    cout &lt;&lt; <span class="string">"int:    "</span> &lt;&lt; <span class="keyword">sizeof</span>(<span class="keyword">int</span>)    &lt;&lt; <span class="string">" bytes"</span> &lt;&lt; endl; <span class="comment">// 4</span>
    cout &lt;&lt; <span class="string">"double: "</span> &lt;&lt; <span class="keyword">sizeof</span>(<span class="keyword">double</span>) &lt;&lt; <span class="string">" bytes"</span> &lt;&lt; endl; <span class="comment">// 8</span>

    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <h2>auto and const (C++11)</h2>
        <pre class="code-block"><code><span class="comment">// auto — let the compiler deduce the type</span>
<span class="keyword">auto</span> x = <span class="number">42</span>;          <span class="comment">// int</span>
<span class="keyword">auto</span> pi = <span class="number">3.14159</span>;   <span class="comment">// double</span>
<span class="keyword">auto</span> msg = string(<span class="string">"Hello"</span>);  <span class="comment">// std::string</span>

<span class="comment">// const — variable that cannot be changed</span>
<span class="keyword">const double</span> GRAVITY = <span class="number">9.8</span>;
<span class="comment">// GRAVITY = 10.0; // ERROR: cannot assign to const</span>

<span class="comment">// constexpr — constant evaluated at compile time</span>
<span class="keyword">constexpr int</span> MAX_SIZE = <span class="number">100</span>;</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Declare each type, print their values, and use sizeof() to check their memory footprints.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\n#include &lt;string&gt;\nusing namespace std;\n\nint main() {\n    int count = 100;\n    double price = 9.99;\n    char grade = \\'A\\';\n    bool active = true;\n    string name = &quot;C++&quot;;\n    cout &lt;&lt; count &lt;&lt; &quot; &quot; &lt;&lt; price &lt;&lt; &quot; &quot; &lt;&lt; grade &lt;&lt; endl;\n    cout &lt;&lt; &quot;int size: &quot; &lt;&lt; sizeof(int) &lt;&lt; endl;\n    return 0;\n}', 'cpp', 'Variables & Data Types')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 303, language: 'cpp', title: 'Control Flow in C++',
    description: 'Direct your C++ program with if/else, switch statements, and the conditional operator.',
    difficulty: 'beginner', orderNumber: 3, createdBy: 1,
    topics: ['if/else', 'switch', 'Ternary', '&&  ||  !', 'Comparison Operators'],
    content: `
        <h2>if / else if / else</h2>
        <p>C++ control flow is nearly identical to Java. Use <code>&amp;&amp;</code> for AND, <code>||</code> for OR, <code>!</code> for NOT.</p>

        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="keyword">int</span> <span class="function">main</span>() {
    <span class="keyword">int</span> score = <span class="number">82</span>;

    <span class="keyword">if</span> (score >= <span class="number">90</span>) {
        cout &lt;&lt; <span class="string">"Grade: A"</span> &lt;&lt; endl;
    } <span class="keyword">else if</span> (score >= <span class="number">80</span>) {
        cout &lt;&lt; <span class="string">"Grade: B"</span> &lt;&lt; endl;    <span class="comment">// This runs</span>
    } <span class="keyword">else if</span> (score >= <span class="number">70</span>) {
        cout &lt;&lt; <span class="string">"Grade: C"</span> &lt;&lt; endl;
    } <span class="keyword">else</span> {
        cout &lt;&lt; <span class="string">"Grade: F"</span> &lt;&lt; endl;
    }

    <span class="comment">// Ternary: condition ? trueValue : falseValue</span>
    string result = (score >= <span class="number">70</span>) ? <span class="string">"Pass"</span> : <span class="string">"Fail"</span>;
    cout &lt;&lt; result &lt;&lt; endl;

    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <h2>switch with Fall-Through Groups</h2>
        <pre class="code-block"><code><span class="keyword">int</span> month = <span class="number">3</span>;
<span class="keyword">switch</span> (month) {
    <span class="keyword">case</span> <span class="number">12</span>: <span class="keyword">case</span> <span class="number">1</span>: <span class="keyword">case</span> <span class="number">2</span>:
        cout &lt;&lt; <span class="string">"Winter"</span> &lt;&lt; endl; <span class="keyword">break</span>;
    <span class="keyword">case</span> <span class="number">3</span>: <span class="keyword">case</span> <span class="number">4</span>: <span class="keyword">case</span> <span class="number">5</span>:
        cout &lt;&lt; <span class="string">"Spring"</span> &lt;&lt; endl; <span class="keyword">break</span>;  <span class="comment">// month=3: this runs</span>
    <span class="keyword">case</span> <span class="number">6</span>: <span class="keyword">case</span> <span class="number">7</span>: <span class="keyword">case</span> <span class="number">8</span>:
        cout &lt;&lt; <span class="string">"Summer"</span> &lt;&lt; endl; <span class="keyword">break</span>;
    <span class="keyword">default</span>:
        cout &lt;&lt; <span class="string">"Autumn"</span> &lt;&lt; endl;
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write a program using if/else that checks if a number is positive, negative, or zero.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\nusing namespace std;\n\nint main() {\n    int score = 82;\n    if (score >= 90) {\n        cout &lt;&lt; &quot;A&quot; &lt;&lt; endl;\n    } else if (score >= 80) {\n        cout &lt;&lt; &quot;B&quot; &lt;&lt; endl;\n    } else {\n        cout &lt;&lt; &quot;F&quot; &lt;&lt; endl;\n    }\n    string r = (score >= 70) ? &quot;Pass&quot; : &quot;Fail&quot;;\n    cout &lt;&lt; r &lt;&lt; endl;\n    return 0;\n}', 'cpp', 'Control Flow in C++')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 304, language: 'cpp', title: 'Loops in C++',
    description: 'Iterate with C++ loops — for, while, do-while, and the modern range-based for.',
    difficulty: 'intermediate', orderNumber: 4, createdBy: 1,
    topics: ['for loop', 'while', 'do-while', 'Range-Based for', 'break/continue'],
    content: `
        <h2>The for Loop</h2>
        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="keyword">int</span> <span class="function">main</span>() {
    <span class="comment">// Classic for loop</span>
    <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">0</span>; i &lt; <span class="number">5</span>; i++) {
        cout &lt;&lt; i &lt;&lt; <span class="string">" "</span>;    <span class="comment">// 0 1 2 3 4</span>
    }
    cout &lt;&lt; endl;

    <span class="comment">// Nested: 3x3 multiplication table</span>
    <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">1</span>; i &lt;= <span class="number">3</span>; i++) {
        <span class="keyword">for</span> (<span class="keyword">int</span> j = <span class="number">1</span>; j &lt;= <span class="number">3</span>; j++) {
            cout &lt;&lt; i * j &lt;&lt; <span class="string">"\t"</span>;
        }
        cout &lt;&lt; endl;
    }
    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <h2>while, do-while, Range-Based for</h2>
        <pre class="code-block"><code><span class="comment">// while — condition checked before each iteration</span>
<span class="keyword">int</span> count = <span class="number">0</span>;
<span class="keyword">while</span> (count &lt; <span class="number">5</span>) {
    cout &lt;&lt; count++ &lt;&lt; <span class="string">" "</span>;
}

<span class="comment">// do-while — runs at least once</span>
<span class="keyword">int</span> n = <span class="number">10</span>;
<span class="keyword">do</span> {
    cout &lt;&lt; n-- &lt;&lt; endl;
} <span class="keyword">while</span> (n &gt; <span class="number">8</span>);           <span class="comment">// Prints: 10, 9</span>

<span class="comment">// Range-based for (C++11) — iterate over arrays/vectors</span>
<span class="keyword">int</span> scores[] = {<span class="number">85</span>, <span class="number">92</span>, <span class="number">78</span>};
<span class="keyword">for</span> (<span class="keyword">int</span> s : scores) {
    cout &lt;&lt; <span class="string">"Score: "</span> &lt;&lt; s &lt;&lt; endl;
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Print even numbers from 2 to 20 with a for loop, then use a while loop to find their sum.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\nusing namespace std;\n\nint main() {\n    for (int i = 1; i &lt;= 5; i++) {\n        for (int j = 1; j &lt;= 5; j++) {\n            cout &lt;&lt; i*j &lt;&lt; &quot;\\t&quot;;\n        }\n        cout &lt;&lt; endl;\n    }\n    return 0;\n}', 'cpp', 'Loops in C++')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 305, language: 'cpp', title: 'Functions in C++',
    description: 'Define reusable functions with type declarations, overloading, and pass-by-reference.',
    difficulty: 'intermediate', orderNumber: 5, createdBy: 1,
    topics: ['Function Declaration', 'Return Types', 'Overloading', 'Pass by Value', 'Pass by Reference'],
    content: `
        <h2>Defining Functions</h2>
        <p>In C++, functions must be declared <strong>before</strong> they are called (or use a forward declaration/prototype). Every parameter and return type must be explicitly typed.</p>

        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="comment">// Return type + name + typed parameters</span>
string <span class="function">greet</span>(string name) {
    <span class="keyword">return</span> <span class="string">"Hello, "</span> + name + <span class="string">"!"</span>;
}

<span class="keyword">int</span> <span class="function">add</span>(<span class="keyword">int</span> a, <span class="keyword">int</span> b) {
    <span class="keyword">return</span> a + b;
}

<span class="comment">// void — no return value</span>
<span class="keyword">void</span> <span class="function">printSeparator</span>(<span class="keyword">int</span> n) {
    <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">0</span>; i &lt; n; i++) cout &lt;&lt; <span class="string">"-"</span>;
    cout &lt;&lt; endl;
}

<span class="keyword">int</span> <span class="function">main</span>() {
    cout &lt;&lt; <span class="function">greet</span>(<span class="string">"Alice"</span>) &lt;&lt; endl;   <span class="comment">// Hello, Alice!</span>
    cout &lt;&lt; <span class="function">add</span>(<span class="number">3</span>, <span class="number">4</span>) &lt;&lt; endl;        <span class="comment">// 7</span>
    <span class="function">printSeparator</span>(<span class="number">20</span>);
    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <h2>Pass by Reference — Modifying Originals</h2>
        <pre class="code-block"><code><span class="comment">// Pass by VALUE — function gets a copy, original unchanged</span>
<span class="keyword">void</span> <span class="function">doubleVal</span>(<span class="keyword">int</span> x)  { x *= <span class="number">2</span>; }

<span class="comment">// Pass by REFERENCE (&amp;) — function modifies the original!</span>
<span class="keyword">void</span> <span class="function">doubleRef</span>(<span class="keyword">int</span>&amp; x) { x *= <span class="number">2</span>; }

<span class="keyword">int</span> n = <span class="number">5</span>;
<span class="function">doubleVal</span>(n);  cout &lt;&lt; n &lt;&lt; endl;  <span class="comment">// 5  — unchanged</span>
<span class="function">doubleRef</span>(n);  cout &lt;&lt; n &lt;&lt; endl;  <span class="comment">// 10 — modified</span></code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Write a <code>swap(int &a, int &b)</code> function using pass-by-reference to swap two variables.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\nusing namespace std;\n\nstring greet(string name) {\n    return &quot;Hello, &quot; + name + &quot;!&quot;;\n}\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    cout &lt;&lt; greet(&quot;Alice&quot;) &lt;&lt; endl;\n    cout &lt;&lt; add(3, 4) &lt;&lt; endl;\n    return 0;\n}', 'cpp', 'Functions in C++')">&#x1F4BB; Open in Playground</button>
        </div>
    `
},

{
    id: 306, language: 'cpp', title: 'Arrays & Vectors',
    description: 'Store collections in C++ with fixed arrays and the flexible, modern std::vector.',
    difficulty: 'advanced', orderNumber: 6, createdBy: 1,
    topics: ['C-Style Arrays', 'Multidimensional Arrays', 'std::vector', 'push_back', 'Range-Based for'],
    content: `
        <h2>C-Style Arrays — Fixed Size</h2>
        <p>Arrays in C++ are fixed-size blocks of contiguous memory. Size must be known at compile time and <strong>cannot change</strong>. Access is O(1) by index.</p>

        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="keyword">int</span> <span class="function">main</span>() {
    <span class="comment">// Declare and initialize</span>
    <span class="keyword">int</span> scores[<span class="number">5</span>] = {<span class="number">85</span>, <span class="number">92</span>, <span class="number">78</span>, <span class="number">96</span>, <span class="number">88</span>};

    <span class="comment">// Access by index (0-based, no bounds checking!)</span>
    cout &lt;&lt; scores[<span class="number">0</span>] &lt;&lt; endl;    <span class="comment">// 85  (first)</span>
    cout &lt;&lt; scores[<span class="number">4</span>] &lt;&lt; endl;    <span class="comment">// 88  (last)</span>

    <span class="comment">// Compute sum with a loop</span>
    <span class="keyword">int</span> sum = <span class="number">0</span>;
    <span class="keyword">for</span> (<span class="keyword">int</span> i = <span class="number">0</span>; i &lt; <span class="number">5</span>; i++) {
        sum += scores[i];
    }
    cout &lt;&lt; <span class="string">"Average: "</span> &lt;&lt; sum / <span class="number">5.0</span> &lt;&lt; endl;   <span class="comment">// 87.8</span>

    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <h2>std::vector — Dynamic Arrays (Preferred)</h2>
        <pre class="code-block"><code><span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>
<span class="keyword">#include</span> <span class="string">&lt;vector&gt;</span>
<span class="keyword">using namespace</span> std;

<span class="keyword">int</span> <span class="function">main</span>() {
    <span class="comment">// vector&lt;type&gt; — resizable, safe array</span>
    vector&lt;<span class="keyword">int</span>&gt; nums = {<span class="number">1</span>, <span class="number">2</span>, <span class="number">3</span>, <span class="number">4</span>};

    nums.<span class="function">push_back</span>(<span class="number">5</span>);            <span class="comment">// Add to end → [1,2,3,4,5]</span>
    nums.<span class="function">pop_back</span>();              <span class="comment">// Remove from end → [1,2,3,4]</span>
    cout &lt;&lt; nums.<span class="function">size</span>() &lt;&lt; endl;  <span class="comment">// 4</span>
    cout &lt;&lt; nums.<span class="function">at</span>(<span class="number">2</span>) &lt;&lt; endl;   <span class="comment">// 3 (safe access with bounds check)</span>

    <span class="comment">// Range-based for — cleanest iteration</span>
    <span class="keyword">for</span> (<span class="keyword">const int</span>&amp; n : nums) {
        cout &lt;&lt; n &lt;&lt; <span class="string">" "</span>;          <span class="comment">// 1 2 3 4</span>
    }
    cout &lt;&lt; endl;

    <span class="comment">// 2D vector (matrix)</span>
    vector&lt;vector&lt;<span class="keyword">int</span>&gt;&gt; matrix = {{<span class="number">1</span>,<span class="number">2</span>},{<span class="number">3</span>,<span class="number">4</span>},{<span class="number">5</span>,<span class="number">6</span>}};
    cout &lt;&lt; matrix[<span class="number">1</span>][<span class="number">0</span>] &lt;&lt; endl;   <span class="comment">// 3</span>

    <span class="keyword">return</span> <span class="number">0</span>;
}</code></pre>

        <div class="try-it-section">
            <div class="try-it-title">Try It!</div>
            <p>Create a vector of 5 temperatures, then use a loop to find the maximum and minimum values.</p>
            <button class="btn btn-primary" style="margin-top:0.75rem;font-size:0.8rem;" onclick="openPlayground('#include &lt;iostream&gt;\n#include &lt;vector&gt;\nusing namespace std;\n\nint main() {\n    vector&lt;int&gt; nums = {1, 2, 3, 4, 5};\n    nums.push_back(6);\n    cout &lt;&lt; &quot;Size: &quot; &lt;&lt; nums.size() &lt;&lt; endl;\n    for (const int&amp; n : nums) {\n        cout &lt;&lt; n &lt;&lt; &quot; &quot;;\n    }\n    cout &lt;&lt; endl;\n    return 0;\n}', 'cpp', 'Arrays & Vectors')">&#x1F4BB; Open in Playground</button>
        </div>
    `
}

]; // end mockLessons

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/lessons?language=python&all=true (all=true is faculty-only for admin view)
router.get('/', (req, res) => {
    const { language, all } = req.query;
    let lessons = mockLessons;

    if (language) {
        lessons = lessons.filter(l => l.language === language.toLowerCase());
    }

    // Students only see shared lessons; faculty see all (all=true flag)
    if (all !== 'true') {
        lessons = lessons.filter(l => l.isShared !== false);
    }

    // Strip heavy HTML content for list view
    const lessonList = lessons.map(({ content, ...meta }) => meta);
    res.json({ lessons: lessonList, total: lessonList.length });
});

// GET /api/lessons/:id
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const lesson = mockLessons.find(l => l.id === id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ lesson });
});

// POST /api/lessons/generate — AI lesson generation (CMS)
router.post('/generate', requireFaculty, async (req, res) => {
    const { topic, language = 'python', difficulty = 'beginner' } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    try {
        const lesson = await openaiService.generateLesson({ topic, language, difficulty });
        return res.json({ success: true, lesson });
    } catch (err) {
        console.error('CMS lesson generation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate lesson: ' + err.message });
    }
});

// POST /api/lessons
router.post('/', requireFaculty, (req, res) => {
    const { title, description, content, difficulty, language, orderNumber, topics } = req.body;
    if (!title || !content || !language) {
        return res.status(400).json({ error: 'title, content, and language are required' });
    }
    const newLesson = {
        id: Date.now(),
        language: language || 'python',
        title,
        description: description || '',
        content,
        difficulty: difficulty || 'beginner',
        orderNumber: orderNumber || mockLessons.length + 1,
        topics: topics || [],
        isShared: false,  // Faculty-created lessons are unshared by default
        createdBy: 1
    };
    mockLessons.push(newLesson);
    res.status(201).json({ lesson: newLesson, message: 'Lesson created successfully' });
});

// PATCH /api/lessons/:id/share — toggle lesson sharing (faculty only)
router.patch('/:id/share', requireFaculty, (req, res) => {
    const id = parseInt(req.params.id);
    const idx = mockLessons.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    const { isShared } = req.body;
    mockLessons[idx].isShared = isShared === true || isShared === 'true';
    res.json({ lesson: mockLessons[idx], message: `Lesson ${mockLessons[idx].isShared ? 'shared' : 'unshared'} successfully` });
});

// PUT /api/lessons/:id
router.put('/:id', requireFaculty, (req, res) => {
    const id = parseInt(req.params.id);
    const idx = mockLessons.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    mockLessons[idx] = { ...mockLessons[idx], ...req.body, id };
    res.json({ lesson: mockLessons[idx], message: 'Lesson updated successfully' });
});

// DELETE /api/lessons/:id
router.delete('/:id', requireFaculty, (req, res) => {
    const id = parseInt(req.params.id);
    const idx = mockLessons.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    mockLessons.splice(idx, 1);
    res.json({ message: 'Lesson deleted successfully' });
});

module.exports = router;
