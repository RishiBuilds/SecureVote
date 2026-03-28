import hashlib
import os
from database import get_db_connection

VOTE_SECRET = os.environ.get('VOTE_SECRET_KEY', 'sv-vote-hmac-secret-2026')

def compute_vote_hash(user_id, candidate_id, election_id, timestamp):
    """Compute a SHA-256 hash for a vote record."""
    raw = f"{user_id}:{candidate_id}:{election_id}:{timestamp}:{VOTE_SECRET}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_previous_hash(election_id):
    """Get the hash of the most recent vote in the election chain."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT vote_hash FROM votes WHERE election_id = ? ORDER BY id DESC LIMIT 1',
        (election_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return row['vote_hash'] if row else 'GENESIS'

def verify_chain(election_id):
    """Verify the entire vote chain for an election.
    Returns (is_valid, details) tuple.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, user_id, candidate_id, election_id, timestamp, vote_hash, previous_hash '
        'FROM votes WHERE election_id = ? ORDER BY id ASC',
        (election_id,)
    )
    votes = cursor.fetchall()
    conn.close()

    if not votes:
        return True, {'message': 'No votes to verify', 'total': 0, 'errors': []}

    errors = []
    expected_prev = 'GENESIS'

    for vote in votes:
        # Check previous hash link
        if vote['previous_hash'] != expected_prev:
            errors.append(f"Broken chain link at Vote #{vote['id']}: expected prev {expected_prev}, got {vote['previous_hash']}")
            
        # Check data integrity (tampering check)
        recomputed_hash = compute_vote_hash(
            vote['user_id'], 
            vote['candidate_id'], 
            vote['election_id'], 
            vote['timestamp']
        )
        if recomputed_hash != vote['vote_hash']:
            errors.append(f"Data tampered at Vote #{vote['id']}: invalid hash signature")
            
        expected_prev = vote['vote_hash']

    is_valid = len(errors) == 0
    return is_valid, {
        'total': len(votes),
        'errors': errors
    }