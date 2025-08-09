const OpenAI = require('openai');
const { API_TIMEOUT, MAX_RETRIES, RETRY_DELAY } = require('../config/timeouts');

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required.');
}

const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://phosdocs.com',
    'X-Title': 'PhosDocs - Section Processor'
  }
});

/**
 * Sleep function for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process a single section with specific prompt
 * @param {string} sectionType - Type of section (funcionalidade, bug, performance, segurança, recurso)
 * @param {string} content - Content to process
 * @param {string} title - Document title
 * @returns {Promise<string>} Processed section
 */
async function processSection(sectionType, content, title) {
  // Mapeamento de tipos para chaves do .env
  const sectionTypeMap = {
    funcionalidade: 'FUNCIONALIDADE',
    bug: 'BUG',
    performance: 'PERFORMANCE',
    segurança: 'SEGURANCA',
    recurso: 'RECURSO'
  };

  const envKey = sectionTypeMap[sectionType];
  if (!envKey) {
    throw new Error(`Tipo de seção não suportado: ${sectionType}`);
  }

  // Busca prompts do .env
  const systemPrompt = process.env[`SECTION_${envKey}_SYSTEM`];
  const userPromptTemplate = process.env[`SECTION_${envKey}_USER`];

  if (!systemPrompt || !userPromptTemplate) {
    throw new Error(`Prompts para seção ${sectionType} não configurados no .env`);
  }

  // Substitui placeholders no prompt do usuário
  const userPrompt = userPromptTemplate
    .replace('{TITLE}', title)
    .replace('{CONTENT}', content);

  const sectionMaxRetries = parseInt(process.env.SECTION_MAX_RETRIES) || MAX_RETRIES;
  const sectionRetryDelay = parseInt(process.env.SECTION_RETRY_DELAY) || RETRY_DELAY;
  const sectionTimeout = parseInt(process.env.SECTION_TIMEOUT) || API_TIMEOUT;

  let lastError;
  for (let attempt = 1; attempt <= sectionMaxRetries; attempt++) {
    try {
      console.log(`Processando seção ${sectionType} - Tentativa ${attempt} de ${sectionMaxRetries}`);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`API timeout after ${sectionTimeout / 1000} seconds`)), sectionTimeout);
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
        max_tokens: parseInt(process.env.SECTION_MAX_TOKENS) || 500,
        temperature: parseFloat(process.env.SECTION_TEMPERATURE) || 0.5,
        timeout: parseInt(process.env.SECTION_TIMEOUT) || API_TIMEOUT,
      });

      const completion = await Promise.race([apiPromise, timeoutPromise]);
      const result = completion.choices[0].message.content.trim();
      
      console.log(`Seção ${sectionType} processada com sucesso`);
      return result;

    } catch (error) {
      lastError = error;
      console.error(`Tentativa ${attempt} falhou para seção ${sectionType}:`, error.message);

      if (attempt < sectionMaxRetries) {
        console.log(`Aguardando ${sectionRetryDelay}ms antes da próxima tentativa...`);
        await sleep(sectionRetryDelay);
      }
    }
  }

  // Fallback: return a basic formatted section
  console.error(`Todas as tentativas falharam para seção ${sectionType}, usando fallback`);
  return `[${sectionType}] ${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}\n${content}`;
}

/**
 * Process all sections individually and concatenate
 * @param {Object} data - The documentation data
 * @returns {Promise<string>} Concatenated sections
 */
async function processAllSections(data) {
  try {
    const { title, description, images } = data;
    
    // Split content into sections if it's already formatted
    const sections = extractSectionsFromContent(description);
    
    const results = [];
    
    // Process each section individually
    for (const section of sections) {
      if (section.type && section.content) {
        const processedSection = await processSection(section.type, section.content, title);
        const lines = processedSection
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        for (const line of lines) {
          const cleanedLine = line.replace(/^\s*\[[^\]]+\]\s*/i, '').trim();
          results.push(`[${section.type}] ${cleanedLine}`);
        }
      }
    }
    
    // If no sections were found, process the entire content as a single section
    if (results.length === 0) {
      console.log('Nenhuma seção encontrada, processando conteúdo completo...');
      const processedContent = await processSection('funcionalidade', description, title);
      const lines = processedContent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      for (const line of lines) {
        const cleanedLine = line.replace(/^\s*\[[^\]]+\]\s*/i, '').trim();
        results.push(`[funcionalidade] ${cleanedLine}`);
      }
    }
    
    // Concatenate all sections
    const finalContent = results.join('\n');
    
    console.log(`Processamento concluído. ${results.length} seções geradas.`);
    return finalContent;
    
  } catch (error) {
    console.error('Erro no processamento de seções:', error);
    throw new Error(`Falha no processamento de seções: ${error.message}`);
  }
}

/**
 * Extract sections from pre-formatted content
 * @param {string} content - Content that may already be formatted
 * @returns {Array} Array of sections with type and content
 */
function extractSectionsFromContent(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check for section markers
    const sectionMatch = trimmedLine.match(/^\[(funcionalidade|bug|performance|segurança|recurso)\]\s*(.*)/i);
    
    if (sectionMatch) {
      // Save previous section if exists, combining title line + accumulated description
      if (currentSection) {
        const combinedContent = [currentSection.content, currentSection.description]
          .filter(Boolean)
          .join(currentSection.content && currentSection.description ? '\n' : '');
        sections.push({ type: currentSection.type, content: combinedContent });
      }
      
      // Start new section
      currentSection = {
        type: sectionMatch[1].toLowerCase(),
        content: (sectionMatch[2] || '').trim(),
        description: ''
      };
    } else if (currentSection) {
      // Add line to current section description
      if (currentSection.description) {
        currentSection.description += '\n' + trimmedLine;
      } else {
        currentSection.description = trimmedLine;
      }
    }
  }
  
  // Add last section combining title line + accumulated description
  if (currentSection) {
    const combinedContent = [currentSection.content, currentSection.description]
      .filter(Boolean)
      .join(currentSection.content && currentSection.description ? '\n' : '');
    sections.push({ type: currentSection.type, content: combinedContent });
  }
  
  return sections;
}

module.exports = {
  processAllSections,
  processSection,
  extractSectionsFromContent
};
