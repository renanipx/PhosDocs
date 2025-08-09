const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, Hyperlink, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs = require('fs-extra');
const path = require('path');

/**
 * Generate Word document with fixed template style
 * @param {Object} data - The documentation data
 * @param {string} data.title - The title of the documentation
 * @param {string} data.content - The markdown content
 * @param {Array} data.images - Array of image objects
 * @returns {Promise<Buffer>} The Word document as buffer
 */
async function generateWordDocument(data) {
  try {
    const { title, content, images } = data;

    // Parse markdown content into structured sections
    const sections = parseMarkdownContent(content);

    // Create document with styled template
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22,
              color: '1A1A1A'
            },
            paragraph: {
              spacing: { after: 120 }
            }
          }
        },
        paragraphStyles: [
          {
            id: 'SectionHeading',
            name: 'Section Heading',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 26, bold: true, color: '000000' },
            paragraph: { spacing: { before: 240, after: 80 } }
          },
          {
            id: 'SmallMuted',
            name: 'Small Muted',
            basedOn: 'Normal',
            next: 'Normal',
            run: { size: 18, color: '666666', italics: true },
            paragraph: { spacing: { after: 160 } }
          }
        ]
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          // Header - Title with teal line above
          new Paragraph({
            children: [new TextRun({ text: '' })],
            border: {
              bottom: { color: '008080', size: 6, style: BorderStyle.SINGLE }
            },
            spacing: { after: 200 }
          }),

          // Product Name | Company
          new Paragraph({
            children: [
              new TextRun({ text: `${title}`, size: 36, color: "0563C1" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 300
            }
          }),

          // Version and Date Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Versão:",
                            size: 16,
                            bold: true,
                            color: "0563C1"
                          })
                        ]
                      })
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                    shading: {
                      fill: "E6F3FF"
                    }
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "1.0.0",
                            size: 16
                          })
                        ]
                      })
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Data de Lançamento:",
                            size: 16,
                            bold: true,
                            color: "0563C1"
                          })
                        ]
                      })
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                    shading: {
                      fill: "E6F3FF"
                    }
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: new Date().toLocaleDateString('pt-BR'),
                            size: 16
                          })
                        ]
                      })
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    }
                  })
                ]
              })
            ]
          }),

          // Spacing after table
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                size: 12
              })
            ],
            spacing: {
              after: 300
            }
          }),

          // New Features Section
          ...(sections.filter(s => s.type === 'feature').length > 0 ? [
            new Paragraph({
              text: 'Novas Funcionalidades',
              style: 'SectionHeading',
              border: { bottom: { color: '5BC0BE', size: 6, style: BorderStyle.SINGLE } },
              spacing: { after: 120 }
            }),
            ...createStyledContentList(sections.filter(s => s.type === 'feature'))
          ] : []),

          // Bug Fixes Section
          ...(sections.filter(s => s.type === 'bugfix').length > 0 ? [
            new Paragraph({
              text: 'Correções de Erros',
              style: 'SectionHeading',
              border: { bottom: { color: '5BC0BE', size: 6, style: BorderStyle.SINGLE } },
              spacing: { after: 120 }
            }),
            ...createStyledContentList(sections.filter(s => s.type === 'bugfix'))
          ] : []),

          // Performance Improvements Section
          ...(sections.filter(s => s.type === 'performance').length > 0 ? [
            new Paragraph({
              text: 'Melhorias de Desempenho',
              style: 'SectionHeading',
              border: { bottom: { color: '5BC0BE', size: 6, style: BorderStyle.SINGLE } },
              spacing: { after: 120 }
            }),
            ...createStyledContentList(sections.filter(s => s.type === 'performance'))
          ] : []),

          // Security Updates Section
          ...(sections.filter(s => s.type === 'security').length > 0 ? [
            new Paragraph({
              text: 'Atualizações de Segurança',
              style: 'SectionHeading',
              border: { bottom: { color: '5BC0BE', size: 6, style: BorderStyle.SINGLE } },
              spacing: { after: 120 }
            }),
            ...createStyledContentList(sections.filter(s => s.type === 'security'))
          ] : []),

          // Additional Resources Section
          ...(sections.filter(s => s.type === 'resource').length > 0 ? [
            new Paragraph({
              text: 'Recursos Adicionais',
              style: 'SectionHeading',
              border: { bottom: { color: '5BC0BE', size: 6, style: BorderStyle.SINGLE } },
              spacing: { after: 120 }
            }),
            ...createStyledContentList(sections.filter(s => s.type === 'resource'))
          ] : [])
        ]
      }]
    });

    // Generate document buffer with error handling
    try {
      console.log('📝 Document structure created, generating buffer...');
      
      const buffer = await Packer.toBuffer(doc);
      
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Generated buffer is empty or invalid');
      }
      
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Generated buffer is not a valid Buffer');
      }
      
      console.log(`Word document generated successfully. Buffer size: ${buffer.length} bytes`);
      console.log(`Buffer type: ${typeof buffer}, is Buffer: ${Buffer.isBuffer(buffer)}`);
      return buffer;
      
    } catch (packerError) {
      console.error('Packer error:', packerError);
      console.error('Document structure may be invalid');
      throw new Error(`Failed to pack Word document: ${packerError.message}`);
    }

  } catch (error) {
    console.error('Word document generation error:', error);
    throw new Error(`Failed to generate Word document: ${error.message}`);
  }
}

/**
 * Create section header with teal underline
 * @param {string} title - Section title
 * @param {string} description - Section description
 * @returns {Array} Paragraph elements
 */
