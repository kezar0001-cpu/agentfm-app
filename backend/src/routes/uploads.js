import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();

// Ensure the uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure disk storage with safe, unique filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base =
      path
        .basename(file.originalname || 'file', ext)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .slice(0, 40) || 'file';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

// 👇 MINIMAL CHANGE: Increased file size limit to 10MB to prevent "request entity too large" error.
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
});
// ---

/**
 * POST /uploads/single (Existing route, no changes)
 * FormData field name must be: "file"
 * Returns: { url: "/uploads/<filename>" }
 */
router.post('/single', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  console.log('✅ Uploaded:', req.file.originalname, '->', req.file.path);
  res.status(201).json({ url });
});

// 👇 MINIMAL CHANGE: Added a new route to handle multiple file uploads.
/**
 * POST /uploads/multiple
 * FormData field name must be: "files"
 * Returns: { urls: ["/uploads/<filename1>", "/uploads/<filename2>"] }
 */
router.post('/multiple', upload.array('files', 5), (req, res) => { // Handles up to 5 files
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const urls = req.files.map(file => `/uploads/${file.filename}`);
  console.log(`✅ Uploaded ${req.files.length} files`);
  res.status(201).json({ urls });
});
// ---

/** GET /uploads/ping -> { ok: true }  (sanity check) */
router.get('/ping', (_req, res) => res.json({ ok: true }));

export default router;