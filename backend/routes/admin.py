from flask import Blueprint, request, jsonify, g
from database import get_db_connection
from decorators import admin_required, token_required
from services.audit import log_action, get_audit_logs
from services.fraud_detection import get_fraud_alerts
from services.vote_security import verify_chain

admin_bp = Blueprint('admin', __name__)


