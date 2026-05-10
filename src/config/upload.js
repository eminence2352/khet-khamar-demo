// Import multer for handling file uploads
const multer = require('multer');
const path = require('path');

// This function creates the multer upload handler for image files
function createUpload() {
  // Keep uploads in memory so the route can hand them to Cloudinary.
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB per file
    // Only allow image files
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
