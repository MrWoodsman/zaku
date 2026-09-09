const webpush = require("web-push");

// Resolves the VAPID key pair: env vars win (for pinning a known pair across
// deploys), otherwise a pair generated on first run and persisted in the DB
// is reused - it must stay stable, since existing push subscriptions are
// tied to whichever public key was used to create them.
let cachedKeys = null;
async function getVapidKeys(db) {
  if (cachedKeys) return cachedKeys;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cachedKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
    return cachedKeys;
  }

  const existing = await db.get(`SELECT public_key, private_key FROM vapid_keys WHERE id = 1`);
  if (existing) {
    cachedKeys = { publicKey: existing.public_key, privateKey: existing.private_key };
    return cachedKeys;
  }

  const generated = webpush.generateVAPIDKeys();
  await db.run(`INSERT INTO vapid_keys (id, public_key, private_key) VALUES (1, ?, ?)`, [
    generated.publicKey,
    generated.privateKey,
  ]);
  cachedKeys = generated;
  return cachedKeys;
}

let vapidConfigured = false;
async function ensureVapidConfigured(db) {
  if (vapidConfigured) return;
  const { publicKey, privateKey } = await getVapidKeys(db);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
}

// Notifies every device subscribed to a group (except the one that triggered
// the change) that a list has new, unseen items - with a running total so
// re-notifications ("added 5", then "added 10") show the real count.
async function notifyListChanged(db, { groupId, listId, listName, excludeDeviceId }) {
  const subscriptions = await db.all(
    `SELECT device_id, endpoint, p256dh, auth FROM push_subscriptions
     WHERE group_id = ? AND device_id != ?`,
    [groupId, excludeDeviceId || ""],
  );

  if (subscriptions.length === 0) return;
  await ensureVapidConfigured(db);

  for (const sub of subscriptions) {
    const { pending } = await db.get(
      `SELECT COUNT(*) AS pending FROM items
       WHERE list_id = ? AND deleted_at IS NULL
         AND created_at > COALESCE(
           (SELECT last_seen_at FROM list_views WHERE device_id = ? AND list_id = ?),
           '1970-01-01'
         )`,
      [listId, sub.device_id, listId],
    );

    const payload = JSON.stringify({
      title: `Lista "${listName}"`,
      body: `Dodano ${pending} nowych produktów`,
      tag: "list-" + listId,
      renotify: true,
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
    } catch (error) {
      // 404/410 = subscription is dead (user revoked permission, uninstalled the app, etc.)
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.run(`DELETE FROM push_subscriptions WHERE device_id = ?`, [sub.device_id]);
      } else {
        console.error("Błąd wysyłki push:", error.message);
      }
    }
  }
}

// iOS (and some other platforms) don't reliably collapse notifications with
// the same `tag` into one - rapid-fire adds would otherwise show up as
// separate, un-replacing notifications. So instead of sending on every single
// item, wait a while after the LAST add to a list before sending one
// notification with the up-to-date total. This isn't urgent info, so we can
// afford to wait long enough to batch a whole shopping-list-building session.
const DEBOUNCE_MS = 2 * 60 * 1000;
const pendingSends = new Map(); // listId -> { timer, params }

function scheduleListChangedNotification(db, params) {
  const existing = pendingSends.get(params.listId);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    pendingSends.delete(params.listId);
    notifyListChanged(db, params).catch((error) =>
      console.error("Błąd powiadomienia push:", error.message),
    );
  }, DEBOUNCE_MS);

  pendingSends.set(params.listId, { timer, params });
}

module.exports = { notifyListChanged, scheduleListChangedNotification, getVapidKeys };
