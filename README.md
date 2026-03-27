# SecureVote

A full-stack web application demonstrating fundamental concepts in REST API design, database management, authentication, and security basics.

## Security Limitations

This educational project uses simplified security measures that do not meet production standards:

- Basic SHA-256 password hashing
- Simple session management
- No multi-factor authentication
- No professional security audit
- No compliance with electoral regulations

Real voting systems require advanced cryptographic protocols, verifiable audit trails, multi-factor authentication, legal compliance, professional security audits, and end-to-end encryption.

## Technology Stack

- **Backend**: Python Flask (REST API)
- **Database**: SQLite (embedded database)
- **Frontend**: Vanilla HTML, CSS, JavaScript (Modern SaaS layout, Custom Design System using CSS Variables)
- **Authentication**: Flask server-side sessions
- **Password Security**: SHA-256 hashing

## Features

### Voter Module

- User registration with email and password
- Secure login with session management, featuring elegant centered auth cards and responsive inputs
- View all candidates with party information represented in modern CSS grid cards
- Cast vote with a specialized custom HTML/CSS confirmation modal (replaces native browser prompts)
- One person, one vote enforcement (DB + API level)
- "Already Voted" indicator with UI lockdown (disabling interactions)
- Logout functionality

### Admin Module

- Separate admin login portal with distinct "Restricted Access" styling
- Modern left-sidebar layout for dashboard multi-tab navigation
- Real-time statistics displayed via gradient-accented stat cards
- Add/delete candidates with modern form structures
- View all registered voters with voting status in styled data tables
- Full votes log with timestamps
- Election results with rankings, percentage gradient bars, and visual badges

### UI/UX Design

- Modern SaaS aesthetic inspired by platforms like Stripe and Clerk
- Deep Blue / Indigo color palette with Google Fonts 'Inter' typography
- Custom CSS variable ecosystem for global theme consistency
- Smooth 200-300ms transitions and micro-animations for interactive hover states
- "Trust signals" including lock icons and encryption reassurance badges
- Fully responsive layout matching desktop and mobile parameters

## Project Structure

```text
├── backend/
│   ├── app.py                  # Main Flask application
│   ├── database.py             # Database initialization and utilities
│   ├── auth_utils.py           # Password hashing utilities
│   ├── decorators.py           # Authentication decorators
│   ├── requirements.txt        # Python dependencies
│   └── voting.db               # SQLite database (auto-created)
│
├── frontend/
│   ├── index.html              # Landing page
│   ├── register.html           # Voter registration
│   ├── login.html              # Voter login
│   ├── dashboard.html          # Voter dashboard
│   ├── admin-login.html        # Admin login
│   ├── admin-dashboard.html    # Admin dashboard
│   ├── styles.css              # Main stylesheet
│   ├── admin-styles.css        # Admin-specific styles
│   ├── register.js             # Registration logic
│   ├── login.js                # Login logic
│   ├── dashboard.js            # Voter dashboard logic
│   ├── admin-login.js          # Admin login logic
│   └── admin-dashboard.js      # Admin dashboard logic
│
└── README.md                   # This file
```

## Installation and Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs Flask (web framework) and Flask-CORS (cross-origin resource sharing).

### Step 2: Initialize Database

The database will be automatically initialized when you first run the application.

## How to Run

### Start the Backend Server

```bash
cd backend
python app.py
```

You should see output indicating the server is starting at `http://127.0.0.1:5000`, the default admin is created (`admin` / `admin123`), and the database is initialized successfully.

### Open the Frontend

Simply open `frontend/index.html` in your web browser.
Note: Keep the backend server running while using the application.

## Default Login Credentials

### Admin Account

- **Username**: `admin`
- **Password**: `admin123`

### Voter Accounts

You need to register new voter accounts through the registration page.

## Usage Guide

### As a Voter

1. Open `frontend/index.html` in your browser.
2. Click "Register to Vote".
3. Fill in your details (name, email, password).
4. Login with your credentials.
5. View available candidates.
6. Select a candidate and click "Review & Cast Vote".
7. Confirm your vote in the modal.
8. You will see an "Already Voted" status locking further interaction.

### As an Administrator

1. Open `frontend/index.html` in your browser.
2. Click "Admin Portal" from the footer.
3. Login with admin credentials (`admin` / `admin123`).
4. Access the admin control panel with 5 sections:
   - **Statistics**: View total voters, votes cast, turnout percentage.
   - **Candidates**: Add or delete candidates.
   - **Voters**: View all registered voters and their voting status.
   - **Votes Cast**: View all cast votes with timestamps.
   - **Results**: View election results with rankings and percentages.

## API Endpoints

### Public Endpoints

- `POST /register` - Register new voter
- `POST /login` - Voter login
- `POST /admin/login` - Admin login

### Voter Protected Endpoints

- `GET /me` - Get current voter info
- `POST /logout` - Logout voter
- `GET /candidates` - Get all candidates
- `POST /vote` - Cast a vote

### Admin Protected Endpoints

- `GET /admin/me` - Get current admin info
- `POST /admin/logout` - Logout admin
- `POST /admin/add-candidate` - Add new candidate
- `DELETE /admin/delete-candidate/<id>` - Delete candidate
- `GET /admin/voters` - Get all voters
- `GET /admin/votes` - Get all votes
- `GET /admin/results` - Get election results
- `GET /admin/stats` - Get election statistics

## Database Schema

### voters

- `id` (PRIMARY KEY)
- `full_name` (TEXT)
- `email` (UNIQUE)
- `password` (SHA-256 hash)
- `has_voted` (BOOLEAN)
- `created_at` (TIMESTAMP)

### admins

- `id` (PRIMARY KEY)
- `username` (UNIQUE)
- `password` (SHA-256 hash)

### candidates

- `id` (PRIMARY KEY)
- `candidate_name` (TEXT)
- `party_name` (TEXT)
- `symbol` (TEXT)
- `created_at` (TIMESTAMP)

### votes

- `id` (PRIMARY KEY)
- `voter_id` (UNIQUE FOREIGN KEY)
- `candidate_id` (FOREIGN KEY)
- `timestamp` (TIMESTAMP)

## Security Features

- Password hashing using SHA-256
- Server-side session management
- One vote per voter (database UNIQUE constraint)
- Route protection with authentication decorators
- Input validation on all endpoints
- XSS prevention with HTML escaping
- CORS configuration

## Troubleshooting

### Backend server won't start

- Make sure Python 3.8+ is installed.
- Install dependencies: `pip install -r requirements.txt`.
- Check if port 5000 is available.

### Frontend can't connect to backend

- Ensure backend server is running at http://127.0.0.1:5000.
- Check browser console for CORS errors.
- Try opening frontend in a different browser.

### Database errors

- Delete `backend/voting.db` and restart the server to reset the database.

## Learning Objectives

This project demonstrates:

1. **REST API Design**: Creating a RESTful API with Flask.
2. **Database Management**: Using SQLite with proper schema design.
3. **Authentication**: Implementing session-based authentication.
4. **Security Basics**: Password hashing, input validation, XSS prevention.
5. **Frontend-Backend Communication**: Using fetch API with credentials.
6. **State Management**: Managing authentication state in the browser.
7. **Error Handling**: Proper error responses and user feedback.

## License

This is an educational project. Feel free to use it for learning purposes.

## Final Reminder

This system is for educational purposes only. For production voting systems, consult with security experts and follow industry standards and legal requirements.

---

Built for educational purposes only | 2026
