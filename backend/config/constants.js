// Punten en beloningen
export const POINTS_BASE = 10; // Basis punten voor voedselinvoer
export const POINTS_HEALTHY = 20; // Punten voor gezond voedsel
export const POINTS_UNHEALTHY = 5; // Punten voor ongezond voedsel
export const POINTS_NEUTRAL = 10; // Punten voor neutraal voedsel
export const POINTS_DAILY_STREAK = 5; // Extra punten per week streak
export const POINTS_PER_CORRECT_QUESTION = 5; // Punten voor elk goed antwoord in een quiz
export const GALLERY_MIN_AI_SCORE = 7; // Min score voor een item om in aanmerking te komen voor de galerij

// Badge definities
export const BADGES = {
    gezonde_keuze: { name: 'Gezonde Keuze', description: 'Eerste gezonde maaltijd gelogd' },
    gezondheidsfreak: { name: 'Gezondheidsfreak', description: '5 gezonde maaltijden gelogd' },
    variatie: { name: 'Variatie', description: '5 verschillende soorten voedsel gelogd' },
    week_streak: { name: 'Week Streak', description: '7 dagen achter elkaar een maaltijd gelogd' },
    level_5: { name: 'Level 5', description: 'Level 5 bereikt' },
    level_10: { name: 'Level 10', description: 'Level 10 bereikt' },
    quiz_kampioen: { name: 'Quiz Kampioen', description: '10 quizvragen goed beantwoord' },
    fotograaf: { name: 'Fotograaf', description: '5 foto\'s geüpload' },
    voedingsdeskundige: { name: 'Voedingsdeskundige', description: '20 voedselitems gelogd' }
};

// Andere constanten
export const DEFAULT_DAILY_GOAL = 5; // Standaard dagelijkse doel voor voedselinvoer
export const LEVEL_UP_POINTS = 100; // Aantal punten nodig om een level omhoog te gaan
