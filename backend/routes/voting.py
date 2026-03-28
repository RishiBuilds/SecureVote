from flask import Blueprint, request, jsonify, g
from database import get_db_connection
from decorators import token_required
from services.vote_security import compute_vote_hash, get_previous_hash, verify_chain
from services.fraud_detection import check_ip_anomaly, check_rapid_submission
from services.audit import log_action
import datetime
import sqlite3

voting_bp = Blueprint('voting', __name__)

@voting_bp.route('/api/elections', methods=['GET'])
@token_required
def get_elections(current_user):
    """Get all elections with vote counts."""
    # Optimization: Simplified query leveraging subqueries
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.created_at,
               (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
               (SELECT COUNT(*) FROM votes WHERE election_id = e.id) as vote_count
        FROM elections e
        ORDER BY e.created_at DESC
    ''')
    elections = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'elections': elections}), 200


@voting_bp.route('/api/elections/<int:election_id>/candidates', methods=['GET'])
@token_required
def get_candidates(current_user, election_id):
    """Get all candidates for a specific election."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, candidate_name, party_name, symbol
        FROM candidates
        WHERE election_id = ?
    ''', (election_id,))
    candidates = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'candidates': candidates}), 200


@voting_bp.route('/api/vote', methods=['POST'])
@token_required
def cast_vote(current_user):
    """Securely cast a vote in an election."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    candidate_id = data.get('candidate_id')
    election_id = data.get('election_id')

    if not candidate_id or not election_id:
        return jsonify({'error': 'Candidate ID and Election ID are required'}), 400

    user_id = current_user['id']
    ip_address = request.remote_addr

    # Fraud Detection Checks
    if check_rapid_submission(user_id):
        log_action('FRAUD_BLOCK_RAPID', user_id, ip_address, {'election_id': election_id})
        return jsonify({'error': 'Suspicious activity detected. Action blocked.'}), 429

    if check_ip_anomaly(ip_address, election_id):
        log_action('FRAUD_FLAG_IP', user_id, ip_address, {'election_id': election_id})

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if election is active
        cursor.execute("SELECT status FROM elections WHERE id = ?", (election_id,))
        election = cursor.fetchone()
        if not election or election['status'] != 'active':
            conn.close()
            return jsonify({'error': 'Election is not active'}), 400

        # Check if user already voted in this election
        cursor.execute('SELECT id FROM votes WHERE user_id = ? AND election_id = ?', (user_id, election_id))
        if cursor.fetchone():
            conn.close()
            log_action('DOUBLE_VOTE_ATTEMPT', user_id, ip_address, {'election_id': election_id})
            return jsonify({'error': 'You have already voted in this election'}), 409

        # Verify Chain Integrity before adding
        is_valid, _ = verify_chain(election_id)
        if not is_valid:
            conn.close()
            log_action('CHAIN_CORRUPT_BLOCK', user_id, ip_address, {'election_id': election_id})
            return jsonify({'error': 'Election integrity compromised. Voting halted.'}), 500

        # Cryptographic linking
        previous_hash = get_previous_hash(election_id)
        current_time = datetime.datetime.utcnow().isoformat()
        vote_hash = compute_vote_hash(user_id, candidate_id, election_id, current_time)

        # Atomic transaction
        cursor.execute('BEGIN TRANSACTION')
        try:
            cursor.execute('''
                INSERT INTO votes (user_id, candidate_id, election_id, timestamp, vote_hash, previous_hash, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, candidate_id, election_id, current_time, vote_hash, previous_hash, ip_address))
            
            # Optional: Update global has_voted flag
            cursor.execute('UPDATE users SET has_voted = 1 WHERE id = ?', (user_id,))
            
            cursor.execute('COMMIT')
        except sqlite3.IntegrityError:
            cursor.execute('ROLLBACK')
            conn.close()
            return jsonify({'error': 'You have already voted.'}), 409

        conn.close()
        
        log_action('VOTE_CAST', user_id, ip_address, {'election_id': election_id, 'candidate_id': candidate_id})
        
        return jsonify({
            'message': 'Vote successfully cast securely.',
            'receipt': {
                'timestamp': current_time,
                'vote_hash': vote_hash,
                'previous_hash': previous_hash
            }
        }), 201

    except Exception as e:
        print(f"Vote error: {e}")
        return jsonify({'error': 'Internal server error processing vote'}), 500