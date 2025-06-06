import React, { useState } from 'react';
import AdminUserManagement from './AdminUserManagement';
import AnalyticsDashboard from './AnalyticsDashboard';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', name: 'Gebruikersbeheer', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    // Add more admin tabs if needed
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p>Welkom, {user?.username || 'Admin'}!</p>
      </div>

      <div className="bg-white rounded-xl shadow-md">
        <div className="flex flex-wrap border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 text-center font-medium transition duration-200 ${
                activeTab === tab.id
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
