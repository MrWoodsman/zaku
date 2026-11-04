import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

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

describe("nieznana grupa w x-group-id", () => {
  it("zwykłe zapytanie -> 401 i grupa NIE jest tworzona", async () => {
    const res = await request(app).get("/api/v1/lists").set("x-group-id", "DOM");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Nieznana grupa");
    expect(await db.get(`SELECT id FROM groups WHERE id = 'DOM'`)).toBeUndefined();
  });

  it("istniejąca grupa przechodzi dalej", async () => {
    await db.run(`INSERT INTO groups (id, name) VALUES ('DOM-AB12', 'DOM-AB12')`);
    const res = await request(app).get("/api/v1/lists").set("x-group-id", "DOM-AB12");

    expect(res.status).toBe(200);
  });

  it("/api/test działa bez istniejącej grupy", async () => {
    const res = await request(app).get("/api/test").set("x-group-id", "NIE-MA");

    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/groups", () => {
  it("tworzy grupę i normalizuje kod -> 201", async () => {
    const res = await request(app).post("/api/v1/groups").send({ id: "  dom ab12 " });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("DOM-AB12");
    expect(await db.get(`SELECT id FROM groups WHERE id = 'DOM-AB12'`)).toBeTruthy();
  });

  it("zajęty kod -> 409", async () => {
    await request(app).post("/api/v1/groups").send({ id: "DOM-AB12" });
    const res = await request(app).post("/api/v1/groups").send({ id: "dom-ab12" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Taki kod już istnieje");
  });

  it.each([{ id: "" }, { id: "ab" }, { id: "a".repeat(65) }, { id: "DOM!@#" }, {}, { id: 123 }])(
    "nieprawidłowy kod %j -> 400",
    async (body) => {
      const res = await request(app).post("/api/v1/groups").send(body);

      expect(res.status).toBe(400);
    },
  );
});

describe("POST /api/v1/groups/join", () => {
  it("istniejąca grupa -> 200 z znormalizowanym kodem", async () => {
    await request(app).post("/api/v1/groups").send({ id: "DOM-AB12" });
    const res = await request(app).post("/api/v1/groups/join").send({ id: " dom-ab12 " });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("DOM-AB12");
  });

  it("brak grupy -> 404 i nic nie tworzy", async () => {
    const res = await request(app).post("/api/v1/groups/join").send({ id: "DOM" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Nie ma takiej grupy");
    expect(await db.get(`SELECT id FROM groups WHERE id = 'DOM'`)).toBeUndefined();
  });

  it("pusty kod -> 400", async () => {
    const res = await request(app).post("/api/v1/groups/join").send({});

    expect(res.status).toBe(400);
  });
});
