<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

# 🔐 SecureVote

**A tamper-resistant, blockchain-secured online voting platform.**

SecureVote is a production-grade web application that demonstrates real-world security engineering — bcrypt password hashing, JWT authentication, blockchain-style vote chaining with HMAC-SHA256, fraud detection, and a complete audit trail. It's designed to feel like a modern SaaS product, not a toy demo.

---

## Key Features

| Feature                          | Description                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🔗 **Blockchain Vote Integrity** | Every vote is hash-chained to the previous one using HMAC-SHA256. Tampering breaks the chain and is immediately detected. |
| 🛡️ **One-Vote Guarantee**        | Enforced at the database level with unique constraints — no double voting, no exceptions.                                 |
| 🔑 **JWT Authentication**        | Stateless token-based auth with bcrypt password hashing and role-based access control (voter/admin).                      |
| 🚨 **Fraud Detection**           | Automated alerts for IP anomalies (multiple users from same IP) and rapid submission patterns.                            |
| 📋 **Full Audit Trail**          | Every action (login, vote, election change) is logged with timestamps, user IDs, IP addresses, and metadata.              |
| 🏛️ **Multi-Election Support**    | Run multiple elections simultaneously, each with their own candidates, voters, and independent vote chains.               |
| 📊 **Live Results**              | Real-time results visualization with Chart.js doughnut charts and percentage bars.                                        |
| ✅ **Chain Verification**        | Admin endpoint to verify the entire vote chain integrity at any time.                                                     |

---

## Technology Stack

| Layer        | Technology                               |
| ------------ | ---------------------------------------- |
| **Backend**  | Python Flask (REST API with Blueprints)  |
| **Database**   | SQLite (6-table, WAL journal mode + optimized indexing) |
| **Auth**       | bcrypt + PyJWT (stateless JWT tokens)                   |
| **Frontend**   | Vanilla HTML, CSS, JavaScript                           |
| **Charts**     | Chart.js 4.x                                            |
| **Design**     | Custom CSS design system with Inter font                |

---

## Project Structure

```text
SecureVote/
├── backend/
│   ├── app.py                     # Application factory with Blueprint registration
│   ├── database.py                # Schema (6 tables) + seed data
│   ├── auth_utils.py              # bcrypt hashing + JWT token generation/verification
│   ├── decorators.py              # @token_required and @admin_required middleware
│   ├── requirements.txt           # Python dependencies
│   ├── routes/
│   │   ├── auth.py                # /api/register, /api/login, /api/me
│   │   ├── voting.py              # /api/elections, /api/vote, /api/results
│   │   └── admin.py               # /api/admin/* (elections, candidates, stats, fraud...)
│   └── services/
│       ├── vote_security.py       # HMAC-SHA256 vote hashing + chain verification
│       ├── fraud_detection.py     # IP anomaly + rapid submission detection
│       └── audit.py               # Centralized audit logging service
│
├── frontend/
│   ├── index.html                 # landing page
│   ├── login.html / login.js      # Voter login (JWT)
│   ├── register.html / register.js # Registration with password strength indicator
│   ├── dashboard.html / dashboard.js # Voter dashboard (election selector, vote, results)
│   ├── admin-login.html / admin-login.js # Admin login (dark theme)
│   ├── admin-dashboard.html / admin-dashboard.js # Admin panel (8-tab sidebar)
│   ├── styles.css                 # Design system (tokens, components, responsive)
│   ├── admin-styles.css           # Admin-specific styles (sidebar, stat cards)
│   └── components/
│       ├── auth.js                # JWT token management + authenticated fetch wrapper
│       └── toast.js               # Toast notification system (4 types, slide animations)
│
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Start the server
python app.py
```

The server starts at **http://127.0.0.1:5000** — the database and default admin account are created automatically.

### Default Credentials

| Role      | Email                         | Password             |
| --------- | ----------------------------- | -------------------- |
| **Admin** | `admin@securevote.io`         | `admin123`           |
| **Voter** | Register via `/register.html` | Your chosen password |

---

## Usage Guide

### As a Voter

1. Navigate to `http://127.0.0.1:5000`
2. Click **"Register to Vote"** and create your account
3. You'll be redirected to the **Voter Dashboard**
4. Select an active election from the dropdown
5. Click on your preferred candidate card
6. Click **"Review & Cast Vote"** → confirm in the modal
7. Your **Vote Receipt** appears with a cryptographic hash — proof your vote is sealed in the chain
8. Live results update immediately with a Chart.js doughnut chart

