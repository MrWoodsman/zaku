const express = require("express");
const router = express.Router();
const { parseVoiceCommand } = require("../../services/llm.service");

// POST /api/v1/voice/parse -> Parsuje wypowiedź (np. z Home Assistant Assist albo asystenta w appce)
// przez LLM i rozwiązuje docelową listę, ale NIC nie zapisuje do bazy - front pokazuje
// to jako podgląd do zatwierdzenia, a faktyczne dodanie idzie przez istniejące endpointy list/items.
router.post("/parse", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Brak treści komendy" });

  try {
    const lists = await req.db.all(
      `SELECT id, name FROM lists WHERE group_id = ? AND deleted_at IS NULL`,
      [groupId],
    );

    let parsed;
    try {
      parsed = await parseVoiceCommand(text, lists);
    } catch (error) {
      return res.status(502).json({ message: "Błąd usługi AI", error: error.message });
    }

    if (!parsed.items.length) {
      return res.status(422).json({ message: "Nie rozpoznano żadnych produktów w wypowiedzi" });
    }

    // ROZWIĄZANIE DOCELOWEJ LISTY (bez zapisu do bazy)
    if (parsed.list_name) {
      const match = lists.find(
        (l) => l.name.trim().toLowerCase() === parsed.list_name.trim().toLowerCase(),
      );
      if (match) {
        return res.status(200).json({
          list: { id: match.id, name: match.name },
          new_list_name: null,
          items: parsed.items,
        });
      }

      return res.status(200).json({
        list: null,
        new_list_name: parsed.list_name.trim(),
        items: parsed.items,
      });
    }

    if (lists.length === 1) {
      return res.status(200).json({
        list: { id: lists[0].id, name: lists[0].name },
        new_list_name: null,
        items: parsed.items,
      });
    }

    if (lists.length === 0) {
      return res.status(200).json({
        list: null,
        new_list_name: "Zakupy",
        items: parsed.items,
      });
    }

    // Wiele list, brak wskazanej -> nie zgadujemy, prosimy o doprecyzowanie
    return res.status(200).json({
      needs_clarification: true,
      message: `Do której listy dodać? Masz: ${lists.map((l) => l.name).join(", ")}`,
      candidates: lists,
      items: parsed.items,
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd", error: error.message });
  }
});

module.exports = router;
