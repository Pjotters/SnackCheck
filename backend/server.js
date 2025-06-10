import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { Readable } from 'stream';
import cors from 'cors';
import bcrypt from 'bcryptjs';

// Configureer __dirname voor ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Laad .env bestand
dotenv.config();

// Bestandspaden (gebruik relatieve paden vanaf de root van het project)
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
const QUESTIONS_FILE_PATH = path.join(DATA_DIR, 'questions.json');
const CHAT_FILE_PATH = path.join(DATA_DIR, 'chat.json');
const FAQ_FILE_PATH = path.join(DATA_DIR, 'faq.json');
const FOOD_ENTRIES_FILE_PATH = path.join(DATA_DIR, 'food-entries.json');
const BADGES_FILE_PATH = path.join(DATA_DIR, 'badges.json');

// Zorg dat de benodigde mappen bestaan
[UPLOADS_DIR, DATA_DIR].forEach(dir => {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
});

// Configuratie constanten
const BADGES = {
    HEALTHY_EATER: 'Gezonde Eter',
    FOOD_CRITIC: 'Voedselcriticus',
    EARLY_BIRD: 'Vroege Vogelaar',
    NIGHT_OWL: 'Nachtbraker',
    STREAK_7: 'Week Streak',
    STREAK_30: 'Maand Streak'
};

const POINTS = {
    BASE: 5,
    HEALTHY: 5,
    UNHEALTHY: -2,
    NEUTRAL: 2,
    DAILY_STREAK: 10,
    IMAGE_UPLOAD: 5,
    NOTES_ADDED: 3,
    QUIZ_CORRECT: 5
};

// Hulpfuncties voor bestandsbewerkingen
async function readData(filePath) {
    try {
        await fs.access(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

const writeData = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// AI Analyse functie
const transformAiAnalysis = async (rawResult, foodName, quantity, userId) => {
    try {
        // Controleer of we een echte AI analyse hebben
        if (rawResult && typeof rawResult === 'object') {
            return {
                calories: rawResult.calories || 0,
                protein: rawResult.protein || 0,
                carbs: rawResult.carbs || 0,
                fat: rawResult.fat || 0,
                is_healthy: rawResult.is_healthy || false,
                suggestions: Array.isArray(rawResult.suggestions) ? 
                    rawResult.suggestions : [
                        'Voeg wat groente toe voor extra voedingsstoffen',
                        'Kies voor volkoren varianten voor meer vezels'
                    ],
                points_earned: rawResult.points_earned || 0
            };
        }

        // Fallback naar mock data als er geen geldige AI analyse is
        return {
            calories: Math.round(100 + Math.random() * 400),
            protein: Math.round(5 + Math.random() * 20),
            carbs: Math.round(10 + Math.random() * 50),
            fat: Math.round(2 + Math.random() * 20),
            is_healthy: Math.random() > 0.3, // 70% kans op gezond
            suggestions: [
                'Voeg wat groente toe voor extra voedingsstoffen',
                'Kies voor volkoren varianten voor meer vezels'
            ],
            points_earned: 5 + Math.floor(Math.random() * 10)
        };
    } catch (error) {
        console.error('Fout bij AI analyse:', error);
        // Retourneer standaardwaarden bij fouten
        return {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            is_healthy: false,
            suggestions: ['Kon voedingsinformatie niet analyseren'],
            points_earned: 0
        };
    }
};

// Configuratie is verplaatst naar boven in het bestand

const app = express();
const port = process.env.PORT || 3002;

// Maak data directory als deze nog niet bestaat
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// Initialiseer lege bestanden als ze niet bestaan
const initFiles = async () => {
    const files = [
        { path: USERS_FILE_PATH, default: [] },
        { path: QUESTIONS_FILE_PATH, default: { questions: [] } },
        { path: CHAT_FILE_PATH, default: { conversations: [] } },
        { path: FAQ_FILE_PATH, default: { faqs: [] } },
        { path: FOOD_ENTRIES_FILE_PATH, default: [] },
        { path: BADGES_FILE_PATH, default: [] }
    ];

    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await writeData(file.path, file.default);
            }
        }
    }
};

// Voer initialisatie uit
initFiles().catch(console.error);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));
app.use('/uploads', express.static(UPLOADS_DIR));

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

