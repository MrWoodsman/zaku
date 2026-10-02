const express = require("express");
const router = express.Router();

const STATUSES = ["favorite", "hidden"];

// GET /api/v1/shops -> All shops with this group's status, favorites first,
// then normal ones, hidden at the end (frontend decides whether to show them)
router.get("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const shops = await req.db.all(
      `SELECT s.id, s.name, p.status
       FROM shops s
       LEFT JOIN group_shop_preferences p ON p.shop_id = s.id AND p.group_id = ?
       ORDER BY
         CASE p.status WHEN 'favorite' THEN 0 WHEN 'hidden' THEN 2 ELSE 1 END,
         s.name = 'Inny',
         s.name COLLATE NOCASE ASC`,
      [groupId],
    );

    res.json(shops);
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/shops");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/shops/:id/status -> Set status for this group.
// Body: { status: "favorite" | "hidden" | null } (null = back to normal)
router.put("/:id/status", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const shopId = Number(req.params.id);
  const { status } = req.body;

  if (status !== null && !STATUSES.includes(status)) {
    return res.status(400).json({ message: "Nieprawidłowy status" });
  }

  try {
    const shop = await req.db.get(`SELECT id FROM shops WHERE id = ?`, [shopId]);
    if (!shop) return res.status(404).json({ message: "Nie znaleziono sklepu" });

    if (status === null) {
      await req.db.run(`DELETE FROM group_shop_preferences WHERE group_id = ? AND shop_id = ?`, [
        groupId,
        shopId,
      ]);
    } else {
      await req.db.run(
        `INSERT INTO group_shop_preferences (group_id, shop_id, status) VALUES (?, ?, ?)
         ON CONFLICT (group_id, shop_id) DO UPDATE SET status = excluded.status`,
        [groupId, shopId, status],
      );
    }

    res.json({ id: shopId, status });
  } catch (error) {
    req.log.error({ err: error }, "Failed: PUT /api/v1/shops/:id/status");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
