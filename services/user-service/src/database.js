const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'users.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'client',
    created_at TEXT NOT NULL
  )
`);

const userRepository = {
  create(user) {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, created_at)
      VALUES (@id, @email, @full_name, @phone, @role, @created_at)
    `);
    stmt.run(user);
    return this.findById(user.id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const users = db
      .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
    const { total } = db.prepare('SELECT COUNT(*) as total FROM users').get();
    return { users, total };
  },

  search(query) {
    const pattern = `%${query}%`;
    const users = db
      .prepare(
        `SELECT * FROM users
         WHERE email LIKE ? OR full_name LIKE ? OR phone LIKE ?
         ORDER BY full_name ASC`
      )
      .all(pattern, pattern, pattern);
    return { users, total: users.length };
  },

  update(id, fields) {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = {
      email: fields.email || existing.email,
      full_name: fields.full_name || existing.full_name,
      phone: fields.phone ?? existing.phone,
      role: fields.role || existing.role,
    };

    db.prepare(
      `UPDATE users SET email = @email, full_name = @full_name, phone = @phone, role = @role
       WHERE id = @id`
    ).run({ ...updated, id });

    return this.findById(id);
  },

  delete(id) {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

module.exports = { db, userRepository };
