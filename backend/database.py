import sqlite3
import os
from auth_utils import hash_password

DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voting.db')

def get_db_connection():
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    return conn

def init_db():
    """Initialize the database with required tables, indexes, and default admin."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'voter',
            has_voted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS elections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'upcoming',
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id INTEGER NOT NULL,
            candidate_name TEXT NOT NULL,
            party_name TEXT NOT NULL,
            symbol TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            candidate_id INTEGER NOT NULL,
            election_id INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            vote_hash TEXT NOT NULL,
            previous_hash TEXT NOT NULL,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
            FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT,
            FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
            UNIQUE(user_id, election_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fraud_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            election_id INTEGER,
            alert_type TEXT NOT NULL,
            details TEXT,
            severity TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            user_id INTEGER,
            ip_address TEXT,
            metadata TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')

    # Optimization: Create Indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)')

    # Default Admin
    cursor.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ('admin',))
    if cursor.fetchone()['count'] == 0:
        admin_password = hash_password('admin123')
        cursor.execute(
            'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ('System Admin', 'admin@securevote.com', admin_password, 'admin')
        )
        print('Default admin created → email: admin@securevote.com | password: admin123')

    conn.commit()
    conn.close()
    print('Database initialized successfully with WAL and indexing.')

if __name__ == '__main__':
    init_db()