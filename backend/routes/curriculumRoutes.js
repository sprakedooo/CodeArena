/**
 * curriculumRoutes.js — SoloLearn-style classroom curriculum
 *
 * Structure:  Classroom → Levels (Beginner/Intermediate/Advanced)
 *                              → Units  (e.g. "Variables")
 *                                    → Topics  (content sub-sections)
 *                                    → Eval Questions (quiz at end of unit)
 *
 * Student progression:
 *   - All units locked except the first of each level
 *   - After reading all topics + passing evaluation (≥ passScore%), next unit unlocks
 *   - Levels unlock independently (faculty decides when to open a level)
 *
 * Storage: JSON files in /data/ (MySQL-free, survives restarts)
 *
 * Endpoints (all under /api/curriculum):
 *   GET  /:cid                               – full curriculum (faculty)
 *   GET  /:cid/student                       – curriculum + my progress (student)
 *
 *   POST /:cid/levels                        – create level
 *   PUT  /:cid/levels/:lid                   – rename / reorder level
 *   DELETE /:cid/levels/:lid                 – delete level
 *
 *   POST /:cid/levels/:lid/units             – create unit in level
 *   PUT  /:cid/units/:uid                    – update unit
 *   DELETE /:cid/units/:uid                  – delete unit
 *   PATCH /:cid/units/reorder                – reorder units in a level
 *
 *   POST  /:cid/units/:uid/topics            – add topic
 *   PUT   /:cid/units/:uid/topics/:tid       – update topic
 *   DELETE /:cid/units/:uid/topics/:tid      – delete topic
 *
 *   POST  /:cid/units/:uid/questions         – add eval question
 *   PUT   /:cid/units/:uid/questions/:qid    – update eval question
 *   DELETE /:cid/units/:uid/questions/:qid   – delete eval question
 *
 *   POST /:cid/units/:uid/complete-content   – student marks content read
 *   POST /:cid/units/:uid/submit-eval        – student submits evaluation
 *   GET  /:cid/my-progress                   – student: get progress for classroom
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const masteryService = require('../services/masteryService');
const dbService = require('../services/dbService');
const db = require('../config/database');

// In-memory name cache: populated when students submit evals so leaderboard has names
const userNameCache = {};

// ── Persistent JSON store ─────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, '../../data');
const CURR_FILE = path.join(DATA_DIR, 'curriculum.json');
const PROG_FILE = path.join(DATA_DIR, 'curriculum_progress.json');
const CERT_FILE = path.join(DATA_DIR, 'curriculum_certs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadFile(f, def) {
    try {
        let raw = fs.readFileSync(f, 'utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM
        return JSON.parse(raw);
    } catch { return def; }
}
function saveFile(f, data) {
    try { fs.writeFileSync(f, JSON.stringify(data, null, 2), { encoding: 'utf8', flag: 'w' }); } catch (e) { console.error('curriculum saveFile', e.message); }
}

// curriculum[cid] = { levels: [ { id, name, order, locked, units: [...] } ] }
let curriculum = loadFile(CURR_FILE, {});
// progress[`${userId}_${unitId}`] = { contentCompleted, evalPassed, evalScore, attempts, completedAt }
let progress   = loadFile(PROG_FILE, {});
// certs: array of { id, userId, classroomId, classroomName, language, levelId, levelName, score, issuedAt }
let certs      = loadFile(CERT_FILE, []);

function persistCurriculum() { saveFile(CURR_FILE, curriculum); }
function persistProgress()   { saveFile(PROG_FILE, progress);   }
function persistCerts()      { saveFile(CERT_FILE, certs);       }

// ── Default curriculum seed ───────────────────────────────────────────────────
// Auto-populates classrooms 1 (Python) and 2 (JavaScript) when they exist in
// curriculum.json but have no units yet (e.g. after a fresh demo.sql run).
function seedDefaultCurriculum() {
    const PYTHON_UNITS = [
        // ── BEGINNER ──────────────────────────────────────────────────────────
        { _level: 'Beginner', id:'u1b1', title:'Introduction to Python', order:0, passScore:70,
          topics:[
            { id:'t1b1a', title:'What is Python?', order:0, content:'<h3>What is Python?</h3>\n<p>Python is a high-level, interpreted programming language created by <strong>Guido van Rossum</strong> in 1991. It is used in web development, AI, data science, automation, and game development.</p>\n<h3>Why Python?</h3>\n<p>Python reads almost like plain English — making it one of the best first languages.</p>\n<pre data-lang="python"><code># Python — clean and simple\nprint("Hello, World!")</code></pre>' },
            { id:'t1b1b', title:'Your First Program', order:1, content:'<h3>Hello, World!</h3>\n<pre data-lang="python"><code>print("Hello, World!")</code></pre>\n<p>The <code>print()</code> function outputs text to the screen.</p>\n<h3>Comments</h3>\n<pre data-lang="python"><code># This is a comment\nprint("This runs!")  # inline comment</code></pre>' },
            { id:'t1b1c', title:'Python Syntax Basics', order:2, content:'<h3>Indentation</h3>\n<p>Python uses <strong>indentation</strong> to define code blocks — this is mandatory.</p>\n<pre data-lang="python"><code>if True:\n    print("Indented correctly")</code></pre>\n<h3>Case Sensitivity</h3>\n<pre data-lang="python"><code>name = "Alice"\nName = "Bob"\nprint(name)  # Alice\nprint(Name)  # Bob</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1b1a', question:'Which function displays output in Python?', questionType:'multiple_choice', options:['print()','output()','display()','echo()'], correctAnswer:'print()', order:0 },
            { id:'eq1b1b', question:'What symbol writes a comment in Python?', questionType:'multiple_choice', options:['#','//','/*','--'], correctAnswer:'#', order:1 },
            { id:'eq1b1c', question:'Python was created by ___.', questionType:'fill_blank', options:[], correctAnswer:'Guido van Rossum', order:2 },
            { id:'eq1b1d', question:'What does `print(2 + 3)` output?', questionType:'multiple_choice', options:['5','2 + 3','23','Error'], correctAnswer:'5', order:3 }
          ]
        },
        { _level: 'Beginner', id:'u1b2', title:'Variables & Data Types', order:1, passScore:70,
          topics:[
            { id:'t1b2a', title:'Variables', order:0, content:'<h3>What is a Variable?</h3>\n<p>A variable is a named container that stores a value.</p>\n<pre data-lang="python"><code>name = "Alice"      # string\nage  = 20           # integer\nheight = 5.6        # float\nis_student = True   # boolean</code></pre>\n<h3>Naming Rules</h3>\n<ul><li>Start with a letter or underscore</li><li>No reserved keywords</li><li>Case-sensitive</li></ul>' },
            { id:'t1b2b', title:'Data Types', order:1, content:'<h3>Core Data Types</h3>\n<ul>\n  <li><strong>int</strong> — whole numbers: <code>5</code>, <code>-3</code></li>\n  <li><strong>float</strong> — decimals: <code>3.14</code></li>\n  <li><strong>str</strong> — text: <code>"hello"</code></li>\n  <li><strong>bool</strong> — <code>True</code> or <code>False</code></li>\n</ul>\n<pre data-lang="python"><code>print(type(42))     # &lt;class \'int\'&gt;\nprint(type(3.14))   # &lt;class \'float\'&gt;\nprint(type("hi"))   # &lt;class \'str\'&gt;</code></pre>' },
            { id:'t1b2c', title:'Type Conversion', order:2, content:'<h3>Converting Types</h3>\n<pre data-lang="python"><code>x = "42"\ny = int(x)     # → 42\nz = float(x)   # → 42.0\nw = str(100)   # → "100"\n\nprint(y + 8)       # 50\nprint(w + " pts")  # "100 pts"</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1b2a', question:'Which type stores 3.14?', questionType:'multiple_choice', options:['float','int','str','bool'], correctAnswer:'float', order:0 },
            { id:'eq1b2b', question:'What does `type(True)` return?', questionType:'multiple_choice', options:["<class 'bool'>","<class 'int'>","<class 'str'>","<class 'true'>"], correctAnswer:"<class 'bool'>", order:1 },
            { id:'eq1b2c', question:'What will `int("7") + 3` evaluate to?', questionType:'multiple_choice', options:['10','73','Error','"73"'], correctAnswer:'10', order:2 },
            { id:'eq1b2d', question:'What function converts a value to a string?', questionType:'fill_blank', options:[], correctAnswer:'str()', order:3 }
          ]
        },
        { _level: 'Beginner', id:'u1b3', title:'Operators', order:2, passScore:70,
          topics:[
            { id:'t1b3a', title:'Arithmetic Operators', order:0, content:'<h3>Arithmetic Operators</h3>\n<pre data-lang="python"><code>a = 10; b = 3\nprint(a + b)   # 13\nprint(a - b)   # 7\nprint(a * b)   # 30\nprint(a / b)   # 3.333\nprint(a // b)  # 3  floor division\nprint(a % b)   # 1  remainder\nprint(a ** b)  # 1000 exponent</code></pre>' },
            { id:'t1b3b', title:'Comparison & Logical', order:1, content:'<h3>Comparison Operators</h3>\n<pre data-lang="python"><code>x = 10; y = 5\nprint(x == y)  # False\nprint(x != y)  # True\nprint(x > y)   # True\nprint(x >= 10) # True</code></pre>\n<h3>Logical Operators</h3>\n<pre data-lang="python"><code>print(True and False)  # False\nprint(True or False)   # True\nprint(not True)        # False</code></pre>' },
            { id:'t1b3c', title:'Assignment Operators', order:2, content:'<h3>Shorthand Assignment</h3>\n<pre data-lang="python"><code>score = 100\nscore += 10   # 110\nscore -= 5    # 105\nscore *= 2    # 210\nscore //= 3   # 70\nprint(score)</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1b3a', question:'What does `10 % 3` evaluate to?', questionType:'multiple_choice', options:['1','3','0','3.33'], correctAnswer:'1', order:0 },
            { id:'eq1b3b', question:'What is `2 ** 4`?', questionType:'multiple_choice', options:['16','8','6','24'], correctAnswer:'16', order:1 },
            { id:'eq1b3c', question:'What does `x += 5` mean?', questionType:'multiple_choice', options:['x = x + 5','x = 5','x = x - 5','x = 5 + 5'], correctAnswer:'x = x + 5', order:2 },
            { id:'eq1b3d', question:'Which operator checks equality?', questionType:'multiple_choice', options:['==','=','!=','>='], correctAnswer:'==', order:3 }
          ]
        },
        { _level: 'Beginner', id:'u1b4', title:'Control Flow', order:3, passScore:70,
          topics:[
            { id:'t1b4a', title:'if / else', order:0, content:'<h3>Making Decisions</h3>\n<pre data-lang="python"><code>score = 65\n\nif score >= 70:\n    print("You passed!")\nelse:\n    print("Keep practicing.")</code></pre>' },
            { id:'t1b4b', title:'elif — Multiple Conditions', order:1, content:'<h3>elif</h3>\n<pre data-lang="python"><code>grade = 85\n\nif grade >= 90:\n    print("A — Excellent!")\nelif grade >= 80:\n    print("B — Great job!")\nelif grade >= 70:\n    print("C — Good work.")\nelse:\n    print("Needs improvement.")</code></pre>' },
            { id:'t1b4c', title:'Ternary Expression', order:2, content:'<h3>One-Line if</h3>\n<pre data-lang="python"><code>result = "Pass" if score >= 70 else "Fail"\nprint(result)</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1b4a', question:'What keyword checks a secondary condition after `if`?', questionType:'multiple_choice', options:['elif','elseif','else if','ifelse'], correctAnswer:'elif', order:0 },
            { id:'eq1b4b', question:'What will `x = 10; print("big") if x > 5 else print("small")` output?', questionType:'multiple_choice', options:['big','small','Error','Nothing'], correctAnswer:'big', order:1 },
            { id:'eq1b4c', question:'In Python, indentation inside an if block is ___.', questionType:'fill_blank', options:[], correctAnswer:'mandatory', order:2 }
          ]
        },
        { _level: 'Beginner', id:'u1b5', title:'Loops', order:4, passScore:70,
          topics:[
            { id:'t1b5a', title:'while Loop', order:0, content:'<h3>while Loop</h3>\n<pre data-lang="python"><code>count = 1\nwhile count <= 5:\n    print(count)\n    count += 1\n# Prints 1 2 3 4 5</code></pre>\n<h3>break and continue</h3>\n<pre data-lang="python"><code>i = 0\nwhile True:\n    i += 1\n    if i == 3: continue\n    if i > 5:  break\n    print(i)  # 1 2 4 5</code></pre>' },
            { id:'t1b5b', title:'for Loop & range()', order:1, content:'<h3>for Loop</h3>\n<pre data-lang="python"><code>for i in range(5):\n    print(i)  # 0 1 2 3 4\n\nfruits = ["apple","banana","cherry"]\nfor fruit in fruits:\n    print(fruit)</code></pre>\n<h3>range() Variants</h3>\n<pre data-lang="python"><code>range(5)         # 0-4\nrange(1, 6)      # 1-5\nrange(0, 10, 2)  # 0 2 4 6 8</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1b5a', question:'How many times does `for i in range(3)` loop?', questionType:'multiple_choice', options:['3','2','4','1'], correctAnswer:'3', order:0 },
            { id:'eq1b5b', question:'What keyword immediately exits a loop?', questionType:'multiple_choice', options:['break','exit','stop','end'], correctAnswer:'break', order:1 },
            { id:'eq1b5c', question:'What does `range(2, 8, 2)` produce?', questionType:'multiple_choice', options:['2, 4, 6','2, 4, 6, 8','0, 2, 4, 6','2, 3, 4, 5, 6, 7'], correctAnswer:'2, 4, 6', order:2 },
            { id:'eq1b5d', question:'Which keyword skips the current iteration?', questionType:'multiple_choice', options:['continue','skip','pass','next'], correctAnswer:'continue', order:3 }
          ]
        },
        // ── INTERMEDIATE ──────────────────────────────────────────────────────
        { _level: 'Intermediate', id:'u1i1', title:'Functions', order:0, passScore:70,
          topics:[
            { id:'t1i1a', title:'Defining Functions', order:0, content:'<h3>Functions</h3>\n<pre data-lang="python"><code>def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Alice")  # Hello, Alice!</code></pre>' },
            { id:'t1i1b', title:'Return Values & Defaults', order:1, content:'<h3>Return</h3>\n<pre data-lang="python"><code>def add(a, b):\n    return a + b\n\nprint(add(5, 3))  # 8</code></pre>\n<h3>Default Parameters</h3>\n<pre data-lang="python"><code>def power(base, exponent=2):\n    return base ** exponent\n\nprint(power(3))    # 9\nprint(power(3, 3)) # 27</code></pre>' },
            { id:'t1i1c', title:'Scope', order:2, content:'<h3>Local vs Global</h3>\n<pre data-lang="python"><code>counter = 0\n\ndef increment():\n    global counter\n    counter += 1\n\nincrement()\nincrement()\nprint(counter)  # 2</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1i1a', question:'What keyword defines a function?', questionType:'multiple_choice', options:['def','func','function','define'], correctAnswer:'def', order:0 },
            { id:'eq1i1b', question:'What does `double(6)` return if `def double(x): return x * 2`?', questionType:'multiple_choice', options:['12','6','2','None'], correctAnswer:'12', order:1 },
            { id:'eq1i1c', question:'A variable created inside a function is called ___.', questionType:'fill_blank', options:[], correctAnswer:'local', order:2 },
            { id:'eq1i1d', question:'What keyword sends a value back from a function?', questionType:'multiple_choice', options:['return','send','output','give'], correctAnswer:'return', order:3 }
          ]
        },
        { _level: 'Intermediate', id:'u1i2', title:'Lists & Tuples', order:1, passScore:70,
          topics:[
            { id:'t1i2a', title:'Lists', order:0, content:'<h3>Lists</h3>\n<pre data-lang="python"><code>fruits = ["apple","banana","cherry"]\nprint(fruits[0])    # apple\nprint(fruits[-1])   # cherry\n\nfruits.append("mango")\nfruits.remove("banana")\nprint(len(fruits))</code></pre>' },
            { id:'t1i2b', title:'Tuples', order:1, content:'<h3>Tuples — Immutable</h3>\n<pre data-lang="python"><code>point = (3, 7)\nprint(point[0])  # 3\n# point[0] = 10  # TypeError!\n\nx, y = (10, 20)  # unpacking\nprint(x, y)</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1i2a', question:'Which method adds to the end of a list?', questionType:'multiple_choice', options:['append()','add()','push()','insert()'], correctAnswer:'append()', order:0 },
            { id:'eq1i2b', question:'What index is the first element?', questionType:'multiple_choice', options:['0','1','-1','None'], correctAnswer:'0', order:1 },
            { id:'eq1i2c', question:'What makes a tuple different from a list?', questionType:'multiple_choice', options:['Tuples are immutable','Tuples use square brackets','Tuples hold only numbers','Tuples are sorted'], correctAnswer:'Tuples are immutable', order:2 }
          ]
        },
        { _level: 'Intermediate', id:'u1i3', title:'Dictionaries & Sets', order:2, passScore:70,
          topics:[
            { id:'t1i3a', title:'Dictionaries', order:0, content:'<h3>Key-Value Pairs</h3>\n<pre data-lang="python"><code>student = {"name":"Alice","age":20,"grade":"A"}\n\nprint(student["name"])     # Alice\nstudent["score"] = 95      # add\ndel student["age"]         # remove\n\nfor k, v in student.items():\n    print(f"{k}: {v}")</code></pre>' },
            { id:'t1i3b', title:'Sets', order:1, content:'<h3>Sets — Unique Values</h3>\n<pre data-lang="python"><code>colors = {"red","green","blue","red"}\nprint(colors)  # no duplicate!\n\na = {1,2,3,4}; b = {3,4,5,6}\nprint(a | b)  # Union\nprint(a & b)  # Intersection {3,4}\nprint(a - b)  # Difference  {1,2}</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1i3a', question:'How do you access key "name" in dict `d`?', questionType:'multiple_choice', options:['d["name"]','d.name','d("name")','d->name'], correctAnswer:'d["name"]', order:0 },
            { id:'eq1i3b', question:'What does a set guarantee?', questionType:'multiple_choice', options:['All elements are unique','Elements are sorted','Elements are immutable','Elements are ordered'], correctAnswer:'All elements are unique', order:1 },
            { id:'eq1i3c', question:'Which method returns all key-value pairs as tuples?', questionType:'multiple_choice', options:['items()','pairs()','tuples()','entries()'], correctAnswer:'items()', order:2 }
          ]
        },
        { _level: 'Intermediate', id:'u1i4', title:'String Methods', order:3, passScore:70,
          topics:[
            { id:'t1i4a', title:'Common String Methods', order:0, content:'<h3>String Methods</h3>\n<pre data-lang="python"><code>text = "  Hello, Python!  "\nprint(text.strip())          # remove spaces\nprint(text.lower())          # lowercase\nprint(text.upper())          # UPPERCASE\nprint(text.replace("Python","World"))\nwords = "the quick fox".split()\nprint("-".join(words))       # the-quick-fox</code></pre>' },
            { id:'t1i4b', title:'f-strings & Slicing', order:1, content:'<h3>f-strings</h3>\n<pre data-lang="python"><code>name  = "Alice"\nscore = 95.5\nprint(f"Hello, {name}!")\nprint(f"Score: {score:.1f}%")</code></pre>\n<h3>Slicing</h3>\n<pre data-lang="python"><code>text = "Hello, World!"\nprint(text[0:5])    # Hello\nprint(text[::-1])   # reversed</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1i4a', question:'What does `"hello".upper()` return?', questionType:'multiple_choice', options:['HELLO','Hello','hello','hELLO'], correctAnswer:'HELLO', order:0 },
            { id:'eq1i4b', question:'Which f-string embeds variable `x = 5` correctly?', questionType:'multiple_choice', options:['f"Value: {x}"','"Value: {x}"','f"Value: x"','"Value: " + {x}'], correctAnswer:'f"Value: {x}"', order:1 },
            { id:'eq1i4c', question:'What does `text[::-1]` do?', questionType:'multiple_choice', options:['Reverses the string','Returns last char','Sorts the string','Removes spaces'], correctAnswer:'Reverses the string', order:2 }
          ]
        },
        { _level: 'Intermediate', id:'u1i5', title:'File Handling', order:4, passScore:70,
          topics:[
            { id:'t1i5a', title:'Reading & Writing Files', order:0, content:'<h3>File I/O</h3>\n<pre data-lang="python"><code># Read\nwith open("data.txt", "r") as f:\n    print(f.read())\n\n# Write\nwith open("out.txt", "w") as f:\n    f.write("Hello!\\n")\n\n# Append\nwith open("out.txt", "a") as f:\n    f.write("More content\\n")</code></pre>\n<p>💡 Always use <code>with</code> — it auto-closes the file.</p>' }
          ],
          evalQuestions:[
            { id:'eq1i5a', question:'Which mode appends without overwriting?', questionType:'multiple_choice', options:['a','w','r','rw'], correctAnswer:'a', order:0 },
            { id:'eq1i5b', question:'What is the advantage of `with open(...) as f`?', questionType:'multiple_choice', options:['Auto-closes the file','Reads faster','Write-only','Creates backup'], correctAnswer:'Auto-closes the file', order:1 },
            { id:'eq1i5c', question:'Which mode overwrites a file completely?', questionType:'fill_blank', options:[], correctAnswer:'w', order:2 }
          ]
        },
        // ── ADVANCED ──────────────────────────────────────────────────────────
        { _level: 'Advanced', id:'u1a1', title:'Object-Oriented Programming', order:0, passScore:70,
          topics:[
            { id:'t1a1a', title:'Classes & Objects', order:0, content:'<h3>Classes</h3>\n<pre data-lang="python"><code>class Dog:\n    def __init__(self, name, age):\n        self.name = name\n        self.age  = age\n    def bark(self):\n        return f"{self.name}: Woof!"\n\ndog = Dog("Rex", 3)\nprint(dog.bark())   # Rex: Woof!</code></pre>' },
            { id:'t1a1b', title:'Inheritance', order:1, content:'<h3>Inheritance</h3>\n<pre data-lang="python"><code>class Animal:\n    def __init__(self, name):\n        self.name = name\n    def speak(self): return "..."\n\nclass Cat(Animal):\n    def speak(self):\n        return f"{self.name}: Meow!"\n\nprint(Cat("Whiskers").speak())</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1a1a', question:'What special method initializes a new object?', questionType:'multiple_choice', options:['__init__','__new__','__create__','__start__'], correctAnswer:'__init__', order:0 },
            { id:'eq1a1b', question:'In `class Cat(Animal):`, what is Animal?', questionType:'multiple_choice', options:['The parent class','The child class','An instance','A method'], correctAnswer:'The parent class', order:1 },
            { id:'eq1a1c', question:'What does `self` refer to in a method?', questionType:'multiple_choice', options:['The current instance','The class','The parent','A global'], correctAnswer:'The current instance', order:2 }
          ]
        },
        { _level: 'Advanced', id:'u1a2', title:'Error Handling', order:1, passScore:70,
          topics:[
            { id:'t1a2a', title:'try / except / finally', order:0, content:'<h3>Error Handling</h3>\n<pre data-lang="python"><code>try:\n    n = int(input("Enter number: "))\n    print(10 / n)\nexcept ValueError:\n    print("Not a number!")\nexcept ZeroDivisionError:\n    print("Cannot divide by zero!")\nfinally:\n    print("Always runs.")</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1a2a', question:'Which block always executes?', questionType:'multiple_choice', options:['finally','else','except','always'], correctAnswer:'finally', order:0 },
            { id:'eq1a2b', question:'What exception is raised on division by zero?', questionType:'multiple_choice', options:['ZeroDivisionError','MathError','DivisionError','ValueError'], correctAnswer:'ZeroDivisionError', order:1 },
            { id:'eq1a2c', question:'What keyword deliberately triggers an exception?', questionType:'fill_blank', options:[], correctAnswer:'raise', order:2 }
          ]
        },
        { _level: 'Advanced', id:'u1a3', title:'List Comprehensions & Lambda', order:2, passScore:70,
          topics:[
            { id:'t1a3a', title:'Comprehensions', order:0, content:'<h3>List Comprehensions</h3>\n<pre data-lang="python"><code>squares = [x**2 for x in range(1,6)]\nprint(squares)  # [1,4,9,16,25]\n\nevens = [x for x in range(10) if x % 2 == 0]\nprint(evens)    # [0,2,4,6,8]</code></pre>' },
            { id:'t1a3b', title:'Lambda & map/filter', order:1, content:'<h3>Lambda</h3>\n<pre data-lang="python"><code>double = lambda x: x * 2\nprint(double(5))  # 10\n\nnums = [1,2,3,4,5,6]\ndoubled = list(map(lambda x: x*2, nums))\nevens   = list(filter(lambda x: x%2==0, nums))\nprint(doubled)  # [2,4,6,8,10,12]\nprint(evens)    # [2,4,6]</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq1a3a', question:'What does `[x**2 for x in range(4)]` produce?', questionType:'multiple_choice', options:['[0,1,4,9]','[1,4,9,16]','[0,1,2,3]','[4,9,16,25]'], correctAnswer:'[0,1,4,9]', order:0 },
            { id:'eq1a3b', question:'What does `lambda x: x * 3` do?', questionType:'multiple_choice', options:['Creates an anonymous function that triples x','Multiplies lambda by 3','Defines a named function','Assigns x = 3'], correctAnswer:'Creates an anonymous function that triples x', order:1 },
            { id:'eq1a3c', question:'Which built-in applies a function to every element?', questionType:'multiple_choice', options:['map()','apply()','each()','transform()'], correctAnswer:'map()', order:2 }
          ]
        }
    ];

    const JS_UNITS = [
        // ── BEGINNER ──────────────────────────────────────────────────────────
        { _level:'Beginner', id:'u2b1', title:'Introduction to JavaScript', order:0, passScore:70,
          topics:[
            { id:'t2b1a', title:'What is JavaScript?', order:0, content:'<h3>What is JavaScript?</h3>\n<p>JavaScript (JS) is the language of the web. It runs in every browser and makes pages <strong>interactive</strong>. With Node.js it also runs on servers.</p>\n<pre data-lang="javascript"><code>console.log("Hello, World!");\nconsole.log(2 + 3);  // 5</code></pre>' },
            { id:'t2b1b', title:'Variables — let, const, var', order:1, content:'<h3>Declaring Variables</h3>\n<pre data-lang="javascript"><code>let   name  = "Alice";  // reassignable\nconst PI    = 3.14;     // constant\nvar   age   = 20;       // old-style, avoid\n\nlet score = 85;\nscore = 90;  // OK\n// PI = 4;  // TypeError!</code></pre>\n<p>💡 Use <strong>const</strong> by default, <strong>let</strong> when you need to change the value.</p>' },
            { id:'t2b1c', title:'Data Types', order:2, content:'<h3>JS Data Types</h3>\n<pre data-lang="javascript"><code>let num     = 42;        // Number\nlet price   = 9.99;      // Number\nlet name    = "Alice";   // String\nlet isReady = true;      // Boolean\nlet empty   = null;      // Null\nlet undef;               // Undefined\n\nconsole.log(typeof num);   // "number"\nconsole.log(typeof name);  // "string"</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2b1a', question:'Which function logs output to the console?', questionType:'multiple_choice', options:['console.log()','print()','alert()','output()'], correctAnswer:'console.log()', order:0 },
            { id:'eq2b1b', question:'Which keyword declares a constant (cannot be reassigned)?', questionType:'multiple_choice', options:['const','let','var','fixed'], correctAnswer:'const', order:1 },
            { id:'eq2b1c', question:'What does `typeof "hello"` return?', questionType:'multiple_choice', options:['"string"','"text"','"str"','String'], correctAnswer:'"string"', order:2 },
            { id:'eq2b1d', question:'What does `"5" + 3` evaluate to?', questionType:'multiple_choice', options:['"53"','8','53','Error'], correctAnswer:'"53"', order:3 }
          ]
        },
        { _level:'Beginner', id:'u2b2', title:'Operators & Expressions', order:1, passScore:70,
          topics:[
            { id:'t2b2a', title:'Arithmetic & Assignment', order:0, content:'<h3>Arithmetic</h3>\n<pre data-lang="javascript"><code>let a = 10, b = 3;\nconsole.log(a + b);   // 13\nconsole.log(a % b);   // 1\nconsole.log(a ** b);  // 1000\n\nlet x = 10;\nx += 5;  // 15\nx++;     // 16</code></pre>' },
            { id:'t2b2b', title:'Comparison & Logical', order:1, content:'<h3>Comparison</h3>\n<pre data-lang="javascript"><code>console.log(5 == "5");   // true  (loose)\nconsole.log(5 === "5");  // false (strict)\nconsole.log(5 !== 3);    // true</code></pre>\n<p>💡 Always use <code>===</code> in JS.</p>\n<h3>Logical</h3>\n<pre data-lang="javascript"><code>console.log(true && false); // false\nconsole.log(true || false); // true\nconsole.log(!true);         // false</code></pre>' },
            { id:'t2b2c', title:'Template Literals', order:2, content:'<h3>Template Literals</h3>\n<pre data-lang="javascript"><code>const name  = "Alice";\nconst score = 95;\nconsole.log(`Hello, ${name}!`);\nconsole.log(`Score: ${score}%`);\nconsole.log(`2 + 2 = ${2 + 2}`);</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2b2a', question:'What does `10 % 3` evaluate to?', questionType:'multiple_choice', options:['1','3','0','3.33'], correctAnswer:'1', order:0 },
            { id:'eq2b2b', question:'Which operator checks both value AND type?', questionType:'multiple_choice', options:['===','==','=','!=='], correctAnswer:'===', order:1 },
            { id:'eq2b2c', question:'What syntax embeds expressions in template literals?', questionType:'multiple_choice', options:['${}','{}','#{}','()'], correctAnswer:'${}', order:2 },
            { id:'eq2b2d', question:'`x++` is shorthand for ___.', questionType:'fill_blank', options:[], correctAnswer:'x = x + 1', order:3 }
          ]
        },
        { _level:'Beginner', id:'u2b3', title:'Control Flow', order:2, passScore:70,
          topics:[
            { id:'t2b3a', title:'if / else / switch', order:0, content:'<h3>if / else if / else</h3>\n<pre data-lang="javascript"><code>const grade = 85;\nif (grade >= 90)      { console.log("A"); }\nelse if (grade >= 80) { console.log("B"); }\nelse                  { console.log("C"); }</code></pre>\n<h3>switch</h3>\n<pre data-lang="javascript"><code>switch (day) {\n    case "Monday": console.log("Start!"); break;\n    case "Friday": console.log("TGIF!"); break;\n    default:       console.log("Midweek");\n}</code></pre>' },
            { id:'t2b3b', title:'Loops', order:1, content:'<h3>for Loop</h3>\n<pre data-lang="javascript"><code>for (let i = 0; i < 5; i++) {\n    console.log(i);\n}\n\nconst fruits = ["apple","banana","cherry"];\nfor (const fruit of fruits) {\n    console.log(fruit);\n}</code></pre>\n<h3>while Loop</h3>\n<pre data-lang="javascript"><code>let n = 1;\nwhile (n <= 5) {\n    console.log(n);\n    n++;\n}</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2b3a', question:'What prevents fall-through in a switch statement?', questionType:'multiple_choice', options:['break','stop','exit','end'], correctAnswer:'break', order:0 },
            { id:'eq2b3b', question:'Which loop iterates over array items using `of`?', questionType:'multiple_choice', options:['for...of','for...in','foreach','while'], correctAnswer:'for...of', order:1 },
            { id:'eq2b3c', question:'In `for (let i = 0; i < 3; i++)`, how many iterations?', questionType:'multiple_choice', options:['3','2','4','0'], correctAnswer:'3', order:2 }
          ]
        },
        { _level:'Beginner', id:'u2b4', title:'Functions', order:3, passScore:70,
          topics:[
            { id:'t2b4a', title:'Declaration & Expression', order:0, content:'<h3>Function Declaration</h3>\n<pre data-lang="javascript"><code>function greet(name) {\n    return `Hello, ${name}!`;\n}\nconsole.log(greet("Alice"));</code></pre>\n<h3>Default Parameters</h3>\n<pre data-lang="javascript"><code>function power(base, exp = 2) {\n    return base ** exp;\n}\nconsole.log(power(3));    // 9\nconsole.log(power(3,3));  // 27</code></pre>' },
            { id:'t2b4b', title:'Arrow Functions', order:1, content:'<h3>Arrow Syntax</h3>\n<pre data-lang="javascript"><code>const double = x => x * 2;\nconsole.log(double(5));  // 10\n\nconst add = (a, b) => a + b;\nconsole.log(add(3, 5));  // 8\n\n// With array methods:\nconst nums = [1,2,3,4,5];\nconst squared = nums.map(n => n ** 2);\nconsole.log(squared); // [1,4,9,16,25]</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2b4a', question:'Which is a valid arrow function?', questionType:'multiple_choice', options:['const f = x => x * 2','arrow f(x) { return x * 2 }','f = function => x * 2','def f(x): return x * 2'], correctAnswer:'const f = x => x * 2', order:0 },
            { id:'eq2b4b', question:'What does `const add = (a,b) => a+b; add(4,6)` return?', questionType:'multiple_choice', options:['10','46','"46"','undefined'], correctAnswer:'10', order:1 },
            { id:'eq2b4c', question:'What keyword returns a value from a function?', questionType:'fill_blank', options:[], correctAnswer:'return', order:2 }
          ]
        },
        // ── INTERMEDIATE ──────────────────────────────────────────────────────
        { _level:'Intermediate', id:'u2i1', title:'Arrays', order:0, passScore:70,
          topics:[
            { id:'t2i1a', title:'Array Methods', order:0, content:'<h3>map / filter / reduce</h3>\n<pre data-lang="javascript"><code>const nums = [1,2,3,4,5];\n\nconst doubled = nums.map(n => n * 2);\nconsole.log(doubled);   // [2,4,6,8,10]\n\nconst evens = nums.filter(n => n % 2 === 0);\nconsole.log(evens);     // [2,4]\n\nconst sum = nums.reduce((acc, n) => acc + n, 0);\nconsole.log(sum);       // 15</code></pre>' },
            { id:'t2i1b', title:'Spread & Destructuring', order:1, content:'<h3>Destructuring</h3>\n<pre data-lang="javascript"><code>const [first, second, ...rest] = [10,20,30,40];\nconsole.log(first);  // 10\nconsole.log(rest);   // [30,40]</code></pre>\n<h3>Spread</h3>\n<pre data-lang="javascript"><code>const a = [1,2,3], b = [4,5,6];\nconst combined = [...a, ...b];\nconsole.log(combined); // [1,2,3,4,5,6]</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2i1a', question:'Which method transforms each element into a new array?', questionType:'multiple_choice', options:['map()','filter()','reduce()','forEach()'], correctAnswer:'map()', order:0 },
            { id:'eq2i1b', question:'What does `[1,2,3].filter(n => n > 1)` return?', questionType:'multiple_choice', options:['[2,3]','[1]','[1,2]','[3]'], correctAnswer:'[2,3]', order:1 },
            { id:'eq2i1c', question:'What does `[...a, ...b]` do?', questionType:'multiple_choice', options:['Merges two arrays','Multiplies arrays','Compares arrays','Empties arrays'], correctAnswer:'Merges two arrays', order:2 }
          ]
        },
        { _level:'Intermediate', id:'u2i2', title:'Objects', order:1, passScore:70,
          topics:[
            { id:'t2i2a', title:'Object Literals', order:0, content:'<h3>Objects</h3>\n<pre data-lang="javascript"><code>const student = {\n    name: "Alice", age: 20,\n    greet() { return `Hi, I\'m ${this.name}`; }\n};\nconsole.log(student.name);    // Alice\nconsole.log(student.greet()); // Hi, I\'m Alice\nstudent.score = 95;  // add property</code></pre>' },
            { id:'t2i2b', title:'Destructuring & Spread', order:1, content:'<h3>Object Destructuring</h3>\n<pre data-lang="javascript"><code>const { name, age } = student;\nconsole.log(name);  // Alice\n\n// Rename\nconst { name: fullName } = student;</code></pre>\n<h3>Spread</h3>\n<pre data-lang="javascript"><code>const base = { theme:"dark", lang:"en" };\nconst user = { ...base, name:"Alice" };\nconsole.log(user);</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2i2a', question:'What does `this` refer to inside an object method?', questionType:'multiple_choice', options:['The object itself','window/global','undefined','The function'], correctAnswer:'The object itself', order:0 },
            { id:'eq2i2b', question:'What does `const { name } = person` do?', questionType:'multiple_choice', options:['Extracts the name property','Creates new object','Copies all properties','Deletes name'], correctAnswer:'Extracts the name property', order:1 },
            { id:'eq2i2c', question:'How do you add property `score = 100` to object `obj`?', questionType:'fill_blank', options:[], correctAnswer:'obj.score = 100', order:2 }
          ]
        },
        { _level:'Intermediate', id:'u2i3', title:'DOM Manipulation', order:2, passScore:70,
          topics:[
            { id:'t2i3a', title:'Selecting & Modifying Elements', order:0, content:'<h3>Selecting Elements</h3>\n<pre data-lang="javascript"><code>const title = document.getElementById("main-title");\nconst btn   = document.querySelector(".submit-btn");\nconst items = document.querySelectorAll("li");\n\ntitle.textContent = "New Title";\ntitle.style.color = "red";\nbtn.classList.add("active");</code></pre>' },
            { id:'t2i3b', title:'Event Listeners', order:1, content:'<h3>Events</h3>\n<pre data-lang="javascript"><code>const btn = document.querySelector("#myBtn");\n\nbtn.addEventListener("click", () => {\n    btn.textContent = "Clicked!";\n    btn.style.background = "green";\n});\n\ndocument.addEventListener("keydown", (e) => {\n    console.log("Key:", e.key);\n});</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2i3a', question:'Which method selects the first element matching a CSS selector?', questionType:'multiple_choice', options:['querySelector()','getElementById()','querySelectorAll()','getElement()'], correctAnswer:'querySelector()', order:0 },
            { id:'eq2i3b', question:'Which method attaches an event handler?', questionType:'multiple_choice', options:['addEventListener()','onEvent()','attachEvent()','bindEvent()'], correctAnswer:'addEventListener()', order:1 },
            { id:'eq2i3c', question:'What property sets visible text without parsing HTML?', questionType:'multiple_choice', options:['textContent','innerHTML','value','innerText'], correctAnswer:'textContent', order:2 }
          ]
        },
        { _level:'Intermediate', id:'u2i4', title:'Async JavaScript', order:3, passScore:70,
          topics:[
            { id:'t2i4a', title:'Promises', order:0, content:'<h3>Promises</h3>\n<pre data-lang="javascript"><code>const p = new Promise((resolve, reject) => {\n    setTimeout(() => resolve("Done!"), 1000);\n});\n\np.then(data  => console.log(data))\n .catch(err  => console.error(err))\n .finally(() => console.log("Always"));</code></pre>' },
            { id:'t2i4b', title:'async / await & Fetch', order:1, content:'<h3>async / await</h3>\n<pre data-lang="javascript"><code>async function fetchUser(id) {\n    try {\n        const res  = await fetch(`/api/users/${id}`);\n        const data = await res.json();\n        console.log(data.name);\n    } catch (err) {\n        console.error("Failed:", err);\n    }\n}\nfetchUser(1);</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2i4a', question:'Which keyword pauses until a Promise resolves?', questionType:'multiple_choice', options:['await','async','then','wait'], correctAnswer:'await', order:0 },
            { id:'eq2i4b', question:'What does `.catch()` handle?', questionType:'multiple_choice', options:['Rejection/errors','Resolve','Always runs','Cancels request'], correctAnswer:'Rejection/errors', order:1 },
            { id:'eq2i4c', question:'A function using `await` must be declared with ___.', questionType:'fill_blank', options:[], correctAnswer:'async', order:2 }
          ]
        },
        // ── ADVANCED ──────────────────────────────────────────────────────────
        { _level:'Advanced', id:'u2a1', title:'ES6+ Classes & Modules', order:0, passScore:70,
          topics:[
            { id:'t2a1a', title:'Classes & Inheritance', order:0, content:'<h3>Classes</h3>\n<pre data-lang="javascript"><code>class Animal {\n    constructor(name) { this.name = name; }\n    speak() { return `${this.name} makes a sound.`; }\n}\n\nclass Dog extends Animal {\n    speak() { return `${this.name} barks.`; }\n}\n\nconst d = new Dog("Rex");\nconsole.log(d.speak());           // Rex barks.\nconsole.log(d instanceof Animal); // true</code></pre>' },
            { id:'t2a1b', title:'Modules (import / export)', order:1, content:'<h3>ES6 Modules</h3>\n<pre data-lang="javascript"><code>// math.js\nexport function add(a,b) { return a+b; }\nexport const PI = 3.14;\nexport default function mul(a,b) { return a*b; }</code></pre>\n<pre data-lang="javascript"><code>// main.js\nimport mul from "./math.js";\nimport { add, PI } from "./math.js";\n\nconsole.log(add(3,5));  // 8\nconsole.log(mul(4,5));  // 20</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2a1a', question:'Which keyword inherits from a parent class?', questionType:'multiple_choice', options:['extends','inherits','super','implements'], correctAnswer:'extends', order:0 },
            { id:'eq2a1b', question:'Which syntax imports the default export?', questionType:'multiple_choice', options:['import X from','import { X } from','require(X)','include X'], correctAnswer:'import X from', order:1 },
            { id:'eq2a1c', question:'What is `constructor()` used for?', questionType:'fill_blank', options:[], correctAnswer:'initializing instance properties', order:2 }
          ]
        },
        { _level:'Advanced', id:'u2a2', title:'Error Handling & Closures', order:1, passScore:70,
          topics:[
            { id:'t2a2a', title:'try / catch / finally', order:0, content:'<h3>Error Handling</h3>\n<pre data-lang="javascript"><code>try {\n    const data = JSON.parse(badJson);\n} catch (err) {\n    console.error("Failed:", err.message);\n} finally {\n    console.log("Cleanup done.");\n}\n\nfunction divide(a,b) {\n    if (b === 0) throw new Error("Division by zero!");\n    return a / b;\n}</code></pre>' },
            { id:'t2a2b', title:'Closures', order:1, content:'<h3>Closures</h3>\n<p>A function that remembers its outer scope variables.</p>\n<pre data-lang="javascript"><code>function makeCounter() {\n    let count = 0;\n    return function() { return ++count; };\n}\n\nconst counter = makeCounter();\nconsole.log(counter());  // 1\nconsole.log(counter());  // 2\nconsole.log(counter());  // 3</code></pre>' }
          ],
          evalQuestions:[
            { id:'eq2a2a', question:'Which block always runs?', questionType:'multiple_choice', options:['finally','catch','else','always'], correctAnswer:'finally', order:0 },
            { id:'eq2a2b', question:'What is a closure?', questionType:'multiple_choice', options:['A function that remembers outer scope variables','A way to close a file','An encapsulated object','A loop that breaks early'], correctAnswer:'A function that remembers outer scope variables', order:1 },
            { id:'eq2a2c', question:'Which keyword throws an exception?', questionType:'fill_blank', options:[], correctAnswer:'throw', order:2 }
          ]
        }
    ];

    // Build classroom 1 (Python) — find levels by name
    function applyUnits(cid, unitsData) {
        const c = getCurr(cid);
        const totalUnits = c.levels.reduce((s,l) => s + (l.units||[]).length, 0);
        if (totalUnits > 0) return; // already seeded

        const levelMap = {};
        c.levels.forEach(l => { levelMap[l.name] = l; });

        unitsData.forEach(u => {
            const lvl = levelMap[u._level];
            if (!lvl) return;
            if (!lvl.units) lvl.units = [];
            const { _level, ...unitData } = u;
            lvl.units.push(unitData);
        });

        lvl_0: for (const l of c.levels) { // unlock first level
            if (l.order === 0) { l.locked = false; break lvl_0; }
        }
        persistCurriculum();
        console.log(`✔ Seeded ${unitsData.length} units into classroom ${cid}`);
    }

    // Only seed if classroom entries exist
    if (curriculum['1']) applyUnits('1', PYTHON_UNITS);
    if (curriculum['2']) applyUnits('2', JS_UNITS);
}

seedDefaultCurriculum();

function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getCurr(cid) {
    if (!curriculum[String(cid)]) curriculum[String(cid)] = { levels: [] };
    return curriculum[String(cid)];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function findUnit(cid, uid) {
    const curr = getCurr(cid);
    for (const lvl of curr.levels) {
        const unit = lvl.units.find(u => u.id === uid);
        if (unit) return { level: lvl, unit };
    }
    return null;
}

/** Returns ordered list of all units across all levels for a classroom */
function allUnits(cid) {
    const curr = getCurr(cid);
    const out = [];
    for (const lvl of [...curr.levels].sort((a,b) => a.order - b.order)) {
        for (const u of [...lvl.units].sort((a,b) => a.order - b.order)) {
            out.push({ ...u, levelId: lvl.id, levelName: lvl.name });
        }
    }
    return out;
}