function createSectionHeader(title, description) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          size: 28,
          bold: true,
          color: "000000"
        })
      ],
      spacing: {
        after: 100,
        before: 300
      }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "─".repeat(50),
          size: 24,
          color: "008080"
        })
      ],
      spacing: {
        after: 100
      }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: description,
          size: 20,
          color: "666666",
          italics: true
        })
      ],
      spacing: {
        after: 200
      }
    })
  ];
}

/**
 * Create styled content list for a section
 * @param {Array} items - Content items
 * @returns {Array} Paragraph elements
 */
function createStyledContentList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "... ✓",
            size: 16,
            color: "666666"
          })
        ],
        spacing: {
          after: 200
        }
      })
    ];
  }

  return items.map(item => {
    // Validate item
    if (!item || !item.content || typeof item.content !== 'string') {
      console.warn('Invalid item in content list:', item);
      return new Paragraph({
        children: [
          new TextRun({
            text: "• Invalid content",
            size: 16,
            color: "FF0000"
          })
        ],
        spacing: {
          after: 100
        }
      });
    }

    // Preserve content with Portuguese characters and common punctuation
    const sanitizedContent = item.content
      .replace(/[^\w\s\-\.áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ,;:!?()]/g, '')
      .trim();
    
    return new Paragraph({
      text: sanitizedContent,
      bullet: { level: 0 },
      spacing: { before: 40, after: 40 },
      indentation: { left: 720, hanging: 360 }
    });
  });
}

/**
 * Normalize text to preserve Portuguese characters
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Normalize Unicode characters and preserve Portuguese accents
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .normalize('NFC'); // Re-compose characters
}

/**
 * Parse markdown content into structured sections for template
 * @param {string} content - Markdown content
 * @returns {Array} Parsed sections with template categories
 */
function parseMarkdownContent(content) {
  // Validate input
  if (!content || typeof content !== 'string') {
    console.warn('Invalid content provided to parseMarkdownContent:', content);
    return [];
  }

  const sections = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;

    // Categorize content based on keywords and structure
    const lowerLine = line.toLowerCase();
    
    // Check for structured markers first - more robust matching
    const trimmedLine = line.trim();
    const lowerTrimmedLine = trimmedLine.toLowerCase();
    
    if (lowerTrimmedLine.startsWith('[nova]') || lowerTrimmedLine.startsWith('[new]') || lowerTrimmedLine.startsWith('[funcionalidade]')) {
      sections.push({
        type: 'feature',
        content: trimmedLine.replace(/^\[(nova|new|funcionalidade)\]\s*/i, '').trim()
      });
    } else if (lowerTrimmedLine.startsWith('[correção]') || lowerTrimmedLine.startsWith('[bug]') || lowerTrimmedLine.startsWith('[fixed]')) {
      sections.push({
        type: 'bugfix',
        content: trimmedLine.replace(/^\[(correção|bug|fixed)\]\s*/i, '').trim()
      });
    } else if (lowerTrimmedLine.startsWith('[performance]') || lowerTrimmedLine.startsWith('[melhoria]') || lowerTrimmedLine.startsWith('[speed]')) {
      sections.push({
        type: 'performance',
        content: trimmedLine.replace(/^\[(performance|melhoria|speed)\]\s*/i, '').trim()
      });
    } else if (lowerTrimmedLine.startsWith('[segurança]') || lowerTrimmedLine.startsWith('[security]')) {
      sections.push({
        type: 'security',
        content: trimmedLine.replace(/^\[(segurança|security)\]\s*/i, '').trim()
      });
    } else if (lowerTrimmedLine.startsWith('[recurso]') || lowerTrimmedLine.startsWith('[resource]') || lowerTrimmedLine.startsWith('[manual]')) {
      sections.push({
        type: 'resource',
        content: trimmedLine.replace(/^\[(recurso|resource|manual)\]\s*/i, '').trim()
      });
    } else if (lowerLine.includes('nova') || lowerLine.includes('new') || lowerLine.includes('adicionado') || lowerLine.includes('implementado')) {
      sections.push({
        type: 'feature',
        content: line
      });
    } else if (lowerLine.includes('melhorado') || lowerLine.includes('enhanced') || lowerLine.includes('otimizado') || lowerLine.includes('upgraded')) {
      sections.push({
        type: 'enhancement',
        content: line
      });
    } else if (lowerLine.includes('corrigido') || lowerLine.includes('fixed') || lowerLine.includes('bug') || lowerLine.includes('erro')) {
      sections.push({
        type: 'bugfix',
        content: line
      });
    } else if (lowerLine.includes('performance') || lowerLine.includes('velocidade') || lowerLine.includes('speed') || lowerLine.includes('tempo')) {
      sections.push({
        type: 'performance',
        content: line
      });
    } else if (lowerLine.includes('segurança') || lowerLine.includes('security') || lowerLine.includes('vulnerabilidade')) {
      sections.push({
        type: 'security',
        content: line
      });
    } else if (lowerLine.includes('problema') || lowerLine.includes('issue') || lowerLine.includes('conhecido')) {
      sections.push({
        type: 'known_issue',
        content: line
      });
    } else if (lowerLine.includes('deprecated') || lowerLine.includes('obsoleto') || lowerLine.includes('removido')) {
      sections.push({
        type: 'deprecated',
        content: line
      });
    } else if (lowerLine.includes('recurso') || lowerLine.includes('resource') || lowerLine.includes('manual') || lowerLine.includes('documentação')) {
      sections.push({
        type: 'resource',
        content: line
      });
    } else {
      // Default to feature if no specific category
      sections.push({
        type: 'feature',
        content: line
      });
    }
  }

  return sections;
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