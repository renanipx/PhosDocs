const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Upload images to backend
export const uploadImages = async (files) => {
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
      throw error;
    }
  }

  return uploadedImages;
};

// Generate documentation using backend API
export const generateDocumentation = async (title, description, images, author, logo) => {
  try {
    let logoData = null;
    
    if (logo) {
      logoData = {
        filename: logo.name,
        base64: await new Promise(resolve => {
          const reader = new FileReader();
          reader.readAsDataURL(logo);
          reader.onloadend = () => resolve(reader.result);
        })
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/documentation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        images,
        author,
        logo: logoData
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Retorna o resultado com os dados da documentação e o nome do arquivo
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Documentation generation error:', error);
    throw error;
  }
};