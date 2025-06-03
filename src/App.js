import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set axios default auth header
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Login Component (No Registration)
const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    class_code: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/login`, formData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthHeader(token);
      onLogin(user);
    } catch (error) {
      alert(error.response?.data?.detail || 'Ongeldige inloggegevens');
    } finally {
      setLoading(false);
    }
  };

  const classCodes = [
    { code: 'klasA', name: '🏃‍♂️ Brugklas 1', color: 'bg-red-100 text-red-800' },
    { code: 'klasB', name: '🎯 Brugklas 2', color: 'bg-blue-100 text-blue-800' },
    { code: 'klasC', name: '⚡ Brugklas 3', color: 'bg-green-100 text-green-800' },
    { code: 'docent', name: '👨‍🏫 Docent', color: 'bg-purple-100 text-purple-800' },
    { code: 'admin', name: '🔧 Administrator', color: 'bg-gray-100 text-gray-800' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            🍎 SnackCheck v3.0
          </h1>
          <p className="text-gray-600">AI-powered onderzoeksplatform</p>
          <p className="text-sm text-gray-500 mt-2">Accounts worden aangemaakt door de admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Klascode
            </label>
            <select 
              value={formData.class_code}
              onChange={(e) => setFormData({...formData, class_code: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              required
            >
              <option value="">Kies je klas</option>
              {classCodes.map(cls => (
                <option key={cls.code} value={cls.code}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gebruikersnaam
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="Je gebruikersnaam"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Wachtwoord
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              placeholder="Je wachtwoord"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition duration-200 font-semibold"
          >
            {loading ? 'Inloggen...' : '🔐 Inloggen'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Geen account? Vraag de admins om een account aan te maken via: 124174@chrlyceumdelft.nl</p>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color = "bg-blue-500" }) => (
  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-lg text-white text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

// Badge Component
const Badge = ({ name, earned = false }) => {
  const badges = {
    healthy_start: { name: "Gezonde Start", icon: "🌱", color: "bg-green-500" },
    week_warrior: { name: "Week Warrior", icon: "🔥", color: "bg-orange-500" },
    point_master: { name: "Punten Master", icon: "⭐", color: "bg-yellow-500" },
    ai_expert: { name: "AI Expert", icon: "🤖", color: "bg-blue-500" }
  };

  const badge = badges[name] || { name: name, icon: "🏆", color: "bg-gray-500" };

  return (
    <div className={`${earned ? badge.color : 'bg-gray-300'} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1`}>
      <span>{badge.icon}</span>
      <span>{badge.name}</span>
    </div>
  );
};

// Food Entry Form with Enhanced AI
const FoodEntryForm = ({ onEntryAdded }) => {
  const [formData, setFormData] = useState({
    food_name: '',
    meal_type: 'breakfast',
    quantity: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('food_name', formData.food_name);
      formDataToSend.append('meal_type', formData.meal_type);
      formDataToSend.append('quantity', formData.quantity);
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await axios.post(`${API}/food-entries`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAiResult(response.data);
      
      setFormData({
        food_name: '',
        meal_type: 'breakfast',
        quantity: '',
        image: null
      });
      
      // Reset file input
      const fileInput = document.getElementById('image-input');
      if (fileInput) fileInput.value = '';
      
      onEntryAdded();
      
      // Clear AI result after 12 seconds
      setTimeout(() => setAiResult(null), 12000);
    } catch (error) {
      alert('Er ging iets mis bij het toevoegen');
    } finally {
      setLoading(false);
    }
  };

  const mealTypes = [
    { value: 'breakfast', label: '🌅 Ontbijt', emoji: '🌅' },
    { value: 'lunch', label: '🥪 Lunch', emoji: '🥪' },
    { value: 'dinner', label: '🍽️ Avondeten', emoji: '🍽️' },
    { value: 'snack', label: '🍪 Tussendoortje', emoji: '🍪' }
  ];

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          📝 Voeg je eten toe
          <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">HuggingFace AI</span>
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Wat heb je gegeten? 🍎
              </label>
              <input
                type="text"
                value={formData.food_name}
                onChange={(e) => setFormData({...formData, food_name: e.target.value})}
                placeholder="Bijv. appel, broodje kaas, yoghurt..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maaltijd type
              </label>
              <select
                value={formData.meal_type}
                onChange={(e) => setFormData({...formData, meal_type: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              >
                {mealTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hoeveelheid
            </label>
            <input
              type="text"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              placeholder="Bijv. 1 stuk, 200g, 1 kom..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📸 Foto (aanbevolen voor betere AI analyse)
            </label>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({...formData, image: e.target.files[0]})}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition duration-200 font-semibold"
          >
            {loading ? '🤖 HuggingFace AI analyseert...' : '✅ Analyseren met AI'}
          </button>
        </form>
      </div>

      {/* Enhanced AI Result Display */}
      {aiResult && (
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 animate-fadeIn">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            🤖 HuggingFace AI Analyse
            <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              +{aiResult.points_earned} punten
            </span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getScoreColor(aiResult.ai_score)}`}>
                Gezondheidscore: {aiResult.ai_score}/10
              </div>
              <div className="text-2xl">
                {aiResult.ai_score >= 8 ? '🌟' : aiResult.ai_score >= 6 ? '👍' : aiResult.ai_score >= 4 ? '⚠️' : '🚨'}
              </div>
              {aiResult.calories_estimated && (
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg font-medium">
                  ~{Math.round(aiResult.calories_estimated)} kcal
                </div>
              )}
            </div>
            
            {aiResult.nutrition_info && aiResult.nutrition_info.detected_food && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-blue-700 font-medium">🎯 AI herkende: {aiResult.nutrition_info.detected_food}</p>
                <p className="text-blue-600 text-sm">Vertrouwen: {Math.round(aiResult.nutrition_info.confidence * 100)}%</p>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 font-medium mb-2">💡 AI Feedback:</p>
              <p className="text-gray-800">{aiResult.ai_feedback}</p>
            </div>
            
            {aiResult.ai_suggestions && aiResult.ai_suggestions.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-blue-700 font-medium mb-2">🔄 Gezondere alternatieven:</p>
                <ul className="text-blue-800 space-y-1">
                  {aiResult.ai_suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.new_badges && aiResult.new_badges.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-yellow-700 font-medium mb-2">🏆 Nieuwe badges behaald!</p>
                <div className="flex flex-wrap gap-2">
                  {aiResult.new_badges.map((badge, idx) => (
                    <Badge key={idx} name={badge} earned={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Calorie Checker
const CalorieChecker = () => {
  const [formData, setFormData] = useState({
    food_name: '',
    quantity: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('food_name', formData.food_name);
      formDataToSend.append('quantity', formData.quantity);

      const response = await axios.post(`${API}/calorie-check`, formDataToSend);
      setResult(response.data);
    } catch (error) {
      alert('Er ging iets mis bij het controleren van calorieën');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        🔥 Caloriechecker
        <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">AI Powered</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Voedsel
          </label>
          <input
            type="text"
            value={formData.food_name}
            onChange={(e) => setFormData({...formData, food_name: e.target.value})}
            placeholder="Bijv. appel, pizza, broccoli..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hoeveelheid
          </label>
          <input
            type="text"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            placeholder="Bijv. 1 stuk, 200g, 1 kom..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition duration-200"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition duration-200 font-semibold"
        >
          {loading ? '🔥 Calorieën berekenen...' : '🔥 Check Calorieën'}
        </button>
      </form>

      {result && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 className="font-bold text-lg text-orange-800 mb-3">Calorie Resultaat</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-orange-700">Voedsel:</span>
              <span className="font-medium">{result.food_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Hoeveelheid:</span>
              <span className="font-medium">{result.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Calorieën per 100g:</span>
              <span className="font-medium">{result.calories_per_100g} kcal</span>
            </div>
            <div className="flex justify-between border-t border-orange-300 pt-2">
              <span className="text-orange-700 font-bold">Geschatte totaal:</span>
              <span className="font-bold text-xl text-orange-800">{Math.round(result.estimated_calories)} kcal</span>
            </div>
            
            {result.nutrition_breakdown && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">{result.nutrition_breakdown.tips}</p>
                <p className="text-xs text-gray-500 mt-1">Gezondheidscore: {result.nutrition_breakdown.score}/10</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Food Comparison Tool
const FoodComparison = () => {
  const [formData, setFormData] = useState({
    food_1: '',
    food_2: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('food_1', formData.food_1);
      formDataToSend.append('food_2', formData.food_2);

      const response = await axios.post(`${API}/food-compare`, formDataToSend);
      setResult(response.data);
    } catch (error) {
      alert('Er ging iets mis bij het vergelijken');
    } finally {
      setLoading(false);
    }
  };

  const getWinnerIcon = (food, winner) => {
    if (food === winner) return '🏆';
    return '⚪';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        ⚖️ Voedsel Vergelijker
        <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">VS Mode</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Voedsel 1 🥇
            </label>
            <input
              type="text"
              value={formData.food_1}
              onChange={(e) => setFormData({...formData, food_1: e.target.value})}
              placeholder="Bijv. appel"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Voedsel 2 🥈
            </label>
            <input
              type="text"
              value={formData.food_2}
              onChange={(e) => setFormData({...formData, food_2: e.target.value})}
              placeholder="Bijv. chips"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition duration-200 font-semibold"
        >
          {loading ? '⚖️ Vergelijken...' : '⚖️ Vergelijk Voedsel'}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-bold text-lg text-purple-800 mb-3 text-center">Vergelijking Resultaat</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Food 1 */}
              <div className={`p-4 rounded-lg border-2 ${result.winner === result.food_1.name ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                <div className="text-center mb-2">
                  <span className="text-2xl">{getWinnerIcon(result.food_1.name, result.winner)}</span>
                  <h4 className="font-bold text-lg">{result.food_1.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">{result.food_1.score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calorieën:</span>
                    <span className="font-bold">{result.food_1.calories_per_100g} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categorie:</span>
                    <span className="font-bold">{result.food_1.category}</span>
                  </div>
                </div>
              </div>

              {/* Food 2 */}
              <div className={`p-4 rounded-lg border-2 ${result.winner === result.food_2.name ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                <div className="text-center mb-2">
                  <span className="text-2xl">{getWinnerIcon(result.food_2.name, result.winner)}</span>
                  <h4 className="font-bold text-lg">{result.food_2.name}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">{result.food_2.score}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calorieën:</span>
                    <span className="font-bold">{result.food_2.calories_per_100g} kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categorie:</span>
                    <span className="font-bold">{result.food_2.category}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-bold text-center mb-2">🏆 Winnaar: {result.winner}</h4>
              <p className="text-gray-700 text-center">{result.recommendation}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div className="text-center">
                  <span className="text-gray-600">Score verschil:</span>
                  <div className="font-bold">{result.score_difference} punten</div>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">Calorie verschil:</span>
                  <div className="font-bold">{result.calorie_difference} kcal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Gallery Component
const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const response = await axios.get(`${API}/gallery`);
      setGalleryItems(response.data);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const likeItem = async (itemId) => {
    try {
      await axios.post(`${API}/gallery/${itemId}/like`);
      // Update local state
      setGalleryItems(items => 
        items.map(item => 
          item.id === itemId 
            ? { ...item, likes: item.likes + 1 }
            : item
        )
      );
    } catch (error) {
      console.error('Error liking item:', error);
    }
  };

  if (loading) {
    return <div className="text-center">Gallery laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        📸 Gallery
        <span className="ml-2 text-sm bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
          {galleryItems.length} foto's
        </span>
      </h2>

      {galleryItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📸</div>
          <p className="text-gray-500">Nog geen foto's in de gallery</p>
          <p className="text-gray-400 text-sm mt-2">Voeg foto's toe met goede scores om ze hier te zien!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-200">
              <img 
                src={`data:image/jpeg;base64,${item.image_data}`}
                alt={item.food_name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{item.food_name}</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Door: {item.username}</span>
                  <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                    item.ai_score >= 8 ? 'bg-green-100 text-green-800' :
                    item.ai_score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {item.ai_score}/10
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString('nl-NL')}
                  </span>
                  <button
                    onClick={() => likeItem(item.id)}
                    className="flex items-center space-x-1 text-pink-600 hover:text-pink-700 transition duration-200"
                  >
                    <span>❤️</span>
                    <span className="text-sm font-medium">{item.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Chat/Help Component
const ChatHelp = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    // Auto-refresh messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/messages`);
      setMessages(response.data.reverse()); // Reverse to show newest first, then reverse again for display
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const formData = new FormData();
      formData.append('message', newMessage);

      await axios.post(`${API}/chat/send`, formData);
      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error) {
      alert('Er ging iets mis bij het versturen van je bericht');
    }
  };

  if (loading) {
    return <div className="text-center">Chat laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        💬 Help & Chat
        <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">Live Chat</span>
      </h2>

      {/* Messages */}
      <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Nog geen berichten</p>
            <p className="text-sm">Stel je eerste vraag!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.is_admin 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  <div className="font-semibold text-sm mb-1">
                    {message.is_admin ? '🔧 Admin' : `👤 ${message.username}`}
                  </div>
                  <div>{message.message}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString('nl-NL')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Message Form */}
      <form onSubmit={sendMessage} className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Typ je vraag of bericht..."
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 font-medium"
        >
          📤 Verstuur
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-blue-700 text-sm">
          💡 <strong>Tip:</strong> Hier kun je vragen stellen aan de admin over het onderzoek, technische problemen, of feedback geven!
        </p>
      </div>
    </div>
  );
};

// Admin User Management Component
const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    class_code: '',
    role: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/create-user`, newUser);
      setNewUser({
        username: '',
        password: '',
        class_code: '',
        role: ''
      });
      setShowCreateForm(false);
      fetchUsers();
      alert('Gebruiker succesvol aangemaakt!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Fout bij aanmaken gebruiker');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        fetchUsers();
        alert('Gebruiker verwijderd!');
      } catch (error) {
        alert('Fout bij verwijderen gebruiker');
      }
    }
  };

  const classCodes = [
    { code: 'KLAS1', name: 'Brugklas 1' },
    { code: 'KLAS2', name: 'Brugklas 2' },
    { code: 'KLAS3', name: 'Brugklas 3' },
    { code: 'DOCENT', name: 'Docent' },
    { code: 'ADMIN', name: 'Administrator' }
  ];

  if (loading) {
    return <div className="text-center">Gebruikers laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          👥 Gebruikersbeheer
          <span className="ml-2 text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
            {users.length} gebruikers
          </span>
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-200"
        >
          ➕ Nieuwe Gebruiker
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold mb-4">Nieuwe Gebruiker Aanmaken</h3>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gebruikersnaam</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klascode</label>
              <select
                value={newUser.class_code}
                onChange={(e) => setNewUser({...newUser, class_code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Kies klascode</option>
                {classCodes.map(cls => (
                  <option key={cls.code} value={cls.code}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition duration-200"
              >
                ✅ Aanmaken
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition duration-200"
              >
                ❌ Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gebruiker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punten</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aangemaakt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id || user._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.class_code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.points || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('nl-NL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 hover:text-red-900 transition duration-200"
                  >
                    🗑️ Verwijderen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Enhanced Admin Dashboard
const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs = [
    { id: 'analytics', name: '📊 Analytics', icon: '📊' },
    { id: 'users', name: '👥 Gebruikersbeheer', icon: '👥' },
    { id: 'chat', name: '💬 Chat Beheer', icon: '💬' }
  ];

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2">🔧 Admin Dashboard</h1>
        <p className="text-gray-300">Volledige toegang tot alle functies en data</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-center font-medium transition duration-200 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'analytics' && <AnalyticsDashboard user={user} />}
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'chat' && <ChatHelp />}
        </div>
      </div>
    </div>
  );
};

// Continue with rest of components in next part due to length...
// [The rest of the components including enhanced analytics, student dashboard, etc. would continue here]

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setAuthHeader(token);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthHeader(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-500">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <p className="mt-4 text-xl font-semibold">SnackCheck v3.0 laden...</p>
          <p className="text-sm opacity-80">HuggingFace AI-powered platform</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'student_class_1': '🏃‍♂️ Brugklas 1',
      'student_class_2': '🎯 Brugklas 2', 
      'student_class_3': '⚡ Brugklas 3',
      'teacher': '👨‍🏫 Docent',
      'admin': '🔧 Administrator'
    };
    return roleNames[role] || role;
  };

  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher';
  const isStudent = !isAdmin && !isTeacher;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                🍎 SnackCheck v3.0
              </h1>
              <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-blue-100 text-green-800 text-sm rounded-full font-medium">
                {getRoleDisplayName(user.role)}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                HuggingFace AI
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              {isStudent && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span>🏆</span>
                    <span className="font-medium">{user.points} pts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>⚡</span>
                    <span className="font-medium">Lvl {user.level}</span>
                  </div>
                </div>
              )}
              
              <div className="text-gray-700 font-medium">
                Welkom, {user.username}!
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 font-medium"
              >
                🚪 Uitloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin && <AdminDashboard user={user} />}
        {isTeacher && <AnalyticsDashboard user={user} />}
        {isStudent && <StudentDashboard user={user} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">
              SnackCheck v3.0 - HuggingFace AI-powered Onderzoeksplatform voor Gezonde Voedselkeuzes
            </p>
            <p className="text-gray-400 text-xs">
              Ontwikkeld met ❤️ voor het bevorderen van gezonde eetgewoonten bij jongeren
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Student Dashboard with enhanced features
const StudentDashboard = ({ user }) => {
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('food');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API}/food-entries`);
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'food', name: '🍎 Voedsel Loggen', icon: '🍎' },
    { id: 'calories', name: '🔥 Caloriechecker', icon: '🔥' },
    { id: 'compare', name: '⚖️ Vergelijken', icon: '⚖️' },
    { id: 'gallery', name: '📸 Gallery', icon: '📸' },
    { id: 'stats', name: '📊 Mijn Stats', icon: '📊' },
    { id: 'questions', name: '❓ Vragen', icon: '❓' },
    { id: 'help', name: '💬 Hulp', icon: '💬' }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Dashboard laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2">Welkom terug, {user.username}! 👋</h1>
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span>🏆</span>
            <span>{user.points} punten</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Level {user.level}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🏆</span>
            <span>{user.badges?.length || 0} badges</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="flex flex-wrap border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 text-center font-medium transition duration-200 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'food' && (
            <div className="space-y-6">
              <FoodEntryForm onEntryAdded={fetchEntries} />
              <FoodEntriesList entries={entries} />
            </div>
          )}
          
          {activeTab === 'calories' && <CalorieChecker />}
          {activeTab === 'compare' && <FoodComparison />}
          {activeTab === 'gallery' && <Gallery />}
          {activeTab === 'stats' && <UserStats user={user} />}
          {activeTab === 'questions' && <DailyQuestions />}
          {activeTab === 'help' && <ChatHelp />}
        </div>
      </div>
    </div>
  );
};

// Enhanced Analytics Dashboard 
const AnalyticsDashboard = ({ user }) => {
  const [analytics, setAnalytics] = useState(null);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchAllEntries();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/class-summary`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchAllEntries = async () => {
    try {
      const response = await axios.get(`${API}/food-entries/all`);
      setAllEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Onderzoeksgegevens laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          📈 Onderzoeksgegevens
          <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {user.role === 'admin' ? 'Full Access' : 'Limited Access'}
          </span>
        </h2>
        
        {analytics && analytics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.map((classData, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  {classData.class_code === 'KLAS1' ? '🏃‍♂️' : classData.class_code === 'KLAS2' ? '🎯' : '⚡'} 
                  <span className="ml-2">{classData.class_code}</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actieve gebruikers:</span>
                    <span className="font-bold text-blue-600">{classData.active_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totaal invoeren:</span>
                    <span className="font-bold text-green-600">{classData.total_entries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gem. score:</span>
                    <span className="font-bold text-purple-600">
                      {classData.avg_score ? classData.avg_score.toFixed(1) : 'N/A'}/10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totaal punten:</span>
                    <span className="font-bold text-yellow-600">{classData.total_points || 0}</span>
                  </div>
                  {classData.avg_calories && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gem. calorieën:</span>
                      <span className="font-bold text-orange-600">{Math.round(classData.avg_calories)} kcal</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">Nog geen data beschikbaar</p>
            <p className="text-gray-400 text-sm mt-2">Studenten moeten eerst voedselinvoeren registreren</p>
          </div>
        )}
      </div>

      <FoodEntriesList 
        entries={allEntries} 
        showUserInfo={user.role === 'admin'} 
      />
    </div>
  );
};

// Enhanced Food Entries List with new features
const FoodEntriesList = ({ entries, showUserInfo = false }) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🍎</div>
        <p className="text-gray-500 text-lg">Nog geen voedselinvoeren geregistreerd</p>
        <p className="text-gray-400 text-sm mt-2">Voeg je eerste maaltijd toe om te beginnen!</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🥪',
      dinner: '🍽️',
      snack: '🍪'
    };
    return icons[mealType] || '🍽️';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        📊 Voedingslogboek
        <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          {entries.length} items
        </span>
      </h2>
      
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{getMealIcon(entry.meal_type)}</span>
                  <h3 className="font-bold text-lg text-gray-800">{entry.food_name}</h3>
                  {entry.ai_score !== null && (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(entry.ai_score)}`}>
                      {entry.ai_score}/10
                    </span>
                  )}
                  {entry.calories_estimated && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      ~{Math.round(entry.calories_estimated)} kcal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {entry.meal_type} • {entry.quantity}
                </p>
                {showUserInfo && (
                  <p className="text-xs text-gray-500">Gebruiker: {entry.user_id}</p>
                )}
                
                {/* Enhanced nutrition info display */}
                {entry.nutrition_info && entry.nutrition_info.detected_food && (
                  <p className="text-xs text-blue-600 mt-1">
                    🤖 AI herkende: {entry.nutrition_info.detected_food} 
                    ({Math.round(entry.nutrition_info.confidence * 100)}% zeker)
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleDateString('nl-NL')}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleTimeString('nl-NL')}
                </div>
                {entry.points_earned > 0 && (
                  <div className="text-xs text-green-600 font-medium">
                    +{entry.points_earned} punten
                  </div>
                )}
              </div>
            </div>
            
            {entry.ai_feedback && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">💡 AI Tip:</span> {entry.ai_feedback}
                </p>
              </div>
            )}
            
            {entry.ai_suggestions && entry.ai_suggestions.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">🔄 Gezondere alternatieven:</p>
                <ul className="text-sm text-blue-600 space-y-1">
                  {entry.ai_suggestions.slice(0, 2).map((suggestion, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-400 mr-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {entry.image_data && (
              <div className="mt-3">
                <img 
                  src={`data:image/jpeg;base64,${entry.image_data}`}
                  alt="Food" 
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 hover:scale-105 transition duration-200 cursor-pointer"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced User Stats with new metrics
const UserStats = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLeaderboard();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/analytics/user-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Totaal Punten"
          value={stats?.total_points || 0}
          icon="🏆"
          color="bg-yellow-500"
        />
        <StatsCard 
          title="Level"
          value={stats?.level || 1}
          icon="⚡"
          color="bg-purple-500"
        />
        <StatsCard 
          title="Gemiddelde Score"
          value={stats?.avg_score?.toFixed(1) || "0.0"}
          icon="📊"
          color="bg-blue-500"
        />
        <StatsCard 
          title="Streak Dagen"
          value={stats?.streak_days || 0}
          icon="🔥"
          color="bg-orange-500"
        />
      </div>

      {/* New Calorie Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard 
          title="Totaal Calorieën"
          value={stats?.total_calories || 0}
          icon="🔥"
          color="bg-red-500"
        />
        <StatsCard 
          title="Gem. per Dag"
          value={`${stats?.avg_calories_per_day || 0} kcal`}
          icon="📈"
          color="bg-green-500"
        />
      </div>

      {/* Badges */}
      {stats?.badges && stats.badges.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Je Badges</h3>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((badge, idx) => (
              <Badge key={idx} name={badge} earned={true} />
            ))}
          </div>
        </div>
      )}

      {/* Class Leaderboard */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🥇 Klas Ranglijst</h3>
        <div className="space-y-3">
          {leaderboard.slice(0, 10).map((student, idx) => (
            <div key={student._id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-800">{student.username}</span>
                {student.username === user.username && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Jij</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Level {student.level}</span>
                <span className="font-bold text-yellow-600">{student.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Daily Questions Component (unchanged but imported)
const DailyQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysQuestions();
  }, []);

  const fetchTodaysQuestions = async () => {
    try {
      const response = await axios.get(`${API}/daily-questions/today`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId, answer) => {
    try {
      await axios.post(`${API}/question-responses`, {
        question_id: questionId,
        answer: answer
      });
      alert('Antwoord ingediend! +5 punten verdiend 🎉');
      // Remove answered question from display
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      if (error.response?.status === 400) {
        alert('Je hebt deze vraag al beantwoord!');
      } else {
        alert('Er ging iets mis bij het indienen van je antwoord');
      }
    }
  };

  if (loading) {
    return <div className="text-center">Vragen laden...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-6xl mb-4">❓</div>
        <p className="text-gray-500 text-lg">Geen vragen beschikbaar voor vandaag</p>
        <p className="text-gray-400 text-sm mt-2">Kom morgen terug voor nieuwe vragen!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        ❓ Dagelijkse Vragen
        <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
          +5 punten per vraag
        </span>
      </h2>
      
      {questions.map((question) => (
        <div key={question.id} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => submitAnswer(question.id, option)}
                className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition duration-200"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
