import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from './config';

const Auth = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('KlasA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Generate a random school name for demo purposes
  useEffect(() => {
    const schools = [
      'Montessori College',
      'Vrijeschool',
      'Johan de Witt Scholengroep',
      'Lorentz Casimir Lyceum',
      'Alkwin College'
    ];
    setSchoolName(schools[Math.floor(Math.random() * schools.length)]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !classCode) {
      setError('Vul alle velden in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/login`, { 
        username, 
        password,
        class_code: classCode
      });
      
      if (response.data && response.data.token) {
        onLogin(response.data);
      } else {
        console.error('Login response did not include a token:', response.data);
        setError('Inloggen mislukt. Probeer het opnieuw.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Inloggen mislukt';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-1">SnackCheck</h1>
          <p className="text-blue-100 text-lg">Welkom bij {schoolName}</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Inloggen</h2>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
              <p className="font-medium">Let op</p>
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Gebruikersnaam
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                  placeholder="Vul je gebruikersnaam in"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Wachtwoord
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                  placeholder="Vul je wachtwoord in"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-1">
                Klas
              </label>
              <select
                id="classCode"
                name="classCode"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                disabled={loading}
              >
                <option value="KlasA">Klas A</option>
                <option value="KlasB">Klas B</option>
                <option value="KlasC">Klas C</option>
              </select>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bezig met inloggen...
                  </>
                ) : (
                  'Inloggen'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Heb je nog geen account?{' '}
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                onClick={() => alert('Neem contact op met je docent voor een account.')}
              >
                Vraag een account aan
              </button>
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              © {new Date().getFullYear()} SnackCheck - Alle rechten voorbehouden
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
