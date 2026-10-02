const express = require("express");
const path = require("path");
const fs = require("fs");
const { initDB } = require("./db");
const { createApp } = require("./app");
const { logger } = require("./logger");

// Crashes still crash (docker/systemd restarts the app), but now leave the stack in the logs
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});

async function startServer() {
  try {
    const db = await initDB();

    // TWORZENIE FODLERU DO PRZECHOWYWANIA ZDJEC
    const uploadDir = path.join(__dirname, "uploads", "recipes");
    const uploadDirRefund = path.join(__dirname, "uploads", "refunds");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info("Utworzono brakujący katalog na zdjęcia: uploads/recipes");
    }
    if (!fs.existsSync(uploadDirRefund)) {
      fs.mkdirSync(uploadDirRefund, { recursive: true });
      logger.info("Utworzono brakujący katalog na zdjęcia: uploads/refunds");
    }

    const app = createApp(db);

    const frontendPath = path.join(__dirname, "../frontend/dist");
    app.use(express.static(frontendPath));

    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => logger.info(`Serwer działa na http://localhost:${PORT}`));
  } catch (error) {
    logger.fatal({ err: error }, "Błąd podczas startu serwera/bazy");
  }
}

startServer();