// Authenticatie middleware met directe wachtwoordvergelijking
const authenticateToken = async (req, res, next) => {
    try {
        console.log('Authorization header:', req.headers['authorization']);
        
        // Tijdelijk overslaan van authenticatie voor testen
        req.user = {
            userId: '123',
            username: 'testuser'
        };
        return next();
        
        /*
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            console.log('Geen authorization header');
            return res.status(401).json({ error: 'Geen authenticatietoken opgegeven' });
        }
        
        const authValue = authHeader.split(' ')[1];
        if (!authValue) {
            console.log('Geen basis authenticatie gegevens');
            return res.status(401).json({ error: 'Ongeldige authenticatie header' });
        }
        
        const decoded = Buffer.from(authValue, 'base64').toString('utf-8');
        console.log('Decoded auth:', decoded);
        
        const [username, password] = decoded.split(':');
        
        // Lees gebruikers uit het bestand
        const users = await readData(USERS_FILE_PATH);
        console.log('Gebruikers in het systeem:', users);
        console.log('Inlogpoging voor gebruiker:', username);
        
        // Controleer of de gebruiker bestaat en het wachtwoord klopt
        const user = users.find(u => u.username === username);
        
        console.log('Gevonden gebruiker:', user);
        
        if (!user) {
            console.log('Gebruiker niet gevonden');
            return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord' });
        }
        
        // Controleer het wachtwoord (eenvoudige stringvergelijking voor nu)
        if (user.password !== password) {
            console.log('Ongeldig wachtwoord');
            return res.status(401).json({ error: 'Ongeldige gebruikersnaam of wachtwoord' });
        }
        
        // Voeg gebruikersinformatie toe aan de request
        req.user = {
            userId: user.id,
            username: user.username
        };
        */
        
        next();
    } catch (error) {
        console.error('Authenticatiefout:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het authenticeren' });
    }
};

// API Routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Test endpoint
apiRouter.get('/', (req, res) => {
    res.json({ message: 'SnackCheck API is actief!' });
});

// Voedselinvoer endpoint
apiRouter.post('/food-entries', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId; // Ondersteuning voor beide notaties
        const { food_name, quantity, meal_type, notes } = req.body;
        
        // Valideer verplichte velden
        if (!food_name || !quantity || !meal_type) {
            return res.status(400).json({ error: 'Voedselnaam, hoeveelheid en maaltijdtype zijn verplicht' });
        }

        // Maak een nieuw food entry object
        const newEntry = {
            id: Date.now().toString(),
            user_id: userId,
            food_name: food_name.trim(),
            quantity: Math.max(1, parseInt(quantity) || 100),
            meal_type: meal_type,
            notes: (notes || '').trim(),
            timestamp: new Date().toISOString(),
            image_url: req.file ? `/uploads/${req.file.filename}` : null,
            ai_analysis: null,
            points_earned: 0
        };

        // Voeg AI-analyse toe indien beschikbaar
        if (req.body.ai_analysis) {
            try {
                const aiAnalysis = JSON.parse(req.body.ai_analysis);
                newEntry.ai_analysis = {
                    calories: aiAnalysis.calories || 0,
                    protein: aiAnalysis.protein || 0,
                    carbs: aiAnalysis.carbs || 0,
                    fat: aiAnalysis.fat || 0,
                    is_healthy: aiAnalysis.is_healthy || false,
                    suggestions: aiAnalysis.suggestions || []
                };
                
                // Bereken punten op basis van de AI-analyse
                let points = 5; // Basis punten voor het toevoegen van voedsel
                
                // Bonuspunten voor gezond voedsel
                if (aiAnalysis.is_healthy) {
                    points += 5;
                }
                
                // Bonus voor het toevoegen van een afbeelding
                if (newEntry.image_url) {
                    points += 3;
                }
                
                // Bonus voor het toevoegen van notities
                if (newEntry.notes) {
                    points += 2;
                }
                
                newEntry.points_earned = points;
            } catch (err) {
                console.error('Fout bij het verwerken van AI-analyse:', err);
            }
        }

        // Voeg de invoer toe aan de database
        const foodEntries = await readData(FOOD_ENTRIES_FILE_PATH);
        foodEntries.push(newEntry);
        await writeData(FOOD_ENTRIES_FILE_PATH, foodEntries);

        // Werk de punten van de gebruiker bij
        const users = await readData(USERS_FILE_PATH);
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].points = (users[userIndex].points || 0) + newEntry.points_earned;
            users[userIndex].food_history = users[userIndex].food_history || [];
            users[userIndex].food_history.push({
                id: newEntry.id,
                food_name: newEntry.food_name,
                timestamp: newEntry.timestamp,
                points_earned: newEntry.points_earned
            });
            
            // Sla de bijgewerkte gebruikersgegevens op
            await writeData(USERS_FILE_PATH, users);
            
            res.status(201).json({
                ...newEntry,
                total_points: users[userIndex].points
            });
        } else {
            // Gebruiker niet gevonden
            res.status(404).json({ error: 'Gebruiker niet gevonden' });
            
            // Maak een nieuwe gebruiker aan als deze niet bestaat
            const newUser = {
                id: userId,
                username: req.user.username,
                password: 'test123', // Dit zou eigenlijk gehasht moeten zijn
                email: 'test@example.com',
                points: aiAnalysis.points_earned || 0,
                level: 1,
                streak_days: 0,
                last_login: new Date().toISOString(),
                badges: [],
                food_history: [{
                    id: newEntry.id,
                    food_name: newEntry.food_name,
                    points: aiAnalysis.points_earned || 0,
                    timestamp: newEntry.timestamp
                }],
                daily_goals: {
                    calories: 2000,
                    protein: 50,
                    carbs: 250,
                    fat: 70,
                    fruits_veggies: 5
                }
            };
            
            users.push(newUser);
            await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
            console.log('New user created and saved successfully');
        }

        // Lees de bijgewerkte gebruikersgegevens opnieuw om de laatste punten te krijgen
        const updatedUsers = JSON.parse(await fs.readFile(USERS_FILE_PATH, 'utf8'));
        const updatedUser = updatedUsers.find(u => u.id === userId);

        // Stuur het nieuwe item terug met de AI-analyse
        res.status(201).json({
            ...newEntry,
            ai_analysis_result: aiAnalysis,
            message: 'Voedselinvoer succesvol toegevoegd',
            points_earned: aiAnalysis.points_earned,
            new_badges: aiAnalysis.new_badges || [],
            total_points: updatedUser?.points || 0
        });
        
    } catch (error) {
        console.error('Fout bij toevoegen voedselinvoer:', error);
        res.status(500).json({ 
            error: 'Er is een fout opgetreden bij het toevoegen van de voedselinvoer',
            details: error.message 
        });
    }
});

