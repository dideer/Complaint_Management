require('dotenv').config({ path: '.env.test' });

// Set test environment variables with defaults
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'password';
process.env.DB_NAME = process.env.DB_NAME || 'complaints_db_test';
process.env.PORT = process.env.PORT || 3001;

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (allow warnings and errors)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};
