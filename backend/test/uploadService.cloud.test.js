import test from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

function restoreCloudinaryEnv() {
  const keys = Object.keys(ORIGINAL_ENV);
  for (const key of keys) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test('createUploadMiddleware uses Cloudinary storage when credentials are configured', async () => {
  try {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_API_KEY = 'demo-key';
    process.env.CLOUDINARY_API_SECRET = 'demo-secret';

    const module = await import(`../src/services/uploadService.js?cloud-${Date.now()}`);
    const { createUploadMiddleware, isUsingCloudStorage } = module;

    assert.equal(isUsingCloudStorage(), true, 'Cloud storage should be detected');

    const upload = createUploadMiddleware();
    assert.ok(upload.storage, 'multer upload should expose storage adapter');
    assert.equal(upload.storage.constructor?.name, 'CloudinaryStorage');
  } finally {
    restoreCloudinaryEnv();
  }
});

test('createUploadMiddleware enforces extension allow-list when provided', async () => {
  try {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    const module = await import(`../src/services/uploadService.js?local-${Date.now()}`);
    const { createUploadMiddleware } = module;

    const upload = createUploadMiddleware({
      allowedExtensions: ['.png'],
      allowedMimeTypes: ['image/png'],
    });

    assert.equal(upload.storage.constructor?.name, 'DiskStorage');

    await new Promise((resolve, reject) => {
      const file = { mimetype: 'image/png', originalname: 'photo.png' };
      upload.fileFilter({}, file, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    await new Promise((resolve) => {
      const badFile = { mimetype: 'image/png', originalname: 'photo.jpg.exe' };
      upload.fileFilter({}, badFile, (err) => {
        assert.ok(err, 'should reject unexpected extension');
        assert.equal(err.code, 'LIMIT_UNEXPECTED_FILE');
        resolve();
      });
    });
  } finally {
    restoreCloudinaryEnv();
  }
});
