import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle } from 'react-feather';

const CalorieChecker = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  const searchFood = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // In een echte app zou je hier de API aanroepen
      // Voor nu gebruiken we een mock response
      const mockResponse = {
        query: searchQuery,
        results: [
          {
            food_name: searchQuery,
            serving_qty: 1,
            serving_unit: 'portie',
            calories: Math.floor(Math.random() * 200) + 50,
            protein: (Math.random() * 10).toFixed(1),
            carbs: (Math.random() * 20).toFixed(1),
            fat: (Math.random() * 10).toFixed(1),
            fiber: (Math.random() * 5).toFixed(1),
            sugar: (Math.random() * 15).toFixed(1),
            nutriscore: ['a', 'b', 'c', 'd', 'e'][Math.floor(Math.random() * 5)],
            is_healthy: Math.random() > 0.3,
          },
        ],
      };
      
      // Simuleer netwerklatentie
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setResults(mockResponse);
      
      // Voeg toe aan recente zoekopdrachten
      setRecentSearches(prev => {
        const newSearches = [searchQuery, ...prev.filter(item => item !== searchQuery)].slice(0, 5);
        return newSearches;
      });
      
    } catch (err) {
      setError('Er is een fout opgetreden bij het zoeken');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchFood(query);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Caloriechecker</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Voer een voedingsmiddel in..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`px-6 py-3 rounded-lg font-medium text-white ${isLoading || !query.trim() ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
          >
            {isLoading ? 'Zoeken...' : 'Zoek'}
          </button>
        </div>
      </form>

      {recentSearches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 mb-2">Recente zoekopdrachten:</h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(search);
                  searchFood(search);
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {results && !isLoading && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Resultaten voor "{results.query}"</h2>
          
          {results.results.map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{item.food_name}</h3>
                    <p className="text-gray-500">{item.serving_qty} {item.serving_unit}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">{item.calories}</span>
                    <span className="ml-1 text-gray-500">kcal</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-blue-800 font-medium">Eiwit</div>
                    <div className="text-gray-700">{item.protein}g</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-green-800 font-medium">Koolhydraten</div>
                    <div className="text-gray-700">{item.carbs}g</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-yellow-800 font-medium">Vetten</div>
                    <div className="text-gray-700">{item.fat}g</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-purple-800 font-medium">Vezels</div>
                    <div className="text-gray-700">{item.fiber}g</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                        item.is_healthy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {item.is_healthy ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </div>
                      <span className="font-medium">
                        {item.is_healthy ? 'Gezonde keuze' : 'Minder gezond'}
                      </span>
                    </div>
                    {!item.is_healthy && (
                      <p className="mt-2 text-sm text-gray-600">
                        Bevat veel {item.sugar}g suiker per portie. Overweeg een gezonder alternatief.
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      Nutri-Score: <span className="ml-1 font-bold">{item.nutriscore.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => {
                    // Hier zou je de logica kunnen toevoegen om dit item toe te voegen aan het voedingsdagboek
                    alert(`${item.food_name} is toegevoegd aan je voedingsdagboek!`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voeg toe aan dagboek
                </button>
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium">Let op:</p>
            <p className="mt-1">Deze informatie is geschat en kan variëren. Voor de meest nauwkeurige informatie raden we aan om de verpakking te raadplegen.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalorieChecker;
