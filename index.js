const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'complaints_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Get all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [complaints] = await connection.query('SELECT * FROM complaints ORDER BY created_at DESC');
    connection.release();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Create complaint
app.post('/api/complaints', async (req, res) => {
  const { title, description, category, priority } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, priority, 'Open']
    );
    connection.release();
    res.status(201).json({ message: 'Complaint created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Update complaint status
app.put('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
    connection.release();
    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Delete complaint
app.delete('/api/complaints/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM complaints WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get complaint details with comments
app.get('/api/complaints/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [complaints] = await connection.query('SELECT * FROM complaints WHERE id = ?', [id]);
    
    if (complaints.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const [comments] = await connection.query(
      'SELECT * FROM comments WHERE complaint_id = ? ORDER BY created_at ASC',
      [id]
    );
    connection.release();

    res.json({
      complaint: complaints[0],
      comments: comments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add comment/answer to complaint
app.post('/api/complaints/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { comment, author, is_resolution } = req.body;

  if (!comment || !author) {
    return res.status(400).json({ error: 'Comment and author are required' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, comment, author, is_resolution || false]
    );
    connection.release();
    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get all comments for a complaint
app.get('/api/complaints/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [comments] = await connection.query(
      'SELECT * FROM comments WHERE complaint_id = ? ORDER BY created_at ASC',
      [id]
    );
    connection.release();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Delete comment
app.delete('/api/comments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM comments WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize DB and start server
async function initializeDB() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100),
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        comment TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        is_resolution BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

app.listen(PORT, async () => {
  await initializeDB();
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
