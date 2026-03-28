import re
from flask import Blueprint, request, jsonify
from database import get_db_connection
from auth_utils import hash_password, verify_password, generate_token
from decorators import token_required
from services.audit import log_action

auth_bp = Blueprint('auth', __name__)

def _is_valid_email(email):
    pattern = r'^[^@]+@[^@]+\.[^@]+$'
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

        # Generate a token immediately upon registration
        token = generate_token(user_id, 'voter', full_name)
        
        # Log this registration action securely
        log_action(action='USER_REGISTER', user_id=user_id, ip_address=request.remote_addr)

        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'full_name': full_name,
                'email': email,
                'role': 'voter'
            }
        }), 201

    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Authenticate specific user."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()

        # Timing attack mitigation: verify a dummy hash if user doesn't exist
        # using arbitrary bcrypt hash.
        dummy_hash = "$2b$12$KIXE71T6gO71Vf.8e.8wU.UuN/Nq/c.K.s.g/s.x.L/w/I.F.v.nC"
        
        if user:
            is_valid = verify_password(password, user['password_hash'])
        else:
            try:
                verify_password(password, dummy_hash)
            except Exception:
                pass
            is_valid = False

        if not is_valid:
            log_action(action='FAILED_LOGIN', metadata={'email': email}, ip_address=request.remote_addr)
            return jsonify({'error': 'Invalid email or password'}), 401

        token = generate_token(user['id'], user['role'], user['full_name'])
        log_action(action='SUCCESSFUL_LOGIN', user_id=user['id'], ip_address=request.remote_addr)

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200

    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/api/me', methods=['GET'])
@token_required
def get_me(current_user):
    """Return the profile of the current authenticated user."""
    return jsonify({'user': current_user}), 200