import React, { useState } from 'react';
import axios from 'axios';
import { API } from './config'; // Assuming API base URL is here

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // For registration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || (!isLogin && !email)) {
      setError('Vul alle vereiste velden in.');
      return;
    }

    setLoading(true);
    setError('');

    const url = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
    const payload = isLogin ? { username, password } : { username, email, password };

    try {
      const response = await axios.post(url, payload);
      // App.js expects onLogin to receive the user object which includes the token
      // e.g., response.data = { user: { username: '...', role: '...' }, token: '...' }
      // OR response.data = { username: '...', role: '...', token: '...' }
      // For now, let's assume the backend sends the user object directly with a token property
      if (response.data && response.data.token) {
        onLogin(response.data); // Pass the whole user object (which includes the token)
      } else {
        // If backend structure is different, adjust here or in App.js handleLogin
        console.error('Login/Register response did not include a token:', response.data);
        setError('Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Inloggen/registreren mislukt. Controleer je gegevens of probeer het later opnieuw.');
      }
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Login op je account' : 'Maak een nieuw account'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username-auth" className="sr-only">Gebruikersnaam</label>
              <input
                id="username-auth"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Gebruikersnaam"
                disabled={loading}
              />
            </div>
            {!isLogin && (
              <div>
                <label htmlFor="email-address" className="sr-only">E-mailadres</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="E-mailadres"
                  disabled={loading}
                />
              </div>
            )}
            <div>
              <label htmlFor="password-auth" className="sr-only">Wachtwoord</label>
              <input
                id="password-auth"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-b-md' : ''} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Wachtwoord"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Fout: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (isLogin ? 'Login' : 'Registreren')}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              // Clear fields when switching mode for better UX
              setUsername('');
              setPassword('');
              setEmail('');
            }}
            disabled={loading}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {isLogin ? 'Nog geen account? Registreer hier.' : 'Al een account? Login hier.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
