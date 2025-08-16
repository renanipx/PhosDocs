import React from 'react';

const DocumentForm = ({
  form,
  errors,
  handleChange,
  handleImageChange,
  handleLogoChange,
  handleRemoveImage,
  handleRemoveLogo,
  handleSubmit,
  loading
}) => {
  return (
    <form onSubmit={handleSubmit} className="documentation-form">
      <div className="form-header">
        <h1>PhosDocs</h1>
        <p>Gerador de documentação com IA</p>
      </div>

      <div className="form-group">
        <label htmlFor="title"><i className="fas fa-heading"></i> Título do Documento</label>
        <input
          type="text"
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          className={errors.title ? 'error' : ''}
          placeholder="Ex: Atualização do Sistema v1.2"
        />
        {errors.title && <div className="error-message">{errors.title}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="description"><i className="fas fa-file-alt"></i> Descrição das Alterações</label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          className={errors.description ? 'error' : ''}
          rows="10"
          placeholder={process.env.REACT_APP_CHANGE_DESCRIPTION}
        ></textarea>
        {errors.description && <div className="error-message">{errors.description}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="author"><i className="fas fa-user"></i> Autor</label>
        <input
          type="text"
          id="author"
          name="author"
          value={form.author}
          onChange={handleChange}
          className={errors.author ? 'error' : ''}
          placeholder="Seu nome ou equipe"
        />
        {errors.author && <div className="error-message">{errors.author}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="logo"><i className="fas fa-building"></i> Logo da Empresa (opcional)</label>
        <input
          type="file"
          id="logo"
          name="logo"
          onChange={handleLogoChange}
          accept="image/png,image/jpeg"
          className="file-input"
        />
        {form.logoPreview && (
          <div className="logo-preview-container">
            <div className="logo-preview">
              <img src={form.logoPreview} alt="Logo preview" />
              <button
                type="button"
                className="image-delete-button"
                onClick={handleRemoveLogo}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="images"><i className="fas fa-images"></i> Imagens (opcional, máx. 5)</label>
        <input
          type="file"
          id="images"
          name="images"
          onChange={handleImageChange}
          accept="image/*"
          multiple
          className={`file-input ${errors.images ? 'error' : ''}`}
        />
        {errors.images && <div className="error-message">{errors.images}</div>}

        {form.imagePreviews.length > 0 && (
          <div className="image-previews">
            {form.imagePreviews.map((preview, index) => (
              <div key={index} className="image-preview">
                <img src={preview} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  className="image-delete-button"
                  onClick={() => handleRemoveImage(index)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Processando...' : <><i className="fas fa-file-word"></i> Gerar Documentação</>}
      </button>
    </form>
  );
};

export default DocumentForm;