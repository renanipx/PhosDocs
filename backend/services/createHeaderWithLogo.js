const { Paragraph, TextRun, ImageRun, AlignmentType } = require("docx");
const sizeOf = require('image-size').default || require('image-size');

/**
 * Gera um Paragraph para o header do DOCX com logo.
 * @param {string|Buffer|null} logo - Base64 (data:image/...) ou Buffer da imagem. Pode ser null.
 * @param {number} targetWidth - Largura máxima da imagem no header (pixels).
 * @param {number} maxHeight - Altura máxima da imagem no header (pixels).
 * @returns {Paragraph} - Paragraph pronto para o header do DOCX.
 */
function createHeaderWithLogo(logo, targetWidth = 120, maxHeight = 100) {
    let logoBuffer = null;

    if (!logo) {
        // Sem logo, retorna parágrafo vazio
        return new Paragraph({
            children: [new TextRun({ text: "" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    }

    try {
        // Se for base64
        if (typeof logo === "string" && logo.startsWith("data:image")) {
            // Verifica se é um tipo de imagem válido
            const mimeMatch = logo.match(/^data:(image\/(png|jpeg|jpg));base64,/);
            if (!mimeMatch) throw new Error("Tipo de imagem inválido. Use PNG ou JPEG");

            const base64Data = logo.split(",")[1];
            if (!base64Data || base64Data.length < 100) throw new Error("Base64 vazio ou muito curto");
            
            logoBuffer = Buffer.from(base64Data, "base64");
            if (logoBuffer.length < 100) throw new Error("Buffer de imagem muito pequeno");
        } else if (Buffer.isBuffer(logo)) {
            if (logo.length < 100) throw new Error("Buffer de imagem muito pequeno");
            logoBuffer = logo;
        } else {
            throw new Error("Formato de logo inválido");
        }

        // Testa dimensões da imagem
        const dimensions = sizeOf(logoBuffer);
        if (!dimensions || !dimensions.width || !dimensions.height) {
            throw new Error("Não foi possível determinar as dimensões da imagem");
        }

        // Garante dimensões mínimas
        if (dimensions.width < 10 || dimensions.height < 10) {
            throw new Error("Imagem muito pequena");
        }

        // Ajusta dimensões para twips (1 twip = 1/20 de ponto = 1/1440 de polegada)
        const twipsPerPixel = 15; // Aproximadamente 15 twips por pixel
        let targetWidthTwips = targetWidth * twipsPerPixel;
        let heightTwips = Math.round(dimensions.height * (targetWidthTwips / dimensions.width));

        // Ajusta altura máxima
        const maxHeightTwips = maxHeight * twipsPerPixel;
        if (heightTwips > maxHeightTwips) {
            const scale = maxHeightTwips / heightTwips;
            heightTwips = Math.round(heightTwips * scale);
            targetWidthTwips = Math.round(targetWidthTwips * scale);
        }

        // Garantir valores válidos
        if (targetWidthTwips <= 0 || heightTwips <= 0) throw new Error("Dimensões inválidas");

        return new Paragraph({
            children: [
                new TextRun({ text: " " }), // Evita problema de compatibilidade
                new ImageRun({
                    data: logoBuffer,
                    transformation: {
                        width: targetWidthTwips,
                        height: heightTwips
                    },
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    } catch (err) {
        console.warn("Falha ao processar logo, ignorando:", err.message);
        return new Paragraph({
            children: [new TextRun({ text: "" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        });
    }
}

module.exports = createHeaderWithLogo;