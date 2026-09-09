const express = require("express");
const router = express.Router();
const { getVapidKeys } = require("../../services/pushService");

// GET /api/v1/push/vapid-public-key -> Frontend needs this to call pushManager.subscribe()
router.get("/vapid-public-key", async (req, res) => {
  const { publicKey } = await getVapidKeys(req.db);
  res.json({ publicKey });
});

// POST /api/v1/push/subscribe -> Save (or update) this device's push subscription
router.post("/subscribe", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const { deviceId, subscription } = req.body || {};
  if (!deviceId || !subscription?.endpoint || !subscription?.keys) {
    return res.status(400).json({ message: "Missing deviceId or subscription" });
  }

  try {
    await req.db.run(
      `INSERT INTO push_subscriptions (device_id, group_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (device_id)
       DO UPDATE SET group_id = excluded.group_id, endpoint = excluded.endpoint,
                      p256dh = excluded.p256dh, auth = excluded.auth`,
      [deviceId, groupId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
    );

    res.status(201).json({ message: "Subscribed" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/push/subscribe -> Called when user turns notifications off
router.delete("/subscribe", async (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ message: "Missing deviceId" });

  try {
    await req.db.run(`DELETE FROM push_subscriptions WHERE device_id = ?`, [deviceId]);
    res.status(200).json({ message: "Unsubscribed" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
