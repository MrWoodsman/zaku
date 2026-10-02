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
describe("POST /api/v1/scan/deposit - zdjęcie", () => {
  const createdFiles = [];

  afterEach(async () => {
    const fs = await import("fs");
    const path = await import("path");
    for (const url of createdFiles.splice(0)) {
      fs.rmSync(path.join("uploads", "refunds", path.basename(url)), { force: true });
    }
  });

  it("zapisuje lekką wersję do wyświetlania i nietknięty oryginał", async () => {
    const sharp = (await import("sharp")).default;
    const fs = await import("fs");
    const path = await import("path");
    const photo = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "#7a9a5a" },
    })
      .jpeg()
      .toBuffer();

    const res = await request(app)
      .post("/api/v1/scan/deposit")
      .set("x-group-id", "g1")
      .field("depositNumber", "123")
      .field("depositValue", "0.5")
      .field("depositDate", "2026-12-01")
      .field("depositShop", "Lidl")
      .attach("image", photo, "kupon.jpg");

    expect(res.status).toBe(201);
    const { image_url, image_original_url } = res.body.deposit;
    createdFiles.push(image_url, image_original_url);

    const display = await sharp(fs.readFileSync(path.join("uploads", "refunds", path.basename(image_url)))).metadata();
    expect(Math.max(display.width, display.height)).toBe(1600);
    expect(display.isProgressive).toBe(true);

    const original = fs.readFileSync(path.join("uploads", "refunds", path.basename(image_original_url)));
    expect(original.equals(photo)).toBe(true);
  });
});
