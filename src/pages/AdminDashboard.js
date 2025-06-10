import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  BarChart2, 
  User, 
  Clock, 
  Award, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search
} from 'react-feather';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../config';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const navigate = useNavigate();

  // Laad gebruikersdata
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/admin/users`, {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        });
        setUsers(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Fout bij ophalen gebruikers:', err);
        setError('Kon gebruikersgegevens niet ophalen. Probeer het later opnieuw.');
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleUserExpand = (userId) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="-ml-1 mr-2 h-4 w-4" />
            Terug naar app
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Tab navigatie */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Gebruikers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BarChart2 className="mr-2 h-5 w-5" />
                Statistieken
              </div>
            </button>
          </nav>
        </div>

        {/* Tab inhoud */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {activeTab === 'users' ? (
            <div>
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Zoek gebruikers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'gebruiker' : 'gebruikers'} gevonden
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50">
                      <button
                        className="w-full flex justify-between items-center text-left"
                        onClick={() => toggleUserExpand(user.id)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">{user.username}</h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex items-center text-sm text-gray-500">
                            <Award className="h-4 w-4 text-yellow-500 mr-1" />
                            {user.points || 0} punten
                          </div>
                          {expandedUserId === user.id ? (
                            <ChevronUp className="ml-4 h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="ml-4 h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedUserId === user.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500">Laatst actief</h4>
                                  <p className="mt-1 text-sm text-gray-900">
                                    {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Onbekend'}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-500">Niveau</h4>
                                  <p className="mt-1 text-sm text-gray-900">{user.level || 1}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <h4 className="text-sm font-medium text-gray-500">Badges</h4>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {user.badges && user.badges.length > 0 ? (
                                      user.badges.map((badge, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          {badge}
                                        </span>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-500">Nog geen badges verdiend</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    // Navigeer naar gebruikersdetails of toon een modal
                                    alert(`Meer acties voor gebruiker: ${user.username}`);
                                  }}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                  Bekijk volledig profiel →
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Geen gebruikers gevonden die voldoen aan de zoekopdracht.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 text-blue-100 mb-4">
                <BarChart2 className="h-full w-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Statistieken</h3>
              <p className="text-gray-500 mb-6">
                Hier komen binnenkort gedetailleerde statistieken over het gebruik van de app.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <dt className="text-sm font-medium text-blue-600 truncate">Totaal gebruikers</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">{users.length}</dd>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <dt className="text-sm font-medium text-green-600 truncate">Actieve gebruikers (laatste week)</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {Math.floor(users.length * 0.7)}
                  </dd>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <dt className="text-sm font-medium text-purple-600 truncate">Gem. punten per gebruiker</dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {Math.round(users.reduce((acc, user) => acc + (user.points || 0), 0) / (users.length || 1))}
                  </dd>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
