import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const db = new Database(join(__dirname, '../data/sms_clients.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sms_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    response_data TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id)
  );

  CREATE TRIGGER IF NOT EXISTS update_clients_timestamp 
  AFTER UPDATE ON clients
  BEGIN
    UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

// Client operations
export const clientOperations = {
  // Get all clients
  getAll: db.prepare('SELECT * FROM clients ORDER BY name ASC'),
  
  // Get client by ID
  getById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  
  // Add new client
  add: db.prepare('INSERT INTO clients (name, phone) VALUES (?, ?)'),
  
  // Update client
  update: db.prepare('UPDATE clients SET name = ?, phone = ? WHERE id = ?'),
  
  // Delete client
  delete: db.prepare('DELETE FROM clients WHERE id = ?'),
  
  // Search clients
  search: db.prepare('SELECT * FROM clients WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC')
};

// SMS history operations
export const smsOperations = {
  // Get all SMS history
  getAll: db.prepare(`
    SELECT h.*, c.name as client_name 
    FROM sms_history h 
    LEFT JOIN clients c ON h.client_id = c.id 
    ORDER BY h.sent_at DESC
  `),
  
  // Add SMS record
  add: db.prepare('INSERT INTO sms_history (client_id, phone, message, sender_name, status, response_data) VALUES (?, ?, ?, ?, ?, ?)'),
  
  // Get SMS history for specific client
  getByClient: db.prepare(`
    SELECT h.*, c.name as client_name 
    FROM sms_history h 
    LEFT JOIN clients c ON h.client_id = c.id 
    WHERE h.client_id = ? 
    ORDER BY h.sent_at DESC
  `)
};

export default db;