### As an Administrator

1. Navigate to `http://127.0.0.1:5000/admin-login.html`
2. Login with admin credentials
3. The admin dashboard has **8 sections** via the sidebar:

| Section          | Functionality                                                           |
| ---------------- | ----------------------------------------------------------------------- |
| **Overview**     | Platform stats (voters, votes, turnout, active elections, fraud alerts) |
| **Elections**    | Create new elections, start/stop existing ones                          |
| **Candidates**   | Add candidates to elections, delete candidates without votes            |
| **Results**      | View results with charts + verify vote chain integrity                  |
| **Voters**       | View all registered voters and their participation                      |
| **Vote Ledger**  | Full vote log with hashes, IPs, timestamps                              |
| **Fraud Alerts** | Review and resolve flagged anomalies                                    |
| **Audit Logs**   | Complete action trail with metadata                                     |

---

## API Reference

All protected endpoints require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint        | Description               |
| ------ | --------------- | ------------------------- |
| `POST` | `/api/register` | Register a new voter      |
| `POST` | `/api/login`    | Login (returns JWT token) |
| `GET`  | `/api/me`       | Get current user profile  |

### Voting (Voter)

| Method | Endpoint                        | Description                      |
| ------ | ------------------------------- | -------------------------------- |
| `GET`  | `/api/elections`                | List all elections               |
| `GET`  | `/api/elections/:id/candidates` | Get candidates + voting status   |
| `POST` | `/api/vote`                     | Cast a vote (blockchain-chained) |
| `GET`  | `/api/results/:id`              | Get election results             |
| `GET`  | `/api/verify-chain/:id`         | Verify vote chain integrity      |

### Admin

| Method   | Endpoint                              | Description                |
| -------- | ------------------------------------- | -------------------------- |
| `GET`    | `/api/admin/elections`                | List elections with stats  |
| `POST`   | `/api/admin/election`                 | Create a new election      |
| `PUT`    | `/api/admin/election/:id`             | Update/start/stop election |
| `POST`   | `/api/admin/candidate`                | Add a candidate            |
| `PUT`    | `/api/admin/candidate/:id`            | Edit a candidate           |
| `DELETE` | `/api/admin/candidate/:id`            | Delete a candidate         |
| `GET`    | `/api/admin/stats`                    | Platform-wide statistics   |
| `GET`    | `/api/admin/voters`                   | All registered voters      |
| `GET`    | `/api/admin/votes`                    | Full vote ledger           |
| `GET`    | `/api/admin/audit-logs`               | Audit trail                |
| `GET`    | `/api/admin/fraud-alerts`             | Fraud alerts               |
| `PUT`    | `/api/admin/fraud-alerts/:id/resolve` | Resolve a fraud alert      |
| `GET`    | `/api/admin/verify-chain/:id`         | Verify vote chain (admin)  |

---

## Database Schema

### `users`

Unified table for voters and admins with role-based access.

| Column       | Type       | Notes              |
| ------------ | ---------- | ------------------ |
| `id`         | INTEGER PK | Auto-increment     |
| `full_name`  | TEXT       | Required           |
| `email`      | TEXT       | Unique             |
| `password_hash`| TEXT       | bcrypt hash        |
| `role`         | TEXT       | `voter` or `admin` |
| `has_voted`    | INTEGER    | Default `0`        |
| `created_at`   | TIMESTAMP  | Auto-set           |

### `elections`

Multi-election support with lifecycle management.

| Column                    | Type       | Notes                        |
| ------------------------- | ---------- | ---------------------------- |
| `id`                      | INTEGER PK | Auto-increment               |
| `title`                   | TEXT       | Required                     |
| `description`             | TEXT       | Optional                     |
| `status`                  | TEXT       | `pending`, `active`, `ended` |
| `start_time` / `end_time` | TIMESTAMP  | Set on status change         |

### `candidates`

Linked to elections with emoji symbols.

| Column        | Type           | Notes               |
| ------------- | -------------- | ------------------- |
| `id`          | INTEGER PK     | Auto-increment      |
| `election_id` | FK → elections | Required            |
| `name`        | TEXT           | Required            |
| `party`       | TEXT           | Required            |
| `symbol`      | TEXT           | Emoji, default `👤` |
| `description` | TEXT           | Optional bio        |

