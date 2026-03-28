from functools import wraps
from flask import request, jsonify
from auth_utils import decode_token

def token_required(f):
    """Decorator that validates JWT token from Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ', 1)[1]
        payload = decode_token(token)

        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401

        current_user = {
            'id': payload['user_id'],
            'role': payload['role'],
            'full_name': payload['full_name']
        }
        return f(current_user, *args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator for routes that require an admin role."""
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated