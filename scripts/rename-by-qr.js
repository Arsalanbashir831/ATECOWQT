/**
 * rename-by-qr.js
 *
 * Reads all PNG images in a folder, decodes the QR code in each image,
 * extracts the certificate/card ID from the URL, and renames the file.
 *
 * Usage:
 *   node scripts/rename-by-qr.js <path-to-folder>
 *
 * Example:
 *   node scripts/rename-by-qr.js ./input/certificates
 *   node scripts/rename-by-qr.js ./input/cards
 */

const { Jimp } = require("jimp");
const jsQR = require("jsqr");
const fs = require("fs");
const path = require("path");

const folderPath = process.argv[2];

if (!folderPath) {
  console.error("❌  Please provide a folder path as an argument.");
  console.error("    Usage: node scripts/rename-by-qr.js <path-to-folder>");
  process.exit(1);
}

if (!fs.existsSync(folderPath)) {
  console.error(`❌  Folder not found: ${folderPath}`);
  process.exit(1);
}

// Get all PNG files in the folder
const files = fs.readdirSync(folderPath).filter((f) => f.match(/\.(png|jpg|jpeg)$/i));

if (files.length === 0) {
  console.log("⚠️  No image files found in the folder.");
  process.exit(0);
}

console.log(`\n📂 Found ${files.length} image(s) in: ${folderPath}\n`);

let successCount = 0;
let skipCount = 0;
let failCount = 0;

async function processFile(file) {
  const filePath = path.join(folderPath, file);

  try {
    const rawImage = await Jimp.read(filePath);

    // --- Attempt 1: Preprocess - greyscale + contrast boost + scale up ---
    const img1 = rawImage.clone();
    // Scale up small images so jsQR can see the QR module pixels better
    const MIN_DIM = 1200;
    if (img1.bitmap.width < MIN_DIM || img1.bitmap.height < MIN_DIM) {
      const scale = MIN_DIM / Math.min(img1.bitmap.width, img1.bitmap.height);
      img1.scale(scale);
    }
    img1.greyscale().contrast(0.8).normalize();

    let code = jsQR(
      new Uint8ClampedArray(img1.bitmap.data),
      img1.bitmap.width,
      img1.bitmap.height
    );

    // --- Attempt 2: Try inverted colors (some QR codes appear light-on-dark) ---
    if (!code) {
      const img2 = img1.clone().invert();
      code = jsQR(
        new Uint8ClampedArray(img2.bitmap.data),
        img2.bitmap.width,
        img2.bitmap.height
      );
    }

    // --- Attempt 3: Try original without preprocessing (raw) ---
    if (!code) {
      code = jsQR(
        new Uint8ClampedArray(rawImage.bitmap.data),
        rawImage.bitmap.width,
        rawImage.bitmap.height
      );
    }

    if (!code) {
      console.warn(`⚠️  [SKIP] No QR code found in: ${file}`);
      skipCount++;
      return;
    }

    const qrUrl = code.data;
    console.log(`    QR URL: ${qrUrl}`);

    // Try to extract certificate or card ID from the URL
    // Matches patterns like: /certificate/view/certificate_63 or /card/view/c-10
    const certMatch = qrUrl.match(/certificate\/view\/(certificate_\d+)/);
    const cardMatch = qrUrl.match(/card\/view\/(c-\d+)/);
    const operatorMatch = qrUrl.match(/operator\/view\/([^\s/]+)/);
    const aasiaMatch = qrUrl.match(/aasia-steel-card\/view\/([^\s/]+)/);

    let newId = null;
    if (certMatch) newId = certMatch[1];
    else if (cardMatch) newId = cardMatch[1];
    else if (operatorMatch) newId = operatorMatch[1];
    else if (aasiaMatch) newId = aasiaMatch[1];

    if (!newId) {
      console.warn(`⚠️  [SKIP] Could not extract ID from QR URL in: ${file}`);
      console.warn(`           URL was: ${qrUrl}`);
      skipCount++;
      return;
    }

    const ext = path.extname(file);
    const newFilename = `${newId}${ext}`;
    const newFilePath = path.join(folderPath, newFilename);

    if (fs.existsSync(newFilePath) && newFilePath !== filePath) {
      console.warn(`⚠️  [SKIP] Target file already exists, skipping: ${newFilename}`);
      skipCount++;
      return;
    }

    if (newFilename === file) {
      console.log(`✅  [OK]   Already correctly named: ${file}`);
      successCount++;
      return;
    }

    fs.renameSync(filePath, newFilePath);
    console.log(`✅  [RENAMED] ${file}  →  ${newFilename}`);
    successCount++;
  } catch (err) {
    console.error(`❌  [ERROR] Failed to process: ${file}`);
    console.error(`           ${err.message}`);
    failCount++;
  }
}

(async () => {
  for (const file of files) {
    process.stdout.write(`🔍 Processing: ${file}\n`);
    await processFile(file);
  }

  console.log("\n─────────────────────────────────────");
  console.log(`✅  Renamed : ${successCount}`);
  console.log(`⚠️  Skipped : ${skipCount}`);
  console.log(`❌  Errors  : ${failCount}`);
  console.log("─────────────────────────────────────\n");
})();
