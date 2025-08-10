const OpenAI = require('openai');
const { API_TIMEOUT, IMAGE_CAPTION_TIMEOUT, MAX_RETRIES, RETRY_DELAY, MAX_DESCRIPTION_LENGTH, MAX_IMAGES } = require('../config/timeouts');
const { processAllSections } = require('./sectionProcessor');

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required. Please configure it in your .env file.');
}

// Initialize OpenRouter client
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://phosdocs.com',
    'X-Title': 'PhosDocs - Documentation Generator'
  }
});

/**
 * Sleep function for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate input data to prevent timeouts
 * @param {Object} data - The documentation data
 * @returns {Object} Validation result
 */
function validateInput(data) {
  const { title, description, images } = data;
  const errors = [];

      if (!title || title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!description || description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description too long. Maximum ${MAX_DESCRIPTION_LENGTH} characters.`);
    }

    if (images && images.length > MAX_IMAGES) {
      errors.push(`Maximum ${MAX_IMAGES} images allowed.`);
    }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate documentation using OpenRouter with retry logic
 * @param {Object} data - The documentation data
 * @param {string} data.title - The title of the documentation
 * @param {string} data.description - The technical description to rewrite
 * @param {Array} data.images - Array of image objects with captions
 * @returns {Promise<string>} The generated documentation
 */
async function generateDocumentation(data) {
  try {
    // Validate input first
    const validation = validateInput(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { title, description, images } = data;

    console.log('🔄 Starting individual section processing...');

    // Use the new section processor instead of single prompt
    const generatedText = await processAllSections(data);

    // Format the response
    const documentation = {
      title: title,
      content: generatedText,
      originalDescription: description,
      images: images || [],
      generatedAt: new Date().toISOString(),
      wordCount: generatedText.split(' ').length,
      characterCount: generatedText.length
    };

    console.log(`✅ Documentation generated successfully using section processing`);
    return documentation;

  } catch (error) {
    console.error('Error in section processing:', error);
    throw new Error(`Documentation generation failed: ${error.message}`);
  }
}

/**
 * Generate image captions using OpenRouter with retry logic
 * @param {string} imageDescription - Description of the image
 * @returns {Promise<string>} Generated caption
 */
async function generateImageCaption(imageDescription) {
  try {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${MAX_RETRIES} to generate caption`);

        const imageCaptionPrompt = process.env.IMAGE_CAPTION_PROMPT;
        
        if (!imageCaptionPrompt) {
          throw new Error('IMAGE_CAPTION_PROMPT is not configured in the .env file');
        }

        const completion = await openRouter.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: process.env.IMAGE_CAPTION_PROMPT
            },
            {
              role: 'user',
              content: imageCaptionPrompt.replace('{DESCRIPTION}', imageDescription)
            }
          ],
          max_tokens: process.env.SECTION_MAX_TOKENS,
          temperature: process.env.SECTION_TEMPERATURE,
          timeout: IMAGE_CAPTION_TIMEOUT,
        });

        const caption = completion.choices[0].message.content.trim();
        console.log(`Caption generated successfully on attempt ${attempt}`);
        return caption;

      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);

        if (attempt < MAX_RETRIES) {
          console.log(`Waiting ${RETRY_DELAY}ms before next attempt...`);
          await sleep(RETRY_DELAY);
        }
      }
    }

    // If all retries failed, return a fallback caption
    console.error('All caption generation attempts failed, using default caption');
    return `Technical image - ${imageDescription}`;

  } catch (error) {
    console.error('Image caption generation error:', error);
    // Return a fallback caption if API fails
    return `Technical image - ${imageDescription}`;
  }
}

module.exports = {
  generateDocumentation,
  generateImageCaption,
  validateInput
}; 