const express = require("express");
const router = express.Router();

// GET /api/v1/items -> Pobranie wszystkich produktów ze wszystkich list
router.get("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    let items = await req.db.all(
      `SELECT i.id, i.name, i.quantity, i.unit, i.completed_at, i.list_id, l.name as list_name 
       FROM items i
       JOIN lists l ON i.list_id = l.id
       WHERE l.group_id = ? AND i.deleted_at IS NULL AND l.deleted_at IS NULL
       ORDER BY (i.completed_at IS NULL) DESC, i.completed_at DESC, i.name ASC`,
      [groupId],
    );

    items = items.map((i) => ({ ...i, completed: !!i.completed_at }));

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// GET /api/v1/items/completed -> Pobiera zakupione przedmioty stronami (kursor po completed_at + id)
router.get("/completed", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const cursor = req.query.cursor;

  try {
    const params = [groupId];
    let cursorSql = "";

    if (cursor) {
      const separatorIndex = String(cursor).lastIndexOf("_");
      const cursorCompletedAt = cursor.slice(0, separatorIndex);
      const cursorId = cursor.slice(separatorIndex + 1);
      cursorSql = "AND (i.completed_at < ? OR (i.completed_at = ? AND i.id < ?))";
      params.push(cursorCompletedAt, cursorCompletedAt, cursorId);
    }

    const items = await req.db.all(
      `SELECT i.id, i.name, i.quantity, i.unit, i.completed_at, i.list_id, l.name as list_name
    FROM items i
    JOIN lists l ON i.list_id = l.id
    WHERE l.group_id = ? AND i.completed_at IS NOT NULL ${cursorSql}
    ORDER BY i.completed_at DESC, i.id DESC
    LIMIT ?`,
      [...params, limit + 1],
    );

    const hasMore = items.length > limit;
    const page = items.slice(0, limit).map((item) => ({
      ...item,
      completed: !!item.completed_at,
    }));
    const last = page.at(-1);
    const nextCursor = hasMore && last ? `${last.completed_at}_${last.id}` : null;

    res.json({ items: page, nextCursor });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/items/:id -> Zmiana statusu i edycja pojedynczego produktu
router.put("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const itemId = req.params.id;
  const { completed, quantity, unit, name } = req.body;

  try {
    // Sprawdzamy czy produkt istnieje ORAZ czy należy do grupy użytkownika
    const item = await req.db.get(
      `SELECT i.id, i.list_id FROM items i JOIN lists l ON i.list_id = l.id WHERE i.id = ? AND l.group_id = ? AND i.deleted_at IS NULL`,
      [itemId, groupId],
    );
    if (!item) return res.status(404).json({ message: "Nie znaleziono produktu" });

    const updates = [];
    const params = [];

    if (typeof completed === "boolean") {
      updates.push(
        completed ? "completed_at = datetime('now','localtime')" : "completed_at = NULL",
      );
    }
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (quantity !== undefined) {
      updates.push("quantity = ?");
      params.push(Number(quantity));
    }
    if (unit !== undefined) {
      updates.push("unit = ?");
      params.push(unit.trim());
    }

    if (updates.length > 0) {
      params.push(itemId);
      await req.db.run(`UPDATE items SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    res.json({ message: "Zaktualizowano produkt" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/items/:id -> Usunięcie konkretnego produktu
router.delete("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });
  const itemId = req.params.id;

  try {
    const item = await req.db.get(
      `SELECT i.id FROM items i JOIN lists l ON i.list_id = l.id WHERE i.id = ? AND l.group_id = ? AND i.deleted_at IS NULL`,
      [itemId, groupId],
    );
    if (!item) return res.status(404).json({ message: "Nie znaleziono produktu" });

    await req.db.run(`UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [itemId]);
    res.json({ message: "Produkt usunięty" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
