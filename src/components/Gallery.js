import React, { useState, useEffect } from 'react';
import { Camera, Search, Filter, X, Clock, Calendar, Coffee, BarChart2, Loader } from 'react-feather'; // Changed Utensils to Coffee
import axios from 'axios';
import { API } from '../config';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { nl } from 'date-fns/locale';

const MEAL_TYPES = {
  breakfast: 'Ontbijt',
  lunch: 'Lunch',
  dinner: 'Avondeten',
  snack: 'Tussendoortje'
};

const DATE_OPTIONS = [
  { value: 'all', label: 'Alle datums' },
  { value: 'today', label: 'Vandaag' },
  { value: 'yesterday', label: 'Gisteren' },
  { value: 'this_week', label: 'Deze week' },
  { value: 'this_month', label: 'Deze maand' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nieuwste eerst' },
  { value: 'oldest', label: 'Oudste eerst' }
];

const Gallery = () => {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    date: 'all',
    mealType: 'all',
    sortBy: 'newest'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Je moet ingelogd zijn om je voedseldagboek te bekijken');
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`${API}/api/food-entries`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Sorteer op datum (nieuwste eerst)
        const sortedEntries = response.data.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        setEntries(sortedEntries);
      } catch (err) {
        console.error('Fout bij ophalen voedselinvoer:', err);
        setError('Er is een fout opgetreden bij het ophalen van je voedselinvoer');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const filterByDate = (entry) => {
    const entryDate = new Date(entry.timestamp);
    switch (filters.date) {
      case 'today':
        return isToday(entryDate);
      case 'yesterday':
        return isYesterday(entryDate);
      case 'this_week':
        return isThisWeek(entryDate, { weekStartsOn: 1 });
      case 'this_month':
        return isThisMonth(entryDate);
      default:
        return true;
    }
  };
  
  const filterByMealType = (entry) => {
    return filters.mealType === 'all' || entry.meal_type === filters.mealType;
  };
  
  const searchFilter = (entry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.food_name.toLowerCase().includes(term) ||
      (entry.ai_analysis?.description?.toLowerCase().includes(term) || '')
    );
  };
  
  const sortEntries = (a, b) => {
    if (filters.sortBy === 'newest') {
      return new Date(b.timestamp) - new Date(a.timestamp);
    } else {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
  };
  
  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Vandaag';
    if (isYesterday(date)) return 'Gisteren';
    if (isThisWeek(date, { weekStartsOn: 1 })) 
      return format(date, 'EEEE', { locale: nl });
    return format(date, 'd MMMM yyyy', { locale: nl });
  };
  
  const groupEntriesByDate = (entries) => {
    return entries.reduce((groups, entry) => {
      const date = entry.timestamp.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});
  };
  
  const filteredEntries = entries
    .filter(filterByDate)
    .filter(filterByMealType)
    .filter(searchFilter)
    .sort(sortEntries);
    
  const groupedEntries = groupEntriesByDate(filteredEntries);

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Loader className="animate-spin h-12 w-12 text-blue-500 mb-4" />
        <p>Bezig met laden van je voedseldagboek...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('ingelogd') && (
              <a 
                href="/login" 
                className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Inloggen
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Mijn Voedselfoto's</h1>
      
      <div className="flex justify-between mb-8">
        <div className="flex items-center">
          <Search className="h-5 w-5 text-gray-500" />
          <input 
            type="search" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Zoek in je voedseldagboek" 
            className="ml-2 py-2 pl-10 text-sm text-gray-700"
          />
        </div>
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-gray-500" />
          <select 
            value={filters.mealType} 
            onChange={(e) => setFilters({ ...filters, mealType: e.target.value })} 
            className="ml-2 py-2 pl-10 text-sm text-gray-700"
          >
            <option value="all">Alle maaltijden</option>
            <option value="breakfast">Ontbijt</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Diner</option>
            <option value="snack">Tussendoor</option>
          </select>
          <select 
            value={filters.date} 
            onChange={(e) => setFilters({ ...filters, date: e.target.value })} 
            className="ml-2 py-2 pl-10 text-sm text-gray-700"
          >
            <option value="all">Alle dagen</option>
            <option value="today">Vandaag</option>
            <option value="yesterday">Gisteren</option>
            <option value="this_week">Deze week</option>
            <option value="this_month">Deze maand</option>
          </select>
          <select 
            value={filters.sortBy} 
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} 
            className="ml-2 py-2 pl-10 text-sm text-gray-700"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen voedselinvoer gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filters.date !== 'all' || filters.mealType !== 'all' 
              ? 'Probeer je zoekopdracht of filters aan te passen.'
              : 'Voeg je eerste voedselinvoer toe via het formulier.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries).map(([date, dateEntries]) => (
            <div key={date} className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                {getDateLabel(date)}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{entry.food_name}</h3>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <Coffee className="h-4 w-4 mr-1 text-blue-500" />
                            {MEAL_TYPES[entry.meal_type] || entry.meal_type}
                            <span className="mx-2">•</span>
                            <Clock className="h-4 w-4 mr-1 text-blue-500" />
                            {format(new Date(entry.timestamp), 'HH:mm')}
                          </p>
                        </div>
                        {entry.points_earned > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            +{entry.points_earned} punten
                          </span>
                        )}
                      </div>
                      
                      {entry.ai_analysis && (
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Calorieën</span>
                            <span className="font-medium">{entry.ai_analysis.calories || '?'} kcal</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Eiwitten</span>
                            <span className="font-medium">{entry.ai_analysis.protein || '?'}g</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Koolhydraten</span>
                            <span className="font-medium">{entry.ai_analysis.carbs || '?'}g</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Vetten</span>
                            <span className="font-medium">{entry.ai_analysis.fat || '?'}g</span>
                          </div>
                        </div>
                      )}
                      
                      {entry.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    {entry.image_url && (
                      <div className="bg-gray-100 h-48 overflow-hidden">
                        <img
                          src={entry.image_url.startsWith('http') ? entry.image_url : `${API}${entry.image_url}`}
                          alt={entry.food_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 bg-white rounded-full p-1"
            >
              <X size={24} />
            </button>
            
            {selectedEntry.image_url && (
              <div className="h-64 bg-gray-100 overflow-hidden">
                <img
                  src={selectedEntry.image_url.startsWith('http') ? selectedEntry.image_url : `${API}${selectedEntry.image_url}`}
                  alt={selectedEntry.food_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEntry.food_name}</h2>
                  <p className="text-gray-500 flex items-center mt-1">
                    <Coffee className="h-4 w-4 mr-1 text-blue-500" />
                    {MEAL_TYPES[selectedEntry.meal_type] || selectedEntry.meal_type}
                    <span className="mx-2">•</span>
                    <Clock className="h-4 w-4 mr-1 text-blue-500" />
                    {format(new Date(selectedEntry.timestamp), 'd MMMM yyyy HH:mm', { locale: nl })}
                  </p>
                </div>
                
                {selectedEntry.points_earned > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    +{selectedEntry.points_earned} punten verdiend
                  </span>
                )}
              </div>
              
              {selectedEntry.ai_analysis && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Voedingsinformatie</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Calorieën</span>
                        <span className="font-medium">{selectedEntry.ai_analysis.calories || '?'} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Portiegrootte</span>
                        <span className="font-medium">{selectedEntry.quantity || '?'}g</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eiwitten</span>
                        <span className="font-medium">{selectedEntry.ai_analysis.protein || '?'}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Koolhydraten</span>
                        <span className="font-medium">{selectedEntry.ai_analysis.carbs || '?'}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vetten</span>
                        <span className="font-medium">{selectedEntry.ai_analysis.fat || '?'}g</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedEntry.ai_analysis.suggestions && selectedEntry.ai_analysis.suggestions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Suggesties</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedEntry.ai_analysis.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-gray-600">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {selectedEntry.notes && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notities</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600">{selectedEntry.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