/**
 * Determine which curriculum LEVELS are unlocked for a student.
 * A level unlocks when EITHER:
 *   - the previous curriculum level is fully completed in this classroom, OR
 *   - the student mastered the previous standard level cross-system
 *     (i.e. passed it in the Technical Assessment for this language).
 * Returns { [levelId]: { unlocked, prevLevelName } }.
 */
function buildLevelStatus(userId, cid, language) {
    const uid  = String(userId);
    const curr = getCurr(cid);
    const lang = language || curr.language || '';
    const levels = [...(curr.levels || [])].sort((a, b) => a.order - b.order);
    const status = {};

    levels.forEach((lvl, i) => {
        if (i === 0) { status[lvl.id] = { unlocked: true, prevLevelName: null }; return; }

        const prev = levels[i - 1];
        const prevUnits = prev.units || [];
        // Previous curriculum level fully completed in THIS classroom ([].every === true)
        const prevDone = prevUnits.every(u => progress[`${uid}_${u.id}`]?.evalPassed);
        // Cross-system: previous standard level mastered (e.g. Technical Assessment pass)
        const crossMastered = masteryService.isLevelUnlocked(uid, lang, lvl.name);

        status[lvl.id] = { unlocked: prevDone || crossMastered, prevLevelName: prev.name };
    });
    return status;
}

