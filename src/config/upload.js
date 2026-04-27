const fs = require('fs');
const path = require('path');
const multer = require('multer');

function createUpload() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const allowedExtensions = new Set([
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.svg',
        '.heic', '.heif', '.avif', '.jfif', '.ico',
      ]);

      if ((file.mimetype && file.mimetype.startsWith('image/')) || allowedExtensions.has(extension)) {
        cb(null, true);
        return;
      }
      cb(new Error('Only image files are allowed'));
    },
  });
}

module.exports = createUpload;
