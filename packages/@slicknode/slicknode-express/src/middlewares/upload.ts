import multer from 'multer';

/**
 * Multi part handling for image upload
 */
export const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 5,
    parts: 100,
  },
}).any();
