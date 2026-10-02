const express = require("express");
const router = express.Router();
const multer = require("multer");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/refunds/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, randomUUID() + ext);
  },
});

const upload = multer({ storage: storage });

// POST /api/v1/scan ->
router.post("/", upload.single("barcodeImage"), async (req, res) => {
  // Weryfikacja ID grupy
  // const groupId = req.headers['x-group-id'];
  // if (!groupId) return res.status(401).json({ message: 'Brak ID grupy' });

  // Weryfikacja przesłania zdjecia (poprawiony wykrzyknik)
  if (!req.file) {
    return res.status(400).json({ message: "Nie przesłano zdjecia" });
  }

  try {
    const { readBarcodes } = require("zxing-wasm");
    console.log("Odebrano zdjęcie, przetwarzanie...");

    // 1. Wczytaj zapisany na dysku plik z powrotem do bufora
    const imageBuffer = await fs.promises.readFile(req.file.path);

    // 2. Przekaż wczytany bufor do skanera zamiast undefined
    const results = await readBarcodes(imageBuffer, {
      tryHarder: true,
      formats: ["Code128"],
      maxNumberOfSymbols: 1,
    });

    if (results && results.length > 0 && results[0].text.trim() !== "") {
      res.json({ success: true, code: results[0].text });
    } else {
      res.json({ success: false, message: "Nie odnaleziono kodu na zdjęciu." });
    }
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera: " + error.message });
  }
});

module.exports = router;
