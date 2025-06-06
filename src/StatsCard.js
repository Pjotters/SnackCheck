import React from 'react';

const StatsCard = ({ title, value, icon, color = "bg-blue-500" }) => (
  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-lg text-white text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatsCard;