/** Build per-unit progress for a student in a classroom (with level + unit gating). */
function buildStudentProgress(userId, cid, language) {
    const uid  = String(userId);
    const curr = getCurr(cid);
    const lang = language || curr.language || '';
    const result = {};
    const units = allUnits(cid);
    const levelStatus = buildLevelStatus(userId, cid, language);

    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const key  = `${uid}_${unit.id}`;
        const p    = progress[key] || {};

        const levelUnlocked = levelStatus[unit.levelId]?.unlocked !== false;

        // If the student passed the Technical Assessment for this level, all units in it unlock.
        const levelMastered = lang && masteryService.hasMastered(uid, lang, unit.levelName);

        // Within an unlocked level: first unit open, others unlock after the previous unit's eval
        const levelUnits = units.filter(u => u.levelId === unit.levelId).sort((a,b) => a.order - b.order);
        const posInLevel = levelUnits.findIndex(u => u.id === unit.id);
        let unitUnlocked;
        if (levelMastered || posInLevel === 0) {
            unitUnlocked = true;
        } else {
            const prevUnit = levelUnits[posInLevel - 1];
            unitUnlocked = !!(progress[`${uid}_${prevUnit.id}`]?.evalPassed);
        }

        result[unit.id] = {
            unlocked:         levelUnlocked && unitUnlocked,
            levelUnlocked,
            contentCompleted: p.contentCompleted || false,
            completedTopics:  Array.isArray(p.completedTopics) ? p.completedTopics : [],
            evalPassed:       p.evalPassed       || false,
            evalScore:        p.evalScore        || 0,
            attempts:         p.attempts         || 0,
            completedAt:      p.completedAt      || null,
        };
    }
    return result;
}

