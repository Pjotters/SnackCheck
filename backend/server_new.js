require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Readable } = require('stream');

// Importeer de nieuwe modules
const { readData, writeData } = require('./utils/fileUtils');
const { fetchNutritionFromOpenFoodFacts } = require('./services/nutritionService');
const transformAiAnalysis = require('./transformAiAnalysis');
const { BADGES, POINTS_BASE, POINTS_HEALTHY, POINTS_UNHEALTHY, POINTS_NEUTRAL, POINTS_DAILY_STREAK } = require('./config/constants');

const app = express();
const port = process.env.PORT || 3001;

// Bestandspaden
const USERS_FILE_PATH = 'data/users.json';
const FOOD_ENTRIES_FILE_PATH = 'data/food_entries.json';
const QUESTIONS_FILE_PATH = 'data/questions.json';
const BADGES_FILE_PATH = 'data/badges.json';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configureer multer voor bestandsuploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limiet
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Alleen afbeeldingen zijn toegestaan!'));
        }
    }
});

// JWT authenticatie middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// API Routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Voedselinvoer endpoint
apiRouter.post('/food-entries', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { food_name, quantity = 100, meal_type } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;
        
        if (!food_name) {
            return res.status(400).json({ error: 'Voedselnaam is verplicht' });
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        // Roep de transformAiAnalysis functie aan
        const aiAnalysis = await transformAiAnalysis(
            req.body.raw_ai_result || null,
            food_name,
            parseFloat(quantity) || 100,
            userId
        );

        // Maak een nieuw voedselitem aan
        const newEntry = {
            id: uuidv4(),
            userId,
            username,
            food_name,
            meal_type: meal_type || 'snack',
            quantity: parseFloat(quantity) || 100,
            image_url: imageUrl,
            timestamp: new Date().toISOString(),
            ai_analysis_result: aiAnalysis
        };

        // Lees bestaande voedselitems en voeg het nieuwe item toe
        let foodEntries = [];
        try {
            foodEntries = await readData(FOOD_ENTRIES_FILE_PATH);
        } catch (error) {
            console.error('Fout bij het lezen van voedselitems:', error);
        }
        
        foodEntries.push(newEntry);
        
        // Schrijf de bijgewerkte lijst terug naar het bestand
        await writeData(FOOD_ENTRIES_FILE_PATH, foodEntries);
        
        // Stuur het nieuwe item terug met de AI-analyse
        res.status(201).json({
            ...newEntry,
            message: 'Voedselinvoer succesvol toegevoegd',
            points_earned: aiAnalysis.points_earned,
            new_badges: aiAnalysis.new_badges
        });
        
    } catch (error) {
        console.error('Fout bij toevoegen voedselinvoer:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het toevoegen van de voedselinvoer' });
    }
});

// Overige endpoints...

// Start de server
app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});

// Exporteer de app voor testen
module.exports = app;
