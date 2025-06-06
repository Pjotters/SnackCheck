import React, { useState } from 'react';
import axios from 'axios';
import { API } from './config';
import FoodDisplay from './FoodDisplay';
import Badge from './Badge'; // Used by FoodDisplay, but good to have if directly used here too

// Food Entry Form with Enhanced AI
const FoodEntryForm = ({ onEntryAdded }) => {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState(100); // Default to 100g
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setFoodName(file.name.split('.')[0]); // Autofill foodname from filename
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('food_name', foodName);
    formData.append('quantity', quantity);
    if (image) {
      formData.append('image', image);
    }

    try {
      const response = await axios.post(`${API}/food-entry`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAnalysisResult(response.data.analysis_result);
      onEntryAdded(response.data.entry); // Callback to update user stats or gallery
    } catch (err) {
      setError(err.response?.data?.detail || 'Fout bij het verwerken van het voedsel.');
      console.error("Food Entry Error:", err.response || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-green-700 mb-8">Log je Snack! 🍎</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="foodName" className="block text-sm font-medium text-gray-700 mb-1">Naam van voedsel</label>
          <input
            type="text"
            id="foodName"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm transition duration-150"
            placeholder="bv. Appel, Banaan, Proteïnereep"
            required
          />
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Hoeveelheid (gram)</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm transition duration-150"
            placeholder="bv. 100"
            required
            min="1"
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Upload een afbeelding (optioneel)</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition duration-150"
          />
          {imagePreview && (
            <div className="mt-4 border border-gray-300 rounded-lg p-2 inline-block">
              <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded-md object-cover"/>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 transition duration-150"
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Analyseer Snack'}
        </button>
      </form>

      {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
      {analysisResult && <FoodDisplay food={analysisResult} />}
    </div>
  );
};

export default FoodEntryForm;
