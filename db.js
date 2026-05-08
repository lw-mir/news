const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'news.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    source_name TEXT NOT NULL,
    published_at TEXT,
    collected_at TEXT NOT NULL,
    keywords_matched TEXT,
    selected INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings VALUES ('cron_schedule', '0 20 * * *');
  INSERT OR IGNORE INTO settings VALUES ('keywords', JSON('["讣告","通报","情况说明","处分","违纪","违规","Nature","Science","突破","首次","新策略","研究生","招生","导师","教授","校长"]'));
  INSERT OR IGNORE INTO settings VALUES ('date_range_days', '1');
`);

module.exports = {
  db,

  insertArticle(article) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO articles (title, url, source, source_name, published_at, collected_at, keywords_matched)
      VALUES (@title, @url, @source, @source_name, @published_at, @collected_at, @keywords_matched)
    `);
    return stmt.run(article);
  },

  getArticles({ source, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    let query = 'SELECT * FROM articles';
    const params = [];
    if (source) {
      query += ' WHERE source = ?';
      params.push(source);
    }
    query += ' ORDER BY collected_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    return db.prepare(query).all(...params);
  },

  getCount(source) {
    if (source) {
      return db.prepare('SELECT COUNT(*) as count FROM articles WHERE source = ?').get(source).count;
    }
    return db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  },

  getSources() {
    return db.prepare('SELECT source, source_name, COUNT(*) as count FROM articles GROUP BY source ORDER BY source_name').all();
  },

  clearArticles() {
    db.prepare('DELETE FROM articles').run();
  },

  getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings VALUES (?, ?)').run(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  },

  getAllSettings() {
    return db.prepare('SELECT * FROM settings').all().reduce((acc, row) => {
      try { acc[row.key] = JSON.parse(row.value); } catch { acc[row.key] = row.value; }
      return acc;
    }, {});
  }
};
