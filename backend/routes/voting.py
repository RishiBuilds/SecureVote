from flask import Blueprint, request, jsonify, g
from database import get_db_connection
from decorators import token_required
from services.vote_security import compute_vote_hash, get_previous_hash, verify_chain
from services.fraud_detection import check_ip_anomaly, check_rapid_submission
from services.audit import log_action

voting_bp = Blueprint('voting', __name__)


@voting_bp.route('/api/elections', methods=['GET'])
@token_required
def get_elections():
    """Get all elections."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.id, e.title, e.description, e.status, e.start_time, e.end_time, e.created_at,
               COUNT(DISTINCT c.id) as candidate_count,
               COUNT(DISTINCT v.id) as vote_count
        FROM elections e
        LEFT JOIN candidates c ON c.election_id = e.id
        LEFT JOIN votes v ON v.election_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC
    ''')
    elections = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'elections': elections}), 200


@voting_bp.route('/api/elections/<int:election_id>/candidates', methods=['GET'])
@token_required
def get_candidates(election_id):
    """Get all candidates for a specific election."""
    conn = get_db_connection()
    cursor = conn.cursor()

    