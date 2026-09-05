import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

let app;
let db;

// Pliki wgrywane w testach lądują naprawdę na dysku (multer.diskStorage pisze do
// uploads/recipes/), więc zbieramy ścieżki i sprzątamy je po każdym teście,
// żeby nie zaśmiecać repo. Serwowany URL to "/images/recipes/x" (przez static
// middleware w app.js), a realny plik leży w "uploads/recipes/x" - stąd mapowanie.
let uploadedFiles = [];

function imageUrlToDiskPath(imageUrl) {
  const filename = path.basename(imageUrl);
  return path.join(__dirname, "..", "..", "uploads", "recipes", filename);
}

beforeEach(async () => {
  process.env.DB_PATH = ":memory:";
  db = await initDB();
  app = createApp(db);
  uploadedFiles = [];
});

afterEach(async () => {
  await db.close();
  for (const imageUrl of uploadedFiles) {
    fs.rm(imageUrlToDiskPath(imageUrl), () => {});
  }
});

const chronioneEndpointy = [
  { method: "get", path: "/api/v1/recipes" },
  { method: "get", path: "/api/v1/recipes/5" },
  { method: "post", path: "/api/v1/recipes" },
  { method: "put", path: "/api/v1/recipes/5" },
  { method: "delete", path: "/api/v1/recipes/5" },
];

describe("wymaganie nagłówka x-group-id", () => {
  it.each(chronioneEndpointy)("$method $path -> 401 bez x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/recipes", () => {
  it("zwraca puste [], gdy grupa nie ma żadnych przepisów", async () => {
    const res = await request(app).get("/api/v1/recipes").set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("widzi własne przepisy grupy", async () => {
    await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Spaghetti" });

    const res = await request(app).get("/api/v1/recipes").set("x-group-id", "test-grupa");

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Spaghetti");
  });

  it("nie widzi prywatnych przepisów innej grupy", async () => {
    await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Przepis grupy A" });

    const res = await request(app).get("/api/v1/recipes").set("x-group-id", "grupa-B");

    expect(res.body).toEqual([]);
  });

  it("widzi globalne przepisy (is_global) niezależnie od grupy", async () => {
    await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Globalny przepis", is_global: "true" });

    const res = await request(app).get("/api/v1/recipes").set("x-group-id", "grupa-B");

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Globalny przepis");
  });

  it("nie zwraca usuniętych przepisów", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Do usunięcia" });

    await request(app)
      .delete(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "test-grupa");

    const res = await request(app).get("/api/v1/recipes").set("x-group-id", "test-grupa");

    expect(res.body).toEqual([]);
  });
});

describe("GET /api/v1/recipes/:id", () => {
  it("zwraca 404, gdy przepis nie istnieje", async () => {
    const res = await request(app)
      .get("/api/v1/recipes/nieistniejace-id")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy przepis jest prywatny i należy do innej grupy", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Prywatny przepis grupy A" });

    const res = await request(app)
      .get(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "grupa-B");

    expect(res.status).toBe(404);
  });

  it("zwraca globalny przepis niezależnie od grupy odczytującej", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Globalny przepis", is_global: "true" });

    const res = await request(app)
      .get(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "grupa-B");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Globalny przepis");
  });

  it("zwraca pełny przepis wraz ze składnikami i krokami, is_global jako boolean", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({
        name: "Naleśniki",
        description: "Proste naleśniki",
        time_to_make: 20,
        is_global: "true",
        ingredients: JSON.stringify([
          { name: "Mąka", quantity: 250, unit: "g" },
          { name: "Mleko", quantity: 500, unit: "ml" },
        ]),
        steps: JSON.stringify([
          { order: 2, title: "Smaż", description: "Smaż na patelni" },
          { order: 1, title: "Wymieszaj", description: "Wymieszaj składniki" },
        ]),
      });

    const res = await request(app)
      .get(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Naleśniki");
    expect(res.body.is_global).toBe(true);
    expect(res.body.ingredients).toHaveLength(2);
    expect(res.body.ingredients.map((i) => i.name).sort()).toEqual(["Mleko", "Mąka"]);

    // Kroki posortowane po "order" ASC, mimo że wstawione w odwrotnej kolejności
    expect(res.body.steps.map((s) => s.title)).toEqual(["Wymieszaj", "Smaż"]);
  });
});

