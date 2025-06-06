import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from './config';
import StatsCard from './StatsCard';
import Badge from './Badge';

// Enhanced User Stats with new metrics
const UserStats = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLeaderboard();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/analytics/user-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard`);
      if (Array.isArray(response.data)) {
        setLeaderboard(response.data);
      } else {
        console.error('Error: /leaderboard did not return an array:', response.data);
        setLeaderboard([]); // Default to empty array
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Totaal Punten"
          value={stats?.total_points || 0}
          icon="🏆"
          color="bg-yellow-500"
        />
        <StatsCard 
          title="Level"
          value={stats?.level || 1}
          icon="⚡"
          color="bg-purple-500"
        />
        <StatsCard 
          title="Gemiddelde Score"
          value={stats?.avg_score?.toFixed(1) || "0.0"}
          icon="📊"
          color="bg-blue-500"
        />
        <StatsCard 
          title="Streak Dagen"
          value={stats?.streak_days || 0}
          icon="🔥"
          color="bg-orange-500"
        />
      </div>

      {/* New Calorie Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard 
          title="Totaal Calorieën"
          value={stats?.total_calories || 0}
          icon="🔥"
          color="bg-red-500"
        />
        <StatsCard 
          title="Gem. per Dag"
          value={`${stats?.avg_calories_per_day || 0} kcal`}
          icon="📈"
          color="bg-green-500"
        />
      </div>

      {/* Badges */}
      {stats?.badges && stats.badges.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Je Badges</h3>
          <div className="flex flex-wrap gap-3">
            {stats.badges.map((badge, idx) => (
              <Badge key={idx} name={badge} earned={true} />
            ))}
          </div>
        </div>
      )}

      {/* Class Leaderboard */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🥇 Klas Ranglijst</h3>
        <div className="space-y-3">
          {leaderboard.slice(0, 10).map((student, idx) => (
            <div key={student._id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {idx + 1}
                </div>
                <span className="font-medium text-gray-800">{student.username}</span>
                {user && student.username === user.username && ( // Added user check
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Jij</span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Level {student.level}</span>
                <span className="font-bold text-yellow-600">{student.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserStats;
