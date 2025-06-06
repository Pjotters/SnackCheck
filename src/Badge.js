import React from 'react';

const Badge = ({ name, earned = false }) => {
  const badges = {
    healthy_start: { name: "Gezonde Start", icon: "🌱", color: "bg-green-500" },
    week_warrior: { name: "Week Warrior", icon: "🔥", color: "bg-orange-500" },
    point_master: { name: "Punten Master", icon: "⭐", color: "bg-yellow-500" },
    ai_expert: { name: "AI Expert", icon: "🤖", color: "bg-blue-500" }
  };

  const badge = badges[name] || { name: name, icon: "🏆", color: "bg-gray-500" };

  return (
    <div className={`${earned ? badge.color : 'bg-gray-300'} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1`}>
      <span>{badge.icon}</span>
      <span>{badge.name}</span>
    </div>
  );
};

export default Badge;
