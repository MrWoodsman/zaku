const express = require("express");
const router = express.Router();
const multer = require("multer");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
// Najlepiej wyciągnąć import na górę pliku
const { readBarcodes } = require("zxing-wasm");
const { createDisplayImage } = require("../../services/imageService");

// 1. MULTER - PAMIĘĆ RAM (do szybkiego skanowania)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });

// 2. MULTER - DYSK (do finalnego zapisu kuponu)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/refunds/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, randomUUID() + ext);
  },
});
const uploadDisk = multer({ storage: diskStorage });

// POST /api/v1/scan -> Tylko skanowanie (zdjęcie w RAM)
router.post("/", uploadMemory.single("barcodeImage"), async (req, res) => {
  // if (!req.headers['x-group-id']) return res.status(401).json({ message: 'Brak ID grupy' });

  if (!req.file) {
    return res.status(400).json({ message: "Nie przesłano zdjecia" });
  }

  try {
    req.log.debug("Odebrano zdjęcie do RAMu, przetwarzanie...");

    // Zamiast fs.readFile, używamy bezpośrednio bufora z RAM
    const results = await readBarcodes(req.file.buffer, {
      tryHarder: true,
      formats: ["Code128"],
      maxNumberOfSymbols: 1,
      // Raw content. The default "HRI" formats GS1 codes for humans with the field
      // numbers in brackets, e.g. Lidl's "(20)10(00)..." - not what's printed on the voucher
      textMode: "Plain",
    });

    // Plain text of a GS1 code can contain GS (ASCII 29) field separators - drop control chars
    const code = results?.[0]?.text.replace(/[\x00-\x1f]/g, "").trim();

    if (code) {
      // "]C1" = GS1-128: Code128 with a leading FNC1. The regenerated barcode needs it
      // too, otherwise the till may not recognise the voucher.
      const codeFormat = results[0].symbologyIdentifier === "]C1" ? "gs1" : null;
      res.json({ success: true, code, codeFormat });
    } else {
      res.json({ success: false, message: "Nie odnaleziono kodu na zdjęciu." });
    }
  } catch (error) {
    req.log.error({ err: error }, "Failed: POST /api/v1/scan");
    res.status(500).json({ message: "Błąd serwera: " + error.message });
  }
});

// POST /api/v1/scan/deposit -> Finalny zapis z wrzuceniem pliku na dysk
router.post("/deposit", uploadDisk.single("image"), async (req, res) => {
  const groupId = req.headers["x-group-id"];
  if (!groupId) return res.status(401).json({ message: "Brak ID grupy" });

  // Uploaded file is already on disk at this point, so remove it whenever we bail out
  const removeUploadedFile = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  try {
    // Tutaj odbierasz resztę danych z formularza
    const { depositNumber, depositValue, depositDate, depositShop, depositCodeFormat } = req.body;

    const value = Number(depositValue);
    if (!Number.isFinite(value) || value <= 0) {
      removeUploadedFile();
      return res.status(400).json({ message: "Nieprawidłowa wartość kaucji" });
    }

    // depositShop can be a shop id or (for now) a shop name sent by the frontend
    let shopId = null;
    if (depositShop) {
      const shop = /^\d+$/.test(depositShop)
        ? await req.db.get(`SELECT id FROM shops WHERE id = ?`, [Number(depositShop)])
        : await req.db.get(`SELECT id FROM shops WHERE name = ?`, [depositShop]);
      if (!shop) {
        removeUploadedFile();
        return res.status(400).json({ message: "Nie znaleziono sklepu" });
      }
      shopId = shop.id;
    }

    // Light display version for the app + the untouched original (full quality,
    // e.g. to re-read the barcode later) - see imageService
    let imageUrl = null;
    let imageOriginalUrl = null;
    if (req.file) {
      const { displayName, originalName } = await createDisplayImage(req.file.path, {
        keepOriginal: true,
      });
      imageUrl = `/images/refunds/${displayName}`;
      imageOriginalUrl = originalName ? `/images/refunds/${originalName}` : null;
    }

    const result = await req.db.run(
      `INSERT INTO deposits (group_id, shop_id, value, code, code_format, expiring_date, image_url, image_original_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        shopId,
        value,
        depositNumber || null,
        // Only "gs1" is a known format, anything else = plain Code128
        depositCodeFormat === "gs1" ? "gs1" : null,
        depositDate || null,
        imageUrl,
        imageOriginalUrl,
      ],
    );

    const deposit = await req.db.get(`SELECT * FROM deposits WHERE id = ?`, [result.lastID]);

    res.status(201).json({ success: true, message: "Kupon kaucji został dodany.", deposit });
  } catch (error) {
    req.log.error({ err: error }, "Failed: POST /api/v1/scan/deposit");
    removeUploadedFile();
    res.status(500).json({ message: "Błąd podczas zapisu: " + error.message });
  }
});

module.exports = router;