### `votes`

Blockchain-style chaining with HMAC-SHA256 hashes.

| Column          | Type            | Notes                                      |
| --------------- | --------------- | ------------------------------------------ |
| `id`            | INTEGER PK      | Auto-increment                             |
| `user_id`       | FK → users      | Unique per election                        |
| `candidate_id`  | FK → candidates | Required                                   |
| `election_id`   | FK → elections  | Required                                   |
| `vote_hash`     | TEXT            | HMAC-SHA256 hash                           |
| `previous_hash` | TEXT            | Previous vote's hash (`GENESIS` for first) |
| `ip_address`    | TEXT            | Voter's IP                                 |
| `timestamp`     | TIMESTAMP       | Auto-set                                   |

### `audit_logs`

Complete action trail for accountability.

| Column       | Type       | Notes                             |
| ------------ | ---------- | --------------------------------- |
| `id`         | INTEGER PK | Auto-increment                    |
| `action`     | TEXT       | e.g. `vote_cast`, `login_success` |
| `user_id`    | INTEGER    | Actor (nullable)                  |
| `ip_address` | TEXT       | Origin IP                         |
| `metadata`   | TEXT       | JSON details                      |
| `timestamp`  | TIMESTAMP  | Auto-set                          |

### `fraud_alerts`

Automated anomaly detection results.

| Column                    | Type       | Notes                                 |
| ------------------------- | ---------- | ------------------------------------- |
| `id`                      | INTEGER PK | Auto-increment                        |
| `user_id`                 | INTEGER    | Context (actor)                       |
| `election_id`             | INTEGER    | Context (election)                    |
| `alert_type`              | TEXT       | e.g. `ip_anomaly`, `rapid_submission` |
| `details`                 | TEXT       | Description                           |
| `severity`                | TEXT       | `medium`, `high`                      |
| `status`                  | TEXT       | `open` or `resolved`                  |
| `created_at`              | TIMESTAMP  | Auto-set                              |

---

## Security Architecture

| Layer                  | Implementation                                                     |
| ---------------------- | ------------------------------------------------------------------ |
| **Password Hashing**   | bcrypt with automatic salting                                      |
| **Anti-Enumeration**   | Timing-attack mitigation via dummy bcrypt execution on failed auth |
| **Authentication**     | Stateless JWT tokens (PyJWT) with configurable expiry              |
| **Authorization**      | Role-based decorators (`@token_required`, `@admin_required`)       |
| **Vote Integrity**     | HMAC-SHA256 hash chaining — each vote references the previous hash |
| **Chain Verification** | Full chain walk with hash recomputation to detect tampering        |
| **Fraud Detection**    | IP anomaly detection + rapid submission pattern flagging           |
| **Audit Trail**        | Every action logged with user, IP, timestamp, and metadata         |
| **Input Validation**   | Server-side validation on all endpoints                            |
| **XSS Prevention**     | HTML escaping in all frontend rendering                            |
| **CORS**               | Configured via strict Flask-CORS constraints                       |

### Environment Variables

| Variable            | Purpose                         | Default                         |
| ------------------- | ------------------------------- | ------------------------------- |
| `SECUREVOTE_SECRET` | JWT signing key                 | Dev key (change in production!) |
| `VOTE_SECRET_KEY`   | HMAC key for vote hash chaining | Dev key (change in production!) |

---

## Troubleshooting

| Issue                  | Solution                                                     |
| ---------------------- | ------------------------------------------------------------ |
| Server won't start     | Ensure Python 3.8+ and run `pip install -r requirements.txt` |
| Port 5000 in use       | Kill the existing process or change the port in `app.py`     |
| Database errors        | Delete `backend/voting.db` and restart — it auto-recreates   |
| "Token expired" errors | Re-login to get a fresh JWT token                            |
| CORS errors            | Ensure you're accessing via `http://127.0.0.1:5000`          |

---

## License

MIT — free to use for learning, demos, and portfolio projects.

> **Disclaimer**: This is an educational project demonstrating security engineering concepts. For production voting systems, consult with security experts and follow electoral regulations.

---

<p align="center">
  <strong>Built with 🔒 by SecureVote</strong><br>
  <sub>Tamper-proof voting for everyone · 2026</sub>
</p>
