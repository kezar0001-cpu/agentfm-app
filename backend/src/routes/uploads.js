import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { sendError, ErrorCodes } from '../utils/errorHandler.js';

const router = express.Router();

// Ensure the uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Bug Fix #6: Add rate limiting for uploads to prevent abuse
const uploadRateLimits = new Map();
const UPLOAD_RATE_LIMIT = 30; // Max 30 uploads per window
const UPLOAD_RATE_WINDOW = 60 * 1000; // 1 minute window

const checkUploadRateLimit = (userId) => {
  const now = Date.now();
  const userLimits = uploadRateLimits.get(userId) || { count: 0, windowStart: now };

  if (now - userLimits.windowStart > UPLOAD_RATE_WINDOW) {
    userLimits.count = 0;
    userLimits.windowStart = now;
  }

  userLimits.count++;
  uploadRateLimits.set(userId, userLimits);

  // Clean up old entries to prevent memory leak
  if (uploadRateLimits.size > 10000) {
    const threshold = now - UPLOAD_RATE_WINDOW;
    for (const [key, value] of uploadRateLimits.entries()) {
      if (value.windowStart < threshold) {
        uploadRateLimits.delete(key);
      }
    }
  }

  return userLimits.count <= UPLOAD_RATE_LIMIT;
};

const rateLimitUpload = (req, res, next) => {
  if (!req.user?.id) {
    return next();
  }

  if (!checkUploadRateLimit(req.user.id)) {
    return sendError(
      res,
      429,
      `Too many uploads. Maximum ${UPLOAD_RATE_LIMIT} uploads per minute.`,
      ErrorCodes.RATE_LIMIT_EXCEEDED
    );
  }

  next();
};

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
    // Bug Fix: Use UUID instead of Date.now() + random to prevent filename collisions
    const unique = randomUUID();
    cb(null, `${base}-${unique}${ext}`);
  },
});

// Bug Fix: Add MIME type validation to prevent non-image uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: (_req, file, cb) => {
    // Bug Fix: Validate MIME type to ensure only images are uploaded
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
    cb(null, true);
  },
});

/**
 * POST /uploads/single
 * FormData field name must be: "file"
 * Returns: { url: "/uploads/<filename>" }
 * Requires authentication
 */
router.post('/single', requireAuth, rateLimitUpload, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No file uploaded', ErrorCodes.FILE_NO_FILE_UPLOADED);
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
    return sendError(res, 500, 'Upload failed', ErrorCodes.FILE_UPLOAD_FAILED);
  }
});

/**
 * POST /uploads/multiple
 * FormData field name must be: "files"
 * Returns: { urls: ["/uploads/<filename1>", "/uploads/<filename2>"] }
 * Requires authentication
 */
router.post('/multiple', requireAuth, rateLimitUpload, upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'No files uploaded', ErrorCodes.FILE_NO_FILE_UPLOADED);
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
          // Bug Fix: Check if file exists before attempting to delete
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      });
    }
    return sendError(res, 500, 'Upload failed', ErrorCodes.FILE_UPLOAD_FAILED);
  }
});

/** GET /uploads/ping -> { ok: true }  (sanity check) */
router.get('/ping', (_req, res) => res.json({ ok: true }));

export default router;