const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('aims-db.db');

module.exports = db;