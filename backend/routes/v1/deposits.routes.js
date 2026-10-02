const express = require("express");
const router = express.Router();

// Same threshold as EXPIRING_SOON_DAYS on the frontend
const EXPIRING_SOON_DAYS = 7;
const PAGE_LIMIT_MAX = 100;

// Whitelisted sort keys -> ORDER BY fragments ({dir} = ASC/DESC). Never put raw
// query params into SQL - only values from this map end up in the query.
const SORTS = {
  // No date always last, whatever the direction
  expiry: "d.expiring_date IS NULL, d.expiring_date {dir}",
  value: "d.value {dir}",
  shop: "s.name IS NULL, s.name COLLATE NOCASE {dir}",
  added: "d.added_at {dir}",
};

// GET /api/v1/deposits?sort=expiry|value|shop|added&order=asc|desc&used=1|0&limit=30&offset=0
// Always grouped: valid -> expired -> used, the chosen sort applies inside each group.
// Paged with limit/offset for progressive loading: { items, nextOffset }.
router.get("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const sort = SORTS[req.query.sort] ? req.query.sort : "expiry";
  const dir = req.query.order === "desc" ? "DESC" : "ASC";
  const showUsed = req.query.used !== "0";
  const limit = Math.min(Number(req.query.limit) || 30, PAGE_LIMIT_MAX);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  // Used vouchers sorted by "expiry" make little sense - show most recently used first instead
  const usedFirstOrder = sort === "expiry" ? "CASE WHEN d.used_at IS NOT NULL THEN d.used_at END DESC," : "";

  try {
    // Fetch one extra row to know whether there's a next page
    const rows = await req.db.all(
      `SELECT d.id, d.shop_id, s.name AS shop_name, d.value, d.code, d.code_format, d.expiring_date,
              d.image_url, d.image_original_url, d.added_at, d.used_at
       FROM deposits d
       LEFT JOIN shops s ON s.id = d.shop_id
       WHERE d.group_id = ? AND d.deleted_at IS NULL
         ${showUsed ? "" : "AND d.used_at IS NULL"}
       ORDER BY
         d.used_at IS NOT NULL,
         -- COALESCE: no date means "never expires", not NULL (NULLs would sort first)
         CASE WHEN d.used_at IS NULL THEN COALESCE(d.expiring_date < date('now','localtime'), 0) END,
         ${usedFirstOrder}
         ${SORTS[sort].replaceAll("{dir}", dir)},
         d.id DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit + 1, offset],
    );

    const hasMore = rows.length > limit;
    res.json({ items: rows.slice(0, limit), nextOffset: hasMore ? offset + limit : null });
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/deposits");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// GET /api/v1/deposits/summary -> Totals over ALL vouchers that can still be used
// (not used, not expired) - the list is paged, so the frontend can't sum it itself.
router.get("/summary", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const summary = await req.db.get(
      `SELECT
         COALESCE(SUM(value), 0) AS total,
         COUNT(*) AS count,
         COALESCE(SUM(expiring_date IS NOT NULL
           AND expiring_date <= date('now','localtime', '+${EXPIRING_SOON_DAYS} days')), 0) AS expiringCount
       FROM deposits
       WHERE group_id = ? AND deleted_at IS NULL AND used_at IS NULL
         AND (expiring_date IS NULL OR expiring_date >= date('now','localtime'))`,
      [groupId],
    );

    res.json(summary);
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/deposits/summary");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/deposits/:id/used -> Mark as used / not used. Body: { used: boolean }
router.put("/:id/used", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const { used } = req.body;
  if (typeof used !== "boolean") {
    return res.status(400).json({ message: "Pole used musi być true lub false" });
  }

  try {
    const result = await req.db.run(
      `UPDATE deposits
       SET used_at = ${used ? "datetime('now','localtime')" : "NULL"}
       WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );

    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono kuponu" });

    const deposit = await req.db.get(`SELECT id, used_at FROM deposits WHERE id = ?`, [req.params.id]);
    res.json(deposit);
  } catch (error) {
    req.log.error({ err: error }, "Failed: PUT /api/v1/deposits/:id/used");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/deposits/:id -> Edit a voucher.
// Body: { value: number, expiring_date: "yyyy-MM-dd" | null, shop_id: number | null, code: string | null }
router.put("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const { value, expiring_date, shop_id, code } = req.body;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return res.status(400).json({ message: "Nieprawidłowa wartość kaucji" });
  }
  if (expiring_date != null && !/^\d{4}-\d{2}-\d{2}$/.test(expiring_date)) {
    return res.status(400).json({ message: "Nieprawidłowa data ważności" });
  }

  try {
    if (shop_id != null) {
      const shop = await req.db.get(`SELECT id FROM shops WHERE id = ?`, [shop_id]);
      if (!shop) return res.status(400).json({ message: "Nie znaleziono sklepu" });
    }

    const result = await req.db.run(
      `UPDATE deposits SET value = ?, expiring_date = ?, shop_id = ?, code = ?
       WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [numericValue, expiring_date ?? null, shop_id ?? null, code?.trim() || null, req.params.id, groupId],
    );

    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono kuponu" });

    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Failed: PUT /api/v1/deposits/:id");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/deposits/:id -> Soft delete (deleted_at), like lists and items
router.delete("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const result = await req.db.run(
      `UPDATE deposits SET deleted_at = datetime('now','localtime')
       WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );

    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono kuponu" });

    res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Failed: DELETE /api/v1/deposits/:id");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
