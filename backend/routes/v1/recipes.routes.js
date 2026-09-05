const express = require("express");
const router = express.Router();
const { randomUUID } = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// KONFIGURACJA ZAPISU PLIKÓW
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/recipes/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, randomUUID() + ext);
  },
});

const upload = multer({ storage: storage });

// GET /api/v1/recipes -> Pobieranie wszystkich przepisów
router.get("/", async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const recipes = await req.db.all(
      `SELECT 
          id, name, description, image_url, time_to_make, is_global, created_at, last_update, status, group_id
        FROM recipes 
        WHERE (group_id = ? OR is_global = 1) 
          AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [groupId],
    );

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera", error: error.message });
  }
});

// POBIERANIE POJEDYNCZEGO PRZEPISU ZE SKŁADNIKAMI I KROKAMI
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    // 1. Pobieramy główne dane przepisu - tylko własny (grupy) lub globalny, nieusunięty
    const recipe = await req.db.get(
      "SELECT * FROM recipes WHERE id = ? AND (group_id = ? OR is_global = 1) AND deleted_at IS NULL",
      [id, groupId],
    );

    if (!recipe) {
      return res.status(404).json({ message: "Nie znaleziono przepisu" });
    }

    // 2. Pobieramy listę składników powiązanych z tym przepisem
    const ingredients = await req.db.all("SELECT * FROM ingredients WHERE recipe_id = ?", [id]);

    // 3. Pobieramy kroki przygotowania (sortujemy po kolumnie "order")
    const steps = await req.db.all('SELECT * FROM steps WHERE recipe_id = ? ORDER BY "order" ASC', [
      id,
    ]);

    // 4. Składamy to wszystko w jeden obiekt, którego oczekuje frontend
    const fullRecipe = {
      ...recipe,
      // SQLite zwraca 1 lub 0 dla booleanów, na froncie wolisz true/false:
      is_global: recipe.is_global === 1 || recipe.is_global === "true",
      ingredients: ingredients,
      steps: steps,
    };

    // 5. Odsyłamy gotowy obiekt
    res.json(fullRecipe);
  } catch (error) {
    console.error("Błąd pobierania detali przepisu:", error);
    res
      .status(500)
      .json({ message: "Błąd serwera podczas pobierania przepisu", error: error.message });
  }
});

// POST /api/v1/recipes -> Dodawanie przepisów
router.post("/", upload.single("image"), async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  // Wyciągamy WSZYSTKO, co przesyła frontend.
  // Zwróć uwagę, że dodaliśmy 'status', 'ingredients' i 'steps'
  let { name, description, time_to_make, is_global, status, ingredients, steps } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Nazwa jest wymagana" });
  }

  // Odpakowujemy składniki i kroki z formatu tekstowego (bo idą przez FormData)
  try {
    if (typeof ingredients === "string") ingredients = JSON.parse(ingredients);
    if (typeof steps === "string") steps = JSON.parse(steps);
  } catch (error) {
    return res.status(400).json({ message: "Błędny format składników lub kroków" });
  }

  // Budujemy ścieżkę do zdjęcia
  let imageUrl = "";
  if (req.file) {
    imageUrl = `/images/recipes/${req.file.filename}`;
  }

  try {
    // 1. OTWIERAMY TRANSAKCJĘ
    await req.db.run("BEGIN TRANSACTION");

    const id = randomUUID();
    const isGlobalValue = is_global === "true" || is_global === true ? 1 : 0;
    const finalStatus = status || "draft";

    // 2. ZAPISUJEMY GŁÓWNY PRZEPIS
    await req.db.run(
      `INSERT INTO recipes (id, group_id, name, description, image_url, time_to_make, is_global, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        groupId,
        name.trim(),
        description || "",
        imageUrl,
        time_to_make || 0,
        isGlobalValue,
        finalStatus,
      ],
    );

    // 3. ZAPISUJEMY SKŁADNIKI
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        await req.db.run(
          `INSERT INTO ingredients (recipe_id, name, quantity, unit) VALUES (?, ?, ?, ?)`,
          [id, ing.name, ing.quantity, ing.unit],
        );
      }
    }

    // 4. ZAPISUJEMY KROKI
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await req.db.run(
          `INSERT INTO steps (recipe_id, "order", title, description) VALUES (?, ?, ?, ?)`,
          [id, step.order, step.title, step.description],
        );
      }
    }

    // 5. WSZYSTKO POSZŁO DOBRZE - ZATWIERDZAMY
    await req.db.run("COMMIT");
    res.status(201).json({ message: "Dodano przepis", id, imageUrl });
  } catch (error) {
    // JEŚLI COKOLWIEK SIĘ WYSYPIE - COFAMY WSZYSTKO
    await req.db.run("ROLLBACK");
    console.error("Błąd bazy danych:", error);

    // USUWANIE ZDJECIA JESLI JUZ ZAPISANE
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Nie udało się usunąć osieroconego zdjęcia z dysku:", err);
        } else {
          console.log("Usunięto zdjęcie z dysku po błędzie bazy danych.");
        }
      });
    }

    res.status(500).json({ message: "Błąd serwera przy zapisie przepisu", error: error.message });
  }
});

