import re
from flask import Blueprint, request, jsonify, g
from database import get_db_connection
from auth_utils import hash_password, verify_password, generate_token
from decorators import token_required
from services.audit import log_action

auth_bp = Blueprint('auth', __name__)


def _is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@auth_bp.route('/api/register', methods=['POST'])
def register():
    """Register a new voter."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not full_name or not email or not password:
        return jsonify({'error': 'All fields are required: full_name, email, password'}), 400

    if len(full_name) < 2:
        return jsonify({'error': 'Name must be at least 2 characters'}), 400

    if not _is_valid_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'An account with this email already exists'}), 409

        password_hash = hash_password(password)
        cursor.execute(
            'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            (full_name, email, password_hash, 'voter')
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()

        