const OpenAI = require('openai');
const { API_TIMEOUT, IMAGE_CAPTION_TIMEOUT, MAX_RETRIES, RETRY_DELAY, MAX_DESCRIPTION_LENGTH, MAX_IMAGES } = require('../config/timeouts');

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
    errors.push('Título é obrigatório');
  }

  if (!description || description.trim().length === 0) {
    errors.push('Descrição é obrigatória');
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Descrição muito longa. Máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`);
  }

  if (images && images.length > MAX_IMAGES) {
    errors.push(`Máximo ${MAX_IMAGES} imagens permitidas.`);
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
      throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
    }

    const { title, description, images } = data;

    const systemPrompt = process.env.DOCUMENTATION_SYSTEM_PROMPT;
    
    if (!systemPrompt) {
      throw new Error('DOCUMENTATION_SYSTEM_PROMPT não está configurado no arquivo .env');
    }

    // Truncate description if too long to prevent timeouts
    const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH 
      ? description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
      : description;

    const userPrompt = `TÍTULO ORIGINAL: ${title}

DESCRIÇÃO TÉCNICA:
${truncatedDescription}

${images && images.length > 0 ? `IMAGENS INCLUÍDAS:
${images.map((img, index) => `- Imagem ${index + 1}: ${img.caption || 'Sem legenda'}`).join('\n')}
` : ''}

Por favor, crie uma documentação técnica estruturada e profissional baseada nas informações acima.`;

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Tentativa ${attempt} de ${MAX_RETRIES} para gerar documentação`);

        // Call OpenRouter API with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`API timeout after ${API_TIMEOUT / 1000} seconds`)), API_TIMEOUT);
        });

        const apiPromise = openRouter.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 2000,
          temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE) || 0.7,
          timeout: API_TIMEOUT,
        });

        const completion = await Promise.race([apiPromise, timeoutPromise]);

        const generatedText = completion.choices[0].message.content;

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

        console.log(`Documentação gerada com sucesso na tentativa ${attempt}`);
        return documentation;

      } catch (error) {
        lastError = error;
        console.error(`Tentativa ${attempt} falhou:`, error.message);

        // Don't retry on certain errors
        if (error.code === 'insufficient_quota' || error.status === 429) {
          throw new Error('API quota exceeded. Please check your OpenRouter account.');
        } else if (error.code === 'invalid_api_key' || error.status === 401) {
          throw new Error('Invalid API key. Please check your OpenRouter configuration.');
        } else if (error.status === 400) {
          throw new Error('Invalid request. Please check your input parameters.');
        }

        // Wait before retrying (except on last attempt)
        if (attempt < MAX_RETRIES) {
          console.log(`Aguardando ${RETRY_DELAY}ms antes da próxima tentativa...`);
          await sleep(RETRY_DELAY);
        }
      }
    }

    // If all retries failed, throw the last error
    throw lastError;

  } catch (error) {
    console.error('OpenRouter API error:', error);

    // Handle specific OpenRouter errors
    if (error.code === 'insufficient_quota' || error.status === 429) {
      throw new Error('API quota exceeded. Please check your OpenRouter account.');
    } else if (error.code === 'invalid_api_key' || error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenRouter configuration.');
    } else if (error.code === 'rate_limit_exceeded' || error.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    } else if (error.status === 400) {
      throw new Error('Invalid request. Please check your input parameters.');
    } else if (error.status === 408) {
      throw new Error('API request timeout. The request took too long to complete. Please try again with a shorter description or fewer images.');
    } else if (error.status === 500) {
      throw new Error('OpenRouter service error. Please try again later.');
    } else if (error.name === 'TimeoutError' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      throw new Error('API timeout. The request took too long to complete. Please try again.');
    } else {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
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
        console.log(`Tentativa ${attempt} de ${MAX_RETRIES} para gerar legenda`);

        const completion = await openRouter.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em criar legendas descritivas para imagens técnicas.'
            },
            {
              role: 'user',
              content: `Crie uma legenda clara e descritiva para a seguinte imagem: ${imageDescription}. A legenda deve explicar o que a imagem mostra de forma simples e didática.`
            }
          ],
          max_tokens: 100,
          temperature: 0.5,
          timeout: IMAGE_CAPTION_TIMEOUT,
        });

        const caption = completion.choices[0].message.content.trim();
        console.log(`Legenda gerada com sucesso na tentativa ${attempt}`);
        return caption;

      } catch (error) {
        lastError = error;
        console.error(`Tentativa ${attempt} falhou:`, error.message);

        if (attempt < MAX_RETRIES) {
          console.log(`Aguardando ${RETRY_DELAY}ms antes da próxima tentativa...`);
          await sleep(RETRY_DELAY);
        }
      }
    }

    // If all retries failed, return a fallback caption
    console.error('Todas as tentativas de gerar legenda falharam, usando legenda padrão');
    return `Imagem técnica - ${imageDescription}`;

  } catch (error) {
    console.error('Image caption generation error:', error);
    // Return a fallback caption if API fails
    return `Imagem técnica - ${imageDescription}`;
  }
}

module.exports = {
  generateDocumentation,
  generateImageCaption,
  validateInput
}; 