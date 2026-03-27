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
    """Initialize the database with required tables and default data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    