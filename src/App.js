import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { API, setAuthHeader } from './config';
import Auth from './Auth';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import FoodEntriesList from './FoodEntriesList';
import StatsCard from './StatsCard';
import Badge from './Badge';
import FoodEntryForm from './FoodEntryForm';
import UserStats from './UserStats';
import DailyQuestions from './DailyQuestions';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthHeader(token);
      axios.get(`${API}/auth/profile`)
        .then(response => {
          setUser(response.data);
        })
        .catch(error => {
          console.error('Error fetching profile:', error);
          localStorage.removeItem('token');
          setAuthHeader(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.token) {
      localStorage.setItem('token', loggedInUser.token);
      setAuthHeader(loggedInUser.token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    setAuthHeader(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-100">
      {user && (
        <nav className="bg-blue-600 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <span className="text-xl font-bold">SnackCheck</span>
            <div>
              <span className="mr-4">Welkom, {user.username}! ({user.role})</span>
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      <div className="container mx-auto p-4">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : user.role === 'admin' ? (
          <AdminDashboard user={user} />
        ) : (
          <StudentDashboard user={user} />
        )}
      </div>
    </div>
  );
}

export default App;

