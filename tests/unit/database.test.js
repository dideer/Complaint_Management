const mysql = require('mysql2/promise');
const { validComplaint, complaintWithAllFields } = require('../fixtures/complaint.fixture');

describe('Database Operations - Unit Tests', () => {
  let pool;
  let connection;

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

    try {
      connection = await pool.getConnection();
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
      connection.release();
    } catch (error) {
      console.error('Setup failed:', error);
    }
  });

  beforeEach(async () => {
    try {
      const conn = await pool.getConnection();
      await conn.query('TRUNCATE TABLE complaints');
      conn.release();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  afterAll(async () => {
    try {
      const conn = await pool.getConnection();
      await conn.query('DROP TABLE IF EXISTS complaints');
      conn.release();
      await pool.end();
    } catch (error) {
      console.error('Teardown failed:', error);
    }
  });

  test('should insert a complaint into the database', async () => {
    const conn = await pool.getConnection();
    const { title, description, category, priority } = validComplaint;

    const result = await conn.query(
      'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, priority, 'Open']
    );

    expect(result[0].affectedRows).toBe(1);
    expect(result[0].insertId).toBeGreaterThan(0);
    conn.release();
  });

  test('should retrieve a complaint by id', async () => {
    const conn = await pool.getConnection();
    const { title, description, category, priority } = validComplaint;

    const insertResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, priority, 'Open']
    );

    const complaintId = insertResult[0].insertId;
    const [complaints] = await conn.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);

    expect(complaints).toHaveLength(1);
    expect(complaints[0].id).toBe(complaintId);
    expect(complaints[0].title).toBe(title);
    conn.release();
  });

  test('should update complaint status', async () => {
    const conn = await pool.getConnection();
    const { title, description, category, priority } = validComplaint;

    const insertResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, priority, 'Open']
    );

    const complaintId = insertResult[0].insertId;
    await conn.query('UPDATE complaints SET status = ? WHERE id = ?', ['Resolved', complaintId]);

    const [complaints] = await conn.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    expect(complaints[0].status).toBe('Resolved');
    conn.release();
  });

  test('should delete a complaint', async () => {
    const conn = await pool.getConnection();
    const { title, description, category, priority } = validComplaint;

    const insertResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, category, priority, 'Open']
    );

    const complaintId = insertResult[0].insertId;
    await conn.query('DELETE FROM complaints WHERE id = ?', [complaintId]);

    const [complaints] = await conn.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    expect(complaints).toHaveLength(0);
    conn.release();
  });

  test('should retrieve all complaints', async () => {
    const conn = await pool.getConnection();

    for (const complaint of [validComplaint, complaintWithAllFields]) {
      await conn.query(
        'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
        [complaint.title, complaint.description, complaint.category, complaint.priority, 'Open']
      );
    }

    const [complaints] = await conn.query('SELECT * FROM complaints');
    expect(complaints).toHaveLength(2);
    conn.release();
  });

  test('should enforce priority enum constraint', async () => {
    const conn = await pool.getConnection();

    try {
      await conn.query(
        'INSERT INTO complaints (title, description, category, priority, status) VALUES (?, ?, ?, ?, ?)',
        ['Test', 'Test', 'IT', 'InvalidPriority', 'Open']
      );
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }

    conn.release();
  });
});
