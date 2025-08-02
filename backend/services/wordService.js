const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } = require('docx');
const fs = require('fs-extra');
const path = require('path');

/**
 * Generate Word document from documentation content
 * @param {Object} data - The documentation data
 * @param {string} data.title - The title of the documentation
 * @param {string} data.content - The markdown content
 * @param {Array} data.images - Array of image objects
 * @returns {Promise<Buffer>} The Word document as buffer
 */
async function generateWordDocument(data) {
  try {
    const { title, content, images } = data;

    // Parse markdown content into sections
    const sections = parseMarkdownContent(content);

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
              before: 400
            }
          }),
          // Content sections
          ...sections.map(section => {
            if (section.type === 'heading') {
              return new Paragraph({
                text: section.content,
                heading: getHeadingLevel(section.level),
                spacing: {
                  after: 200,
                  before: 300
                }
              });
            } else if (section.type === 'list') {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${section.content}`,
                    size: 24
                  })
                ],
                spacing: {
                  after: 100
                }
              });
            } else {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: section.content,
                    size: 24
                  })
                ],
                spacing: {
                  after: 200
                }
              });
            }
          })
        ]
      }]
    });

    // Generate document buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;

  } catch (error) {
    console.error('Word document generation error:', error);
    throw new Error(`Failed to generate Word document: ${error.message}`);
  }
}

/**
 * Parse markdown content into structured sections
 * @param {string} content - Markdown content
 * @returns {Array} Parsed sections
 */
function parseMarkdownContent(content) {
  const sections = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      sections.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2]
      });
      continue;
    }

    // Check for list items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      sections.push({
        type: 'list',
        content: line.substring(2)
      });
      continue;
    }

    // Regular paragraph
    sections.push({
      type: 'paragraph',
      content: line
    });
  }

  return sections;
}

/**
 * Get heading level for Word document
 * @param {number} level - Markdown heading level (1-6)
 * @returns {HeadingLevel} Word heading level
 */
function getHeadingLevel(level) {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return HeadingLevel.HEADING_2;
  }
}

/**
 * Save Word document to file system
 * @param {Buffer} buffer - Document buffer
 * @param {string} filename - Filename to save
 * @returns {Promise<string>} File path
 */
async function saveWordDocument(buffer, filename) {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.ensureDir(uploadsDir);
    
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    
    return filePath;
  } catch (error) {
    console.error('Error saving Word document:', error);
    throw new Error(`Failed to save Word document: ${error.message}`);
  }
}

module.exports = {
  generateWordDocument,
  saveWordDocument
}; 