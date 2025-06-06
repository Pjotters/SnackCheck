import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from './config';
import FoodEntryForm from './FoodEntryForm';
import FoodEntriesList from './FoodEntriesList';
import CalorieChecker from './CalorieChecker';
import FoodComparison from './FoodComparison';
import Gallery from './Gallery';
import UserStats from './UserStats';
import DailyQuestions from './DailyQuestions';
import ChatHelp from './ChatHelp';

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
      if (Array.isArray(response.data)) {
        setEntries(response.data);
      } else {
        console.error('Error: /food-entries did not return an array:', response.data);
        setEntries([]); // Default to empty array to prevent .map errors
      }
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

export default StudentDashboard;
