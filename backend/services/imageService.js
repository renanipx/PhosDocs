const fs = require('fs');
const path = require('path');
const { generateImageCaption } = require('./openaiService');

/**
 * Upload image to local storage
 * @param {Object} imageData - Image data object
 * @param {string} imageData.path - Local file path
 * @param {string} imageData.filename - Generated filename
 * @param {string} imageData.originalname - Original filename
 * @param {string} imageData.mimetype - File MIME type
 * @param {number} imageData.size - File size in bytes
 * @returns {Promise<Object>} Uploaded image information
 */
async function uploadImage(imageData) {
  try {
    const { path: filePath, filename, originalname, mimetype, size } = imageData;

    // Upload to local storage
    const uploadedImage = await storeLocally(filePath, filename);

    // Generate caption for the image
    const caption = await generateImageCaption(originalname);

    return {
      url: uploadedImage.url,
      caption: caption,
      filename: filename,
      originalname: originalname,
      size: size,
      mimetype: mimetype,
      storageProvider: uploadedImage.provider
    };

  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Store image locally
 */
async function storeLocally(filePath, filename) {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Copy file to uploads directory
    const destPath = path.join(uploadsDir, filename);
    fs.copyFileSync(filePath, destPath);

    return {
      url: `/uploads/${filename}`,
      provider: 'local'
    };

  } catch (error) {
    console.error('Local storage error:', error);
    throw error;
  }
}

/**
 * Delete image from local storage
 * @param {string} filename - Filename to delete
 * @param {string} provider - Storage provider (should be 'local')
 */
async function deleteImage(filename, provider) {
  try {
    if (provider !== 'local') {
      throw new Error(`Unsupported storage provider: ${provider}`);
    }

    await deleteFromLocal(filename);

    return { success: true, message: 'Image deleted successfully' };

  } catch (error) {
    console.error('Image deletion error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Delete image from local storage
 */
async function deleteFromLocal(filename) {
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  uploadImage,
  deleteImage
}; 