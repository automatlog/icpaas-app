const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'dev.db');
const migrationPath = path.join(__dirname, 'migrations', '0001_init', 'migration.sql');

if (!fs.existsSync(migrationPath)) {
  throw new Error(`Migration file not found: ${migrationPath}`);
}

if (fs.existsSync(dbPath)) {
  console.log(`Prisma SQLite database already exists at ${dbPath}`);
  process.exit(0);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
const db = new DatabaseSync(dbPath);

try {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(sql);
  console.log(`Initialized Prisma SQLite database at ${dbPath}`);
} finally {
  db.close();
}
