const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'catalog.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price_per_day REAL NOT NULL,
    availability INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    created_at TEXT NOT NULL
  )
`);

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM resources').get();
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO resources (id, name, description, category, price_per_day, availability, location, created_at)
      VALUES (@id, @name, @description, @category, @price_per_day, @availability, @location, @created_at)
    `);
    const now = new Date().toISOString();
    const samples = [
      { name: 'Salle de conférence A', description: 'Salle équipée pour 50 personnes', category: 'salle', price_per_day: 150, availability: 3, location: 'Paris' },
      { name: 'Studio photo', description: 'Studio professionnel avec éclairage', category: 'studio', price_per_day: 200, availability: 2, location: 'Lyon' },
      { name: 'Véhicule utilitaire', description: 'Camionnette 12m³', category: 'vehicule', price_per_day: 80, availability: 5, location: 'Marseille' },
      { name: 'Espace coworking', description: 'Bureau partagé premium', category: 'bureau', price_per_day: 45, availability: 10, location: 'Toulouse' },
    ];
    for (const s of samples) {
      insert.run({ id: uuidv4(), ...s, created_at: now });
    }
    console.log('[Catalog Service] Données de démonstration insérées');
  }
}

seedIfEmpty();

const resourceRepository = {
  create(resource) {
    db.prepare(`
      INSERT INTO resources (id, name, description, category, price_per_day, availability, location, created_at)
      VALUES (@id, @name, @description, @category, @price_per_day, @availability, @location, @created_at)
    `).run(resource);
    return this.findById(resource.id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  },

  findAll(page = 1, limit = 20, category = '') {
    const offset = (page - 1) * limit;
    let users;
    let totalRow;

    if (category) {
      users = db
        .prepare(
          'SELECT * FROM resources WHERE category = ? ORDER BY name ASC LIMIT ? OFFSET ?'
        )
        .all(category, limit, offset);
      totalRow = db
        .prepare('SELECT COUNT(*) as total FROM resources WHERE category = ?')
        .get(category);
    } else {
      users = db
        .prepare('SELECT * FROM resources ORDER BY name ASC LIMIT ? OFFSET ?')
        .all(limit, offset);
      totalRow = db.prepare('SELECT COUNT(*) as total FROM resources').get();
    }

    return { resources: users, total: totalRow.total };
  },

  search(query, category = '') {
    const pattern = `%${query}%`;
    let resources;
    if (category) {
      resources = db
        .prepare(
          `SELECT * FROM resources
           WHERE category = ? AND (name LIKE ? OR description LIKE ? OR location LIKE ?)
           ORDER BY name ASC`
        )
        .all(category, pattern, pattern, pattern);
    } else {
      resources = db
        .prepare(
          `SELECT * FROM resources
           WHERE name LIKE ? OR description LIKE ? OR location LIKE ? OR category LIKE ?
           ORDER BY name ASC`
        )
        .all(pattern, pattern, pattern, pattern);
    }
    return { resources, total: resources.length };
  },

  update(id, fields) {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = {
      name: fields.name || existing.name,
      description: fields.description ?? existing.description,
      category: fields.category || existing.category,
      price_per_day: fields.price_per_day ?? existing.price_per_day,
      availability: fields.availability ?? existing.availability,
      location: fields.location ?? existing.location,
    };

    db.prepare(
      `UPDATE resources SET name = @name, description = @description, category = @category,
       price_per_day = @price_per_day, availability = @availability, location = @location
       WHERE id = @id`
    ).run({ ...updated, id });

    return this.findById(id);
  },

  updateAvailability(id, delta) {
    const resource = this.findById(id);
    if (!resource) return null;

    const newAvailability = resource.availability + delta;
    if (newAvailability < 0) {
      throw new Error('Disponibilité insuffisante');
    }

    db.prepare('UPDATE resources SET availability = ? WHERE id = ?').run(newAvailability, id);
    return this.findById(id);
  },

  delete(id) {
    const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

module.exports = { db, resourceRepository };
