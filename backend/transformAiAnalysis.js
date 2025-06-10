import { readData, writeData } from './utils/fileUtils.js';
import { fetchNutritionFromOpenFoodFacts } from './services/nutritionService.js';
import { localFoodDatabase } from './data/localFoodDatabase.js';
import { BADGES, POINTS_BASE, POINTS_HEALTHY, POINTS_UNHEALTHY, POINTS_NEUTRAL } from './config/constants.js';

async function transformAiAnalysis(rawAnalysisResult, foodName, quantity = 100, userId) {
    try {
        // Laad benodigde gegevens
        let foodEntries = [];
        try {
            foodEntries = await readData('data/food_entries.json');
        } catch (error) {
            console.error('Kon food_entries.json niet laden:', error);
        }
        
        let detectedFoodByAI = foodName; // Standaard naar gebruikersinvoer
        let confidence = 0;
        let nutritionData = null;
        let newBadges = [];
        
        // Als we een AI-analyse hebben, gebruik die dan
        if (rawAnalysisResult && Array.isArray(rawAnalysisResult) && rawAnalysisResult.length > 0) {
            detectedFoodByAI = rawAnalysisResult[0].label.split(',')[0].trim();
            confidence = rawAnalysisResult[0].score;
        }
        
        // Standaardwaarden voor het geval we geen gedetailleerde voedingsinformatie hebben
        let pointsEarned = POINTS_BASE;
        let aiScore = 5; // Neutrale score
        let caloriesEstimated = 100; // Standaard schatting
        let feedback = `Je hebt ${detectedFoodByAI} gelogd.`;
        let suggestions = [];
        let nutritionInfo = {
            detected_food: detectedFoodByAI,
            ai_confidence: confidence,
            source: 'fallback',
            calories: 150,
            protein: 2,
            fat: 5,
            carbs: 25,
            fiber: 1,
            sugars: 5,
            salt: 0.3,
            nutriscore: 'e'
        };
        
        // Probeer voedingsinformatie op te halen
        try {
            // Probeer eerst Open Food Facts
            if (detectedFoodByAI) {
                nutritionData = await fetchNutritionFromOpenFoodFacts(detectedFoodByAI);
            }
            
            // Als dat niet werkt, probeer dan de oorspronkelijke voedselnaam
            if (!nutritionData && foodName && foodName.toLowerCase() !== detectedFoodByAI.toLowerCase()) {
                nutritionData = await fetchNutritionFromOpenFoodFacts(foodName);
                if (nutritionData) {
                    detectedFoodByAI = foodName;
                }
            }
            
            // Als we nog steeds geen voedingsinformatie hebben, gebruik dan de lokale database
            if (!nutritionData) {
                const localFood = localFoodDatabase[foodName?.toLowerCase()] || 
                                 localFoodDatabase[detectedFoodByAI?.toLowerCase()];
                if (localFood) {
                    nutritionData = { ...localFood, source: 'local_database' };
                }
            }
            
            // Als we voedingsinformatie hebben, verwerk die dan
            if (nutritionData) {
                const quantityMultiplier = quantity / 100;
                caloriesEstimated = Math.round((nutritionData.calories || 100) * quantityMultiplier);
                aiScore = nutritionData.health_score || 5;
                
                // Update voedingsinformatie
                nutritionInfo = {
                    detected_food: detectedFoodByAI,
                    ai_confidence: confidence,
                    source: nutritionData.source || 'unknown',
                    calories: Math.round(caloriesEstimated),
                    protein: nutritionData.protein ? Math.round(nutritionData.protein * quantityMultiplier * 10) / 10 : 0,
                    fat: nutritionData.fat ? Math.round(nutritionData.fat * quantityMultiplier * 10) / 10 : 0,
                    carbs: nutritionData.carbs ? Math.round(nutritionData.carbs * quantityMultiplier * 10) / 10 : 0,
                    fiber: nutritionData.fiber ? Math.round(nutritionData.fiber * quantityMultiplier * 10) / 10 : 0,
                    sugars: nutritionData.sugars ? Math.round(nutritionData.sugars * quantityMultiplier * 10) / 10 : 0,
                    salt: nutritionData.salt ? Math.round(nutritionData.salt * quantityMultiplier * 1000) / 1000 : 0,
                    nutriscore: nutritionData.nutriscore || 'e'
                };
                
                // Genereer feedback op basis van voedingswaarden
                const feedbackParts = [];
                
                if (nutritionData.nutriscore) {
                    feedbackParts.push(`Nutri-Score: ${nutritionData.nutriscore.toUpperCase()}`);
                }
                
                if (nutritionData.protein > 10) {
                    feedbackParts.push('rijk aan eiwitten');
                    if (aiScore < 8) aiScore += 1;
                }
                
                if (nutritionData.fiber > 3) {
                    feedbackParts.push('vezelrijk');
                    if (aiScore < 9) aiScore += 1;
                } else if (nutritionData.fiber < 1) {
                    suggestions.push('Kies vaker voor volkoren producten voor meer vezels.');
                }
                
                if (nutritionData.sugars > 10) {
                    feedbackParts.push('bevat veel suiker');
                    suggestions.push('Kies vaker voor producten met minder toegevoegde suikers.');
                    if (aiScore > 2) aiScore -= 1;
                }
                
                if (nutritionData.salt > 0.3) {
                    feedbackParts.push('bevat veel zout');
                    suggestions.push('Let op je zoutinname, te veel zout is niet goed voor je bloeddruk.');
                    if (aiScore > 2) aiScore -= 1;
                }
                
                if (feedbackParts.length > 0) {
                    feedback = `${detectedFoodByAI} is ${feedbackParts.join(', ')}.`;
                }
                
                // Bepaal punten op basis van de gezondheidsscore
                if (aiScore >= 8) {
                    pointsEarned = POINTS_HEALTHY;
                    feedback += ' Goede keuze!';
                    
                    // Controleer op badges
                    if (!users[userIndex].badges?.includes('gezonde_keuze')) {
                        newBadges.push('gezonde_keuze');
                    }
                    
                    // Geef een badge voor 5 gezonde keuzes
                    const userFoodEntries = foodEntries.filter(entry => entry.userId === userId);
                    const healthyEntries = userFoodEntries.filter(entry => 
                        entry.ai_analysis_result?.ai_score >= 8
                    ).length;
                    
                    if (healthyEntries >= 4 && !users[userIndex].badges?.includes('gezondheidsfreak')) {
                        newBadges.push('gezondheidsfreak');
                    }
                    
                } else if (aiScore <= 3) {
                    pointsEarned = POINTS_UNHEALTHY;
                    feedback += ' Kijk uit, dit is een minder gezonde keuze.';
                } else {
                    pointsEarned = POINTS_NEUTRAL;
                }
                
                // Controleer op badge voor variatie
                const uniqueFoods = [...new Set(
                    foodEntries
                        .filter(entry => entry.userId === userId)
                        .map(entry => entry.food_name?.toLowerCase())
                    )];
                
                if (uniqueFoods.length >= 4 && !users[userIndex].badges?.includes('variatie')) {
                    newBadges.push('variatie');
                }
            }
            
        } catch (error) {
            console.error('Fout bij het ophalen van voedingsinformatie:', error);
            feedback = `Kon geen gedetailleerde informatie vinden over ${detectedFoodByAI}. ${feedback}`;
            suggestions.push('Probeer een specifiekere omschrijving of een foto te maken voor een betere analyse.');
        }
        
        // Voeg een algemene suggestie toe als er geen andere suggesties zijn
        if (suggestions.length === 0) {
            suggestions.push('Probeer gevarieerd te eten voor een uitgebalanceerd dieet.');
        }
        
        // We upden de gebruikersgegevens niet meer hier, dit gebeurt in de API route
        // Return alleen de punten die verdiend zijn
        pointsEarned = POINTS_BASE; // Basis punten voor elke invoer
        
        return {
            points_earned: pointsEarned,
            ai_score: 7, // Standaard score
            calories_estimated: 100,
            nutrition_info: nutritionInfo,
            ai_feedback: feedback,
            ai_suggestions: suggestions.join(' '),
            new_badges: []
        };
        
    } catch (error) {
        console.error('Fout in transformAiAnalysis:', error);
        throw error; // Gooi de fout door naar de aanroepende functie
    }
}

export default transformAiAnalysis;
