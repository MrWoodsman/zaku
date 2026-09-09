require("dotenv").config();
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const fs = require("fs");

async function initDB() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "database.sqlite");

  const dirPath = path.dirname(dbPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Utworzono brakujący folder dla bazy danych: ${dirPath}`);
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Włączamy FOREIGN KEY constraints
  await db.exec("PRAGMA foreign_keys = ON;");

  // Tworzymy tabelę Grup
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  // Tworzymy tabelę List
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      name TEXT,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  // Tworzymy tabelę Produktów
  await db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      list_id TEXT,
      name TEXT,
      quantity REAL,
      unit TEXT,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      completed_at DATETIME DEFAULT NULL,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (list_id) REFERENCES lists(id)
    )
  `);

  // Generated once on first run and reused forever after - existing push
  // subscriptions are tied to this exact key pair, so it must stay stable.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vapid_keys (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL
    )
  `);

  // One push subscription per device (browser). Re-subscribing (e.g. after
  // switching group) just overwrites the row for that deviceId.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      device_id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  // Tracks, per device, when a list was last opened/seen (no user accounts, so
  // "who saw what" is keyed by the client-generated deviceId, not a user id)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS list_views (
      device_id TEXT NOT NULL,
      list_id TEXT NOT NULL,
      last_seen_at DATETIME DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (device_id, list_id),
      FOREIGN KEY (list_id) REFERENCES lists(id)
    )
  `);

  // Tworzeymy tabele Przepisów
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      name TEXT,
      description TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      last_update DATETIME DEFAULT (datetime('now','localtime')),
      deleted_at DATETIME DEFAULT NULL,
      time_to_make INTEGER,
      is_global BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'draft',
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  // Tworzymy tabele składników
  await db.exec(`
  CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );
`);

  // Tworzymy tabele krokó
  await db.exec(`
  CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      title TEXT,
      description TEXT,
      image_url TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  );
`);

  console.log("Baza danych SQLite została załadowana i tabele są gotowe!");
  return db;
}

// Eksportujemy funkcję, żeby wywołać ją w index.js
module.exports = { initDB };
