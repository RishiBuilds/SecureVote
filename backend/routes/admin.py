from flask import Blueprint, request, jsonify, g
from database import get_db_connection
from decorators import admin_required, token_required
from services.audit import log_action, get_audit_logs
from services.vote_security import verify_chain

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_stats(current_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM users WHERE role = "voter"')
    total_voters = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM votes')
    total_votes = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM elections WHERE status = "active"')
    active_elections = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM candidates')
    total_candidates = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM fraud_alerts WHERE status = "open"')
    unresolved_alerts = cursor.fetchone()[0]
    
    conn.close()
    
    turnout = round((total_votes / total_voters * 100) if total_voters > 0 else 0, 1)
    
    return jsonify({
        'total_voters': total_voters,
        'total_votes': total_votes,
        'turnout_percentage': turnout,
        'active_elections': active_elections,
        'total_candidates': total_candidates,
        'unresolved_alerts': unresolved_alerts
    }), 200

@admin_bp.route('/api/admin/elections', methods=['GET'])
@admin_required
def admin_elections(current_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*, 
               (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
               (SELECT COUNT(*) FROM votes WHERE election_id = e.id) as vote_count
        FROM elections e
        ORDER BY created_at DESC
    ''')
    elections = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'elections': elections}), 200

@admin_bp.route('/api/admin/election', methods=['POST'])
@admin_required
def create_election(current_user):
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO elections (title, description) VALUES (?, ?)', (title, description))
    conn.commit()
    conn.close()
    
    log_action('election_created', current_user['id'], request.remote_addr, {'title': title})
    return jsonify({'message': 'Election created'}), 201

@admin_bp.route('/api/admin/election/<int:election_id>', methods=['PUT'])
@admin_required
def update_election(current_user, election_id):
    data = request.get_json()
    status = data.get('status')
    if status not in ['upcoming', 'active', 'ended']:
        return jsonify({'error': 'Invalid status'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE elections SET status = ? WHERE id = ?', (status, election_id))
    conn.commit()
    conn.close()
    
    log_action('election_updated', current_user['id'], request.remote_addr, {'election_id': election_id, 'status': status})
    return jsonify({'message': 'Updated successfully'}), 200

@admin_bp.route('/api/admin/candidate', methods=['POST'])
@admin_required
def add_candidate(current_user):
    data = request.get_json()
    election_id = data.get('election_id')
    name = data.get('name')
    party = data.get('party')
    symbol = data.get('symbol', '')
    
    if not all([election_id, name, party]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO candidates (election_id, candidate_name, party_name, symbol)
        VALUES (?, ?, ?, ?)
    ''', (election_id, name, party, symbol))
    conn.commit()
    conn.close()
    
    log_action('candidate_added', current_user['id'], request.remote_addr, {'name': name})
    return jsonify({'message': 'Candidate added'}), 201

@admin_bp.route('/api/admin/candidate/<int:id>', methods=['DELETE'])
@admin_required
def delete_candidate(current_user, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM candidates WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    log_action('candidate_deleted', current_user['id'], request.remote_addr, {'candidate_id': id})
    return jsonify({'message': 'Candidate removed'}), 200

@admin_bp.route('/api/admin/voters', methods=['GET'])
@admin_required
def get_voters(current_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, full_name, email, created_at,
               (SELECT COUNT(DISTINCT election_id) FROM votes WHERE user_id = users.id) as elections_voted
        FROM users
        WHERE role = 'voter'
        ORDER BY created_at DESC
    ''')
    voters = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'total': len(voters), 'voters': voters}), 200

@admin_bp.route('/api/admin/votes', methods=['GET'])
@admin_required
def get_votes(current_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT v.id, v.vote_hash, v.previous_hash, v.ip_address, v.timestamp,
               u.full_name as voter_name, c.candidate_name, c.party_name as candidate_party,
               e.title as election_title
        FROM votes v
        JOIN users u ON v.user_id = u.id
        JOIN candidates c ON v.candidate_id = c.id
        JOIN elections e ON v.election_id = e.id
        ORDER BY v.timestamp DESC
    ''')
    votes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'total': len(votes), 'votes': votes}), 200

@admin_bp.route('/api/admin/fraud-alerts', methods=['GET'])
@admin_required
def list_fraud_alerts(current_user):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT f.*, u.full_name as user_name, e.title as election_title,
               CASE WHEN f.status = 'resolved' THEN 1 ELSE 0 END as resolved
        FROM fraud_alerts f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN elections e ON f.election_id = e.id
        ORDER BY f.created_at DESC
    ''')
    alerts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'total': len(alerts), 'alerts': alerts}), 200

@admin_bp.route('/api/admin/fraud-alerts/<int:id>/resolve', methods=['PUT'])
@admin_required
def resolve_fraud(current_user, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE fraud_alerts SET status = 'resolved' WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Resolved'}), 200

@admin_bp.route('/api/admin/audit-logs', methods=['GET'])
@admin_required
def list_audit_logs(current_user):
    logs = get_audit_logs(limit=200)
    return jsonify({'total': len(logs), 'logs': logs}), 200

@admin_bp.route('/api/admin/verify-chain/<int:election_id>', methods=['GET'])
@admin_required
def test_chain(current_user, election_id):
    is_valid, details = verify_chain(election_id)
    return jsonify({
        'chain_valid': is_valid,
        'details': details
    }), 200

@admin_bp.route('/api/results/<int:election_id>', methods=['GET'])
@token_required
def get_results(current_user, election_id):
    """Get the results/tally for a specific election."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get total votes
    cursor.execute('SELECT COUNT(*) as total FROM votes WHERE election_id = ?', (election_id,))
    total = cursor.fetchone()['total']
    
    # Get candidate tallies
    cursor.execute('''
        SELECT c.id, c.candidate_name as name, c.party_name as party, c.symbol,
               COUNT(v.id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON v.candidate_id = c.id
        WHERE c.election_id = ?
        GROUP BY c.id
        ORDER BY vote_count DESC
    ''', (election_id,))
    
    candidates_data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    results = []
    for idx, c in enumerate(candidates_data):
        pct = round((c['vote_count'] / total * 100) if total > 0 else 0, 1)
        c['percentage'] = pct
        c['rank'] = idx + 1
        results.append(c)
        
    return jsonify({
        'total_votes': total,
        'results': results
    }), 200
