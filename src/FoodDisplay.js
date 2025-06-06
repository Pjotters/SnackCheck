import React from 'react';
import Badge from './Badge'; // Assuming Badge.js is in the same src/ directory

// Food Display Component (used within FoodEntryForm)
const FoodDisplay = ({ food }) => {
  if (!food) return null;

  const renderNutrient = (label, value, unit = 'g', progressValue, progressMax, progressBarColor = 'bg-green-500') => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}{unit}</span>
      </div>
      {progressValue !== undefined && progressMax !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`${progressBarColor} h-2.5 rounded-full`}
            style={{ width: `${(progressValue / progressMax) * 100}%` }}
          ></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Analyse van: <span className="text-green-600">{food.food_name || 'Jouw Snack'}</span></h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {renderNutrient("Calorieën (per 100g)", food.calories_per_100g, ' kcal', food.calories_per_100g, 500, 'bg-red-500')}
        {renderNutrient("Eiwitten (per 100g)", food.protein_per_100g, 'g', food.protein_per_100g, 30, 'bg-blue-500')}
        {renderNutrient("Vetten (per 100g)", food.fat_per_100g, 'g', food.fat_per_100g, 30, 'bg-yellow-500')}
        {renderNutrient("Koolhydraten (per 100g)", food.carbs_per_100g, 'g', food.carbs_per_100g, 50, 'bg-purple-500')}
      </div>

      {food.estimated_calories !== undefined && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Geschatte calorieën voor jouw portie ({food.quantity_input || 'onbekend'}g): 
            <span className="font-bold text-lg text-red-600"> {food.estimated_calories.toFixed(1)} kcal</span>
          </p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
        <p className="text-gray-800 bg-green-50 p-3 rounded-md">{food.feedback || "Geen specifieke feedback."}</p>
      </div>

      {food.points_awarded !== undefined && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700">Punten verdiend:</p>
          <p className="text-2xl font-bold text-green-600">+{food.points_awarded}</p>
        </div>
      )}

      {food.badges_awarded && food.badges_awarded.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Nieuwe Badges:</p>
          <div className="flex flex-wrap gap-2">
            {food.badges_awarded.map(badgeName => (
              <Badge key={badgeName} name={badgeName} earned={true} />
            ))}
          </div>
        </div>
      )}
      {food.source && (
        <p className="text-xs text-gray-500 mt-4 text-right">Bron: {food.source}</p>
      )}
    </div>
  );
};

export default FoodDisplay;
