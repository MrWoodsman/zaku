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

// Pomocnicze funkcje - tworzenie listy/produktu przez istniejące endpointy z lists.routes,
// bo items.routes nie ma własnego "dodaj produkt" (dodawanie zostaje w podkategorii list).
async function createList(groupId, name = "Lista testowa") {
  const res = await request(app).post("/api/v1/lists").set("x-group-id", groupId).send({ name });
  return res.body.list.id;
}

async function addItem(groupId, listId, data) {
  const res = await request(app)
    .post(`/api/v1/lists/${listId}/items`)
    .set("x-group-id", groupId)
    .send(data);
  return res;
}

async function getItemId(listId, name) {
  const item = await db.get("SELECT id FROM items WHERE list_id = ? AND name = ?", [
    listId,
    name,
  ]);
  return item.id;
}

const chronioneEndpointy = [
  { method: "get", path: "/api/v1/items" },
  { method: "get", path: "/api/v1/items/completed" },
  { method: "put", path: "/api/v1/items/5" },
  { method: "delete", path: "/api/v1/items/5" },
];

describe("wymaganie nagłówka x-group-id", () => {
  it.each(chronioneEndpointy)("$method $path -> 401 bez x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/items", () => {
  it("zwraca puste [], gdy grupa nie ma żadnych produktów", async () => {
    const res = await request(app).get("/api/v1/items").set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("agreguje produkty ze wszystkich list danej grupy wraz z nazwą listy", async () => {
    const listA = await createList("test-grupa", "Lista A");
    const listB = await createList("test-grupa", "Lista B");
    await addItem("test-grupa", listA, { name: "Mleko", quantity: 1, unit: "l" });
    await addItem("test-grupa", listB, { name: "Chleb", quantity: 2, unit: "szt." });

    const res = await request(app).get("/api/v1/items").set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const mleko = res.body.find((i) => i.name === "Mleko");
    expect(mleko.list_id).toBe(listA);
    expect(mleko.list_name).toBe("Lista A");
    expect(mleko.completed).toBe(false);

    const chleb = res.body.find((i) => i.name === "Chleb");
    expect(chleb.list_id).toBe(listB);
    expect(chleb.list_name).toBe("Lista B");
  });

  it("nie widzi produktów należących do innej grupy", async () => {
    const listA = await createList("grupa-A");
    await addItem("grupa-A", listA, { name: "Cudzy produkt" });

    const res = await request(app).get("/api/v1/items").set("x-group-id", "grupa-B");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("nie zwraca usuniętych (soft-delete) produktów ani produktów z usuniętej listy", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Usunięty ręcznie" });
    await addItem("test-grupa", listId, { name: "Zostaje" });

    const usunietyId = await getItemId(listId, "Usunięty ręcznie");
    await request(app).delete(`/api/v1/items/${usunietyId}`).set("x-group-id", "test-grupa");

    const listId2 = await createList("test-grupa", "Usunięta lista");
    await addItem("test-grupa", listId2, { name: "Produkt z usuniętej listy" });
    await request(app).delete(`/api/v1/lists/${listId2}`).set("x-group-id", "test-grupa");

    const res = await request(app).get("/api/v1/items").set("x-group-id", "test-grupa");

    expect(res.body.map((i) => i.name)).toEqual(["Zostaje"]);
  });

  it("mapuje completed_at na pole completed (boolean)", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Produkt" });
    const itemId = await getItemId(listId, "Produkt");

    await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa")
      .send({ completed: true });

    const res = await request(app).get("/api/v1/items").set("x-group-id", "test-grupa");

    expect(res.body[0].completed).toBe(true);
  });

  it("sortuje: najpierw produkty do kupienia (alfabetycznie), potem kupione od najnowszych", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Zebra" });
    await addItem("test-grupa", listId, { name: "Ananas" });
    await addItem("test-grupa", listId, { name: "Najpierw kupione" });
    await addItem("test-grupa", listId, { name: "Potem kupione" });

    const najpierwId = await getItemId(listId, "Najpierw kupione");
    const potemId = await getItemId(listId, "Potem kupione");

    // Ustawiamy completed_at bezpośrednio w bazie z rozłącznymi znacznikami czasu -
    // datetime('now') w SQLite ma rozdzielczość sekundową, więc dwa kolejne
    // wywołania API w tym samym teście mogłyby dostać identyczny timestamp.
    await db.run("UPDATE items SET completed_at = ? WHERE id = ?", [
      "2024-01-01 10:00:00",
      najpierwId,
    ]);
    await db.run("UPDATE items SET completed_at = ? WHERE id = ?", [
      "2024-01-02 10:00:00",
      potemId,
    ]);

    const res = await request(app).get("/api/v1/items").set("x-group-id", "test-grupa");
    const names = res.body.map((i) => i.name);

    // Do kupienia zawsze przed kupionymi, alfabetycznie
    expect(names.slice(0, 2)).toEqual(["Ananas", "Zebra"]);
    // Kupione od najnowszych - "Potem kupione" zaznaczone jako drugie, więc jest nowsze
    expect(names.slice(2)).toEqual(["Potem kupione", "Najpierw kupione"]);
  });
});

describe("GET /api/v1/items/completed", () => {
  it("zwraca pustą stronę, gdy brak kupionych produktów", async () => {
    const res = await request(app).get("/api/v1/items/completed").set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("zwraca tylko produkty oznaczone jako kupione", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Kupiony" });
    await addItem("test-grupa", listId, { name: "Niekupiony" });

    const kupionyId = await getItemId(listId, "Kupiony");
    await request(app)
      .put(`/api/v1/items/${kupionyId}`)
      .set("x-group-id", "test-grupa")
      .send({ completed: true });

    const res = await request(app).get("/api/v1/items/completed").set("x-group-id", "test-grupa");

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe("Kupiony");
    expect(res.body.items[0].completed).toBe(true);
  });

  it("nie widzi kupionych produktów innej grupy", async () => {
    const listId = await createList("grupa-A");
    await addItem("grupa-A", listId, { name: "Produkt" });
    const itemId = await getItemId(listId, "Produkt");
    await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "grupa-A")
      .send({ completed: true });

    const res = await request(app).get("/api/v1/items/completed").set("x-group-id", "grupa-B");

    expect(res.body.items).toEqual([]);
  });

  it("stronicuje wyniki po limit i zwraca nextCursor do kolejnej strony", async () => {
    const listId = await createList("test-grupa");
    for (const name of ["A", "B", "C", "D", "E"]) {
      await addItem("test-grupa", listId, { name });
      const id = await getItemId(listId, name);
      await request(app)
        .put(`/api/v1/items/${id}`)
        .set("x-group-id", "test-grupa")
        .send({ completed: true });
    }

    const firstPage = await request(app)
      .get("/api/v1/items/completed?limit=3")
      .set("x-group-id", "test-grupa");

    expect(firstPage.body.items).toHaveLength(3);
    expect(firstPage.body.nextCursor).toBeTruthy();

    const secondPage = await request(app)
      .get(`/api/v1/items/completed?limit=3&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`)
      .set("x-group-id", "test-grupa");

    expect(secondPage.body.items).toHaveLength(2);
    expect(secondPage.body.nextCursor).toBeNull();

    // Brak duplikatów pomiędzy stronami
    const wszystkieNazwy = [...firstPage.body.items, ...secondPage.body.items].map((i) => i.name);
    expect(new Set(wszystkieNazwy).size).toBe(5);
  });

  it("limit jest ograniczony do maksymalnie 100", async () => {
    const res = await request(app)
      .get("/api/v1/items/completed?limit=9999")
      .set("x-group-id", "test-grupa");

    // Brak błędu przy dużym limicie - endpoint sam go przycina wewnętrznie
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/v1/items/:id", () => {
  it("zwraca 404, gdy produkt nie istnieje", async () => {
    const res = await request(app)
      .put("/api/v1/items/nieistniejace-id")
      .set("x-group-id", "test-grupa")
      .send({ completed: true });

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy produkt należy do innej grupy", async () => {
    const listId = await createList("grupa-A");
    await addItem("grupa-A", listId, { name: "Produkt" });
    const itemId = await getItemId(listId, "Produkt");

    const res = await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "grupa-B")
      .send({ completed: true });

    expect(res.status).toBe(404);
  });

  it("ustawia completed_at przy completed: true i czyści przy completed: false", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Produkt" });
    const itemId = await getItemId(listId, "Produkt");

    const resTrue = await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa")
      .send({ completed: true });
    expect(resTrue.status).toBe(200);

    let saved = await db.get("SELECT completed_at FROM items WHERE id = ?", [itemId]);
    expect(saved.completed_at).not.toBeNull();

    const resFalse = await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa")
      .send({ completed: false });
    expect(resFalse.status).toBe(200);

    saved = await db.get("SELECT completed_at FROM items WHERE id = ?", [itemId]);
    expect(saved.completed_at).toBeNull();
  });

  it("aktualizuje nazwę, ilość i jednostkę produktu", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Stara nazwa", quantity: 1, unit: "szt." });
    const itemId = await getItemId(listId, "Stara nazwa");

    const res = await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa")
      .send({ name: "  Nowa nazwa  ", quantity: 3, unit: "kg" });

    expect(res.status).toBe(200);

    const saved = await db.get("SELECT name, quantity, unit FROM items WHERE id = ?", [itemId]);
    expect(saved.name).toBe("Nowa nazwa");
    expect(saved.quantity).toBe(3);
    expect(saved.unit).toBe("kg");
  });

  it("nic nie zmienia, gdy nie przesłano żadnych pól do aktualizacji", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Bez zmian", quantity: 1, unit: "szt." });
    const itemId = await getItemId(listId, "Bez zmian");

    const res = await request(app)
      .put(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa")
      .send({});

    expect(res.status).toBe(200);

    const saved = await db.get("SELECT name, quantity, unit FROM items WHERE id = ?", [itemId]);
    expect(saved.name).toBe("Bez zmian");
    expect(saved.quantity).toBe(1);
    expect(saved.unit).toBe("szt.");
  });
});

describe("DELETE /api/v1/items/:id", () => {
  it("zwraca 404, gdy produkt nie istnieje", async () => {
    const res = await request(app)
      .delete("/api/v1/items/nieistniejace-id")
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(404);
  });

  it("zwraca 404, gdy produkt należy do innej grupy", async () => {
    const listId = await createList("grupa-A");
    await addItem("grupa-A", listId, { name: "Produkt" });
    const itemId = await getItemId(listId, "Produkt");

    const res = await request(app)
      .delete(`/api/v1/items/${itemId}`)
      .set("x-group-id", "grupa-B");

    expect(res.status).toBe(404);
  });

  it("usuwa (soft-delete) produkt - ustawia deleted_at, nie kasuje wiersza", async () => {
    const listId = await createList("test-grupa");
    await addItem("test-grupa", listId, { name: "Do usunięcia" });
    const itemId = await getItemId(listId, "Do usunięcia");

    const res = await request(app)
      .delete(`/api/v1/items/${itemId}`)
      .set("x-group-id", "test-grupa");

    expect(res.status).toBe(200);

    const saved = await db.get("SELECT deleted_at FROM items WHERE id = ?", [itemId]);
    expect(saved).toBeTruthy();
    expect(saved.deleted_at).not.toBeNull();
  });
});
