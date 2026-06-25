const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'bookings.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  )
`);

const bookingRepository = {
  create(booking) {
    db.prepare(`
      INSERT INTO bookings (id, user_id, resource_id, start_date, end_date, total_price, status, created_at)
      VALUES (@id, @user_id, @resource_id, @start_date, @end_date, @total_price, @status, @created_at)
    `).run(booking);
    return this.findById(booking.id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  },

  findAll(page = 1, limit = 20, status = '') {
    const offset = (page - 1) * limit;
    let bookings;
    let totalRow;

    if (status) {
      bookings = db
        .prepare(
          'SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
        )
        .all(status, limit, offset);
      totalRow = db
        .prepare('SELECT COUNT(*) as total FROM bookings WHERE status = ?')
        .get(status);
    } else {
      bookings = db
        .prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(limit, offset);
      totalRow = db.prepare('SELECT COUNT(*) as total FROM bookings').get();
    }

    return { bookings, total: totalRow.total };
  },

  findByUserId(userId) {
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
    return { bookings, total: bookings.length };
  },

  updateStatus(id, status) {
    const existing = this.findById(id);
    if (!existing) return null;
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    return this.findById(id);
  },
};

function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
}

module.exports = { db, bookingRepository, calculateDays };
