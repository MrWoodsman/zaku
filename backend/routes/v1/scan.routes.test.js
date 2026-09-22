import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

let app;
let db;

// Inicjalizacja aplikacji i bazy w pamięci przed każdym testem
beforeEach(async () => {
  process.env.DB_PATH = ":memory:";
  db = await initDB();
  app = createApp(db);
});

// Sprzątanie po każdym teście
afterEach(async () => {
  await db.close();
});

describe("POST /api/v1/scan", () => {
  it("zwraca 401, gdy brak nagłówka x-group-id", async () => {
    const res = await request(app)
      .post("/api/v1/scan")
      .send({}); // Brak nagłówka

    expect(res.status).toBe(401);
  });

  it("zwraca 400, gdy nie przesłano zdjęcia (puste body)", async () => {
    const res = await request(app)
      .post("/api/v1/scan")
      .set("x-group-id", "test-grupa")
      .send({}); // Brak pliku w formularzu

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Nie przesłano zdjecia");
  });

it("zwraca success: false, gdy przesłane zdjęcie nie zawiera kodu", async () => {
    const res = await request(app)
      .post("/api/v1/scan")
      .set("x-group-id", "test-grupa")
      .attach("barcodeImage", Buffer.from("to-nie-jest-prawdziwy-kod"), "fake-image.jpg");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Nie odnaleziono kodu.");
  });
});