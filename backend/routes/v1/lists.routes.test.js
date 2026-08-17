import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

// WZORZEC: beforeEach/afterEach TUTAJ, poza wszystkimi describe = odpala sie
// przed/po KAZDYM tescie w calym pliku. Kazdy describe ponizej (jeden na endpoint)
// dostaje wiec swiezy "app" i "db" bez powtarzania tego samego setupu.
let app;
let db;

beforeEach(async () => {
  process.env.DB_PATH = ":memory:";
  db = await initDB();
  app = createApp(db);
});

afterEach(async () => {
  await db.close();
});

// WZORZEC: "brak x-group-id -> 401" jest identyczne dla kazdego chronionego
// endpointu, wiec zamiast kopiowac ten sam "it" do kazdego describe,
// wypisujemy liste { method, path } i it.each odpala TEN SAM test dla kazdej z nich.
const chronioneEndpointy = [
  { method: "get", path: "/api/v1/lists" },
  { method: "get", path: "/api/v1/lists/5" },
  { method: "post", path: "/api/v1/lists" },
  { method: "put", path: "/api/v1/lists/5" },
  { method: "delete", path: "/api/v1/lists/5" },
  { method: "post", path: "/api/v1/lists/5/items" },
  { method: "put", path: "/api/v1/lists/5/items/mark-all" },
];

