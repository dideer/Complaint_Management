const request = require('supertest');
const mysql = require('mysql2/promise');
const app = require('../../index');

describe('Comments Workflow - Integration Tests', () => {
  let pool;

  beforeAll(async () => {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
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

  test('should complete complaint workflow with comments: Create -> Comment -> Resolve', async () => {
    // Create complaint
    const createResponse = await request(app)
      .post('/api/complaints')
      .send({
        title: 'System Outage',
        description: 'Server is down',
        category: 'IT',
        priority: 'High'
      })
      .expect(201);

    // Get complaint ID
    const complaintsResponse = await request(app)
      .get('/api/complaints')
      .expect(200);

    const complaintId = complaintsResponse.body[0].id;

    // Add support comment
    const commentResponse = await request(app)
      .post(`/api/complaints/${complaintId}/comments`)
      .send({
        comment: 'We are investigating the issue',
        author: 'Support Team',
        is_resolution: false
      })
      .expect(201);

    expect(commentResponse.body.message).toContain('successfully');

    // Add resolution comment
    const resolutionResponse = await request(app)
      .post(`/api/complaints/${complaintId}/comments`)
      .send({
        comment: 'Server restarted, issue resolved',
        author: 'IT Admin',
        is_resolution: true
      })
      .expect(201);

    // Get complaint with comments
    const detailsResponse = await request(app)
      .get(`/api/complaints/${complaintId}/details`)
      .expect(200);

    expect(detailsResponse.body.comments).toHaveLength(2);
    expect(detailsResponse.body.comments[1].is_resolution).toBe(true);

    // Update status to Resolved
    await request(app)
      .put(`/api/complaints/${complaintId}`)
      .send({ status: 'Resolved' })
      .expect(200);

    const finalDetailsResponse = await request(app)
      .get(`/api/complaints/${complaintId}/details`)
      .expect(200);

    expect(finalDetailsResponse.body.complaint.status).toBe('Resolved');
    expect(finalDetailsResponse.body.comments).toHaveLength(2);
  });

  test('should retrieve complaint details with all comments', async () => {
    const conn = await pool.getConnection();

    // Create complaint
    const complaintResult = await conn.query(
      'INSERT INTO complaints (title, description, category, priority) VALUES (?, ?, ?, ?)',
      ['Test Issue', 'Test Description', 'HR', 'Medium']
    );
    const complaintId = complaintResult[0].insertId;

    // Add multiple comments
    await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'First comment', 'User1', false]
    );

    await conn.query(
      'INSERT INTO comments (complaint_id, comment, author, is_resolution) VALUES (?, ?, ?, ?)',
      [complaintId, 'Solution found', 'Support', true]
    );

    conn.release();

    // Get details via API
    const response = await request(app)
      .get(`/api/complaints/${complaintId}/details`)
      .expect(200);

    expect(response.body.complaint.id).toBe(complaintId);
    expect(response.body.comments).toHaveLength(2);
    expect(response.body.comments[0].author).toBe('User1');
    expect(response.body.comments[1].is_resolution).toBe(true);
  });

  test('should delete comment from complaint', async () => {
    // Create complaint
    const complaintResponse = await request(app)
      .post('/api/complaints')
      .send({
        title: 'Issue',
        description: 'Description',
        category: 'IT',
        priority: 'Low'
      })
      .expect(201);

    const complaintsResponse = await request(app).get('/api/complaints');
    const complaintId = complaintsResponse.body[0].id;

    // Add comment
    const commentResponse = await request(app)
      .post(`/api/complaints/${complaintId}/comments`)
      .send({
        comment: 'Test comment',
        author: 'Admin',
        is_resolution: false
      })
      .expect(201);

    // Get comment ID
    const detailsResponse = await request(app)
      .get(`/api/complaints/${complaintId}/details`)
      .expect(200);

    const commentId = detailsResponse.body.comments[0].id;

    // Delete comment
    await request(app)
      .delete(`/api/comments/${commentId}`)
      .expect(200);

    // Verify deletion
    const finalResponse = await request(app)
      .get(`/api/complaints/${complaintId}/comments`)
      .expect(200);

    expect(finalResponse.body).toHaveLength(0);
  });

  test('should handle invalid complaint ID when adding comment', async () => {
    const response = await request(app)
      .post('/api/complaints/99999/comments')
      .send({
        comment: 'Test',
        author: 'Admin',
        is_resolution: false
      });

    expect(response.status).toBe(500);
  });

  test('should require comment and author fields', async () => {
    const complaintResponse = await request(app)
      .post('/api/complaints')
      .send({
        title: 'Test',
        description: 'Test',
        category: 'IT',
        priority: 'High'
      })
      .expect(201);

    const complaintsResponse = await request(app).get('/api/complaints');
    const complaintId = complaintsResponse.body[0].id;

    const response = await request(app)
      .post(`/api/complaints/${complaintId}/comments`)
      .send({
        comment: 'Only comment'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('required');
  });
});
