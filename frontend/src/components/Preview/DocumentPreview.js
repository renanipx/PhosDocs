import React from 'react';

const DocumentPreview = ({ doc, previewUrl, previewLoading, setStep }) => {
  return (
    <div className="document-preview">
      <div className="preview-header">
        <h2>Documentação Gerada</h2>
        <div className="preview-actions">
          <button onClick={() => setStep('form')} className="back-button">
            <i className="fas fa-arrow-left"></i> Voltar
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={`${doc.title}.docx`}
              className="download-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-download"></i> Baixar Documento
            </a>
          )}
        </div>
      </div>

      <div className="preview-content">
        {previewLoading ? (
          <div className="preview-loading">
            <div className="spinner"></div>
            <p>Carregando visualização...</p>
          </div>
        ) : (
          <>
            {/* Visualização HTML do documento */}
            <div className="document-content">
              <h1>{doc.title}</h1>
              <div className="document-section">
                <h3>Introdução</h3>
                <div dangerouslySetInnerHTML={{ __html: doc.intro }}></div>
              </div>
              
              {doc.sections && doc.sections.map((section, index) => (
                <div key={index} className="document-section">
                  <h3>{section.title}</h3>
                  <div dangerouslySetInnerHTML={{ __html: section.content }}></div>
                  {section.images && section.images.length > 0 && (
                    <div className="section-images">
                      {section.images.map((image, imgIndex) => (
                        <div key={imgIndex} className="section-image">
                          <img src={image.url} alt={image.caption || `Imagem ${imgIndex + 1}`} />
                          {image.caption && <p className="image-caption">{image.caption}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {doc.conclusion && (
                <div className="document-section">
                  <h3>Conclusão</h3>
                  <div dangerouslySetInnerHTML={{ __html: doc.conclusion }}></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;