import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

// WZORZEC: przed KAŻDYM testem odpalamy świeżą, pustą bazę w pamięci (":memory:"),
// żeby testy nie wpływały na siebie nawzajem ani na Twoją prawdziwą bazę z danymi.
describe("POST /api/v1/lists", () => {
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
