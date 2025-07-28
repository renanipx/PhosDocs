const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage } = require('../services/imageService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// POST /api/images/upload
// Upload a single image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    // Process the uploaded image
    const imageData = {
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    const uploadedImage = await uploadImage(imageData);

    res.json({
      success: true,
      image: uploadedImage
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// POST /api/images/upload-multiple
// Upload multiple images
router.post('/upload-multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No image files provided'
      });
    }

    // Process all uploaded images
    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const imageData = {
          path: file.path,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        };

        return await uploadImage(imageData);
      })
    );

    res.json({
      success: true,
      images: uploadedImages,
      count: uploadedImages.length
    });

  } catch (error) {
    console.error('Multiple image upload error:', error);
    res.status(500).json({
      error: 'Failed to upload images',
      details: error.message
    });
  }
});

// GET /api/images/:filename
// Serve uploaded images
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  res.sendFile(filename, { root: 'uploads/' }, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Image not found'
      });
    }
  });
});

// DELETE /api/images/:filename
// Delete an uploaded image
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // TODO: Implement image deletion from storage service
    // For now, just return success
    res.json({
      success: true,
      message: 'Image deletion not yet implemented',
      filename
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      details: error.message
    });
  }
});

module.exports = router; 