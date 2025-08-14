import React, { useState, useEffect } from 'react';
import DocumentForm from './components/Form/DocumentForm';
import DocumentPreview from './components/Preview/DocumentPreview';
import Notification from './components/UI/Notification';
import Loading from './components/UI/Loading';
import useForm from './hooks/useForm';
import useNotification from './hooks/useNotification';
import { validateDocumentForm, cleanupBlobUrls } from './utils/helpers';
import { uploadImages, generateDocumentation } from './services/api';
import './styles/index.css';
import './styles/components.css';

const initialFormState = {
  title: '',
  description: process.env.REACT_APP_CHANGE_DESCRIPTION ? process.env.REACT_APP_CHANGE_DESCRIPTION.replace(/\\n/g, '\n') : '',
  images: [],
  imagePreviews: [],
  author: '',
  logo: null,
  logoPreview: null
};

function App() {
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState(null);
  
  // Preview Word document states
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Use custom hooks
  const { notification, showNotification } = useNotification();
  const { form, errors, handleChange, handleImageChange, handleLogoChange, handleRemoveImage, handleRemoveLogo, validate, setErrors } = 
    useForm(initialFormState, validateDocumentForm);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
      cleanupBlobUrls(form.imagePreviews);
      cleanupBlobUrls(form.logoPreview);
    };
  }, [previewUrl, form.imagePreviews, form.logoPreview]);

  // Função para voltar ao formulário preservando a logo
  const handleBackToForm = () => {
    setStep('form');
    // Preservar a logo e outros dados do formulário
    // mas limpar o documento gerado
    setDoc(null);
    // Limpar URL do documento
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // Restaurar logoPreview se existir
    if (!form.logoPreview && form.logo) {
      form.logoPreview = URL.createObjectURL(form.logo);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
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

      // Generate documentation with retry logic
      showNotification('Gerando documentação... (pode levar alguns minutos)');

      let documentation;
      let retryCount = 0;
      const maxRetries = 3;

      // Convert logo to base64 if present
      let logoBase64 = null;
      if (form.logo && (form.logo instanceof Blob || form.logo instanceof File)) {
        logoBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.readAsDataURL(form.logo);
          reader.onloadend = () => resolve(reader.result);
        });
      }

      while (retryCount < maxRetries) {
        try {
          documentation = await generateDocumentation(
            form.title,
            form.description,
            uploadedImages,
            form.author,
            logoBase64 // Passa sempre como base64
          );
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.error(`Tentativa ${retryCount} falhou:`, error.message);

          if (error.message.includes('timeout')) {
            if (retryCount < maxRetries) {
              showNotification(`Timeout detectado. Tentativa ${retryCount + 1} de ${maxRetries}...`, 'warning');
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              throw new Error('Todas as tentativas falharam devido a timeout. Tente com uma descrição mais curta ou menos imagens.');
            }
          } else {
            // Non-timeout error, don't retry
            throw error;
          }
        }
      }

      // Process the documentation data
      const docData = documentation.documentation;

      setDoc({
        title: docData.title,
        intro: docData.content,
        sections: docData.sections || [],
        conclusion: docData.conclusion,
        author: form.author,
        date: new Date().toLocaleDateString()
      });

      // Criar URL para download do documento
      // Usar a URL direta da API em vez de criar um Blob
      const wordUrl = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/documentation/download/${documentation.filename}`;
      setPreviewUrl(wordUrl);

      // Change to preview step
      setStep('preview');
      showNotification('Documentação gerada com sucesso!');
    } catch (error) {
      console.error('Error:', error);
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="main-card">
        {loading && <Loading message="Processando sua solicitação..." />}
        
        {!loading && step === 'form' && (
          <DocumentForm
            form={form}
            errors={errors}
            handleChange={handleChange}
            handleImageChange={handleImageChange}
            handleLogoChange={handleLogoChange}
            handleRemoveImage={handleRemoveImage}
            handleRemoveLogo={handleRemoveLogo}
            handleSubmit={handleSubmit}
            loading={loading}
          />
        )}

        {!loading && step === 'preview' && doc && (
          <DocumentPreview
            doc={doc}
            previewUrl={previewUrl}
            previewLoading={previewLoading}
            setStep={handleBackToForm}
          />
        )}

        <Notification notification={notification} />
      </div>
    </div>
  );
}

export default App;