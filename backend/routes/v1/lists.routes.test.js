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

describe("POST /api/v1/lists", () => {
  it("zwraca 401, gdy brakuje nagłówka x-group-id", async () => {
    const res = await request(app).post("/api/v1/lists").send({ name: "Zakupy" });

    expect(res.status).toBe(401);
  });

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
  it("zwraca 401, gdy brakuje nagłówka x-group-id", async () => {
    const res = await request(app).get("/api/v1/lists");

    expect(res.status).toBe(401);
  });

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
  it("zwraca 401, gdy brakuje nagłówka x-group-id", async () => {
    const res = await request(app).get("/api/v1/lists/5");

    expect(res.status).toBe(401);
  });

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
