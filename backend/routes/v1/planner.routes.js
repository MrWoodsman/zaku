const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();

// In the order they happen during the day
const SLOTS = ["breakfast", "second_breakfast", "lunch", "snack", "dinner"];
// What a person sees until they pick their own
const DEFAULT_SLOTS = ["breakfast", "lunch", "dinner"];
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME = 40;
const MAX_TITLE = 120;

// Reads ?from=&to= (yyyy-MM-dd, inclusive); null when missing or malformed
const readRange = (query) => {
  const { from, to } = query;
  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "")) return null;
  return { from, to };
};

// --- PEOPLE -----------------------------------------------------------------

// Slots come back always sorted by the time of day and never empty
const parseSlots = (stored) => {
  const slots = SLOTS.filter((slot) => (stored || "").split(",").includes(slot));
  return slots.length > 0 ? slots : DEFAULT_SLOTS;
};

// Body "slots": undefined = not sent; otherwise a non-empty array of known slots.
// Returns { slots: string | undefined } (stored form) or { error }.
const readSlots = (value) => {
  if (value === undefined) return { slots: undefined };
  const valid =
    Array.isArray(value) && value.length > 0 && value.every((slot) => SLOTS.includes(slot));
  if (!valid) return { error: "Nieprawidłowe posiłki" };
  return { slots: SLOTS.filter((slot) => value.includes(slot)).join(",") };
};