// Quiz endpoints
apiRouter.get('/quiz/questions', authenticateToken, async (req, res) => {
    try {
        // Lees de vragen uit het JSON bestand
        const questions = await readData(QUESTIONS_FILE_PATH);
        
        // Verwijder de juiste antwoorden voordat we de vragen naar de client sturen
        const questionsWithoutAnswers = questions.map(question => {
            const { correctAnswers, ...questionWithoutAnswers } = question;
            return questionWithoutAnswers;
        });
        res.json(questionsWithoutAnswers);
        res.json(randomQuestions);
    } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        res.status(500).json({ error: 'Kon vragen niet ophalen' });
    }
});

// Haal food entries op voor een gebruiker
apiRouter.get('/food-entries', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is vereist' });
        }
        
        // Controleer of de gebruiker toegang heeft tot deze gegevens
        if (req.user.userId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Geen toegang tot deze gegevens' });
        }
        
        // Lees de food entries
        let entries = [];
        entries = await readData(FOOD_ENTRIES_FILE_PATH);
        
        // Filter op gebruiker als de huidige gebruiker geen admin is
        if (!req.user.isAdmin) {
            entries = entries.filter(entry => entry.userId === userId);
        } else if (userId) {
            // Als admin specifiek om een gebruiker vraagt
            entries = entries.filter(entry => entry.userId === userId);
        }
        
        // Sorteer op datum (nieuwste eerst)
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(entries);
    } catch (error) {
        // Als het bestand niet bestaat, retourneer een lege array
        if (error.code === 'ENOENT') {
            return res.json([]);
        }
        console.error('Fout bij ophalen food entries:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de food entries' });
    }
});

// Haal gebruikersinformatie op
apiRouter.get('/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Controleer of de gebruiker toegang heeft tot deze gegevens
        if (req.user.userId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Geen toegang tot deze gebruikersgegevens' });
        }
        
        const users = await readData(USERS_FILE_PATH);
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        
        // Verwijder gevoelige gegevens voordat we ze terugsturen
        const { password, ...userData } = user;
        
        res.json(userData);
    } catch (error) {
        console.error('Fout bij ophalen gebruikersinformatie:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de gebruikersinformatie' });
    }
});

// Quiz endpoints
apiRouter.get('/quiz/questions', authenticateToken, async (req, res) => {
    try {
        const questionsData = await readData(QUESTIONS_FILE_PATH);
        // Selecteer willekeurig 5 vragen (of minder als er minder dan 5 zijn)
        const randomQuestions = questionsData.questions
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map(q => ({
                id: q.id,
                question: q.question,
                options: q.options.map(opt => ({
                    id: opt.id,
                    text: opt.text
                }))
            }));
        res.json(randomQuestions);
    } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        res.status(500).json({ error: 'Kon vragen niet ophalen' });
    }
});

