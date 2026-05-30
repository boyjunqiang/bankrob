import sqlite3
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow cross-origin requests from the game

DB_PATH = 'leaderboard.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            score REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    name = data.get('name')
    score = data.get('score')

    if not name or score is None:
        return jsonify({'error': 'Missing name or score'}), 400
    
    # Simple validation
    name = name[:20] # Limit name length
    try:
        score = float(score)
    except ValueError:
        return jsonify({'error': 'Invalid score'}), 400

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Check if user exists
    c.execute('SELECT score FROM scores WHERE name = ?', (name,))
    row = c.fetchone()
    if row:
        existing_score = row[0]
        if score > existing_score:
            c.execute('UPDATE scores SET score = ?, timestamp = CURRENT_TIMESTAMP WHERE name = ?', (score, name))
    else:
        c.execute('INSERT INTO scores (name, score) VALUES (?, ?)', (name, score))
        
    conn.commit()
    
    # Calculate rank
    c.execute('SELECT COUNT(*) + 1 FROM scores WHERE score > ?', (score,))
    rank = c.fetchone()[0]
    
    conn.close()
    
    return jsonify({'success': True, 'rank': rank})

@app.route('/leaderboard', methods=['GET'])
def leaderboard():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Get top 50
    c.execute('SELECT name, score FROM scores ORDER BY score DESC LIMIT 50')
    rows = c.fetchall()
    conn.close()
    
    result = [{'name': row[0], 'score': row[1]} for row in rows]
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9801)
