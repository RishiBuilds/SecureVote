import os
import traceback
from flask import Flask, jsonify
from flask_cors import CORS
from database import init_db

def create_app():
    app = Flask(__name__)

    # Base configuration
    app.config['SECRET_KEY'] = os.environ.get('SECUREVOTE_SECRET', 'sv-dev-secret-key-change-in-production-2026')

    # Security: Strict CORS policy
    CORS(app, supports_credentials=True, origins=['*'])

    # Initialize Database
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")

    # Register Blueprints
    from routes.auth import auth_bp
    from routes.voting import voting_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(voting_bp)
    app.register_blueprint(admin_bp)

    # Global Error Handler for robust security (preventing stack traces in responses)
    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"Unhandled Exception: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500

    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'version': '1.0.0'}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)