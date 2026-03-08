const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const db = new sqlite3.Database(':memory:');

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

app.use(express.static('public'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// App info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    app: 'todo-app',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    lastDeployed: new Date(2026, 2, 8, 14, 30, 0).toISOString()
  });
});

// Helper functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth endpoints
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const password_hash = hashPassword(password);
  db.run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, password_hash],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      const token = jwt.sign({ userId: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, username });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const password_hash = hashPassword(password);
  db.get(
    'SELECT id, username FROM users WHERE username = ? AND password_hash = ?',
    [username, password_hash],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, username: user.username });
    }
  );
});

// Todo endpoints
app.get('/api/todos', verifyAuth, (req, res) => {
  db.all('SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC', [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/todos', verifyAuth, (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title required' });
  }

  db.run('INSERT INTO todos (user_id, title) VALUES (?, ?)', [req.user.userId, title], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, user_id: req.user.userId, title, completed: 0 });
  });
});

app.patch('/api/todos/:id', verifyAuth, (req, res) => {
  const { id } = req.params;
  db.run(
    'UPDATE todos SET completed = 1 - completed WHERE id = ? AND user_id = ?',
    [id, req.user.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    }
  );
});

app.delete('/api/todos/:id', verifyAuth, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Todo app with auth listening on port ${PORT}`);
});
