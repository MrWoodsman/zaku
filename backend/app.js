const express = require("express");
const path = require("path");

const listsRoutes = require("./routes/v1/lists.routes");
const itemsRoutes = require("./routes/v1/items.routes");
const recipesRoutes = require("./routes/v1/recipes.routes");
const voiceRoutes = require("./routes/v1/voice.routes");

// Buduje gotową aplikację Express, ale NIE odpala serwera (brak .listen).
// Dzięki temu można ją "wziąć" w testach i strzelać w nią requestami przez supertest,
// bez realnego portu i bez node index.js.
function createApp(db) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.use(async (req, res, next) => {
    const groupId = req.headers["x-group-id"];
    if (!groupId) return next();
    try {
      const existing = await req.db.get(`SELECT id FROM groups WHERE id = ?`, [groupId]);
      if (!existing) {
        await req.db.run(`INSERT INTO groups (id, name) VALUES (?, ?)`, [groupId, groupId]);
      }
      return next();
    } catch (err) {
      console.error("Błąd podczas sprawdzania/tworzenia grupy:", err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  });

  app.use("/images", express.static(path.join(__dirname, "uploads")));

  app.use("/api/v1/lists", listsRoutes);
  app.use("/api/v1/items", itemsRoutes);
  app.use("/api/v1/recipes", recipesRoutes);
  app.use("/api/v1/voice", voiceRoutes);

  app.get("/api/test", (req, res) => {
    res.json({ message: "Działa V1!" });
  });

  return app;
}

module.exports = { createApp };
