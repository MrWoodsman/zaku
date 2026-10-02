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

const shopId = async (name) => (await db.get(`SELECT id FROM shops WHERE name = ?`, [name])).id;

describe("wymaganie nagłówka x-group-id", () => {
  it.each([
    { method: "get", path: "/api/v1/shops" },
    { method: "put", path: "/api/v1/shops/1/status" },
  ])("$method $path -> 401 bez x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/shops", () => {
  it("zwraca wszystkie sklepy bez statusu, alfabetycznie, 'Inny' na końcu", async () => {
    const res = await request(app).get("/api/v1/shops").set("x-group-id", "g1");

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(10);
    expect(res.body.every((s) => s.status === null)).toBe(true);
    expect(res.body.at(-1).name).toBe("Inny");
  });

  it("ulubione na początku, ukryte na końcu, tylko dla swojej grupy", async () => {
    const lidl = await shopId("Lidl");
    const orlen = await shopId("Orlen");
    await request(app).put(`/api/v1/shops/${lidl}/status`).set("x-group-id", "g1").send({ status: "favorite" });
    await request(app).put(`/api/v1/shops/${orlen}/status`).set("x-group-id", "g1").send({ status: "hidden" });

    const res = await request(app).get("/api/v1/shops").set("x-group-id", "g1");
    expect(res.body[0]).toMatchObject({ id: lidl, status: "favorite" });
    expect(res.body.at(-1)).toMatchObject({ id: orlen, status: "hidden" });

    const other = await request(app).get("/api/v1/shops").set("x-group-id", "g2");
    expect(other.body.every((s) => s.status === null)).toBe(true);
  });
});

describe("PUT /api/v1/shops/:id/status", () => {
  it("zmienia status i null przywraca zwykły", async () => {
    const lidl = await shopId("Lidl");
    const put = (status) =>
      request(app).put(`/api/v1/shops/${lidl}/status`).set("x-group-id", "g1").send({ status });

    expect((await put("favorite")).status).toBe(200);
    expect((await put("hidden")).status).toBe(200);
    let row = await db.get(`SELECT status FROM group_shop_preferences WHERE shop_id = ?`, [lidl]);
    expect(row.status).toBe("hidden");

    expect((await put(null)).status).toBe(200);
    row = await db.get(`SELECT status FROM group_shop_preferences WHERE shop_id = ?`, [lidl]);
    expect(row).toBeUndefined();
  });

  it("400 dla złego statusu, 404 dla nieistniejącego sklepu", async () => {
    const bad = await request(app).put("/api/v1/shops/1/status").set("x-group-id", "g1").send({ status: "xyz" });
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .put("/api/v1/shops/99999/status")
      .set("x-group-id", "g1")
      .send({ status: "favorite" });
    expect(missing.status).toBe(404);
  });
});
