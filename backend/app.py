from flask import Flask, request, jsonify, session
from flask_cors import CORS
import re
import sqlite3
from database import init_db, get_db_connection
from auth_utils import hash_password, verify_password
from decorators import login_required, admin_required

app = Flask(__name__)

app.config['SECRET_KEY'] = 'votesecure-secret-key'
app.config['SESSION_TYPE'] = 'filesystem'

CORS(app, supports_credentials=True, origins=['http://localhost:*', 'http://127.0.0.1:*', 'file://*'])

with app.app_context():
    init_db()

def is_valid_email(email):
    """Validate email format using regex."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_string(value):
    """Check if string is not empty after trimming whitespace."""
    return value and value.strip() != ''

@app.route('/')
def home():
    """Health check endpoint."""
    return jsonify({'message': 'VoteSecure API is running', 'status': 'ok'})

@app.route('/register', methods=['POST'])
def register():
    """Register a new voter."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not full_name or not email or not password:
        return jsonify({'error': 'Missing required fields: full_name, email, password'}), 400

    if not is_valid_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM voters WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        hashed_password = hash_password(password)
        cursor.execute(
            'INSERT INTO voters (full_name, email, password, has_voted) VALUES (?, ?, ?, 0)',
            (full_name, email, hashed_password)
        )
        conn.commit()

        voter_id = cursor.lastrowid
        cursor.execute('SELECT id, full_name, email, has_voted, created_at FROM voters WHERE id = ?', (voter_id,))
        voter = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'message': 'Registration successful',
            'voter': {
                'id': voter['id'],
                'full_name': voter['full_name'],
                'email': voter['email'],
                'has_voted': bool(voter['has_voted']),
                'created_at': voter['created_at']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'An error occurred during registration'}), 500

