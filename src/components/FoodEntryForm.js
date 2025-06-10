import { useState, useEffect } from 'react';
import { Camera, X, Loader, CheckCircle, XCircle, Info, Star } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { getAuthHeaders, isAuthenticated } from '../authUtils';

// Hulpcomponent voor tooltips
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-2">
      <button 
        type="button" 
        className="text-gray-400 hover:text-gray-500 focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="Meer informatie"
      >
        <Info className="h-4 w-4" />
      </button>
      {isVisible && (
        <div className="absolute z-10 w-48 p-2 mt-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg -left-4">
          {content}
        </div>
      )}
    </div>
  );
};

const FoodEntryForm = ({ onFoodAdded, user, onClose }) => {
  const [formData, setFormData] = useState({
    food_name: '',
    quantity: 100,
    meal_type: 'snack',
    image: null,
    imagePreview: null
  });
  
  const [touched, setTouched] = useState({
    food_name: false,
    quantity: false,
    meal_type: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // Validatie functies
  const validateField = (name, value) => {
    switch (name) {
      case 'food_name':
        return value.trim() === '' ? 'Voer een geldige voedselnaam in' : '';
      case 'quantity':
        return isNaN(value) || value <= 0 ? 'Voer een geldig getal in (groter dan 0)' : '';
      default:
        return '';
    }
  };
  
  const errors = {
    food_name: validateField('food_name', formData.food_name),
    quantity: validateField('quantity', formData.quantity)
  };
  
  const isFormValid = !errors.food_name && !errors.quantity;
  
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };
  
  // Controleer authenticatie bij het mounten
  useEffect(() => {
    if (!isAuthenticated()) {
      setError('Je moet ingelogd zijn om voedsel toe te voegen');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result
        }));
      };
      
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'quantity' ? parseInt(value) || 0 : value
      }));
    }
  };

  const analyzeFood = async () => {
    if (!formData.food_name.trim()) {
      setError('Voer een voedselnaam in om te analyseren');
      return;
    }
    
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    
    try {
      const response = await axios.post(
        API_ENDPOINTS.ANALYZE_FOOD, 
        { 
          food_name: formData.food_name,
          quantity: formData.quantity
        },
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );
      
      if (response.data.success) {
        setAnalysis(response.data.analysis);
      } else {
        setError(response.data.error || 'Kon het voedsel niet analyseren');
      }
    } catch (err) {
      console.error('Fout bij analyseren voedsel:', err);
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Er is een fout opgetreden bij het analyseren van het voedsel. Probeer het later opnieuw.';
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Markeer alle velden als aangeraakt voor validatie
    const newTouched = {};
    Object.keys(touched).forEach(key => {
      newTouched[key] = true;
    });
    setTouched(newTouched);
    
    // Controleer of het formulier geldig is
    if (!isFormValid) {
      setError('Vul alle verplichte velden correct in');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    const formDataToSend = new FormData();
    formDataToSend.append('food_name', formData.food_name.trim());
    formDataToSend.append('quantity', formData.quantity);
    formDataToSend.append('meal_type', formData.meal_type);
    
    // Voeg alleen de afbeelding toe als deze is geselecteerd
    if (formData.image) {
      formDataToSend.append('image', formData.image);
    }
    
    // Voeg analysegegevens toe als beschikbaar
    if (analysis) {
      formDataToSend.append('analysis_data', JSON.stringify({
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        is_healthy: analysis.is_healthy
      }));
    }

    try {
      const response = await axios.post(
        API_ENDPOINTS.FOOD_ENTRIES, 
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...getAuthHeaders()
          }
        }
      );
      
      if (response.data.success) {
        setSuccess('Voedsel succesvol toegevoegd!');
        setShowForm(false);
        
        // Roep de callback aan om de ouder op de hoogte te stellen
        if (onFoodAdded) {
          onFoodAdded(response.data.food_entry);
        }
        
        // Sluit het formulier na 2 seconden
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Er is een fout opgetreden bij het opslaan');
      }
    } catch (err) {
      console.error('Fout bij toevoegen voedselinvoer:', err);
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Er is een fout opgetreden bij het toevoegen van de voedselinvoer';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Toon succesbericht na toevoegen
  if (!showForm) {
    return (
      <div className="text-center py-8" role="alert" aria-live="polite" aria-atomic="true">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-lg font-medium text-gray-900">Gelukt!</h3>
        <div className="mt-2 text-sm text-gray-500">
          <p>{success || 'Je voedselinvoer is succesvol opgeslagen.'}</p>
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Terug naar overzicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        aria-labelledby="food-form-title"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg leading-6 font-medium text-gray-900" id="food-form-title">
              Voedsel toevoegen
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Sluit formulier"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          {error && (
            <div 
              className="rounded-md bg-red-50 p-4 mb-4" 
              role="alert"
              aria-live="assertive"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Er is een fout opgetreden</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center">
                <label htmlFor="food_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Wat heb je gegeten? *
                </label>
                <Tooltip content="Voer de naam in van het voedsel dat je hebt gegeten, bijvoorbeeld 'Banaan' of 'Broodje kaas'">
                  <span className="sr-only">Meer informatie over voedselnaam</span>
                </Tooltip>
              </div>
              <div className="mt-1">
                <input
                  type="text"
                  id="food_name"
                  name="food_name"
                  value={formData.food_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full rounded-md shadow-sm sm:text-sm ${
                    touched.food_name && errors.food_name
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  aria-invalid={touched.food_name && errors.food_name ? 'true' : 'false'}
                  aria-describedby={touched.food_name && errors.food_name ? 'food_name-error' : undefined}
                />
                {touched.food_name && errors.food_name && (
                  <p className="mt-2 text-sm text-red-600" id="food_name-error">
                    {errors.food_name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Hoeveelheid (gram) *
                  </label>
                  <Tooltip content="Voer het gewicht in gram in, bijvoorbeeld 100 voor 100 gram">
                    <span className="sr-only">Meer informatie over hoeveelheid</span>
                  </Tooltip>
                </div>
                <div className="mt-1">
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      touched.quantity && errors.quantity
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    aria-invalid={touched.quantity && errors.quantity ? 'true' : 'false'}
                    aria-describedby={touched.quantity && errors.quantity ? 'quantity-error' : undefined}
                  />
                  {touched.quantity && errors.quantity && (
                    <p className="mt-2 text-sm text-red-600" id="quantity-error">
                      {errors.quantity}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center">
                  <label htmlFor="meal_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Maaltijdtype *
                  </label>
                  <Tooltip content="Selecteer het type maaltijd">
                    <span className="sr-only">Meer informatie over maaltijdtype</span>
                  </Tooltip>
                </div>
                <select
                  id="meal_type"
                  name="meal_type"
                  value={formData.meal_type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="breakfast">Ontbijt</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Avondeten</option>
                  <option value="snack">Tussendoortje</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto toevoegen (optioneel)
                </label>
                <Tooltip content="Voeg een foto toe van je maaltijd voor betere analyse en tracking">
                  <span className="sr-only">Meer informatie over foto toevoegen</span>
                </Tooltip>
              </div>
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  formData.imagePreview 
                    ? 'border-transparent' 
                    : 'border-gray-300 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
                }`}
              >
                {formData.imagePreview ? (
                  <div className="relative group">
                    <img 
                      src={formData.imagePreview} 
                      alt="Voorbeeld van geüploade maaltijd" 
                      className="mx-auto h-32 w-32 object-cover rounded-lg shadow-sm" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            image: null,
                            imagePreview: null
                          }));
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        aria-label="Verwijder afbeelding"
                      >
                        <X className="h-3 w-3 mr-1" aria-hidden="true" />
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="image-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload een foto</span>
                        <input
                          id="image-upload"
                          name="image"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleChange}
                        />
                      </label>
                      <p className="pl-1">of sleep hierheen</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF tot 5MB</p>
                  </div>
                )}
              </div>
            </div>
            
            {analysis && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analyse resultaat</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {analysis.is_healthy ? (
                        <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {analysis.is_healthy ? 'Gezonde keuze!' : 'Minder gezonde keuze'}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>{analysis.suggestions?.[0] || 'Geen specifieke suggesties beschikbaar.'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Calorieën</p>
                      <p className="text-lg font-semibold">{Math.round(analysis.calories)} kcal</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Eiwitten</p>
                      <p className="text-lg font-semibold">{analysis.protein}g</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Koolhydraten</p>
                      <p className="text-lg font-semibold">{analysis.carbs}g</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vetten</p>
                      <p className="text-lg font-semibold">{analysis.fat}g</p>
                    </div>
                  </div>
                  
                  {analysis.points_earned > 0 && (
                    <div className="mt-4 flex items-center text-yellow-600">
                      <Star className="h-5 w-5" aria-hidden="true" />
                      <span className="ml-1 text-sm font-medium">+{analysis.points_earned} punten verdiend!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="pt-6">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuleren
                </button>
                
                <button
                  type="button"
                  onClick={analyzeFood}
                  disabled={!formData.food_name.trim() || analyzing || loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Analyseren...
                    </>
                  ) : (
                    'Analyseren'
                  )}
                </button>
                
                <button
                  type="submit"
                  disabled={!isFormValid || loading || analyzing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Opslaan...
                    </>
                  ) : (
                    'Opslaan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FoodEntryForm;
