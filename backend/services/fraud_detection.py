import json
from datetime import datetime, timedelta
from database import get_db_connection


def check_ip_anomaly(ip_address, election_id):
    """Check if multiple different users have voted from the same IP."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT COUNT(DISTINCT user_id) as count FROM votes WHERE ip_address = ? AND election_id = ?',
        (ip_address, election_id)
    )
    count = cursor.fetchone()['count']
    conn.close()

    if count >= 3:
        create_fraud_alert(
            user_id=None,
            election_id=election_id,
            alert_type='multiple_ip_votes',
            details=f'{count + 1} different users have voted from IP {ip_address}',
            severity='high' if count >= 5 else 'medium'
        )
        return True
    return False


def check_rapid_submission(user_id):
    """Check if a user has submitted actions suspiciously fast."""
    conn = get_db_connection()
    cursor = conn.cursor()
    