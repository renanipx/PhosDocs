import { useState } from 'react';

const useForm = (initialState, validateForm) => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

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

    setForm({
      ...form,
      images: [...(form.images || []), ...validFiles],
      imagePreviews: [...(form.imagePreviews || []), ...validFiles.map(file => URL.createObjectURL(file))]
    });

    return {
      success: validFiles.length === files.length,
      message: validFiles.length !== files.length
        ? 'Algumas imagens foram ignoradas por serem muito grandes (máximo 5MB cada)'
        : `${validFiles.length} imagem(ns) selecionada(s) com sucesso!`
    };
  };

  // Remove an image by index
  const handleRemoveImage = (index) => {
    // Revoke the URL to prevent memory leaks
    if (form.imagePreviews && form.imagePreviews[index]) {
      URL.revokeObjectURL(form.imagePreviews[index]);
    }
    
    const newImages = [...form.images];
    const newPreviews = [...form.imagePreviews];
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setForm({
      ...form,
      images: newImages,
      imagePreviews: newPreviews
    });
  };

  // Handle logo upload
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Revoke previous URL if exists
      if (form.logoPreview) {
        URL.revokeObjectURL(form.logoPreview);
      }
      
      setForm({
        ...form,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      });
    }
  };
  
  // Remove logo
  const handleRemoveLogo = () => {
    if (form.logoPreview) {
      URL.revokeObjectURL(form.logoPreview);
    }
    
    setForm({
      ...form,
      logo: null,
      logoPreview: null
    });
  };

  // Validate the form
  const validate = () => {
    const newErrors = validateForm(form);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    form,
    errors,
    setForm,
    setErrors,
    handleChange,
    handleImageChange,
    handleLogoChange,
    handleRemoveImage,
    handleRemoveLogo,
    validate
  };
};

export default useForm;