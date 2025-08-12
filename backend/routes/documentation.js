const express = require('express');
const router = express.Router();
const { generateDocumentation } = require('../services/openaiService');
const { generateWordDocument, saveWordDocument } = require('../services/wordService');
const { uploadImage } = require('../services/imageService');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});
const upload = multer({ storage });

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
router.post('/download-word', upload.single('logo'), async (req, res) => {
  try {
    // Accept both JSON and multipart/form-data
    let title, content, author;
    if (req.is('multipart/form-data')) {
      title = req.body.title;
      content = req.body.content;
      author = req.body.author;
    } else {
      ({ title, content, author } = req.body);
    }
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }
    let logo = null;
    // Verificar se temos um arquivo de logo enviado via multipart/form-data
    if (req.file) {
      logo = req.file.path;
      console.log('DEBUG logo upload (arquivo):', {
        file: req.file,
        logoPath: logo,
        exists: logo ? require('fs').existsSync(logo) : false
      });
    } 
    // Verificar se temos uma string base64 enviada via JSON
    else if (req.body.logoBase64) {
      logo = req.body.logoBase64;
      console.log('DEBUG logo upload (base64):', {
        hasBase64: !!logo,
        base64Length: logo ? logo.length : 0
      });
    }
    
    const buffer = await generateWordDocument({
      title,
      content,
      images: [],
      author,
      logo: logo
    });
    if (!buffer || buffer.length === 0) {
      console.error('Generated buffer is empty or invalid');
      return res.status(500).json({ error: 'Generated Word document is empty or invalid' });
    }
    if (!Buffer.isBuffer(buffer)) {
      console.error('Generated buffer is not a valid Buffer');
      return res.status(500).json({ error: 'Generated Word document buffer is invalid' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.docx`;
    const filePath = await saveWordDocument(buffer, filename);
    
    // Usar o método download do Express para enviar o arquivo
    // Este método é mais adequado para download de arquivos e lida melhor com arquivos binários
    return res.download(filePath, filename, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Word download error:', error);
    res.status(500).json({ error: 'Failed to generate Word document', details: error.message });
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