@app.route('/login', methods=['POST'])
def login():
    """Authenticate a voter."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Missing required fields: email, password'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, full_name, email, password, has_voted, created_at FROM voters WHERE email = ?', (email,))
        voter = cursor.fetchone()
        conn.close()
        
        if not voter:
            return jsonify({'error': 'Invalid email or password'}), 401

        if not verify_password(password, voter['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        session['voter_id'] = voter['id']
        
        return jsonify({
            'message': 'Login successful',
            'voter': {
                'id': voter['id'],
                'full_name': voter['full_name'],
                'email': voter['email'],
                'has_voted': bool(voter['has_voted']),
                'created_at': voter['created_at']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred during login'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    """Log out the current voter."""
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/me', methods=['GET'])
@login_required
def get_current_voter():
    """Get current voter information."""
    voter_id = session.get('voter_id')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, full_name, email, has_voted, created_at FROM voters WHERE id = ?', (voter_id,))
        voter = cursor.fetchone()
        conn.close()
        
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404
        
        return jsonify({
            'id': voter['id'],
            'full_name': voter['full_name'],
            'email': voter['email'],
            'has_voted': bool(voter['has_voted']),
            'created_at': voter['created_at']
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/candidates', methods=['GET'])
@login_required
def get_candidates():
    """Get all candidates."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, candidate_name, party_name, symbol, created_at FROM candidates ORDER BY created_at ASC')
        candidates = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'candidates': [
                {
                    'id': c['id'],
                    'candidate_name': c['candidate_name'],
                    'party_name': c['party_name'],
                    'symbol': c['symbol'],
                    'created_at': c['created_at']
                }
                for c in candidates
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/vote', methods=['POST'])
@login_required
def cast_vote():
    """Cast a vote for a candidate."""
    data = request.get_json()
    voter_id = session.get('voter_id')
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    candidate_id = data.get('candidate_id')
    
    if not candidate_id:
        return jsonify({'error': 'Missing required field: candidate_id'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM candidates WHERE id = ?', (candidate_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Invalid candidate_id'}), 400

        cursor.execute('SELECT has_voted FROM voters WHERE id = ?', (voter_id,))
        voter = cursor.fetchone()
        
        if voter['has_voted']:
            conn.close()
            return jsonify({'error': 'You have already voted'}), 409
 
        try:
            cursor.execute('INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)', (voter_id, candidate_id))
            cursor.execute('UPDATE voters SET has_voted = 1 WHERE id = ?', (voter_id,))
            conn.commit()

            vote_id = cursor.lastrowid
            cursor.execute('SELECT id, voter_id, candidate_id, timestamp FROM votes WHERE id = ?', (vote_id,))
            vote = cursor.fetchone()
            conn.close()
            
            return jsonify({
                'message': 'Vote cast successfully',
                'vote': {
                    'id': vote['id'],
                    'voter_id': vote['voter_id'],
                    'candidate_id': vote['candidate_id'],
                    'timestamp': vote['timestamp']
                }
            }), 201
            
        except sqlite3.IntegrityError:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'You have already voted'}), 409
            
    except Exception as e:
        return jsonify({'error': 'An error occurred while casting vote'}), 500

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """Authenticate an administrator."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Missing required fields: username, password'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, username, password FROM admins WHERE username = ?', (username,))
        admin = cursor.fetchone()
        conn.close()
        
        if not admin:
            return jsonify({'error': 'Invalid username or password'}), 401

        if not verify_password(password, admin['password']):
            return jsonify({'error': 'Invalid username or password'}), 401

        session['admin_id'] = admin['id']
        session['is_admin'] = True
        
        return jsonify({
            'message': 'Admin login successful',
            'admin': {
                'id': admin['id'],
                'username': admin['username']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred during admin login'}), 500

@app.route('/admin/logout', methods=['POST'])
def admin_logout():
    """Log out the current admin."""
    session.clear()
    return jsonify({'message': 'Admin logout successful'}), 200

@app.route('/admin/me', methods=['GET'])
@admin_required
def get_current_admin():
    """Get current admin information."""
    admin_id = session.get('admin_id')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, username FROM admins WHERE id = ?', (admin_id,))
        admin = cursor.fetchone()
        conn.close()
        
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        
        return jsonify({
            'id': admin['id'],
            'username': admin['username']
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/admin/add-candidate', methods=['POST'])
@admin_required
def add_candidate():
    """Add a new candidate."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    candidate_name = data.get('candidate_name', '').strip()
    party_name = data.get('party_name', '').strip()
    symbol = data.get('symbol', '').strip()

    if not candidate_name or not party_name:
        return jsonify({'error': 'Missing required fields: candidate_name, party_name'}), 400

    if not is_valid_string(candidate_name) or not is_valid_string(party_name):
        return jsonify({'error': 'Candidate name and party name cannot be empty'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO candidates (candidate_name, party_name, symbol) VALUES (?, ?, ?)',
            (candidate_name, party_name, symbol if symbol else None)
        )
        conn.commit()

        candidate_id = cursor.lastrowid
        cursor.execute('SELECT id, candidate_name, party_name, symbol, created_at FROM candidates WHERE id = ?', (candidate_id,))
        candidate = cursor.fetchone()
        conn.close()
        
        return jsonify({
            'message': 'Candidate added successfully',
            'candidate': {
                'id': candidate['id'],
                'candidate_name': candidate['candidate_name'],
                'party_name': candidate['party_name'],
                'symbol': candidate['symbol'],
                'created_at': candidate['created_at']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'An error occurred while adding candidate'}), 500

@app.route('/admin/delete-candidate/<int:candidate_id>', methods=['DELETE'])
@admin_required
def delete_candidate(candidate_id):
    """Delete a candidate by ID."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM candidates WHERE id = ?', (candidate_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Candidate deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred while deleting candidate'}), 500

@app.route('/admin/voters', methods=['GET'])
@admin_required
def get_all_voters():
    """Get all registered voters."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, full_name, email, has_voted, created_at FROM voters ORDER BY created_at DESC')
        voters = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'voters': [
                {
                    'id': v['id'],
                    'full_name': v['full_name'],
                    'email': v['email'],
                    'has_voted': bool(v['has_voted']),
                    'created_at': v['created_at']
                }
                for v in voters
            ],
            'total': len(voters)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/admin/votes', methods=['GET'])
@admin_required
def get_all_votes():
    """Get all cast votes with details."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                votes.id,
                voters.full_name as voter_name,
                voters.email as voter_email,
                candidates.candidate_name,
                candidates.party_name,
                votes.timestamp
            FROM votes
            JOIN voters ON votes.voter_id = voters.id
            JOIN candidates ON votes.candidate_id = candidates.id
            ORDER BY votes.timestamp DESC
        ''')
        votes = cursor.fetchall()
        conn.close()
        
        return jsonify({
            'votes': [
                {
                    'id': v['id'],
                    'voter_name': v['voter_name'],
                    'voter_email': v['voter_email'],
                    'candidate_name': v['candidate_name'],
                    'party_name': v['party_name'],
                    'timestamp': v['timestamp']
                }
                for v in votes
            ],
            'total': len(votes)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/admin/results', methods=['GET'])
@admin_required
def get_election_results():
    """Get election results with vote counts and percentages."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) as total FROM votes')
        total_votes = cursor.fetchone()['total']

        cursor.execute('''
            SELECT 
                candidates.id,
                candidates.candidate_name,
                candidates.party_name,
                COUNT(votes.id) as vote_count
            FROM candidates
            LEFT JOIN votes ON candidates.id = votes.candidate_id
            GROUP BY candidates.id
            ORDER BY vote_count DESC, candidates.candidate_name ASC
        ''')
        results = cursor.fetchall()
        conn.close()

        results_list = []
        rank = 1
        for r in results:
            vote_count = r['vote_count']
            percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
            
            results_list.append({
                'rank': rank,
                'candidate_name': r['candidate_name'],
                'party_name': r['party_name'],
                'vote_count': vote_count,
                'percentage': round(percentage, 2)
            })
            rank += 1
        
        return jsonify({
            'results': results_list,
            'total_votes': total_votes
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

@app.route('/admin/stats', methods=['GET'])
@admin_required
def get_election_stats():
    """Get election statistics."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) as total FROM voters')
        total_voters = cursor.fetchone()['total']

        cursor.execute('SELECT COUNT(*) as total FROM votes')
        total_votes = cursor.fetchone()['total']

        cursor.execute('SELECT COUNT(*) as total FROM candidates')
        total_candidates = cursor.fetchone()['total']
        
        conn.close()
        
        turnout_percentage = (total_votes / total_voters * 100) if total_voters > 0 else 0
        
        return jsonify({
            'total_voters': total_voters,
            'total_votes': total_votes,
            'turnout_percentage': round(turnout_percentage, 2),
            'total_candidates': total_candidates
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'An error occurred'}), 500

if __name__ == '__main__':
    print('VoteSecure Voting System')
    print('Server starting at http://127.0.0.1:5000')
    app.run(debug=True, host='127.0.0.1', port=5000)
