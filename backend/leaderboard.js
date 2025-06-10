// --- LEADERBOARD ---
apiRouter.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const [users, foodEntries] = await Promise.all([
            readData(USERS_FILE_PATH),
            readData(FOOD_ENTRIES_FILE_PATH)
        ]);

        // Verrijk gebruikersdata met extra statistieken
        const enrichedUsers = users.map(user => {
            const userEntries = foodEntries.filter(entry => entry.user_id === user.id);
            const healthyEntries = userEntries.filter(entry => 
                entry.ai_analysis_result?.ai_score >= 7
            ).length;
            
            return {
                ...user,
                total_entries: userEntries.length,
                healthy_entries: healthyEntries,
                healthy_percentage: userEntries.length > 0 
                    ? Math.round((healthyEntries / userEntries.length) * 100) 
                    : 0,
                last_entry: userEntries.length > 0 
                    ? userEntries[userEntries.length - 1].timestamp 
                    : null,
                points: user.points || 0,
                level: user.level || 1,
                badges: user.badges || [],
                streak_days: user.streak_days || 0
            };
        });
        
        // Sorteer gebruikers op basis van punten (hoog naar laag)
        const sortedUsers = [...enrichedUsers].sort((a, b) => b.points - a.points);
        
        // Voeg een positie (rank) toe aan elke gebruiker
        const leaderboard = sortedUsers.map((user, index) => ({
            rank: index + 1,
            id: user.id,
            username: user.username,
            points: user.points,
            level: user.level,
            badges: user.badges,
            streak_days: user.streak_days,
            stats: {
                total_entries: user.total_entries,
                healthy_entries: user.healthy_entries,
                healthy_percentage: user.healthy_percentage,
                last_entry: user.last_entry
            }
        }));
        
        // Filter op klasgenoten als de gebruiker geen admin is
        const filteredLeaderboard = req.user.role === 'admin'
            ? leaderboard
            : leaderboard.filter(user => {
                const userData = users.find(u => u.id === user.id);
                return userData && userData.class_code === req.user.class_code;
            });
        
        res.json({
            leaderboard: filteredLeaderboard,
            last_updated: new Date().toISOString(),
            total_users: filteredLeaderboard.length
        });
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ 
            detail: 'Er is een fout opgetreden bij het ophalen van de ranglijst',
            error: error.message 
        });
    }
});
