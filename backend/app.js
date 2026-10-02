const express = require("express");
const path = require("path");
const pinoHttp = require("pino-http");
const { logger } = require("./logger");
const { requestInfo, trustProxySetting } = require("./requestInfo");

// pino-http makes up an Error ("failed with status code 500") for every 5xx response.
// The route has already logged the real one with its stack, so this one is just noise.
const isStatusOnlyError = (err) => /^failed with status code \d+$/.test(err?.message ?? "");

const listsRoutes = require("./routes/v1/lists.routes");
const itemsRoutes = require("./routes/v1/items.routes");
const recipesRoutes = require("./routes/v1/recipes.routes");
const scanRoutes = require("./routes/v1/scan.routes");
const pushRoutes = require("./routes/v1/push.routes");
const shopsRoutes = require("./routes/v1/shops.routes");
const depositsRoutes = require("./routes/v1/deposits.routes");

// Buduje gotową aplikację Express, ale NIE odpala serwera (brak .listen).
// Dzięki temu można ją "wziąć" w testach i strzelać w nią requestami przez supertest,
// bez realnego portu i bez node index.js.
function createApp(db) {
  const app = express();
  // req.ip = the phone's IP, not the reverse proxy's (see TRUST_PROXY)
  app.set("trust proxy", trustProxySetting());

  // One log line per API request (method, url, status, time), plus req.log for
  // route code - its lines carry the same request id, so they're easy to match up.
  // Static files (frontend, images) are skipped, they'd only drown out the API.
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => !req.url.startsWith("/api/") },
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(responseTime)}ms`,
      customErrorMessage: (req, res, err) =>
        isStatusOnlyError(err)
          ? `${req.method} ${req.originalUrl} ${res.statusCode}`
          : `${req.method} ${req.originalUrl} ${res.statusCode} - ${err.message}`,
      // group, device, IP - on the request line and on every req.log line in the routes
      customProps: (req) => requestInfo(req),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
        // receives the already-serialized error (pino-http wraps this serializer)
        err: (err) => (isStatusOnlyError(err) ? undefined : err),
      },
    }),
  );

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
      req.log.error({ err }, "Failed to check/create group");
      return res.status(500).json({ message: "Błąd serwera" });
    }
  });

  app.use("/images", express.static(path.join(__dirname, "uploads")));

  app.use("/api/v1/lists", listsRoutes);
  app.use("/api/v1/items", itemsRoutes);
  app.use("/api/v1/recipes", recipesRoutes);
  app.use("/api/v1/push", pushRoutes);
  app.use("/api/v1/scan", scanRoutes);
  app.use("/api/v1/shops", shopsRoutes);
  app.use("/api/v1/deposits", depositsRoutes);

  app.get("/api/test", (req, res) => {
    res.json({ message: "Działa V1!" });
  });

  // Last resort for errors no route caught itself (bad JSON body, upload errors,
  // anything thrown outside a try) - logged with the stack instead of Express' default page.
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) req.log.error({ err }, "Unhandled error");
    else req.log.warn({ reason: err.message }, "Rejected request");
    if (res.headersSent) return next(err);
    res.status(status).json({ message: status >= 500 ? "Błąd serwera" : "Nieprawidłowe żądanie" });
  });

  return app;
}

module.exports = { createApp };