// ── GET /certs-for-user/:userId — all curriculum certs for a user ─────────────
// MUST be before GET /:cid or Express will treat 'certs-for-user' as a classroom id
router.get('/certs-for-user/:userId', authMiddleware, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const userCerts = certs
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
    res.json({ success: true, certificates: userCerts });
});

// ── GET /:cid — full curriculum (faculty) ─────────────────────────────────────
router.get('/:cid', authMiddleware, (req, res) => {
    const curr = getCurr(req.params.cid);
    res.json({ success: true, curriculum: curr });
});

// ── GET /:cid/student — curriculum + student progress ─────────────────────────
router.get('/:cid/student', authMiddleware, async (req, res) => {
    const cid  = req.params.cid;
    const curr = getCurr(cid);
    const language = (req.query.language || curr.language || '').toLowerCase();
    // Remember the classroom language for server-side level gating
    if (language && curr.language !== language) { curr.language = language; persistCurriculum(); }

    // Backfill mastery from MySQL certificates so students who passed the
    // Technical Assessment before mastery tracking existed still get unlocked.
    if (dbService.isDbAvailable()) {
        try {
            const certs = await db.query(
                'SELECT language_code, level, accuracy FROM certificates WHERE user_id = ? AND accuracy >= 70',
                [req.user.id]
            );
            for (const c of (certs || [])) {
                masteryService.recordMastery(req.user.id, c.language_code, c.level, 'assessment');
            }
        } catch (e) { /* non-fatal */ }
    }

    const prog        = buildStudentProgress(req.user.id, cid, language);
    const levelStatus = buildLevelStatus(req.user.id, cid, language);
    // Strip correct answers from eval questions for students
    const safe = JSON.parse(JSON.stringify(curr));
    for (const lvl of safe.levels) {
        for (const unit of lvl.units) {
            unit.evalQuestions = (unit.evalQuestions || []).map(q => ({
                id: q.id, question: q.question, questionType: q.questionType || 'multiple_choice',
                options: q.options, hint: q.hint, codeSnippet: q.codeSnippet || null,
                codeLines: q.codeLines || null,
            }));
        }
    }
    res.json({ success: true, curriculum: safe, progress: prog, levelStatus });
});

