import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';

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
 * POST /uploads/single
 * FormData field name must be: "file"
 * Returns: { url: "/uploads/<filename>" }
 * Requires authentication
 */
router.post('/single', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const url = `/uploads/${req.file.filename}`;
    console.log('✅ Uploaded by user', req.user.id, ':', req.file.originalname, '->', req.file.path);
    res.status(201).json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up file if it was saved
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to clean up file:', cleanupError);
      }
    }
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * POST /uploads/multiple
 * FormData field name must be: "files"
 * Returns: { urls: ["/uploads/<filename1>", "/uploads/<filename2>"] }
 * Requires authentication
 */
router.post('/multiple', requireAuth, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    
    const urls = req.files.map(file => `/uploads/${file.filename}`);
    console.log(`✅ Uploaded ${req.files.length} files by user`, req.user.id);
    res.status(201).json({ success: true, urls });
  } catch (error) {
    console.error('Multiple upload error:', error);
    // Clean up any uploaded files
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      });
    }
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/** GET /uploads/ping -> { ok: true }  (sanity check) */
router.get('/ping', (_req, res) => res.json({ ok: true }));

export default router;