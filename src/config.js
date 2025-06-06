export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
import axios from 'axios';

export const API = `${BACKEND_URL}/api`;

export const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};
