import axios from 'axios';

export async function fetchNutritionFromOpenFoodFacts(foodName) {
    try {
        // Eerst zoeken we naar het product
        const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1`;
        const searchResponse = await axios.get(searchUrl);
        
        if (!searchResponse.data.products || searchResponse.data.products.length === 0) {
            return null;
        }
        
        // Sorteer op Nutri-Score (a is het beste, e is het slechtste)
        const sortedProducts = [...searchResponse.data.products].sort((a, b) => {
            const scoreA = a.nutriscore_grade || 'e';
            const scoreB = b.nutriscore_grade || 'e';
            return scoreA.localeCompare(scoreB);
        });
        
        // Neem het beste product (laagste letter in het alfabet is beter)
        const product = sortedProducts[0];
        
        if (!product) {
            return null;
        }
        
        // Haal gedetailleerde voedingsinformatie op
        const nutrition = product.nutriments || {};
        
        // Bereken een gezondheidsscore op basis van voedingswaarden
        let healthScore = 5; // Neutrale score
        
        // Pas de score aan op basis van voedingswaarden
        if (nutrition.proteins_100g > 5) healthScore += 1;
        if (nutrition.fiber_100g > 3) healthScore += 1;
        if (nutrition.sugars_100g > 10) healthScore -= 1;
        if (nutrition.salt_100g > 0.5) healthScore -= 1;
        if (nutrition.fat_100g > 10) healthScore -= 1;
        
        // Zorg dat de score binnen de perken blijft
        healthScore = Math.max(1, Math.min(10, healthScore));
        
        return {
            source: 'openfoodfacts',
            name: product.product_name || foodName,
            calories: nutrition.energy_kcal_100g || nutrition.energy_100g ? (nutrition.energy_kcal_100g || (nutrition.energy_100g / 4.184)) : 0,
            protein: nutrition.proteins_100g || 0,
            fat: nutrition.fat_100g || 0,
            carbs: nutrition.carbohydrates_100g || 0,
            fiber: nutrition.fiber_100g || 0,
            sugars: nutrition.sugars_100g || 0,
            salt: nutrition.salt_100g || 0,
            nutriscore: product.nutriscore_grade || 'e',
            health_score: healthScore,
            image_url: product.image_url || null
        };
        
    } catch (error) {
        console.error('Fout bij het ophalen van voedingsinformatie:', error);
        return null;
    }
}

// Export alleen de functie die we nodig hebben
