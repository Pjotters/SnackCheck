import axios from 'axios';

// Functie om auth header in te stellen
export const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Functie om gebruiker in te loggen
export const login = async (email, password) => {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email,
      password
    });
    
    if (response.data.token) {
      setAuthHeader(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Inloggen mislukt:', error);
    throw error;
  }
};

// Functie om gebruiker uit te loggen
export const logout = () => {
  setAuthHeader(null);
  localStorage.removeItem('user');
};

// Functie om huidige gebruiker op te halen
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Functie om te controleren of gebruiker is ingelogd
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Functie om auth headers op te halen
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json'
  };
};

// Functie om te controleren of gebruiker admin is
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.isAdmin === true;
};