// GET /api/v1/planner/people -> people of this group, oldest first
router.get("/people", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const rows = await req.db.all(
      `SELECT id, name, color, slots FROM planner_people WHERE group_id = ? ORDER BY created_at ASC, rowid ASC`,
      [groupId],
    );
    res.json(rows.map((row) => ({ ...row, slots: parseSlots(row.slots) })));
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/planner/people");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// POST /api/v1/planner/people -> Body: { name, color, slots? }
router.post("/people", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const color = req.body?.color;
  const { slots, error: slotsError } = readSlots(req.body?.slots);

  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ message: "Nieprawidłowe imię" });
  }
  if (!COLOR_RE.test(color || "")) {
    return res.status(400).json({ message: "Nieprawidłowy kolor" });
  }
  if (slotsError) return res.status(400).json({ message: slotsError });

  try {
    const id = randomUUID();
    await req.db.run(
      `INSERT INTO planner_people (id, group_id, name, color, slots) VALUES (?, ?, ?, ?, ?)`,
      [id, groupId, name, color, slots ?? null],
    );
    res.status(201).json({ id, name, color, slots: parseSlots(slots) });
  } catch (error) {
    req.log.error({ err: error }, "Failed: POST /api/v1/planner/people");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// PUT /api/v1/planner/people/:id -> Body: { name, color, slots? } (slots not sent = unchanged)
router.put("/people/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const color = req.body?.color;
  const { slots, error: slotsError } = readSlots(req.body?.slots);

  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ message: "Nieprawidłowe imię" });
  }
  if (!COLOR_RE.test(color || "")) {
    return res.status(400).json({ message: "Nieprawidłowy kolor" });
  }
  if (slotsError) return res.status(400).json({ message: slotsError });

  try {
    const result = await req.db.run(
      `UPDATE planner_people SET name = ?, color = ?, slots = COALESCE(?, slots) WHERE id = ? AND group_id = ?`,
      [name, color, slots ?? null, req.params.id, groupId],
    );
    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono osoby" });

    const saved = await req.db.get(`SELECT slots FROM planner_people WHERE id = ?`, [req.params.id]);
    res.json({ id: req.params.id, name, color, slots: parseSlots(saved.slots) });
  } catch (error) {
    req.log.error({ err: error }, "Failed: PUT /api/v1/planner/people/:id");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/planner/people/:id -> Their meals stay and become shared (person_id = NULL)
router.delete("/people/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const result = await req.db.run(`DELETE FROM planner_people WHERE id = ? AND group_id = ?`, [
      req.params.id,
      groupId,
    ]);
    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono osoby" });

    res.json({ message: "Usunięto osobę" });
  } catch (error) {
    req.log.error({ err: error }, "Failed: DELETE /api/v1/planner/people/:id");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// --- MEALS ------------------------------------------------------------------

// GET /api/v1/planner/meals?from=yyyy-MM-dd&to=yyyy-MM-dd -> meals in the range (inclusive)
router.get("/meals", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Nieprawidłowy zakres dat" });

  try {
    const meals = await req.db.all(
      `SELECT m.id, m.date, m.slot, m.title, m.person_id, m.recipe_id, r.image_url
       FROM planner_meals m
       LEFT JOIN recipes r ON r.id = m.recipe_id
       WHERE m.group_id = ? AND m.date BETWEEN ? AND ?
       ORDER BY m.date ASC, m.created_at ASC, m.rowid ASC`,
      [groupId, range.from, range.to],
    );
    res.json(meals);
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/planner/meals");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// POST /api/v1/planner/meals
// Body: { date, slot, person_id?, recipe_id?, title? } - needs a recipe_id or a title
router.post("/meals", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const { date, slot, recipe_id: recipeId, person_id: personId } = req.body || {};
  let title = typeof req.body?.title === "string" ? req.body.title.trim() : "";

  if (!DATE_RE.test(date || "")) return res.status(400).json({ message: "Nieprawidłowa data" });
  if (!SLOTS.includes(slot)) return res.status(400).json({ message: "Nieprawidłowy posiłek" });
  if (title.length > MAX_TITLE) return res.status(400).json({ message: "Zbyt długa nazwa" });

  try {
    if (personId) {
      const person = await req.db.get(`SELECT id FROM planner_people WHERE id = ? AND group_id = ?`, [
        personId,
        groupId,
      ]);
      if (!person) return res.status(404).json({ message: "Nie znaleziono osoby" });
    }

    if (recipeId) {
      const recipe = await req.db.get(
        `SELECT id, name FROM recipes WHERE id = ? AND (group_id = ? OR is_global = 1) AND deleted_at IS NULL`,
        [recipeId, groupId],
      );
      if (!recipe) return res.status(404).json({ message: "Nie znaleziono przepisu" });
      if (!title) title = recipe.name;
    }

    if (!title) return res.status(400).json({ message: "Podaj nazwę posiłku lub wybierz przepis" });

    const id = randomUUID();
    await req.db.run(
      `INSERT INTO planner_meals (id, group_id, person_id, date, slot, recipe_id, title)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, groupId, personId || null, date, slot, recipeId || null, title],
    );
    res.status(201).json({ id });
  } catch (error) {
    req.log.error({ err: error }, "Failed: POST /api/v1/planner/meals");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// DELETE /api/v1/planner/meals/:id
router.delete("/meals/:id", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const result = await req.db.run(`DELETE FROM planner_meals WHERE id = ? AND group_id = ?`, [
      req.params.id,
      groupId,
    ]);
    if (result.changes === 0) return res.status(404).json({ message: "Nie znaleziono posiłku" });

    res.json({ message: "Usunięto posiłek" });
  } catch (error) {
    req.log.error({ err: error }, "Failed: DELETE /api/v1/planner/meals/:id");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

// --- SHOPPING ---------------------------------------------------------------

// GET /api/v1/planner/ingredients?from=&to=[&person_id=] -> ingredients of all planned
// recipes in the range, summed by name + unit (a recipe planned twice counts twice).
// person_id narrows it to that person's meals plus the shared ones.
router.get("/ingredients", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Nieprawidłowy zakres dat" });

  const personId = req.query.person_id;

  try {
    const params = [groupId, range.from, range.to];
    let personFilter = "";
    if (personId) {
      personFilter = "AND (m.person_id = ? OR m.person_id IS NULL)";
      params.push(personId);
    }

    const ingredients = await req.db.all(
      `SELECT MIN(i.name) AS name, i.unit AS unit, SUM(i.quantity) AS quantity
       FROM planner_meals m
       JOIN ingredients i ON i.recipe_id = m.recipe_id
       WHERE m.group_id = ? AND m.date BETWEEN ? AND ? ${personFilter}
       GROUP BY LOWER(i.name), i.unit
       ORDER BY LOWER(MIN(i.name)) ASC`,
      params,
    );
    res.json(ingredients);
  } catch (error) {
    req.log.error({ err: error }, "Failed: GET /api/v1/planner/ingredients");
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
