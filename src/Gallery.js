import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from './config';

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');


  const fetchImages = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/gallery`); // Endpoint for fetching gallery images
      if (Array.isArray(response.data)) {
        setImages(response.data);
      } else {
        console.error('Error: /gallery did not return an array:', response.data);
        setImages([]);
        setError('Kon de galerij-items niet correct laden.');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Er is een fout opgetreden bij het ophalen van de galerij. Probeer het later opnieuw.');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadError('');
    setUploadSuccess('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Selecteer eerst een bestand om te uploaden.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('galleryImage', selectedFile); // 'galleryImage' should match backend multer field name

    try {
      const response = await axios.post(`${API}/gallery/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess('Afbeelding succesvol geüpload!');
      setSelectedFile(null); // Clear file input
      // Refresh images list
      fetchImages(); 
    } catch (err) {
      console.error('Error uploading image:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setUploadError(err.response.data.message);
      } else {
        setUploadError('Fout bij het uploaden van de afbeelding. Probeer het opnieuw.');
      }
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="p-6 bg-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
        📸 Fotogalerij
      </h2>

      {/* Upload Section */}
      <div className="bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Nieuwe afbeelding uploaden</h3>
        <div className="flex items-center space-x-4">
          <input 
            type="file" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100"
            disabled={uploading}
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300 transition duration-150 ease-in-out"
          >
            {uploading ? (
              <svg className="animate-spin h-5 w-5 mr-3 text-white inline" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Upload'}
          </button>
        </div>
        {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
        {uploadSuccess && <p className="text-green-500 text-sm mt-2">{uploadSuccess}</p>}
      </div>


      {loading && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Galerij laden...</p>
        </div>
      )}
      {error && (
        <div className="text-center py-10 bg-red-50 p-4 rounded-lg">
          <p className="text-red-600 font-semibold">{error}</p>
          <button 
            onClick={fetchImages} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Opnieuw proberen
          </button>
        </div>
      )}
      {!loading && !error && images.length === 0 && (
        <p className="text-center text-gray-500 py-10">
          Er zijn nog geen afbeeldingen in de galerij. Upload de eerste en krijg punten!
        </p>
      )}
      {!loading && !error && images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <div key={image._id || index} className="bg-gray-100 rounded-lg shadow-md overflow-hidden group transform hover:scale-105 transition-transform duration-300">
              <img 
                // Assuming image.url contains the full path or backend serves it correctly
                src={image.imageUrl || image.url || `${API}/uploads/${image.filename}`} 
                alt={image.title || 'Galerij afbeelding'} 
                className="w-full h-56 object-cover" 
              />
              {image.title && (
                <div className="p-3">
                  <h3 className="text-md font-semibold text-gray-700 truncate group-hover:text-indigo-600">{image.title}</h3>
                  {image.uploader && <p className="text-xs text-gray-500">Geüpload door: {image.uploader.username || image.uploader}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
