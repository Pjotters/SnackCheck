import React, { useState } from 'react';
import axios from 'axios';
import { API } from './config';
import { setAuthHeader } from './authUtils'; // Adjusted import

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

export default LoginForm;
