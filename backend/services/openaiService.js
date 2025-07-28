const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate documentation using OpenAI
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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
    console.error('OpenAI API error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your account.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

/**
 * Generate image captions using OpenAI
 * @param {string} imageDescription - Description of the image
 * @returns {Promise<string>} Generated caption
 */
async function generateImageCaption(imageDescription) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
    return `Imagem técnica - ${imageDescription}`;
  }
}

module.exports = {
  generateDocumentation,
  generateImageCaption
}; 