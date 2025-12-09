const mysql = require('mysql2/promise');

describe('Comments Database Operations - Unit Tests', () => {
  let pool;

  beforeAll(async () => {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'complaints_db_test',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    await conn.query(`
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

    await conn.query(`
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
    conn.release();
  });

  beforeEach(async () => {
    const conn = await pool.getConnection();
    await conn.query('TRUNCATE TABLE comments');
    await conn.query('TRUNCATE TABLE complaints');
    conn.release();
  });

  afterAll(async () => {
    const conn = await pool.getConnection();
    await conn.query('DROP TABLE IF EXISTS comments');
    await conn.query('DROP TABLE IF EXISTS complaints');
    conn.release();
    await pool.end();
  });

  test('should insert a comment for a complaint', async () => {
    const conn = await pool.getConnection();

    // Create complaint first
    const complaintResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority) VALUES (?, ?, ?, ?)',
      ['Test', 'Test Description', 'IT', 'High']
    );
    const complaintId = complaintResult[0].insertId;

    // Insert comment
    const commentResult = await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'This is a test comment', 'Admin', false]
    );

    expect(commentResult[0].affectedRows).toBe(1);
    expect(commentResult[0].insertId).toBeGreaterThan(0);
    conn.release();
  });

  test('should retrieve all comments for a complaint', async () => {
    const conn = await pool.getConnection();

    const complaintResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority) VALUES (?, ?, ?, ?)',
      ['Test', 'Test Description', 'IT', 'High']
    );
    const complaintId = complaintResult[0].insertId;

    await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'Comment 1', 'Admin', false]
    );

    await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'Solution', 'Support', true]
    );

    const [comments] = await conn.query(
      'SELECT * FROM comments WHERE complaint_id = ?',
      [complaintId]
    );

    expect(comments).toHaveLength(2);
    expect(comments[0].author).toBe('Admin');
    expect(comments[1].is_resolution).toBe(true);
    conn.release();
  });

  test('should delete a comment', async () => {
    const conn = await pool.getConnection();

    const complaintResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority) VALUES (?, ?, ?, ?)',
      ['Test', 'Test Description', 'IT', 'High']
    );
    const complaintId = complaintResult[0].insertId;

    const commentResult = await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'Test comment', 'Admin', false]
    );
    const commentId = commentResult[0].insertId;

    await conn.query('DELETE FROM comments WHERE id = ?', [commentId]);

    const [comments] = await conn.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    expect(comments).toHaveLength(0);
    conn.release();
  });

  test('should cascade delete comments when complaint is deleted', async () => {
    const conn = await pool.getConnection();

    const complaintResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority) VALUES (?, ?, ?, ?)',
      ['Test', 'Test Description', 'IT', 'High']
    );
    const complaintId = complaintResult[0].insertId;

    await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'Test comment', 'Admin', false]
    );

    await conn.query('DELETE FROM complaints WHERE id = ?', [complaintId]);

    const [comments] = await conn.query(
      'SELECT * FROM comments WHERE complaint_id = ?',
      [complaintId]
    );
    expect(comments).toHaveLength(0);
    conn.release();
  });
});
