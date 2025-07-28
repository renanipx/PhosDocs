const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { generateImageCaption } = require('./openaiService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to storage service (Supabase or Cloudinary)
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

    // Determine which storage service to use
    const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
    const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

    let uploadedImage;

    if (useSupabase) {
      uploadedImage = await uploadToSupabase(filePath, filename, mimetype);
    } else if (useCloudinary) {
      uploadedImage = await uploadToCloudinary(filePath, filename);
    } else {
      // Fallback to local storage
      uploadedImage = await storeLocally(filePath, filename);
    }

    // Generate caption for the image
    const caption = await generateImageCaption(originalname);

    // Clean up local file if it was uploaded to cloud storage
    if (useSupabase || useCloudinary) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup local file:', cleanupError.message);
      }
    }

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
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(filePath, filename, mimetype) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'phosdocs-images')
      .upload(filename, fileBuffer, {
        contentType: mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'phosdocs-images')
      .getPublicUrl(filename);

    return {
      url: urlData.publicUrl,
      provider: 'supabase'
    };

  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(filePath, filename) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'phosdocs',
      public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      provider: 'cloudinary'
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Store image locally (fallback)
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
 * Delete image from storage
 * @param {string} filename - Filename to delete
 * @param {string} provider - Storage provider ('supabase', 'cloudinary', 'local')
 */
async function deleteImage(filename, provider) {
  try {
    switch (provider) {
      case 'supabase':
        await deleteFromSupabase(filename);
        break;
      case 'cloudinary':
        await deleteFromCloudinary(filename);
        break;
      case 'local':
        await deleteFromLocal(filename);
        break;
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }

    return { success: true, message: 'Image deleted successfully' };

  } catch (error) {
    console.error('Image deletion error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Delete image from Supabase Storage
 */
async function deleteFromSupabase(filename) {
  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME || 'phosdocs-images')
    .remove([filename]);

  if (error) {
    throw new Error(`Supabase deletion error: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 */
async function deleteFromCloudinary(filename) {
  const publicId = `phosdocs/${filename.replace(/\.[^/.]+$/, '')}`;
  const result = await cloudinary.uploader.destroy(publicId);
  
  if (result.result !== 'ok') {
    throw new Error(`Cloudinary deletion error: ${result.result}`);
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