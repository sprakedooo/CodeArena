# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeArena is an AI-powered game-based adaptive learning system for programming education. It's a Computer-Aided Instruction (CAI) prototype built for a thesis demonstration.

**Tech Stack:** Node.js + Express (backend), HTML5/CSS3/JavaScript (frontend), MySQL (database with automatic mock data fallback)

## Development Commands

```bash
# Start both servers (recommended)
npm start

# Start individually
npm run backend    # API server on port 3000
npm run frontend   # Web server on port 8080

# Alternative with colored output
npm run dev

# Installation (or use start.bat / start.sh)
npm run install-all
```

**Test Account:** student@example.com / student123

## Architecture

```
Frontend (Port 8080) ──HTTP REST──> Backend API (Port 3000) ──> MySQL Database
```

### Backend Structure (`backend/`)

- **server.js** - Main Express application, mounts all route modules
- **config/database.js** - MySQL connection pool with async query helper
- **routes/** - 9 route modules:
  - `authRoutes.js` - Login/registration with DB fallback
  - `questionRoutes.js` - Questions by language/level with DB fallback
  - `answerRoutes.js` - Answer checking + AI hint generation
  - `progressRoutes.js` - Level tracking and advancement
  - `rewardRoutes.js` - Points, badges, achievements
  - `feedbackRoutes.js` - AI-generated performance feedback
  - `mlRoutes.js` - Decision Tree ML predictions
  - `languageRoutes.js` - Programming language selection
  - `lessonRoutes.js` - Programming fundamentals lessons (12 topics)
- **services/** - Business logic:
  - `dbService.js` - Database operations with mock data fallback
  - `aiService.js` - Rule-based AI for hints and feedback
  - `adaptiveEngine.js` - Difficulty adjustment logic
  - `decisionTreeML.js` - Decision Tree classifier for predictions

### Frontend Structure (`frontend/`)

- **server.js** - Express static file server
- **pages/** - HTML pages (login, dashboard, lesson_game, feedback)
- **js/** - Client-side JavaScript (auth.js, dashboard.js, lessons.js, quizzes.js)
- **css/styles.css** - Game-themed styling

### Database

**Schema Location:** `backend/config/schema.sql`

**Tables:** users, questions, user_answers, progress, rewards, feedback

**Setup MySQL (optional):**
```bash
# Create database and tables
mysql -u root -p < backend/config/schema.sql

# Configure connection in backend/config/database.js
# Default: host=localhost, user=root, password=root, database=codearena
```

**Fallback:** System automatically uses mock data if MySQL is unavailable. All routes have database integration with graceful fallback.

**Database Service:** `backend/services/dbService.js` provides:
- `init()` - Test connection and set availability flag
- `isDbAvailable()` - Check if database is connected
- User, Question, Answer, Progress, Reward, Feedback operations

## Key AI/ML Components

### Decision Tree ML (`decisionTreeML.js`)

Makes three predictions based on user performance:
1. **Difficulty Recommendation:** INCREASE / MAINTAIN / DECREASE
2. **Intervention Detection:** NEEDS_HELP / ON_TRACK / AT_RISK
3. **Topic Priority:** FOCUS_WEAK / EXPLORE_NEW / REINFORCE

Features: accuracy, consecutiveCorrect, consecutiveWrong, questionsAnswered, currentLevel

### Adaptive Engine (`adaptiveEngine.js`)

- Question selection by difficulty level
- 30% challenge question probability on hot streaks
- Level advancement: 5 consecutive correct (beginner→intermediate), 7 (intermediate→advanced)

### AI Service (`aiService.js`)

Rule-based system for generating contextual hints and feedback based on performance thresholds.

## API Endpoints

All endpoints prefixed with `/api/`:
- `POST /auth/login`, `POST /auth/register`
- `GET /questions?language=python&level=beginner`
- `POST /answers/check` - Returns hint if wrong
- `GET /progress/:userId`, `POST /progress/advance`
- `GET /rewards/:userId`
- `GET /feedback/:userId`
- `GET /ml/predict/:userId/:language` - All ML predictions
- `GET /ml/difficulty/:userId/:language`, `/ml/intervention/:userId/:language`, `/ml/topic-priority/:userId/:language`

## Game Mechanics

- **Points:** 10/20/30 per correct answer (beginner/intermediate/advanced)
- **Levels:** Beginner → Intermediate → Advanced
- **Badges:** Achievement-based (first_login, fast_learner, perfect_score)
- **Streaks:** Consecutive correct answers tracked for advancement