describe("POST /api/v1/recipes", () => {
  it("zwraca 400, gdy brak nazwy", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ description: "Bez nazwy" });

    expect(res.status).toBe(400);
  });

  it("zwraca 400, gdy nazwa to same białe znaki", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "   " });

    expect(res.status).toBe(400);
  });

  it("tworzy przepis z domyślnym statusem 'draft', gdy nie podano statusu", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Zupa" });

    expect(res.status).toBe(201);

    const saved = await db.get("SELECT status, is_global FROM recipes WHERE id = ?", [
      res.body.id,
    ]);
    expect(saved.status).toBe("draft");
    expect(saved.is_global).toBe(0);
  });

  it("tworzy przepis ze składnikami i krokami przesłanymi jako natywna tablica (JSON body)", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({
        name: "Kanapka",
        ingredients: [{ name: "Chleb", quantity: 2, unit: "kromki" }],
        steps: [{ order: 1, title: "Złóż", description: "Złóż kanapkę" }],
      });

    expect(res.status).toBe(201);

    const ingredients = await db.all("SELECT * FROM ingredients WHERE recipe_id = ?", [
      res.body.id,
    ]);
    const steps = await db.all("SELECT * FROM steps WHERE recipe_id = ?", [res.body.id]);
    expect(ingredients).toHaveLength(1);
    expect(steps).toHaveLength(1);
  });

  it("tworzy przepis ze składnikami/krokami przesłanymi jako JSON string (symulacja FormData)", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({
        name: "Placek",
        ingredients: JSON.stringify([{ name: "Jajka", quantity: 3, unit: "szt." }]),
        steps: JSON.stringify([{ order: 1, title: "Piecz", description: "Piecz 40 minut" }]),
      });

    expect(res.status).toBe(201);

    const ingredients = await db.all("SELECT * FROM ingredients WHERE recipe_id = ?", [
      res.body.id,
    ]);
    expect(ingredients).toHaveLength(1);
    expect(ingredients[0].name).toBe("Jajka");
  });

  it("zwraca 400, gdy ingredients to niepoprawny JSON string", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Błędny", ingredients: "{niepoprawny" });

    expect(res.status).toBe(400);
  });

  it("normalizuje is_global: 'true' (string) na 1 w bazie", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Globalny", is_global: "true" });

    const saved = await db.get("SELECT is_global FROM recipes WHERE id = ?", [res.body.id]);
    expect(saved.is_global).toBe(1);
  });

  it("zapisuje przesłane zdjęcie i zwraca jego URL", async () => {
    const res = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .field("name", "Przepis ze zdjęciem")
      .attach("image", Buffer.from("fake-image-bytes"), "zdjecie.png");

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toMatch(/^\/images\/recipes\/.+\.png$/);
    uploadedFiles.push(res.body.imageUrl);

    expect(fs.existsSync(imageUrlToDiskPath(res.body.imageUrl))).toBe(true);
  });
});

describe("PUT /api/v1/recipes/:id", () => {
  it("zwraca 400, gdy brak nazwy", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({ name: "Oryginał" });

    const res = await request(app)
      .put(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "test-grupa")
      .send({ description: "Bez nazwy" });

    expect(res.status).toBe(400);
  });

  it("zwraca 404, gdy przepis nie istnieje", async () => {
    const res = await request(app)
      .put("/api/v1/recipes/nieistniejace-id")
      .set("x-group-id", "test-grupa")
      .send({ name: "Cokolwiek" });

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy przepis należy do innej grupy", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Cudzy przepis" });

    const res = await request(app)
      .put(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "grupa-B")
      .send({ name: "Przejęty" });

    expect(res.status).toBe(404);

    const saved = await db.get("SELECT name FROM recipes WHERE id = ?", [createRes.body.id]);
    expect(saved.name).toBe("Cudzy przepis");
  });

  it("aktualizuje dane przepisu i podmienia składniki/kroki (stare usunięte, nowe wstawione)", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({
        name: "Wersja 1",
        ingredients: [{ name: "Stary składnik", quantity: 1, unit: "szt." }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/api/v1/recipes/${id}`)
      .set("x-group-id", "test-grupa")
      .send({
        name: "Wersja 2",
        ingredients: [{ name: "Nowy składnik", quantity: 2, unit: "szt." }],
        steps: [{ order: 1, title: "Nowy krok", description: "Opis" }],
      });

    expect(res.status).toBe(200);

    const saved = await db.get("SELECT name FROM recipes WHERE id = ?", [id]);
    expect(saved.name).toBe("Wersja 2");

    const ingredients = await db.all("SELECT name FROM ingredients WHERE recipe_id = ?", [id]);
    expect(ingredients).toHaveLength(1);
    expect(ingredients[0].name).toBe("Nowy składnik");

    const steps = await db.all("SELECT title FROM steps WHERE recipe_id = ?", [id]);
    expect(steps).toHaveLength(1);
  });

  it("zachowuje istniejące zdjęcie, gdy nie przesłano nowego", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .field("name", "Ze zdjęciem")
      .attach("image", Buffer.from("fake-image-bytes"), "oryginal.png");
    uploadedFiles.push(createRes.body.imageUrl);

    const res = await request(app)
      .put(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "test-grupa")
      .send({ name: "Ze zdjęciem (edycja)" });

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toBe(createRes.body.imageUrl);
  });
});

describe("DELETE /api/v1/recipes/:id", () => {
  it("zwraca 404, gdy przepis nie istnieje", async () => {
    const res = await request(app)
      .delete("/api/v1/recipes/nieistniejace-id")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy przepis należy do innej grupy", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "grupa-A")
      .send({ name: "Cudzy przepis" });

    const res = await request(app)
      .delete(`/api/v1/recipes/${createRes.body.id}`)
      .set("x-group-id", "grupa-B");

    expect(res.status).toBe(404);

    const saved = await db.get("SELECT id FROM recipes WHERE id = ?", [createRes.body.id]);
    expect(saved).toBeTruthy();
  });

  it("usuwa przepis oraz jego składniki i kroki", async () => {
    const createRes = await request(app)
      .post("/api/v1/recipes")
      .set("x-group-id", "test-grupa")
      .send({
        name: "Do usunięcia",
        ingredients: [{ name: "Składnik", quantity: 1, unit: "szt." }],
        steps: [{ order: 1, title: "Krok", description: "Opis" }],
      });
    const id = createRes.body.id;

    const res = await request(app)
      .delete(`/api/v1/recipes/${id}`)
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);

    const recipe = await db.get("SELECT id FROM recipes WHERE id = ?", [id]);
    const ingredients = await db.all("SELECT * FROM ingredients WHERE recipe_id = ?", [id]);
    const steps = await db.all("SELECT * FROM steps WHERE recipe_id = ?", [id]);

    expect(recipe).toBeUndefined();
    expect(ingredients).toEqual([]);
    expect(steps).toEqual([]);
  });
});
