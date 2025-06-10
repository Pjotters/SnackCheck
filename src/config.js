import axios from 'axios';

export const BACKEND_URL = 'http://localhost:3001';
export const API = `${BACKEND_URL}/api`;

// Functie om auth headers op te halen
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json'
  };
};

// API endpoints
export const API_ENDPOINTS = {
  // Authenticatie
  LOGIN: `${API}/auth/login`,
  
  // Gebruikersbeheer
  USERS: `${API}/users`,
  
  // Voedselinvoer
  FOOD_ENTRIES: `${API}/food-entries`,
  
  // Quiz
  QUIZ_QUESTIONS: `${API}/quiz/questions`,
  QUIZ_SUBMIT: `${API}/quiz/submit`,
  
  // Chat
  CHAT_CONVERSATIONS: `${API}/chat/conversations`,
  CHAT_MESSAGES: `${API}/chat/messages`,
  
  // FAQ
  FAQ: `${API}/faq`,
  
  // Admin
  ADMIN_USERS: `${API}/admin/users`,
  
  // Quiz
  QUIZ_QUESTIONS: `${API}/quiz/questions`,
  QUIZ_SUBMIT: `${API}/quiz/submit`,
};

export const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Hulp functie voor API calls
export const apiRequest = async (method, endpoint, data = null) => {
  try {
    const response = await axios({
      method,
      url: endpoint,
      data,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};
