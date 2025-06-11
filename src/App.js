import React, { useState, useEffect } from 'react';
import { 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  Navigate,
  useNavigate 
} from 'react-router-dom';
import { 
  Home, 
  Camera, 
  BarChart2, 
  Image, 
  LogIn, 
  LogOut, 
  User, 
  CheckCircle, 
  Award, 
  HelpCircle, 
  MessageSquare,
  Menu,
  X,
  BookOpen,
  PlusCircle
} from 'react-feather';
import axios from 'axios';
import { API, API_ENDPOINTS } from './config';
import { login, logout, getCurrentUser, isAuthenticated, isAdmin } from './authUtils';
import LoginPage from './pages/LoginPage';
import Gallery from './components/Gallery';
import CalorieChecker from './components/CalorieChecker';
import FoodEntryForm from './components/FoodEntryForm';
import HelpPage from './pages/HelpPage';
import QuizPage from './pages/QuizPage';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

// Hoofd navigatie component
const Navigation = ({ user, onLogout }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', icon: PlusCircle, label: 'Voedsel Loggen' },
    { path: '/food-diary', icon: BookOpen, label: 'Voedsel Dagboek' },
    { path: '/calorie-checker', icon: Camera, label: 'Calorie-Checker' },
    { path: '/stats', icon: BarChart2, label: 'Statistieken' },
    { path: '/quiz', icon: CheckCircle, label: 'Quiz' },
    { path: '/help', icon: HelpCircle, label: 'Hulp & Contact' },
  ];

  const adminNavItems = [
    { path: '/admin', icon: User, label: 'Admin Dashboard' },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">SnackCheck</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.path)
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              {user?.isAdmin && adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-red-600 hover:border-red-300 hover:text-red-700"
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mr-4">
                  <Award className="h-4 w-4 mr-1" />
                  {user.points || 0} punten
                </span>
                <div className="relative">
                  <button
                    onClick={() => onLogout()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <LogOut className="-ml-1 mr-2 h-4 w-4" />
                    Uitloggen
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogIn className="-ml-1 mr-2 h-4 w-4" />
                Inloggen
              </Link>
            )}
          </div>

          {/* Mobiele menu knop */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Hoofdmenu openen</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobiel menu */}
      <div className={`sm:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={`mobile-${item.path}`}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive(item.path)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center">
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
          {user?.isAdmin && adminNavItems.map((item) => (
            <Link
              key={`mobile-${item.path}`}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              <div className="flex items-center">
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
          
          {user && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {user.username || 'Gebruiker'}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {user.points || 0} punten
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Uitloggen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Beveiligde route component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const user = getCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated()) {
    // Redirect naar inlogpagina met terugkeer URL
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location.pathname,
          error: 'Je moet ingelogd zijn om deze pagina te bekijken.'
        }} 
        replace 
      />
    );
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Toegang geweigerd</h2>
          <p className="text-gray-600 mb-4">Je hebt geen beheerdersrechten om deze pagina te bekijken.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Terug naar startpagina
          </button>
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  // Controleer of gebruiker is ingelogd bij het opstarten
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Stel auth header in voor toekomstige requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      setAuthError('');
      
      const user = await login(email, password);
      if (user) {
        setUser(user);
        navigate('/');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Inloggen mislukt:', error);
      setAuthError(error.response?.data?.message || 'Inloggen mislukt. Probeer het opnieuw.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  // Als er geen gebruiker is ingelogd, toon de inlogpagina
  if (!user && !['/login', '/register'].includes(window.location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && <Navigation user={user} onLogout={handleLogout} />}
        
        <main className="container mx-auto px-4 py-8">
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}
          
          <Routes>
            <Route 
              path="/login" 
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginPage 
                    onLogin={handleLogin} 
                    loading={loading} 
                    error={authError} 
                  />
                )
              } 
            />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <FoodEntryForm user={user} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/food-diary" 
              element={
                <ProtectedRoute>
                  <Gallery user={user} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/calorie-checker" 
              element={
                <ProtectedRoute>
                  <CalorieChecker />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/quiz" 
              element={
                <ProtectedRoute>
                  <QuizPage user={user} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/help" 
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard user={user} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="*" 
              element={
                <div className="text-center py-10">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-gray-600">Pagina niet gevonden</p>
                </div>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
