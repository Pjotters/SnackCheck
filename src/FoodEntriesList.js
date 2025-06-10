import React from 'react';

const FoodEntriesList = ({ entries }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-gray-500">Nog geen voedselinvoeren.</p>
        <p className="text-sm text-gray-400">Voeg je eerste maaltijd toe om hier je voortgang te zien!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Mijn Voedselinvoeren</h2>
      <div className="space-y-6">
        {entries.map((entry) => (
          <div
            key={entry.id || entry.timestamp}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border border-gray-200"
          >
            <div className="md:flex justify-between items-start mb-3">
              <div>
                <h3 className="text-2xl font-semibold text-indigo-700 mb-1">{entry.food_name || 'Onbekend voedsel'}</h3>
                <p className="text-md text-gray-600">
                  Hoeveelheid: <span className="font-medium">{entry.quantity || 'N/A'}</span>
                </p>
              </div>
              <span className="text-sm text-gray-500 mt-2 md:mt-0 block md:inline-block bg-gray-100 px-2 py-1 rounded">
                {new Date(entry.timestamp).toLocaleDateString('nl-NL', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-md text-gray-700">
                  Geschatte calorieën:
                  <span className={`font-bold ml-1 ${entry.ai_analysis_result?.calories_estimated > 500 ? 'text-red-500' : 'text-green-600'}`}>
                    {entry.ai_analysis_result?.calories_estimated != null ? `${entry.ai_analysis_result.calories_estimated} kcal` : 'N/A'}
                  </span>
                </p>
              </div>
              {entry.ai_analysis_result?.ai_score != null && (
                <div>
                  <p className={`text-md font-semibold ${entry.ai_analysis_result.ai_score >= 7 ? 'text-green-700' : entry.ai_analysis_result.ai_score >= 4 ? 'text-yellow-600' : 'text-red-700'}`}>
                    AI Score: {entry.ai_analysis_result.ai_score}/10
                  </p>
                </div>
              )}
            </div>

            {entry.ai_analysis_result?.ai_feedback && (
              <div className="bg-gray-50 p-3 rounded-md mt-3">
                <p className="text-sm italic text-gray-700">
                  <span className="font-semibold not-italic">AI Feedback:</span> {entry.ai_analysis_result.ai_feedback}
                </p>
              </div>
            )}
             {entry.ai_analysis_result?.ai_suggestions && (
              <div className="bg-indigo-50 p-3 rounded-md mt-3">
                <p className="text-sm text-indigo-700">
                  <span className="font-semibold">Suggesties:</span> {entry.ai_analysis_result.ai_suggestions}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoodEntriesList;
