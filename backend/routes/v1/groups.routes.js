const express = require("express");
const router = express.Router();

const MIN_LENGTH = 3;
const MAX_LENGTH = 64;
// Letters (incl. Polish), digits, dash and underscore
const ALLOWED = /^[\p{L}\p{N}_-]+$/u;

// Single source of truth for the group code format: trim, uppercase, spaces -> "-"
function normalizeGroupId(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

// POST /api/v1/groups -> Creates a group with the given code (the only place groups are created)
router.post("/", async (req, res) => {
  const id = normalizeGroupId(req.body?.id);
  if (id.length < MIN_LENGTH || id.length > MAX_LENGTH || !ALLOWED.test(id)) {
    return res.status(400).json({
      message: `Kod grupy musi mieć ${MIN_LENGTH}-${MAX_LENGTH} znaków (litery, cyfry, - lub _)`,
    });
  }

  try {
    const existing = await req.db.get(`SELECT id FROM groups WHERE id = ?`, [id]);
    if (existing) return res.status(409).json({ message: "Taki kod już istnieje" });

    await req.db.run(`INSERT INTO groups (id, name) VALUES (?, ?)`, [id, id]);
    res.status(201).json({ id });
  } catch (err) {
    req.log.error({ err }, "Failed to create group");
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// POST /api/v1/groups/join -> Confirms the group exists (never creates it)
router.post("/join", async (req, res) => {
  const id = normalizeGroupId(req.body?.id);
  if (!id) return res.status(400).json({ message: "Podaj kod grupy" });

  try {
    const existing = await req.db.get(`SELECT id FROM groups WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ message: "Nie ma takiej grupy" });
    res.json({ id });
  } catch (err) {
    req.log.error({ err }, "Failed to join group");
    res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;
module.exports.normalizeGroupId = normalizeGroupId;
