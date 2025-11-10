import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Configure Cloudinary if environment variables are set
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured for persistent image storage');
} else {
  console.warn('⚠️  Cloudinary not configured - using local filesystem (not recommended for production)');
  console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable cloud storage');
}

// Local storage configuration (fallback for development)
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const localDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base =
      path
        .basename(file.originalname || 'file', ext)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .slice(0, 40) || 'file';
    const unique = randomUUID();
    cb(null, `${base}-${unique}${ext}`);
  },
});

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agentfm/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 2000,
        height: 2000,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto',
      }
    ],
    // Use original filename with UUID for uniqueness
    public_id: (_req, file) => {
      const base = path
        .basename(file.originalname || 'file', path.extname(file.originalname || ''))
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .slice(0, 40) || 'file';
      const unique = randomUUID();
      return `${base}-${unique}`;
    },
  },
});

// Create multer upload instance based on configuration
export const createUploadMiddleware = (options = {}) => {
  const storage = isCloudinaryConfigured ? cloudinaryStorage : localDiskStorage;

  return multer({
    storage: storage,
    limits: {
      fileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      files: options.maxFiles || 50,
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        return cb(
          new multer.MulterError(
            'LIMIT_UNEXPECTED_FILE',
            'Only image files (JPEG, PNG, GIF, WebP) are allowed'
          )
        );
      }
      cb(null, true);
    },
  });
};

/**
 * Extract the URL from an uploaded file
 * For Cloudinary: returns the secure_url
 * For local: returns /uploads/filename
 */
export const getUploadedFileUrl = (file) => {
  if (!file) return null;

  // Cloudinary file
  if (file.path && file.path.startsWith('http')) {
    return file.path; // Cloudinary returns full URL in file.path
  }

  // Local file
  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  return null;
};

/**
 * Extract URLs from multiple uploaded files
 */
export const getUploadedFileUrls = (files) => {
  if (!Array.isArray(files)) return [];
  return files.map(getUploadedFileUrl).filter(Boolean);
};

/**
 * Delete an image from Cloudinary or local storage
 */
export const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Cloudinary URL
    if (imageUrl.startsWith('http') && imageUrl.includes('cloudinary.com')) {
      // Extract public_id from Cloudinary URL
      const matches = imageUrl.match(/\/agentfm\/properties\/([^/.]+)/);
      if (matches && matches[1]) {
        const publicId = `agentfm/properties/${matches[1]}`;
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted image from Cloudinary: ${publicId}`);
      }
    }
    // Local file
    else if (imageUrl.startsWith('/uploads/')) {
      const filename = imageUrl.replace('/uploads/', '');
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted local file: ${filename}`);
      }
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - deletion failure shouldn't break the application
  }
};

export const isUsingCloudStorage = () => isCloudinaryConfigured;

export { cloudinary };
