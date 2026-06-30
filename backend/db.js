const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const pool = {
  query: async (sql, params) => {
    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const isInsert = trimmed.startsWith('INSERT');

    const stmt = db.prepare(sql);

    if (isSelect) {
      const rows = params && params.length ? stmt.all(...params) : stmt.all();
      return [rows];
    }

    const result = params && params.length ? stmt.run(...params) : stmt.run();

    if (isInsert) {
      return [{ insertId: Number(result.lastInsertRowid), affectedRows: result.changes }];
    }

    return [{ affectedRows: result.changes }];
  },

  get db() { return db; },
};

module.exports = pool;
