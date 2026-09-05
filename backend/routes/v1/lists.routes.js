const express = require("express");
const router = express.Router();
const { randomUUID } = require("crypto");

// ==========================================
// OPERACJE NA SAMYCH LISTACH
// ==========================================

// GET /api/v1/lists -> Pobranie wszystkich list
// TEST ✅
router.get("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const lists = await req.db.all(
      `SELECT id, group_id as groupId, name, created_at as createdAt FROM lists WHERE group_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [groupId],
    );

    for (const l of lists) {
      const items = await req.db.all(
        `SELECT id, name, quantity, unit, completed_at FROM items WHERE list_id = ? AND deleted_at IS NULL`,
        [l.id],
      );
      l.items = items.map((i) => ({ ...i, completed: !!i.completed_at }));
      l.itemsIn = items.length;
      l.completedCount = items.filter((i) => i.completed_at).length;
    }

    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera", error: error.message });
  }
});

// GET /api/v1/lists/:id -> Pobranie jednej listy
// TEST ✅
router.get("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });
  const listId = req.params.id;

  try {
    const list = await req.db.get(
      `SELECT id, group_id as groupId, name, created_at as createdAt FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [listId, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    const items = await req.db.all(
      `SELECT id, name, quantity, unit, completed_at FROM items WHERE list_id = ? AND deleted_at IS NULL`,
      [listId],
    );
    list.items = items.map((i) => ({ ...i, completed: !!i.completed_at }));
    list.itemsIn = items.length;
    list.completedCount = items.filter((i) => i.completed_at).length;

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera", error: error.message });
  }
});

// POST /api/v1/lists -> Tworzenie nowej listy
// TEST ✅
router.post("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const id = randomUUID();
    const name = req.body.name || "Nowa lista";
    await req.db.run(`INSERT INTO lists (id, group_id, name) VALUES (?, ?, ?)`, [
      id,
      groupId,
      name,
    ]);

    res.status(201).json({
      message: "Utworzono listę",
      list: { id, groupId, name, itemsIn: 0, completedCount: 0, items: [] },
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd tworzenia", error: error.message });
  }
});

// PUT /api/v1/lists/:id -> Edycja nazwy listy
// TEST ✅
router.put("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    if (req.body.name)
      await req.db.run(`UPDATE lists SET name = ? WHERE id = ?`, [req.body.name, req.params.id]);
    res.status(200).json({ message: "Zaktualizowano listę" });
  } catch (error) {
    res.status(500).json({ message: "Błąd aktualizacji", error: error.message });
  }
});

// DELETE /api/v1/lists/:id -> Usuwanie listy
// TEST ✅
router.delete("/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    await req.db.run(`UPDATE lists SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      req.params.id,
    ]);
    await req.db.run(`UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE list_id = ?`, [
      req.params.id,
    ]);
    res.status(200).json({ message: "Lista usunięta" });
  } catch (error) {
    res.status(500).json({ message: "Błąd usuwania", error: error.message });
  }
});

// ==========================================
// OPERACJE NA ELEMENTACH (W KONTEKŚCIE LISTY)
// ==========================================

// POST /api/v1/lists/:id/items -> Dodawanie pojedynczego produktu do listy
// TEST ✅
router.post("/:id/items", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });
  const listId = req.params.id;
  const name = (req.body.name || "").trim();
  const { quantity = 1, unit = "szt." } = req.body;

  if (!name) return res.status(400).json({ message: "Nazwa pusta" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [listId, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    const id = randomUUID();
    await req.db.run(
      `INSERT INTO items (id, list_id, name, quantity, unit) VALUES (?, ?, ?, ?, ?)`,
      [id, listId, name, quantity, unit],
    );

    res.status(201).json({ message: "Dodano produkt" }); // Celowo uproszczone dla czytelności
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/lists/:id/items/mark-all
router.put("/:id/items/mark-all", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono" });

    await req.db.run(
      `UPDATE items SET completed_at = datetime('now','localtime') WHERE list_id = ? AND completed_at IS NULL AND deleted_at IS NULL`,
      [req.params.id],
    );
    res.json({ message: "Wszystko kupione" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/lists/:id/items/reset-all
router.put("/:id/items/reset-all", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    await req.db.run(
      `UPDATE items SET completed_at = NULL WHERE list_id = ? AND deleted_at IS NULL`,
      [req.params.id],
    );
    res.json({ message: "Reset" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/lists/:id/items/delete-completed
router.delete("/:id/items/delete-completed", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    await req.db.run(
      `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE list_id = ? AND completed_at IS NOT NULL AND deleted_at IS NULL`,
      [req.params.id],
    );
    res.json({ message: "Usunięto kupione" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/lists/:id/items/delete-all
router.delete("/:id/items/delete-all", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const list = await req.db.get(
      `SELECT id FROM lists WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [req.params.id, groupId],
    );
    if (!list) return res.status(404).json({ message: "Nie znaleziono listy" });

    await req.db.run(
      `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE list_id = ? AND deleted_at IS NULL`,
      [req.params.id],
    );
    res.json({ message: "Wyczyszczono" });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// POST /api/v1/lists/add-from-recipe
router.post("/add-from-recipe", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  let { target, ingredients } = req.body || {};

  // ROZPAKOWANIE DANYCH O SKŁADNIKACH
  try {
    if (typeof ingredients === "string") ingredients = JSON.parse(ingredients);
    if (typeof target === "string") target = JSON.parse(target);
  } catch (error) {
    return res.status(400).json({ message: "Błędny format składników lub celu" });
  }

  // Prosta walidacja danych wejściowych
  if (!target || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ message: "Brak wymaganych danych lub pusta lista składników" });
  }

  // OPERACJE NA BAZIE DANYCH
  try {
    await req.db.run("BEGIN TRANSACTION");

    let targetListId = target.list_id;

    // A. WYBRANIE UTWORZNEIA NOWEJ LISTY
    if (target.mode === "new") {
      const listName = target.new_list_name?.trim() || "Nowa lista z przepisu";
      const id = randomUUID();

      const newList = await req.db.run(`INSERT INTO lists (name, group_id, id) VALUES (?, ?, ?)`, [
        listName,
        groupId,
        id,
      ]);

      targetListId = id;
    }

    // B. MASOWE DODWANIE SKLADNIKOW (BULK INSERT)
    for (const ing of ingredients) {
      const itemId = randomUUID();
      await req.db.run(`INSERT INTO items (id, list_id, name, quantity, unit) VALUES (?,?,?,?,?)`, [
        itemId,
        targetListId,
        ing.name,
        ing.quantity,
        ing.unit,
      ]);
    }

    await req.db.run("COMMIT");
    res.status(201).json({ message: "Dodano składniki do listy", targetListId });
  } catch (error) {
    await req.db.run("ROLLBACK");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