// PUT /api/v1/recipes/:id -> Edycja / Aktualizacja przepisu
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  let { name, description, time_to_make, is_global, status, ingredients, steps } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Nazwa jest wymagana" });
  }

  // Odpakowujemy składniki i kroki z formatu tekstowego (FormData)
  try {
    if (typeof ingredients === "string") ingredients = JSON.parse(ingredients);
    if (typeof steps === "string") steps = JSON.parse(steps);
  } catch (error) {
    return res.status(400).json({ message: "Błędny format składników lub kroków" });
  }

  try {
    // 1. OTWIERAMY TRANSAKCJĘ
    await req.db.run("BEGIN TRANSACTION");

    // Sprawdzamy czy przepis w ogóle istnieje i należy do grupy
    const existingRecipe = await req.db.get("SELECT * FROM recipes WHERE id = ? AND group_id = ?", [
      id,
      groupId,
    ]);
    if (!existingRecipe) {
      await req.db.run("ROLLBACK");
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Nie znaleziono przepisu" });
    }

    // Obsługa zdjęcia: jeśli przesłano nowe, bierzemy jego ścieżkę. Jeśli nie, zostawiamy stare.
    let imageUrl = existingRecipe.image_url;
    if (req.file) {
      imageUrl = `/images/recipes/${req.file.filename}`;

      // Opcjonalnie: stary plik ze starego zdjęcia można by skasować z dysku,
      // żeby nie śmiecić (jeśli istniał)
      if (existingRecipe.image_url) {
        const oldPath = path.join(__dirname, "..", "..", existingRecipe.image_url); // dostosuj ścieżkę do struktury folderów jeśli trzeba
        fs.unlink(oldPath, () => {}); // ignorujemy błąd jeśli pliku nie było
      }
    }

    const isGlobalValue = is_global === "true" || is_global === true ? 1 : 0;
    const finalStatus = status || existingRecipe.status;

    // 2. AKTUALIZUJEMY GŁÓWNY PRZEPIS
    await req.db.run(
      `UPDATE recipes 
       SET name = ?, description = ?, image_url = ?, time_to_make = ?, is_global = ?, status = ?
       WHERE id = ?`,
      [name.trim(), description || "", imageUrl, time_to_make || 0, isGlobalValue, finalStatus, id],
    );

    // 3. CZYSCIMY STARE SKŁADNIKI I KROKI (Najprostsza i niezawodna metoda)
    await req.db.run("DELETE FROM ingredients WHERE recipe_id = ?", [id]);
    await req.db.run("DELETE FROM steps WHERE recipe_id = ?", [id]);

    // 4. WSTAWIAMY NOWE SKŁADNIKI
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        await req.db.run(
          `INSERT INTO ingredients (recipe_id, name, quantity, unit) VALUES (?, ?, ?, ?)`,
          [id, ing.name, ing.quantity, ing.unit],
        );
      }
    }

    // 5. WSTAWIAMY NOWE KROKI
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await req.db.run(
          `INSERT INTO steps (recipe_id, "order", title, description) VALUES (?, ?, ?, ?)`,
          [id, step.order, step.title, step.description],
        );
      }
    }

    // 6. WSZYSTKO OK - ZATWIERDZAMY
    await req.db.run("COMMIT");
    res.json({ message: "Zaktualizowano przepis", id, imageUrl });
  } catch (error) {
    // JEŚLI BŁĄD - COFAMY ZMIANY W BAZIE
    await req.db.run("ROLLBACK");
    console.error("Błąd bazy danych przy edycji:", error);

    // USUWANIE NOWO DODANEGO ZDJĘCIA W RAZIE AWARII
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Nie udało się usunąć osieroconego zdjęcia:", err);
      });
    }

    res
      .status(500)
      .json({ message: "Błąd serwera przy aktualizacji przepisu", error: error.message });
  }
});

// DELETE /api/v1/recipes/:id -> Usuwanie przepisu
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  try {
    const recipe = await req.db.get("SELECT * FROM recipes WHERE id = ? AND group_id = ?", [
      id,
      groupId,
    ]);
    if (!recipe) {
      return res.status(404).json({ message: "Nie znaleziono przepisu lub brak uprawnień" });
    }

    // Opcjonalnie: usuwamy plik zdjęcia z dysku, jeśli istniał
    if (recipe.image_url) {
      const imagePath = path.join(__dirname, "..", "..", recipe.image_url);
      fs.unlink(imagePath, () => {});
    }

    // Baza danych dzięki kluczom obcym z 'ON DELETE CASCADE' automatycznie usunie
    // powiązane składniki i kroki, albo usuwamy je jawnie w transakcji:
    await req.db.run("BEGIN TRANSACTION");
    await req.db.run("DELETE FROM ingredients WHERE recipe_id = ?", [id]);
    await req.db.run("DELETE FROM steps WHERE recipe_id = ?", [id]);
    await req.db.run("DELETE FROM recipes WHERE id = ?", [id]);
    await req.db.run("COMMIT");

    res.json({ message: "Pomyślnie usunięto przepis" });
  } catch (error) {
    await req.db.run("ROLLBACK");
    console.error("Błąd przy usuwaniu przepisu:", error);
    res.status(500).json({ message: "Błąd serwera przy usuwaniu przepisu", error: error.message });
  }
});

module.exports = router;
