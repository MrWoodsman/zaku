const pino = require("pino");
const path = require("path");

// One shared logger for the whole backend, same readable lines in both places:
// - console (docker logs / journalctl)
// - files in LOG_DIR, rotated daily, last LOG_RETENTION_DAYS days kept.
//   Defaults to data/logs, so in Docker it lands in the same volume as the database.
const level = process.env.LOG_LEVEL || "info";
const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

// Readable lines, e.g.
// [2026-10-03 12:00:00] INFO: GET /api/v1/lists 200 18ms | iPhone Safari | dev:3f2a... | grupa:dom
// IP, full user-agent, pid etc. are left to the JSON files.
const prettyOptions = {
  singleLine: true,
  translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
  messageFormat:
    "{msg}{if device} | {device}{end}{if deviceId} | dev:{deviceId}{end}{if groupId} | grupa:{groupId}{end}",
  ignore: "pid,hostname,req,res,responseTime,groupId,deviceId,device,ip,userAgent",
};

function createLogger() {
  if (isTest) return pino({ level: "silent" });

  const targets = [{ target: "pino-pretty", level, options: prettyOptions }];

  if (process.env.LOG_DIR !== "off") {
    const logDir = path.resolve(process.env.LOG_DIR || path.join(__dirname, "data", "logs"));
    // The extension goes in the file name - pino-roll ignores its own "extension" option
    const rollOptions = (file) => ({
      file,
      frequency: "daily",
      dateFormat: "yyyy-MM-dd",
      limit: { count: Number(process.env.LOG_RETENTION_DAYS) || 14 },
      mkdir: true,
    });

    // logs/app.<date>.<n>.log - readable, for looking through by eye
    targets.push({
      target: path.join(__dirname, "logFileTransport.js"),
      level,
      options: { pretty: prettyOptions, roll: rollOptions(path.join(logDir, "app.log")) },
    });
    // logs/json/app.<date>.<n>.json - every field (pid, request id, ...), for jq/scripts.
    // Own folder, so pino-roll's file numbering and cleanup don't mix the two formats.
    targets.push({
      target: "pino-roll",
      level,
      options: rollOptions(path.join(logDir, "json", "app.json")),
    });
  }

  return pino({ level, transport: { targets } });
}

const logger = createLogger();

module.exports = { logger };
