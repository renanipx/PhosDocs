const { Paragraph, TextRun, ImageRun, AlignmentType } = require("docx");
const sizeOf = require('image-size').default || require('image-size');
const sharp = require('sharp');

/**
 * Gera um Paragraph para o header do DOCX com logo.
 * @param {string|Buffer|null} logo - Base64 (data:image/...) ou Buffer da imagem. Pode ser null.
 * @param {number} targetWidth - Largura máxima da imagem no header (pixels).
 * @param {number} maxHeight - Altura máxima da imagem no header (pixels).
 * @returns {Paragraph} - Paragraph pronto para o header do DOCX.
 */
async function createHeaderWithLogo(logo, targetWidth = 120, maxHeight = 100) {
    const FORMATOS_SUPORTADOS = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
    const DIMENSOES_MAXIMAS = { width: 2000, height: 2000 };

    if (!logo) {
        return new Paragraph({
            children: [new TextRun({ text: "" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    }

    try {
        let logoBuffer, formato;

        // Processamento de Base64
        if (typeof logo === "string" && logo.startsWith("data:image")) {
            const mimeMatch = logo.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
            if (!mimeMatch || !FORMATOS_SUPORTADOS.includes(mimeMatch[1])) {
                throw new Error(`Formato não suportado. Use: ${FORMATOS_SUPORTADOS.join(', ')}`);
            }

            const base64Data = logo.split(",")[1];
            if (!base64Data || base64Data.length < 100) throw new Error("Base64 inválido");
            // Validação extra: garantir que o buffer não está vazio
            const tempBuffer = Buffer.from(base64Data, "base64");
            if (!tempBuffer || tempBuffer.length < 100) throw new Error("Buffer da imagem inválido ou vazio");
            logoBuffer = await sharp(tempBuffer).png().toBuffer();
            if (!logoBuffer || logoBuffer.length < 100) throw new Error("Buffer PNG gerado está vazio ou inválido");
            formato = 'png';
        }
        // Processamento de Buffer/Arquivo
        else if (Buffer.isBuffer(logo)) {
            // Sempre converte para PNG para garantir compatibilidade
            logoBuffer = await sharp(logo).png().toBuffer();
            formato = 'png';
        } else {
            throw new Error("Tipo de entrada inválido");
        }

        // Validação dimensional
        const dimensions = sizeOf(logoBuffer);
        if (!dimensions || dimensions.width > DIMENSOES_MAXIMAS.width || dimensions.height > DIMENSOES_MAXIMAS.height) {
            throw new Error(`Dimensões excedem o máximo permitido (${DIMENSOES_MAXIMAS.width}x${DIMENSOES_MAXIMAS.height}px)`);
        }

        // Cálculo proporcional
        let height = Math.round(dimensions.height * (targetWidth / dimensions.width));
        if (height > maxHeight) {
            const scale = maxHeight / height;
            height = Math.round(height * scale);
            targetWidth = Math.round(targetWidth * scale);
        }

        return new Paragraph({
            children: [
                new TextRun({ text: " " }),
                new ImageRun({
                    data: logoBuffer,
                    transformation: { width: targetWidth, height },
                    format: formato
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    } catch (err) {
        console.error("Erro no processamento do logo:", err.message);
        return new Paragraph({
            children: [new TextRun({ text: "" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    }
}

module.exports = createHeaderWithLogo;