describe("wymaganie nagłówka x-group-id", () => {
  it.each(chronioneEndpointy)("$method $path -> 401 bez x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/lists", () => {
  it("tworzy nową listę dla podanej grupy i zwraca ją w odpowiedzi", async () => {
    const res = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Zakupy na weekend" });

    expect(res.status).toBe(201);
    expect(res.body.list.name).toBe("Zakupy na weekend");
    expect(res.body.list.itemsIn).toBe(0);

    // Sprawdzamy nie tylko odpowiedź HTTP, ale i to, że faktycznie wylądowało w bazie
    const saved = await db.get("SELECT * FROM lists WHERE id = ?", [res.body.list.id]);
    expect(saved).toBeTruthy();
    expect(saved.group_id).toBe("test-grupa");
  });

  it("gdy nie podano nazwy, używa domyślnej 'Nowa lista'", async () => {
    const res = await request(app).post("/api/v1/lists").set("x-group-id", "test-grupa").send({});

    expect(res.status).toBe(201);
    expect(res.body.list.name).toBe("Nowa lista");
  });
});

describe("GET /api/v1/lists", () => {
  it("zwraca puste [], gdy grupa nie ma jeszcze żadnych list", async () => {
    const res = await request(app).get("/api/v1/lists").set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("nie widzi list należących do innej grupy", async () => {
    await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "grupa-A")
      .send({ name: "Lista grupy A" });

    const res = await request(app).get("/api/v1/lists").set("x-group-id", "grupa-B");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/v1/lists/:id", () => {
  it("zwraca 404, gdy lista o podanym id nie istnieje", async () => {
    const res = await request(app)
      .get("/api/v1/lists/nieistniejace-id")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("nie widzi zawartości listy należącej do innej grupy", async () => {
    // Najpierw tworzymy prawdziwą listę i bierzemy jej id z odpowiedzi -
    // nie da się "z góry" wymyślić id, bo generuje je backend (randomUUID)
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "grupa-A")
      .send({ name: "Lista grupy A" });
    const listId = createRes.body.list.id;

    const res = await request(app).get(`/api/v1/lists/${listId}`).set("x-group-id", "grupa-B");

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/lists/:id", () => {
  it("zwraca 404, gdy lista o podanym id nie istnieje", async () => {
    const res = await request(app)
      .put("/api/v1/lists/nieistniejace-id")
      .set("x-group-id", "test-grupa")
      .send({ name: "Cokolwiek" });

    expect(res.status).toBe(404);
  });

  it("aktualizuje nazwę listy", async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "grupa-A")
      .send({ name: "Pierwsza nazwa" });
    const listId = createRes.body.list.id;

    const res = await request(app)
      .put(`/api/v1/lists/${listId}`)
      .set("x-group-id", "grupa-A")
      .send({ name: "Druga nazwa" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Zaktualizowano listę");

    // Sprawdzamy nie tylko odpowiedź, ale i to, że dane faktycznie sie zmienily w bazie
    const saved = await db.get("SELECT name FROM lists WHERE id = ?", [listId]);
    expect(saved.name).toBe("Druga nazwa");
  });

  it("zwraca 404, gdy próbujemy zaktualizować cudzą listę (inna grupa)", async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "grupa-A")
      .send({ name: "Lista grupy A" });
    const listId = createRes.body.list.id;

    const res = await request(app)
      .put(`/api/v1/lists/${listId}`)
      .set("x-group-id", "grupa-B")
      .send({ name: "Przejęta nazwa" });

    expect(res.status).toBe(404);

    // I najważniejsze: nazwa NIE mogła się zmienić, mimo błędu 404
    const saved = await db.get("SELECT name FROM lists WHERE id = ?", [listId]);
    expect(saved.name).toBe("Lista grupy A");
  });
});

describe("DELETE /api/v1/lists/:id", () => {
  it("zwraca 404, gdy, lista o podanym id nie istnieje", async () => {
    const res = await request(app)
      .delete("/api/v1/lists/nieistniejace-id")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("usuwa całą liste", async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "grupa-A")
      .send({ name: "Nowa lista" });
    const listId = createRes.body.list.id;

    const res = await request(app).delete(`/api/v1/lists/${listId}`).set("x-group-id", "grupa-A");

    expect(res.status).toBe(200);

    // DANE
    const saved = await db.get("SELECT deleted_at FROM lists WHERE id = ?", [listId]);
    expect(saved.deleted_at).not.toBeNull();
  });
});

describe("POST /api/v1/lists/:id/items", () => {
  let listId;

  beforeEach(async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Lista testowa" });
    listId = createRes.body.list.id;
  });

  it("zwraca 400 jeśli nie podano nazwy", async () => {
    const res = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set("x-group-id", "test-grupa")
      .send({});

    expect(res.status).toBe(400);
  });

  it("dodaje produkt do listy", async () => {
    const res = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set("x-group-id", "test-grupa")
      .send({ name: "Mleko", quantity: 2, unit: "l" });

    expect(res.status).toBe(201);
  });

  it("zwraca 404, gdy próbujemy dodać produkt do cudzej listy", async () => {
    const res = await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set("x-group-id", "inna-grupa")
      .send({ name: "Mleko" });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/lists/:id/items/mark-all", () => {
  let listId;

  beforeEach(async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Lista testowa" });
    listId = createRes.body.list.id;

    await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set("x-group-id", "test-grupa")
      .send({ name: "Mleko" });

    await request(app)
      .post(`/api/v1/lists/${listId}/items`)
      .set("x-group-id", "test-grupa")
      .send({ name: "Chleb" });
  });

  it("zwraca 404, gdy lista o podanym id nie istnieje", async () => {
    const res = await request(app)
      .put("/api/v1/lists/nieistniejace-id/items/mark-all")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy próbujemy oznaczyć produkty w cudzej liście", async () => {
    const res = await request(app)
      .put(`/api/v1/lists/${listId}/items/mark-all`)
      .set("x-group-id", "inna-grupa");

    expect(res.status).toBe(404);
  });

  it("zaznacza wszystkie produkty jako kupione", async () => {
    const res = await request(app)
      .put(`/api/v1/lists/${listId}/items/mark-all`)
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);

    const items = await db.all("SELECT completed_at FROM items WHERE list_id = ?", [listId]);

    items.forEach((item) => {
      expect(item.completed_at).not.toBeNull();
    });
  });
});
