const express = require('express');
const router = express.Router();
const { generateDocumentation } = require('../services/openaiService');
const { uploadImage } = require('../services/imageService');

// POST /api/documentation/generate
// Receives form data and generates documentation
router.post('/generate', async (req, res) => {
  try {
    const { title, description, images } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        error: 'Title and description are required'
      });
    }

    // Process images if provided
    let processedImages = [];
    if (images && images.length > 0) {
      try {
        processedImages = await Promise.all(
          images.map(async (image, index) => {
            const uploadedImage = await uploadImage(image);
            return {
              url: uploadedImage.url,
              caption: uploadedImage.caption || `Image ${index + 1}`,
              position: index
            };
          })
        );
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        return res.status(500).json({
          error: 'Failed to process images',
          details: imageError.message
        });
      }
    }

    // Generate documentation using AI
    const documentation = await generateDocumentation({
      title,
      description,
      images: processedImages
    });

    const response = {
      success: true,
      documentation,
      metadata: {
        title,
        generatedAt: new Date().toISOString(),
        imageCount: processedImages.length
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Documentation generation error:', error);
    res.status(500).json({
      error: 'Failed to generate documentation',
      details: error.message
    });
  }
});

// GET /api/documentation/:id
// Retrieve a specific documentation (for future use with database)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement database retrieval
    // For now, return a placeholder
    res.json({
      message: 'Documentation retrieval not yet implemented',
      id
    });
  } catch (error) {
    console.error('Documentation retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve documentation',
      details: error.message
    });
  }
});

// GET /api/documentation
// List all documentations (for future use with database)
router.get('/', async (req, res) => {
  try {
    // TODO: Implement database listing
    // For now, return a placeholder
    res.json({
      message: 'Documentation listing not yet implemented',
      documentations: []
    });
  } catch (error) {
    console.error('Documentation listing error:', error);
    res.status(500).json({
      error: 'Failed to list documentations',
      details: error.message
    });
  }
});

module.exports = router; 