// ── POST /:cid/levels — create level (idempotent by name) ────────────────────
router.post('/:cid/levels', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const { name, locked } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required.' });

    // Idempotent: return the existing level if one with the same name already exists
    const existing = curr.levels.find(l => l.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) return res.json({ success: true, level: existing });

    const level = {
        id:     genId('lvl'),
        name:   name.trim(),
        order:  curr.levels.length,
        locked: locked !== false,
        units:  [],
    };
    curr.levels.push(level);
    persistCurriculum();
    res.json({ success: true, level });
});

// ── PUT /:cid/levels/:lid ─────────────────────────────────────────────────────
router.put('/:cid/levels/:lid', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const lvl  = curr.levels.find(l => l.id === req.params.lid);
    if (!lvl) return res.status(404).json({ success: false, message: 'Level not found.' });
    if (req.body.name   !== undefined) lvl.name   = req.body.name;
    if (req.body.order  !== undefined) lvl.order  = req.body.order;
    if (req.body.locked !== undefined) lvl.locked = req.body.locked;
    persistCurriculum();
    res.json({ success: true, level: lvl });
});

// ── DELETE /:cid/levels/:lid ──────────────────────────────────────────────────
router.delete('/:cid/levels/:lid', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const idx  = curr.levels.findIndex(l => l.id === req.params.lid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Level not found.' });
    curr.levels.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/levels/:lid/units — create unit ────────────────────────────────
router.post('/:cid/levels/:lid/units', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const lvl  = curr.levels.find(l => l.id === req.params.lid);
    if (!lvl) return res.status(404).json({ success: false, message: 'Level not found.' });
    const { title, passScore } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
    const unit = {
        id:            genId('unit'),
        title:         title.trim(),
        order:         lvl.units.length,
        passScore:     passScore || 70,
        topics:        [],
        evalQuestions: [],
    };
    lvl.units.push(unit);
    persistCurriculum();
    res.json({ success: true, unit });
});

// ── PUT /:cid/units/:uid ──────────────────────────────────────────────────────
router.put('/:cid/units/:uid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { unit } = found;
    if (req.body.title     !== undefined) unit.title     = req.body.title;
    if (req.body.order     !== undefined) unit.order     = req.body.order;
    if (req.body.passScore !== undefined) unit.passScore = req.body.passScore;
    persistCurriculum();
    res.json({ success: true, unit });
});

