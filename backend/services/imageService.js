const sharp = require("sharp");
const fs = require("fs/promises");
const path = require("path");
const { logger } = require("../logger");

// Longest side of the display version. Phone photos are ~4000px / 2-5 MB - way more
// than a screen needs, and the reason big photos loaded in visible strips on phones.
const MAX_SIZE = 1600;
const QUALITY = 80;

// Makes a light display version of an uploaded photo: resized, *progressive* JPEG
// (shows a blurry full image first and sharpens as it loads, instead of drawing from
// the top in strips), with EXIF rotation applied (phones store photos sideways + a flag).
//
// keepOriginal: true  -> the untouched upload is kept as "<name>.orig<ext>" (full quality,
//                        e.g. to re-read a barcode later); false -> it's removed.
// Returns { displayName, originalName } (originalName is null when not kept).
// If the file can't be processed, the upload is used as-is for display - a slow photo
// is better than a failed upload.
async function createDisplayImage(filePath, { keepOriginal = false } = {}) {
  const parsed = path.parse(filePath);
  const displayName = `${parsed.name}.jpg`;
  const originalName = `${parsed.name}.orig${parsed.ext}`;
  // Write to a temp file first: the display name may equal the upload's name
  const tempPath = path.join(parsed.dir, `${parsed.name}.tmp.jpg`);

  try {
    // Read into memory first: on Windows sharp keeps a handle on a file it opened
    // by path, so renaming/removing the upload afterwards fails with EBUSY
    await sharp(await fs.readFile(filePath))
      .rotate()
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
      .toFile(tempPath);
  } catch (error) {
    logger.warn({ err: error, file: parsed.base }, "Nie udało się przygotować zdjęcia");
    await fs.rm(tempPath, { force: true });
    return { displayName: parsed.base, originalName: null };
  }

  if (keepOriginal) {
    await fs.rename(filePath, path.join(parsed.dir, originalName));
  } else {
    await fs.rm(filePath, { force: true });
  }
  await fs.rename(tempPath, path.join(parsed.dir, displayName));

  return { displayName, originalName: keepOriginal ? originalName : null };
}

module.exports = { createDisplayImage };
