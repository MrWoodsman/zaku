import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

// WZORZEC: zamiast mockować moduł usługi LLM (problematyczne przy CJS require na Windows),
// mockujemy globalny fetch - to on jest jedyną "granicą" ze światem zewnętrznym w llm.service.js.
// Dzięki temu testy nigdy nie strzelają do prawdziwego Gemini API i nie zużywają realnego klucza.
function mockGeminiResponse({ list_name = null, items = [] }) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ list_name, items }) }] } }],
    }),
  };
}

let app;
let db;
let fetchMock;

beforeEach(async () => {
  process.env.DB_PATH = ":memory:";
  process.env.GEMINI_API_KEY = "test-key";
  db = await initDB();
  app = createApp(db);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await db.close();
  vi.unstubAllGlobals();
});

describe("wymaganie nagłówka x-group-id", () => {
  it("POST /api/v1/voice/parse -> 401 bez x-group-id", async () => {
    const res = await request(app).post("/api/v1/voice/parse").send({ text: "dodaj mleko" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/voice/parse", () => {
  it("zwraca 400 jeśli nie podano treści komendy", async () => {
    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({});

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("zwraca 502, gdy usługa AI zawiedzie", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj mleko" });

    expect(res.status).toBe(502);
  });

  it("zwraca 422, gdy AI nie rozpozna żadnych produktów", async () => {
    fetchMock.mockResolvedValue(mockGeminiResponse({ list_name: null, items: [] }));

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "jaka jest pogoda" });

    expect(res.status).toBe(422);
  });

  it("proponuje nową listę o domyślnej nazwie, gdy grupa nie ma żadnej listy, i niczego nie zapisuje", async () => {
    fetchMock.mockResolvedValue(
      mockGeminiResponse({ list_name: null, items: [{ name: "Mleko", quantity: 2, unit: "l" }] }),
    );

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj 2 litry mleka" });

    expect(res.status).toBe(200);
    expect(res.body.list).toBeNull();
    expect(res.body.new_list_name).toBe("Zakupy");
    expect(res.body.items).toEqual([{ name: "Mleko", quantity: 2, unit: "l" }]);

    const lists = await db.all("SELECT * FROM lists");
    expect(lists).toHaveLength(0);
  });

  it("wskazuje jedyną istniejącą listę, gdy AI nie wskazał nazwy", async () => {
    const createRes = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Lista testowa" });
    const listId = createRes.body.list.id;

    fetchMock.mockResolvedValue(
      mockGeminiResponse({ list_name: null, items: [{ name: "Chleb", quantity: 1, unit: "szt." }] }),
    );

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj chleb" });

    expect(res.status).toBe(200);
    expect(res.body.list).toEqual({ id: listId, name: "Lista testowa" });
    expect(res.body.new_list_name).toBeNull();
  });

  it("dopasowuje listę po nazwie (case-insensitive) wskazanej przez AI", async () => {
    await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Impreza" });
    const createRes2 = await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Codzienne" });

    fetchMock.mockResolvedValue(
      mockGeminiResponse({ list_name: "impreza", items: [{ name: "Chipsy", quantity: 3, unit: "szt." }] }),
    );

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj chipsy do listy impreza" });

    expect(res.status).toBe(200);
    expect(res.body.list.name).toBe("Impreza");
    expect(res.body.list.id).not.toBe(createRes2.body.list.id);
  });

  it("proponuje nową listę, gdy AI wskazał nazwę której nie ma wśród istniejących, i niczego nie zapisuje", async () => {
    fetchMock.mockResolvedValue(
      mockGeminiResponse({
        list_name: "Wakacje",
        items: [{ name: "Krem do opalania", quantity: 1, unit: "szt." }],
      }),
    );

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj krem do opalania do listy wakacje" });

    expect(res.status).toBe(200);
    expect(res.body.list).toBeNull();
    expect(res.body.new_list_name).toBe("Wakacje");

    const lists = await db.all("SELECT * FROM lists WHERE group_id = ?", ["test-grupa"]);
    expect(lists).toHaveLength(0);
  });

  it("prosi o doprecyzowanie, gdy jest kilka list, a AI nie wskazał żadnej", async () => {
    await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Zakupy" });
    await request(app)
      .post("/api/v1/lists")
      .set("x-group-id", "test-grupa")
      .send({ name: "Impreza" });

    fetchMock.mockResolvedValue(
      mockGeminiResponse({ list_name: null, items: [{ name: "Mleko", quantity: 1, unit: "szt." }] }),
    );

    const res = await request(app)
      .post("/api/v1/voice/parse")
      .set("x-group-id", "test-grupa")
      .send({ text: "dodaj mleko" });

    expect(res.status).toBe(200);
    expect(res.body.needs_clarification).toBe(true);
    expect(res.body.candidates).toHaveLength(2);
  });
});
