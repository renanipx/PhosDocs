const OpenAI = require('openai');

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
 * Generate documentation using OpenRouter
 * @param {Object} data - The documentation data
 * @param {string} data.title - The title of the documentation
 * @param {string} data.description - The technical description to rewrite
 * @param {Array} data.images - Array of image objects with captions
 * @returns {Promise<string>} The generated documentation
 */
async function generateDocumentation(data) {
  try {
    const { title, description, images } = data;

    // Build the prompt with the specified format from .env
    let prompt = process.env.DOCUMENTATION_PROMPT + '\n\n';
    prompt += `Título: ${title}\n\n`;
    prompt += `Descrição técnica:\n${description}\n\n`;

    // Add image information if available
    if (images && images.length > 0) {
      prompt += 'Imagens incluídas:\n';
      images.forEach((image, index) => {
        prompt += `- Imagem ${index + 1}: ${image.caption || 'Sem legenda'}\n`;
      });
      prompt += '\n';
    }

    prompt += 'Por favor, reescreva a documentação seguindo as diretrizes especificadas.';

    // Call OpenRouter API
    const completion = await openRouter.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em reescrever documentação técnica para torná-la mais acessível e compreensível.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

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

    return documentation;

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
    } else if (error.status === 500) {
      throw new Error('OpenRouter service error. Please try again later.');
    } else {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }
}

/**
 * Generate image captions using OpenRouter
 * @param {string} imageDescription - Description of the image
 * @returns {Promise<string>} Generated caption
 */
async function generateImageCaption(imageDescription) {
  try {
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
    });

    return completion.choices[0].message.content.trim();

  } catch (error) {
    console.error('Image caption generation error:', error);
    // Return a fallback caption if API fails
    return `Imagem técnica - ${imageDescription}`;
  }
}

module.exports = {
  generateDocumentation,
  generateImageCaption
}; 