/**
 * Timeout configurations for the PhosDocs application
 * All values can be overridden via environment variables
 */

module.exports = {
  // Server timeout (5 minutes)
  SERVER_TIMEOUT: parseInt(process.env.SERVER_TIMEOUT) || 300000,
  
  // API timeout for documentation generation (5 minutes)
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 300000,
  
  // Image caption generation timeout (1 minute)
  IMAGE_CAPTION_TIMEOUT: parseInt(process.env.IMAGE_CAPTION_TIMEOUT) || 60000,
  
  // Frontend notification timeout (3 seconds)
  NOTIFICATION_TIMEOUT: parseInt(process.env.NOTIFICATION_TIMEOUT) || 3000,
  
  // Word preview generation delay (1 second)
  WORD_PREVIEW_DELAY: parseInt(process.env.WORD_PREVIEW_DELAY) || 1000,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // File upload limits
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  MAX_FILES: parseInt(process.env.MAX_FILES) || 10,
  
  // Request body limits
  BODY_LIMIT: process.env.BODY_LIMIT || '10mb',
  
  // Retry configuration
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 2000,
  
  // Content limits to prevent timeouts
  MAX_DESCRIPTION_LENGTH: parseInt(process.env.MAX_DESCRIPTION_LENGTH) || 5000,
  MAX_IMAGES: parseInt(process.env.MAX_IMAGES) || 5
}; 