// ── DELETE /:cid/units/:uid ───────────────────────────────────────────────────
router.delete('/:cid/units/:uid', authMiddleware, requireFaculty, (req, res) => {
    const cid  = req.params.cid;
    const uid  = req.params.uid;
    const curr = getCurr(cid);
    for (const lvl of curr.levels) {
        const idx = lvl.units.findIndex(u => u.id === uid);
        if (idx !== -1) {
            lvl.units.splice(idx, 1);
            persistCurriculum();
            return res.json({ success: true });
        }
    }
    res.status(404).json({ success: false, message: 'Unit not found.' });
});

// ── POST /:cid/units/:uid/topics ──────────────────────────────────────────────
router.post('/:cid/units/:uid/topics', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
    const topic = { id: genId('topic'), title: title.trim(), content: content || '', order: found.unit.topics.length };
    found.unit.topics.push(topic);
    persistCurriculum();
    res.json({ success: true, topic });
});

// ── PUT /:cid/units/:uid/topics/:tid ─────────────────────────────────────────
router.put('/:cid/units/:uid/topics/:tid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const topic = found.unit.topics.find(t => t.id === req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found.' });
    if (req.body.title   !== undefined) topic.title   = req.body.title;
    if (req.body.content !== undefined) topic.content = req.body.content;
    if (req.body.order   !== undefined) topic.order   = req.body.order;
    persistCurriculum();
    res.json({ success: true, topic });
});

