const express = require("express");
const path = require("path");
const fs = require("fs");
const { initDB } = require("./db");
const { createApp } = require("./app");

async function startServer() {
  try {
    const db = await initDB();

    // TWORZENIE FODLERU DO PRZECHOWYWANIA ZDJEC
    const uploadDir = path.join(__dirname, "uploads", "recipes");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("Utworzono brakujący katalog na zdjęcia: uploads/recipes");
    }

    const app = createApp(db);

    const frontendPath = path.join(__dirname, "../frontend/dist");
    app.use(express.static(frontendPath));

    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serwer działa na http://localhost:${PORT}`));
  } catch (error) {
    console.error("Błąd podczas startu serwera/bazy:", error);
  }
}

startServer();
