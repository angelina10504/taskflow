// Avatar upload middleware (Cloudinary-backed).
//
// IMPORTANT: cloudinary + multer-storage-cloudinary are loaded LAZILY (on the first
// avatar upload) rather than at module load. `require('cloudinary')` is pathologically
// slow / hangs under Node 25, and because this file is pulled in by the auth routes at
// startup, requiring it eagerly blocked the entire server from booting. Deferring the
// require keeps it off the startup path so the server starts instantly.

let _upload = null;

const buildUpload = () => {
  if (_upload) return _upload;

  const multer = require('multer');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('cloudinary').v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'taskflow/avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 400, height: 400, crop: 'fill' }],
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  };

  _upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  return _upload;
};

// Preserve the previous API: `upload.single('avatar')` returns Express middleware.
// The heavy cloudinary modules are only required when this middleware first runs.
module.exports = {
  single: (field) => (req, res, next) => buildUpload().single(field)(req, res, next),
};
