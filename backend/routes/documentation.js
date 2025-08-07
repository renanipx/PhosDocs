const express = require('express');
const router = express.Router();
const { generateDocumentation } = require('../services/openaiService');
const { generateWordDocument, saveWordDocument } = require('../services/wordService');
const { uploadImage } = require('../services/imageService');
const path = require('path');
const fs = require('fs-extra');

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

// POST /api/documentation/download-word
// Generate and download Word document
router.post('/download-word', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: 'Title and content are required'
      });
    }

    // Validate content is not empty
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Content cannot be empty'
      });
    }

    const buffer = await generateWordDocument({
      title,
      content,
      images: []
    });

    // Validate buffer
    if (!buffer || buffer.length === 0) {
      console.error('Generated buffer is empty or invalid');
      return res.status(500).json({
        error: 'Generated Word document is empty or invalid'
      });
    }

    // Ensure buffer is a valid Buffer
    if (!Buffer.isBuffer(buffer)) {
      console.error('Generated buffer is not a valid Buffer');
      return res.status(500).json({
        error: 'Generated Word document buffer is invalid'
      });
    }

    console.log(`Word document generated successfully. Buffer size: ${buffer.length} bytes`);
    console.log(`Buffer type: ${typeof buffer}, is Buffer: ${Buffer.isBuffer(buffer)}`);

    // Create filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.docx`;

    // Save file
    const filePath = await saveWordDocument(buffer, filename);

    // Set proper headers for Word document with UTF-8 encoding
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Send buffer as binary data
    res.write(buffer);
    res.end();

  } catch (error) {
    console.error('Word download error:', error);
    res.status(500).json({
      error: 'Failed to generate Word document',
      details: error.message
    });
  }
});

// GET /api/documentation/preview/:filename
// Get Word document for preview
router.get('/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Send file for preview
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: 'Failed to preview document',
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