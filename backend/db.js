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

  // Static, global list of shops for deposits (same for every group)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    )
  `);

  // Seeded on every startup - INSERT OR IGNORE skips names that already exist,
  // so adding a new shop is just appending it to this array.
  const SHOPS = [
    "Biedronka", "Lidl", "Kaufland", "Auchan", "Carrefour", "Carrefour Express",
    "Dino", "Netto", "Aldi", "Żabka", "Stokrotka", "Intermarché", "E.Leclerc",
    "Polomarket", "Lewiatan", "Delikatesy Centrum", "Groszek", "Spar", "Eurospar",
    "Topaz", "Mila", "Społem", "Chata Polska", "Top Market", "Prim Market",
    "Euro Sklep", "ABC", "Odido", "Freshmarket", "Livio", "Gram Market",
    "Frac", "Arhelan", "Biedronka Express", "Makro", "Selgros", "Rossmann",
    "Hebe", "Orlen", "Circle K", "BP", "Shell", "MOL", "Amic Energy",
    "Inny",
  ];
  const placeholders = SHOPS.map(() => "(?)").join(", ");
  await db.run(`INSERT OR IGNORE INTO shops (name) VALUES ${placeholders}`, SHOPS);

  // Per-group shop preference. No row = normal shop; 'favorite' = shown first;
  // 'hidden' = not shown in the shop picker (still visible on existing deposits).
  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_shop_preferences (
      group_id TEXT NOT NULL,
      shop_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('favorite', 'hidden')),
      PRIMARY KEY (group_id, shop_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  `);

  // Deposit (bottle return) vouchers
  await db.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      shop_id INTEGER,
      value REAL NOT NULL,
      code TEXT,
      expiring_date DATETIME,
      image_url TEXT,
      added_at DATETIME DEFAULT (datetime('now','localtime')),
      used_at DATETIME DEFAULT NULL,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_deposits_group ON deposits (group_id)`);

  console.log("Baza danych SQLite została załadowana i tabele są gotowe!");
  return db;
}

// Eksportujemy funkcję, żeby wywołać ją w index.js
module.exports = { initDB };