apiRouter.post('/quiz/submit', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body;
        const userId = req.user.userId;
        
        const questionsData = await readData(QUESTIONS_FILE_PATH);
        const users = await readData(USERS_FILE_PATH);
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        
        let totalPoints = 0;
        const results = [];
        
        answers.forEach(answer => {
            const question = questionsData.questions.find(q => q.id === answer.questionId);
            if (!question) return;
            
            const selectedOption = question.options.find(opt => opt.id === answer.optionId);
            const isCorrect = question.options.some(opt => opt.id === answer.optionId && opt.correct);
            
            if (isCorrect) {
                totalPoints += question.points || 10;
            }
            
            results.push({
                questionId: question.id,
                question: question.question,
                selectedOption: selectedOption?.text,
                isCorrect,
                correctAnswer: question.options.find(opt => opt.correct)?.text,
                explanation: question.explanation
            });
        });
        
        // Update user points
        user.points = (user.points || 0) + totalPoints;
        await writeData(USERS_FILE_PATH, users);
        
        res.json({
            totalPoints,
            results
        });
    } catch (error) {
        console.error('Fout bij verwerken quiz antwoorden:', error);
        res.status(500).json({ error: 'Kon antwoorden niet verwerken' });
    }
});

// FAQ endpoint
apiRouter.get('/faq', authenticateToken, async (req, res) => {
    try {
        const faqs = await readData(FAQ_FILE_PATH);
        res.json(faqs);
    } catch (error) {
        console.error('Fout bij ophalen FAQ:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van de FAQ' });
    }
});

// Chat endpoints
apiRouter.get('/chat/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const chatData = await readData(CHAT_FILE_PATH);
        
        // Voor gebruikers: toon alleen hun gesprekken
        // Voor admins: toon alle gesprekken
        const conversations = req.user.isAdmin 
            ? chatData.conversations 
            : chatData.conversations.filter(c => c.userId === userId);
            
        res.json(conversations);
    } catch (error) {
        console.error('Fout bij ophalen gesprekken:', error);
        res.status(500).json({ error: 'Kon gesprekken niet ophalen' });
    }
});

apiRouter.post('/chat/message', authenticateToken, async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user.userId;
        const isAdmin = req.user.isAdmin;
        
        if (!content) {
            return res.status(400).json({ error: 'Bericht mag niet leeg zijn' });
        }
        
        const chatData = await readData(CHAT_FILE_PATH);
        let conversation = chatData.conversations.find(c => c.id === conversationId);
        
        // Als er geen gesprek is en het is een gebruiker die een nieuw gesprek start
        if (!conversation && !isAdmin) {
            conversation = {
                id: uuidv4(),
                userId: senderId,
                adminId: null, // Wordt later toegewezen door een admin
                messages: [],
                status: 'open',
                createdAt: new Date().toISOString()
            };
            chatData.conversations.push(conversation);
        } else if (!conversation) {
            return res.status(404).json({ error: 'Gesprek niet gevonden' });
        }
        
        // Voeg bericht toe
        const newMessage = {
            id: uuidv4(),
            sender: isAdmin ? 'admin' : 'user',
            content,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        conversation.messages.push(newMessage);
        
        // Als een admin antwoordt en er was nog geen admin toegewezen
        if (isAdmin && !conversation.adminId) {
            conversation.adminId = senderId;
        }
        
        await writeData(CHAT_FILE_PATH, chatData);
        
        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Fout bij versturen bericht:', error);
        res.status(500).json({ error: 'Kon bericht niet versturen' });
    }
});

// FAQ endpoints
apiRouter.get('/faq', async (req, res) => {
    try {
        const faqData = await readData(FAQ_FILE_PATH);
        res.json(faqData.faqs);
    } catch (error) {
        console.error('Fout bij ophalen FAQ:', error);
        res.status(500).json({ error: 'Kon FAQ niet ophalen' });
    }
});

// Admin endpoints
apiRouter.get('/admin/users', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Geen toegang' });
        }
        
        const users = await readData(USERS_FILE_PATH);
        // Geef alleen basisgebruikersinformatie door, geen gevoelige gegevens
        const userList = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            points: user.points || 0,
            level: user.level || 1,
            badges: user.badges || [],
            lastActive: user.lastActive
        }));
        
        res.json(userList);
    } catch (error) {
        console.error('Fout bij ophalen gebruikers:', error);
        res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
    }
});

// Serveer statische bestanden uit de uploads map
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serveer de React-app voor alle andere routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Er is iets misgegaan!');
});

// Start de server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server draait op http://localhost:${port}`);
    
    // Log beschikbare routes
    console.log('Beschikbare API routes:');
    console.log(`- POST   /api/food-entries`);
    console.log(`- GET    /api/quiz/questions`);
    console.log(`- POST   /api/quiz/submit`);
    console.log(`- GET    /api/chat/conversations`);
    console.log(`- POST   /api/chat/message`);
    console.log(`- GET    /api/faq`);
    console.log(`- GET    /api/admin/users`);
});

// Nette afsluiting voor Heroku
process.on('SIGTERM', () => {
    console.log('SIGTERM ontvangen. Server wordt netjes afgesloten...');
    server.close(() => {
        console.log('Server afgesloten');
    });
});

// Exporteer de app voor testen
export default app;
