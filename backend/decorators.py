from functools import wraps
from flask import session, jsonify
from database import get_db_connection

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        voter_id = session.get('voter_id')
        
        if not voter_id:
            return jsonify({'error': 'Unauthorized: Please log in'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM voters WHERE id = ?', (voter_id,))
        voter = cursor.fetchone()
        conn.close()
        
        if not voter:
            session.clear()
            return jsonify({'error': 'Unauthorized: Invalid session'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_id = session.get('admin_id')
        is_admin = session.get('is_admin')
        
        if not admin_id or not is_admin:
            return jsonify({'error': 'Unauthorized: Admin access required'}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM admins WHERE id = ?', (admin_id,))
        admin = cursor.fetchone()
        conn.close()
        
        if not admin:
            session.clear()
            return jsonify({'error': 'Unauthorized: Invalid admin session'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function
