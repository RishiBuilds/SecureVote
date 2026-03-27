import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from database import init_db

def create_app():
    app = Flask(__name__, static_folder=None)

    app.config['SECRET_KEY'] = os.environ.get('SECUREVOTE_SECRET', 'sv-dev-secret-key-change-in-production-2026')

    CORS(app, supports_credentials=True, origins=['*'])

    