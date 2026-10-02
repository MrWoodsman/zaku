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
  await db.run(`INSERT INTO groups (id, name) VALUES ('g1', 'g1'), ('g2', 'g2')`);
});

afterEach(async () => {
  await db.close();
});

const addDeposit = async (fields) => {
  const row = { group_id: "g1", shop_id: 1, value: 0.5, code: "123", expiring_date: null, used_at: null, ...fields };
  const result = await db.run(
    `INSERT INTO deposits (group_id, shop_id, value, code, expiring_date, used_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [row.group_id, row.shop_id, row.value, row.code, row.expiring_date, row.used_at],
  );
  return result.lastID;
};

describe("wymaganie nagłówka x-group-id", () => {
  it.each([
    { method: "get", path: "/api/v1/deposits" },
    { method: "get", path: "/api/v1/deposits/summary" },
    { method: "put", path: "/api/v1/deposits/1/used" },
    { method: "put", path: "/api/v1/deposits/1" },
    { method: "delete", path: "/api/v1/deposits/1" },
  ])("$method $path -> 401 bez x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/deposits", () => {
  it("zwraca kupony grupy z nazwą sklepu, bez usuniętych i bez innych grup", async () => {
    await addDeposit({});
    await addDeposit({ group_id: "g2" });
    const deletedId = await addDeposit({});
    await db.run(`UPDATE deposits SET deleted_at = datetime('now') WHERE id = ?`, [deletedId]);

    const res = await request(app).get("/api/v1/deposits").set("x-group-id", "g1");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].shop_name).toBe("Biedronka");
    expect(res.body.nextOffset).toBeNull();
  });

  it("domyślnie: ważne od najszybciej wygasających, bez daty dalej, potem wygasłe, wykorzystane na końcu", async () => {
    const used = await addDeposit({ expiring_date: "2099-01-01", used_at: "2026-09-01 10:00:00" });
    const expired = await addDeposit({ expiring_date: "2000-01-01" });
    const noDate = await addDeposit({});
    const later = await addDeposit({ expiring_date: "2099-12-01" });
    const sooner = await addDeposit({ expiring_date: "2099-10-05" });

    const res = await request(app).get("/api/v1/deposits").set("x-group-id", "g1");

    expect(res.body.items.map((d) => d.id)).toEqual([sooner, later, noDate, expired, used]);
  });

  it("sortowanie po kwocie malejąco, wykorzystane dalej na końcu", async () => {
    const used = await addDeposit({ value: 5, used_at: "2026-09-01 10:00:00" });
    const small = await addDeposit({ value: 0.5 });
    const big = await addDeposit({ value: 2 });

    const res = await request(app)
      .get("/api/v1/deposits?sort=value&order=desc")
      .set("x-group-id", "g1");

    expect(res.body.items.map((d) => d.id)).toEqual([big, small, used]);
  });

  it("used=0 ukrywa wykorzystane", async () => {
    await addDeposit({ used_at: "2026-09-01 10:00:00" });
    const active = await addDeposit({});

    const res = await request(app).get("/api/v1/deposits?used=0").set("x-group-id", "g1");

    expect(res.body.items.map((d) => d.id)).toEqual([active]);
  });

  it("stronicowanie: limit + nextOffset", async () => {
    for (let i = 0; i < 5; i++) await addDeposit({ value: i + 1 });

    const first = await request(app)
      .get("/api/v1/deposits?sort=value&limit=2")
      .set("x-group-id", "g1");
    expect(first.body.items.map((d) => d.value)).toEqual([1, 2]);
    expect(first.body.nextOffset).toBe(2);

    const last = await request(app)
      .get("/api/v1/deposits?sort=value&limit=2&offset=4")
      .set("x-group-id", "g1");
    expect(last.body.items.map((d) => d.value)).toEqual([5]);
    expect(last.body.nextOffset).toBeNull();
  });

  it("nieznany sort nie trafia do SQL - wraca do domyślnego", async () => {
    await addDeposit({});

    const res = await request(app)
      .get("/api/v1/deposits?sort=value;DROP TABLE deposits")
      .set("x-group-id", "g1");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe("GET /api/v1/deposits/summary", () => {
  it("liczy tylko ważne i niewykorzystane, osobno te wygasające wkrótce", async () => {
    await addDeposit({ value: 1 }); // bez daty
    await addDeposit({ value: 2, expiring_date: "2099-01-01" });
    const now = new Date();
    // Local date (not toISOString, which is UTC and would be "yesterday" right after midnight)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    await addDeposit({ value: 0.5, expiring_date: today }); // wygasa dzisiaj
    await addDeposit({ value: 10, expiring_date: "2000-01-01" }); // wygasły
    await addDeposit({ value: 10, used_at: "2026-09-01 10:00:00" }); // wykorzystany

    const res = await request(app).get("/api/v1/deposits/summary").set("x-group-id", "g1");

    expect(res.body).toEqual({ total: 3.5, count: 3, expiringCount: 1 });
  });
});

describe("PUT /api/v1/deposits/:id/used", () => {
  it("oznacza jako wykorzystany i cofa", async () => {
    const id = await addDeposit({});
    const put = (used) =>
      request(app).put(`/api/v1/deposits/${id}/used`).set("x-group-id", "g1").send({ used });

    const marked = await put(true);
    expect(marked.status).toBe(200);
    expect(marked.body.used_at).not.toBeNull();

    const unmarked = await put(false);
    expect(unmarked.body.used_at).toBeNull();
  });

  it("400 dla złego body, 404 dla kuponu innej grupy", async () => {
    const id = await addDeposit({ group_id: "g2" });

    const bad = await request(app).put(`/api/v1/deposits/${id}/used`).set("x-group-id", "g1").send({ used: "tak" });
    expect(bad.status).toBe(400);

    const other = await request(app).put(`/api/v1/deposits/${id}/used`).set("x-group-id", "g1").send({ used: true });
    expect(other.status).toBe(404);
  });
});

describe("PUT /api/v1/deposits/:id", () => {
  const edit = (id, body, group = "g1") =>
    request(app).put(`/api/v1/deposits/${id}`).set("x-group-id", group).send(body);

  it("zapisuje kwotę, datę, sklep i kod", async () => {
    const id = await addDeposit({});

    const res = await edit(id, { value: 2.5, expiring_date: "2026-12-24", shop_id: 2, code: " 999 " });
    expect(res.status).toBe(200);

    const row = await db.get(`SELECT value, expiring_date, shop_id, code FROM deposits WHERE id = ?`, [id]);
    expect(row).toEqual({ value: 2.5, expiring_date: "2026-12-24", shop_id: 2, code: "999" });
  });

  it("400 dla złej kwoty, daty i sklepu, 404 dla innej grupy", async () => {
    const id = await addDeposit({});

    expect((await edit(id, { value: 0 })).status).toBe(400);
    expect((await edit(id, { value: 1, expiring_date: "24.12.2026" })).status).toBe(400);
    expect((await edit(id, { value: 1, shop_id: 99999 })).status).toBe(400);
    expect((await edit(id, { value: 1 }, "g2")).status).toBe(404);
  });
});

describe("DELETE /api/v1/deposits/:id", () => {
  it("usuwa miękko - znika z listy i podsumowania", async () => {
    const id = await addDeposit({ value: 3 });

    const res = await request(app).delete(`/api/v1/deposits/${id}`).set("x-group-id", "g1");
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/v1/deposits").set("x-group-id", "g1");
    expect(list.body.items).toHaveLength(0);
    const summary = await request(app).get("/api/v1/deposits/summary").set("x-group-id", "g1");
    expect(summary.body.total).toBe(0);

    const again = await request(app).delete(`/api/v1/deposits/${id}`).set("x-group-id", "g1");
    expect(again.status).toBe(404);
  });
});