// ── DELETE /:cid/units/:uid/topics/:tid ───────────────────────────────────────
router.delete('/:cid/units/:uid/topics/:tid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const idx = found.unit.topics.findIndex(t => t.id === req.params.tid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Topic not found.' });
    found.unit.topics.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/questions — add eval question ───────────────────────
router.post('/:cid/units/:uid/questions', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { question, questionType, options, correctAnswer, hint, codeSnippet, codeLines } = req.body;
    if (!question) return res.status(400).json({ success: false, message: 'Question text required.' });
    const q = {
        id:           genId('q'),
        question:     question.trim(),
        questionType: questionType || 'multiple_choice',
        options:      options      || [],
        correctAnswer: correctAnswer || '',
        hint:         hint         || '',
        codeSnippet:  codeSnippet  || null,
        codeLines:    codeLines    || null,
        order:        found.unit.evalQuestions.length,
    };
    found.unit.evalQuestions.push(q);
    persistCurriculum();
    res.json({ success: true, question: q });
});

// ── PUT /:cid/units/:uid/questions/:qid ───────────────────────────────────────
router.put('/:cid/units/:uid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const q = found.unit.evalQuestions.find(x => x.id === req.params.qid);
    if (!q) return res.status(404).json({ success: false, message: 'Question not found.' });
    Object.assign(q, {
        question:      req.body.question      ?? q.question,
        questionType:  req.body.questionType  ?? q.questionType,
        options:       req.body.options       ?? q.options,
        correctAnswer: req.body.correctAnswer ?? q.correctAnswer,
        hint:          req.body.hint          ?? q.hint,
        codeSnippet:   req.body.codeSnippet   ?? q.codeSnippet,
        codeLines:     req.body.codeLines     ?? q.codeLines,
    });
    persistCurriculum();
    res.json({ success: true, question: q });
});

// ── DELETE /:cid/units/:uid/questions/:qid ────────────────────────────────────
router.delete('/:cid/units/:uid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const idx = found.unit.evalQuestions.findIndex(x => x.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found.' });
    found.unit.evalQuestions.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/complete-content — student marks content read ───────
