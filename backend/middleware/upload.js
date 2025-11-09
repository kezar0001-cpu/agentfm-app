const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/properties');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Bug Fix: Use UUID instead of Date.now() + random to prevent filename collisions
    const uniqueSuffix = randomUUID();
    cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file (unified with other upload endpoints)
  },
  fileFilter: fileFilter
});

module.exports = upload;