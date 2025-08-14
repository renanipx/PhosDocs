// Helper function to validate form
export const validateDocumentForm = (form) => {
  const errors = {};

  if (!form.title.trim()) {
    errors.title = 'Título é obrigatório';
  }

  if (!form.description.trim()) {
    errors.description = 'Descrição é obrigatória';
  } else if (form.description.length < 20) {
    errors.description = 'Descrição deve ter pelo menos 20 caracteres';
  } else if (form.description.length > 5000) {
    errors.description = 'Descrição muito longa. Máximo 5000 caracteres para evitar timeouts.';
  }

  if (!form.author.trim()) {
    errors.author = 'Autor é obrigatório';
  }

  if (form.images.length > 5) {
    errors.images = 'Máximo 5 imagens permitidas para evitar timeouts.';
  }

  return errors;
};

// Helper function to clean up blob URLs
export const cleanupBlobUrls = (urls) => {
  if (!urls) return;
  
  if (Array.isArray(urls)) {
    urls.forEach(url => {
      if (url && typeof url === 'string' && url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    });
  } else if (typeof urls === 'string' && urls.startsWith('blob:')) {
    window.URL.revokeObjectURL(urls);
  }
};