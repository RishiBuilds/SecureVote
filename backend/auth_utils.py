import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

SECRET_KEY = os.environ.get('SECUREVOTE_SECRET', 'sv-dev-secret-key-change-in-production-2026')
JWT_EXPIRY_HOURS = 24


def hash_password(password):
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password, password_hash):
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def generate_token(user_id, role, full_name):
    """Generate a JWT token for an authenticated user."""
    payload = {
        'user_id': user_id,
        'role': role,
        'full_name': full_name,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token):
    """Decode and verify a JWT token. Returns payload or None."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
