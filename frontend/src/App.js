import React, { useState } from 'react';

function App() {
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    images: [],
    imagePreviews: []
  });
  const [doc, setDoc] = useState(null);

  // API base URL - can be configured via environment variables
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  // Handle image uploads
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles = files.filter(file => file.size <= maxSize);
    
    if (validFiles.length !== files.length) {
      showNotification('Algumas imagens foram ignoradas por serem muito grandes (máximo 5MB cada)', 'error');
    }
    
    if (validFiles.length > 0) {
      showNotification(`${validFiles.length} imagem(ns) selecionada(s) com sucesso!`);
    }
    
    setForm({
      ...form,
      images: validFiles,
      imagePreviews: validFiles.map(file => URL.createObjectURL(file))
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (form.description.length < 20) {
      newErrors.description = 'Descrição deve ter pelo menos 20 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload images to backend
  const uploadImages = async (files) => {
    const uploadedImages = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch(`${API_BASE_URL}/images/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        uploadedImages.push({
          url: `http://localhost:5000${result.url}`,
          caption: result.caption,
          filename: result.filename
        });
      } catch (error) {
        console.error('Image upload error:', error);
        showNotification(`Erro ao fazer upload da imagem: ${error.message}`, 'error');
      }
    }
    
    return uploadedImages;
  };

  // Generate documentation using backend API
  const generateDocumentation = async (title, description, images) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documentation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          images
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Documentation generation error:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Por favor, corrija os erros no formulário', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload images first
      let uploadedImages = [];
      if (form.images.length > 0) {
        showNotification('Fazendo upload das imagens...');
        uploadedImages = await uploadImages(form.images);
      }
      
      // Generate documentation
      showNotification('Gerando documentação...');
      const documentation = await generateDocumentation(
        form.title,
        form.description,
        uploadedImages
      );
      
      setDoc({
        title: documentation.title,
        intro: documentation.content,
        steps: documentation.content,
        images: uploadedImages.map(img => ({ 
          src: img.url, 
          legend: img.caption 
        }))
      });
      
      setStep('view');
      showNotification('Documentação gerada com sucesso!');
    } catch (error) {
      showNotification(`Erro ao gerar documentação: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Button functions (copy, export, share)
  const handleCopy = async () => {
    if (doc) {
      try {
        await navigator.clipboard.writeText(`${doc.title}\n${doc.intro}\n${doc.steps}`);
        showNotification('Texto copiado para a área de transferência!');
      } catch (error) {
        showNotification('Erro ao copiar texto', 'error');
      }
    }
  };

  // Remove image preview
  const removeImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    const newPreviews = form.imagePreviews.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages, imagePreviews: newPreviews });
    showNotification('Imagem removida');
  };

  // Screen structure
  if (step === 'form') {
    return (
      <div className="app-container">
        <div className="main-card fade-in">
          <div className="logo-container">
            <img src="/phosdocs_img.png" alt="PhosDocs Logo" className="logo" />
            <p className="logo-subtitle">Crie documentação técnica inteligente</p>
          </div>
          
          <div className="form-container">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Título da documentação</label>
                <input 
                  name="title" 
                  value={form.title} 
                  onChange={handleChange} 
                  required 
                  className={`form-input ${errors.title ? 'form-input-error' : ''}`}
                  placeholder="Digite o título da sua documentação"
                />
                {errors.title && <div className="error-message">{errors.title}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Descrição técnica</label>
                <textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  required 
                  rows={4} 
                  className={`form-input form-textarea ${errors.description ? 'form-input-error' : ''}`}
                  placeholder="Descreva o processo ou tecnologia que você quer documentar"
                />
                {errors.description && <div className="error-message">{errors.description}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Imagens (opcional)</label>
                <div className="file-upload">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageChange}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="file-upload-label">
                    📷 Clique para selecionar imagens
                  </label>
                </div>
                {form.imagePreviews.length > 0 && (
                  <div className="image-previews">
                    {form.imagePreviews.map((src, i) => (
                      <div key={i} className="image-preview-container">
                        <img 
                          src={src} 
                          alt={`preview ${i}`} 
                          className="image-preview" 
                        />
                        <button 
                          type="button"
                          onClick={() => removeImage(i)}
                          className="remove-image-btn"
                          title="Remover imagem"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Gerando documentação...
                  </>
                ) : (
                  <>
                    ✨ Gerar documentação
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
    );
  }

  // Documentation view screen
  if (step === 'view' && doc) {
    return (
      <div className="app-container">
        <div className="main-card fade-in">
          <div className="logo-container">
            <img src="/phosdocs_img.png" alt="PhosDocs Logo" className="logo" />
          </div>
          
          <div className="doc-container">
            <h2 className="doc-title">{doc.title}</h2>
            
            <div className="doc-section">
              <div className="doc-section-title">📖 Introdução</div>
              <div className="doc-content">{doc.intro}</div>
            </div>
            
            <div className="doc-section">
              <div className="doc-section-title">🔧 Como funciona</div>
              <div className="doc-content">{doc.steps}</div>
            </div>
            
            {doc.images.length > 0 && (
              <div className="doc-images">
                <div className="doc-section-title">🖼️ Imagens</div>
                {doc.images.map((img, i) => (
                  <div key={i} className="doc-image-item">
                    <img 
                      src={img.src} 
                      alt={`doc-img-${i}`} 
                      className="doc-image"
                    />
                    <div className="doc-image-caption">{img.legend}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="action-buttons">
              <button onClick={handleCopy} className="btn btn-secondary">
                📋 Copiar texto
              </button>
              <button disabled className="btn btn-secondary">
                📄 Exportar PDF
              </button>
              <button disabled className="btn btn-secondary">
                🔗 Compartilhar
              </button>
              <button onClick={() => setStep('form')} className="btn btn-primary">
                ✨ Nova documentação
              </button>
            </div>
          </div>
        </div>
        
        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default App;