router.post('/:cid/units/:uid/complete-content', authMiddleware, (req, res) => {
    const uid  = req.params.uid;
    const key  = `${req.user.id}_${uid}`;
    if (!progress[key]) progress[key] = {};
    progress[key].contentCompleted = true;
    persistProgress();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/topics/:tid/complete — student finishes one topic ───
router.post('/:cid/units/:uid/topics/:tid/complete', authMiddleware, (req, res) => {
    const cid = req.params.cid;
    const uid = req.params.uid;
    const tid = req.params.tid;
    const key = `${req.user.id}_${uid}`;

    if (!progress[key]) progress[key] = {};
    if (!Array.isArray(progress[key].completedTopics)) progress[key].completedTopics = [];
    if (!progress[key].completedTopics.includes(tid)) {
        progress[key].completedTopics.push(tid);
    }

    // If every topic in the unit is now complete, mark contentCompleted = true
    const found = findUnit(cid, uid);
    if (found) {
        const allTopicIds = (found.unit.topics || []).map(t => t.id);
        const allDone = allTopicIds.length > 0 && allTopicIds.every(id => progress[key].completedTopics.includes(id));
        if (allDone) progress[key].contentCompleted = true;
    }

    persistProgress();
    res.json({ success: true, completedTopics: progress[key].completedTopics });
});

// ── POST /:cid/units/:uid/submit-eval — student submits evaluation ────────────
router.post('/:cid/units/:uid/submit-eval', authMiddleware, (req, res) => {
    const cid     = req.params.cid;
    const unitId  = req.params.uid;
    const userId  = req.user.id;
    const { answers } = req.body;   // { [questionId]: selectedAnswer }
    if (!answers) return res.status(400).json({ success: false, message: 'answers required.' });

    const found = findUnit(cid, unitId);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { unit } = found;

    // Score the answers
    const questions = unit.evalQuestions || [];
    let correct = 0;
    const results = questions.map(q => {
        let isCorrect = false;

        if (q.questionType === 'code_ordering') {
            const submittedArr = Array.isArray(answers[q.id]) ? answers[q.id] : [];
            const expectedArr  = Array.isArray(q.codeLines) ? q.codeLines : [];
            isCorrect = submittedArr.length === expectedArr.length &&
                        submittedArr.every((line, i) => line === expectedArr[i]);
        } else {
            const submitted = String(answers[q.id] || '').trim().toLowerCase();
            const expected  = String(q.correctAnswer || '').trim().toLowerCase();
            // Also accept just the letter if correctAnswer is "A) some text"
            const expectedLetter = expected.match(/^([a-d])[).]?\s*/i)?.[1]?.toLowerCase() || expected;
            isCorrect = submitted === expected || submitted === expectedLetter ||
                        submitted === expected.replace(/^[a-d][).]\s*/i,'');
        }

        if (isCorrect) correct++;
        return { questionId: q.id, correct: isCorrect, correctAnswer: q.correctAnswer };
    });

    const total    = questions.length;
    const score    = total ? Math.round((correct / total) * 100) : 0;
    const passed   = score >= (unit.passScore || 70);

    // Cache student name for leaderboard
    userNameCache[String(userId)] = req.user.fullName || req.user.email || `Student #${userId}`;

    const key = `${userId}_${unitId}`;
    if (!progress[key]) progress[key] = { attempts: 0 };
    const wasAlreadyPassed = progress[key].evalPassed === true;
    progress[key].attempts        = (progress[key].attempts || 0) + 1;
    progress[key].evalScore       = Math.max(progress[key].evalScore || 0, score);
    progress[key].contentCompleted = true;
    if (passed) {
        progress[key].evalPassed  = true;
        progress[key].completedAt = new Date().toISOString();

        // Award XP on first-ever pass so the classroom leaderboard reflects curriculum work
        if (!wasAlreadyPassed) {
            const xpAmount = score; // 70–100 XP depending on score
            if (dbService.isDbAvailable()) {
                db.query('UPDATE users SET total_xp = total_xp + ? WHERE user_id = ?', [xpAmount, userId])
                  .catch(err => console.error('[curriculum] XP award error:', err));
            }
        }
    }
    persistProgress();

    // Server-authoritative cross-system mastery: if this pass completes the whole level,
    // record mastery so the next level unlocks in BOTH the classroom and the Technical Assessment.
    if (passed) {
        const curr  = getCurr(cid);
        const level = found.level;
        const lvlUnits = level.units || [];
        const levelDone = lvlUnits.length > 0 && lvlUnits.every(u => progress[`${userId}_${u.id}`]?.evalPassed);
        if (levelDone && curr.language) {
            masteryService.recordMastery(userId, curr.language, level.name, 'classroom');
        }
    }

    res.json({ success: true, score, correct, total, passed, results, passScore: unit.passScore || 70 });
});

// ── GET /:cid/leaderboard — curriculum-score leaderboard ─────────────────────
router.get('/:cid/leaderboard', authMiddleware, async (req, res) => {
    const cid = req.params.cid;
    const units = allUnits(cid);
    const unitIds = new Set(units.map(u => u.id));

    // Tally curriculum score per user from in-memory progress
    const currScores = {};
    for (const [key, p] of Object.entries(progress)) {
        const firstUs = key.indexOf('_');
        if (firstUs < 0) continue;
        const uid    = key.slice(0, firstUs);
        const unitId = key.slice(firstUs + 1);
        if (!unitIds.has(unitId)) continue;
        if (!currScores[uid]) currScores[uid] = { score: 0, unitsPassed: 0 };
        if (p.evalPassed) {
            currScores[uid].score += p.evalScore || 0;
            currScores[uid].unitsPassed++;
        }
    }

    let entries = [];
    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT u.user_id AS id, u.full_name AS fullName
                 FROM classroom_enrollments ce
                 JOIN users u ON u.user_id = ce.student_id
                 WHERE ce.classroom_id = ? AND ce.status = 'active'`,
                [Number(cid)]
            );
            entries = rows.map(r => ({
                id: r.id,
                fullName: r.fullName,
                score: currScores[String(r.id)]?.score || 0,
                unitsPassed: currScores[String(r.id)]?.unitsPassed || 0,
            }));
        } catch (err) { console.error('[curriculum] leaderboard DB error:', err); }
    }

    if (!entries.length) {
        // Fallback: build from whatever progress we have
        entries = Object.entries(currScores).map(([uid, s]) => ({
            id: Number(uid),
            fullName: userNameCache[uid] || `Student #${uid}`,
            score: s.score,
            unitsPassed: s.unitsPassed,
        }));
    }

    entries.sort((a, b) => b.score - a.score);
    res.json({ success: true, leaderboard: entries });
});

// ── GET /:cid/progress-summary — per-student curriculum stats (faculty) ───────
router.get('/:cid/progress-summary', authMiddleware, (req, res) => {
    const cid = req.params.cid;
    const units = allUnits(cid);
    const unitMap = {};
    units.forEach(u => { unitMap[u.id] = u; });
    const unitIds = new Set(units.map(u => u.id));
    const totalUnits = units.length;

    const summary = {};
    for (const [key, p] of Object.entries(progress)) {
        const firstUs = key.indexOf('_');
        if (firstUs < 0) continue;
        const uid    = key.slice(0, firstUs);
        const unitId = key.slice(firstUs + 1);
        if (!unitIds.has(unitId)) continue;
        if (!summary[uid]) summary[uid] = { unitsPassed: 0, topScore: 0, answered: 0, correct: 0 };
        if (p.evalPassed) {
            summary[uid].unitsPassed++;
            summary[uid].topScore = Math.max(summary[uid].topScore, p.evalScore || 0);
        }
        // Tally eval questions answered/correct from best score × question count
        const qCount   = (unitMap[unitId]?.evalQuestions || []).length;
        const attempts = p.attempts || (p.evalScore > 0 ? 1 : 0);
        summary[uid].answered += qCount * attempts;
        summary[uid].correct  += Math.round((p.evalScore || 0) / 100 * qCount);
    }

    res.json({ success: true, summary, totalUnits });
});

// ── GET /:cid/my-progress ─────────────────────────────────────────────────────
router.get('/:cid/my-progress', authMiddleware, (req, res) => {
    const prog = buildStudentProgress(req.user.id, req.params.cid);
    res.json({ success: true, progress: prog });
});

// ── POST /:cid/issue-level-cert — award a level-completion certificate ────────
router.post('/:cid/issue-level-cert', authMiddleware, (req, res) => {
    const cid    = String(req.params.cid);
    const userId = req.user.id;
    const { levelId, levelName, classroomName, language, score } = req.body;

    if (!levelId || !levelName) {
        return res.status(400).json({ success: false, message: 'levelId and levelName required.' });
    }

    // Verify: all units in this level must have evalPassed = true
    const curr = getCurr(cid);
    const level = curr.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ success: false, message: 'Level not found.' });

    const units = [...(level.units || [])].sort((a, b) => a.order - b.order);
    if (units.length === 0) {
        return res.status(400).json({ success: false, message: 'No units in this level.' });
    }
    const allPassed = units.every(u => progress[`${userId}_${u.id}`]?.evalPassed);
    if (!allPassed) {
        return res.status(403).json({ success: false, message: 'Not all units passed for this level.' });
    }

    // Upsert: one cert per (userId, classroomId, levelId)
    const existing = certs.findIndex(c => c.userId === userId && c.classroomId === cid && c.levelId === levelId);
    const certData = {
        id:            existing >= 0 ? certs[existing].id : `cert_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        userId,
        classroomId:   cid,
        classroomName: classroomName || `Classroom ${cid}`,
        language:      language || 'general',
        levelId,
        levelName,
        score:         score || 0,
        issuedAt:      existing >= 0 ? certs[existing].issuedAt : new Date().toISOString(),
    };

    if (existing >= 0) { certs[existing] = certData; }
    else               { certs.push(certData); }
    persistCerts();

    // Remember the classroom language on the curriculum so level-gating works server-side
    if (language && language !== 'general') { curr.language = String(language).toLowerCase(); persistCurriculum(); }

    // Completing every unit of this level grants cross-system mastery
    // → unlocks the next level in the Technical Assessment for the same language.
    masteryService.recordMastery(userId, language, levelName, 'classroom');

    res.json({ success: true, certificate: certData });
});

module.exports = router;
