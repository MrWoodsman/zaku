// Who sent a request, for the logs: no accounts, so it's the group, the device id
// the frontend generates once per browser, a short device label and the IP.

// "iPhone Safari", "Android Chrome", "Windows Edge"... - enough to spot
// "it only breaks on iPhones" without reading full user-agent strings.
// Order matters: most UAs also contain "Safari"/"Chrome" for compatibility.
const SYSTEMS = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];
const BROWSERS = [
  [/Edg(A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung"],
  [/FxiOS\/|Firefox\//, "Firefox"],
  [/CriOS\/|Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

function describeDevice(userAgent) {
  if (!userAgent) return undefined;
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  // Not a browser (curl, scripts, bots) - the first token says enough, e.g. "curl/8.4.0"
  if (!system && !browser) return userAgent.split(" ")[0].slice(0, 40);
  return [system, browser].filter(Boolean).join(" ");
}

// IPv4 clients show up as "::ffff:192.168.1.10" on a dual-stack socket
const cleanIp = (ip) => ip?.replace(/^::ffff:/, "");

function requestInfo(req) {
  return {
    groupId: req.headers["x-group-id"] || undefined,
    deviceId: req.headers["x-device-id"] || undefined,
    device: describeDevice(req.headers["user-agent"]),
    ip: cleanIp(req.ip),
    userAgent: req.headers["user-agent"],
  };
}

// TRUST_PROXY decides whether X-Forwarded-For is believed (= the real phone IP behind
// a reverse proxy). Default: only proxies on this machine or the local network.
function trustProxySetting(value = process.env.TRUST_PROXY) {
  if (!value) return "loopback, linklocal, uniquelocal";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

module.exports = { requestInfo, describeDevice, trustProxySetting };
