// backend/src/routes/uploads.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').slice(0, 40) || 'file';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// POST /uploads/single - For one file
router.post('/single', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// POST /uploads/multiple - For multiple files
router.post('/multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const urls = req.files.map(file => `/uploads/${file.filename}`);
  res.status(201).json({ urls });
});

export default router;