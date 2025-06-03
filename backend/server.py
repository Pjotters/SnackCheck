from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import base64
import io
from huggingface_hub import InferenceClient
from PIL import Image
import numpy as np
import json
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# HuggingFace Client
hf_client = InferenceClient(token=os.environ.get('HF_API_KEY'))

# Create the main app without a prefix
app = FastAPI(title="SnackCheck Research Platform", version="3.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = "snackcheck_secret_key_2024"

# User Roles
USER_ROLES = {
    "STUDENT_CLASS_1": "student_class_1",
    "STUDENT_CLASS_2": "student_class_2", 
    "STUDENT_CLASS_3": "student_class_3",
    "TEACHER": "teacher",
    "ADMIN": "admin"
}

# Enhanced nutrition database with calorie information
NUTRITION_DATA = {
    "apple": {"score": 9, "category": "fruit", "calories_per_100g": 52, "tips": "Perfect healthy snack! Rich in fiber and vitamins."},
    "banana": {"score": 8, "category": "fruit", "calories_per_100g": 89, "tips": "Great source of potassium and natural energy."},
    "orange": {"score": 9, "category": "fruit", "calories_per_100g": 47, "tips": "Excellent vitamin C source. Keep up the healthy choice!"},
    "carrot": {"score": 9, "category": "vegetable", "calories_per_100g": 41, "tips": "Great for your eyes and skin. Rich in beta-carotene."},
    "pizza": {"score": 3, "category": "processed", "calories_per_100g": 266, "tips": "Try a salad or fruit instead for better nutrition."},
    "chocolate": {"score": 2, "category": "sweets", "calories_per_100g": 546, "tips": "Consider dark chocolate (70%+) or fruit for a healthier sweet option."},
    "candy": {"score": 1, "category": "sweets", "calories_per_100g": 375, "tips": "Try fruits like grapes or berries for natural sweetness."},
    "chips": {"score": 2, "category": "snacks", "calories_per_100g": 536, "tips": "Consider nuts, carrot sticks, or air-popped popcorn instead."},
    "yogurt": {"score": 7, "category": "dairy", "calories_per_100g": 59, "tips": "Great choice! Greek yogurt with berries is even better."},
    "bread": {"score": 6, "category": "grains", "calories_per_100g": 265, "tips": "Whole grain bread is a healthier choice."},
    "sandwich": {"score": 6, "category": "meal", "calories_per_100g": 250, "tips": "Add more vegetables and choose whole grain bread."},
    "salad": {"score": 9, "category": "vegetable", "calories_per_100g": 20, "tips": "Excellent! Add nuts or seeds for extra protein."},
    "water": {"score": 10, "category": "drinks", "calories_per_100g": 0, "tips": "Perfect choice! Stay hydrated throughout the day."},
    "soda": {"score": 1, "category": "drinks", "calories_per_100g": 42, "tips": "Try water, unsweetened tea, or sparkling water with lemon."},
    "burger": {"score": 3, "category": "fast_food", "calories_per_100g": 295, "tips": "Consider a grilled chicken salad or veggie wrap instead."},
    "fries": {"score": 2, "category": "fast_food", "calories_per_100g": 365, "tips": "Try baked sweet potato wedges or roasted vegetables."},
    "nuts": {"score": 8, "category": "protein", "calories_per_100g": 607, "tips": "Great healthy fat and protein source. Watch portion sizes."},
    "egg": {"score": 8, "category": "protein", "calories_per_100g": 155, "tips": "Excellent protein source. Great for breakfast or snacks."},
    "rice": {"score": 6, "category": "grains", "calories_per_100g": 130, "tips": "Brown rice is more nutritious than white rice."},
    "chicken": {"score": 8, "category": "protein", "calories_per_100g": 239, "tips": "Lean protein source. Remove skin for less fat."},
    "fish": {"score": 9, "category": "protein", "calories_per_100g": 206, "tips": "Excellent source of protein and omega-3 fatty acids."},
    "broccoli": {"score": 10, "category": "vegetable", "calories_per_100g": 34, "tips": "Superfood packed with vitamins and minerals!"},
    "spinach": {"score": 10, "category": "vegetable", "calories_per_100g": 23, "tips": "Iron-rich leafy green. Great in salads or smoothies."},
    "pasta": {"score": 5, "category": "grains", "calories_per_100g": 220, "tips": "Choose whole grain pasta and add lots of vegetables."},
    "cheese": {"score": 6, "category": "dairy", "calories_per_100g": 113, "tips": "Good protein source but high in saturated fat. Moderate portions."},
    "milk": {"score": 7, "category": "dairy", "calories_per_100g": 42, "tips": "Good source of calcium and protein."},
    "coffee": {"score": 8, "category": "drinks", "calories_per_100g": 1, "tips": "Great antioxidant source! Avoid too much sugar or cream."},
    "tea": {"score": 9, "category": "drinks", "calories_per_100g": 1, "tips": "Excellent choice! Green tea has additional antioxidants."},
}

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    class_code: str
    role: str
    points: int = 0
    level: int = 1
    badges: List[str] = []
    streak_days: int = 0
    last_entry_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserLogin(BaseModel):
    username: str
    password: str
    class_code: str

class UserCreate(BaseModel):
    username: str
    password: str
    class_code: str
    role: Optional[str] = None

class FoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    food_name: str
    meal_type: str
    quantity: str
    image_data: Optional[str] = None
    image_url: Optional[str] = None
    ai_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    ai_suggestions: Optional[List[str]] = None
    calories_estimated: Optional[float] = None
    nutrition_info: Optional[Dict] = None
    points_earned: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CalorieCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    food_name: str
    quantity: str
    calories_per_100g: float
    estimated_calories: float
    nutrition_breakdown: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FoodComparison(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    food_1: str
    food_2: str
    comparison_result: Dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    message: str
    is_admin: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DailyQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: List[str]
    date: str
    active: bool = True
    points_reward: int = 5

class QuestionResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    answer: str
    points_earned: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class QuestionResponseCreate(BaseModel):
    question_id: str
    answer: str

class Gallery(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    food_name: str
    image_data: str
    ai_score: float
    likes: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# AI Functions
async def analyze_food_with_huggingface(food_name: str, image_data: str = None) -> Dict:
    """Enhanced AI analysis using HuggingFace API"""
    try:
        # Try to use HuggingFace for food recognition if image is provided
        if image_data and hf_client:
            try:
                # Convert base64 to image bytes
                image_bytes = base64.b64decode(image_data)
                
                # Use HuggingFace food classification model
                result = hf_client.image_classification(
                    image_bytes,
                    model="nateraw/food"  # Food classification model
                )
                
                if result and len(result) > 0:
                    # Get the top prediction
                    top_prediction = result[0]
                    detected_food = top_prediction.get('label', food_name).lower()
                    confidence = top_prediction.get('score', 0.5)
                    
                    # Use detected food for analysis
                    food_name = detected_food
                    
                    logging.info(f"HuggingFace detected: {detected_food} (confidence: {confidence})")
                
            except Exception as e:
                logging.error(f"HuggingFace API error: {e}")
                # Fall back to manual analysis
        
        # Analyze using our nutrition database
        food_lower = food_name.lower()
        
        # Try exact match first
        for food_key, data in NUTRITION_DATA.items():
            if food_key in food_lower or food_lower in food_key:
                score = data["score"]
                tips = data["tips"]
                calories = data["calories_per_100g"]
                
                # Generate suggestions based on score
                suggestions = generate_healthy_alternatives(data["category"], score)
                
                return {
                    "score": score,
                    "feedback": tips,
                    "suggestions": suggestions,
                    "category": data["category"],
                    "calories_per_100g": calories,
                    "detected_food": food_name,
                    "confidence": 0.9
                }
        
        # Default analysis for unknown foods
        default_score = 5
        return {
            "score": default_score,
            "feedback": "We couldn't analyze this food precisely. Try to include more fruits and vegetables in your diet!",
            "suggestions": ["Try adding some fruits", "Consider vegetables as snacks", "Drink more water"],
            "category": "unknown",
            "calories_per_100g": 200,  # Estimated
            "detected_food": food_name,
            "confidence": 0.3
        }
        
    except Exception as e:
        logging.error(f"Food analysis error: {e}")
        return {
            "score": 5,
            "feedback": "Error analyzing food. Please try again.",
            "suggestions": ["Try again with a clearer image"],
            "category": "unknown",
            "calories_per_100g": 200,
            "detected_food": food_name,
            "confidence": 0.1
        }

def generate_healthy_alternatives(category: str, current_score: int) -> List[str]:
    """Generate healthy alternatives based on food category"""
    if current_score >= 7:
        return ["Great choice! Keep it up!", "Maybe add some variety with other healthy options"]
    
    alternatives = {
        "sweets": ["Try fresh fruits like berries or grapes", "Dark chocolate (70%+) in small amounts", "Frozen grapes or banana 'ice cream'"],
        "snacks": ["Raw nuts or seeds", "Carrot sticks with hummus", "Air-popped popcorn"],
        "drinks": ["Water with lemon or cucumber", "Herbal tea", "Sparkling water with fruit"],
        "fast_food": ["Grilled chicken salad", "Veggie wrap with hummus", "Homemade smoothie bowl"],
        "processed": ["Whole grain alternatives", "Fresh fruits and vegetables", "Homemade versions with less salt/sugar"]
    }
    
    return alternatives.get(category, ["Add more fruits and vegetables", "Choose whole grain options", "Drink more water"])

def calculate_points(ai_score: float) -> int:
    """Calculate points earned based on AI score"""
    if ai_score >= 8:
        return 15
    elif ai_score >= 6:
        return 10
    elif ai_score >= 4:
        return 7
    else:
        return 3

def estimate_calories(food_name: str, quantity: str, calories_per_100g: float) -> float:
    """Estimate total calories based on quantity"""
    try:
        # Extract numbers from quantity string
        import re
        numbers = re.findall(r'\d+', quantity)
        if numbers:
            amount = float(numbers[0])
            # Assume basic serving sizes
            if 'gram' in quantity.lower() or 'g' in quantity.lower():
                return (amount / 100) * calories_per_100g
            elif 'piece' in quantity.lower() or 'stuk' in quantity.lower():
                # Assume average piece is 150g
                return (amount * 150 / 100) * calories_per_100g
            else:
                # Default to 100g serving
                return calories_per_100g
        else:
            return calories_per_100g
    except:
        return calories_per_100g

def check_level_up(total_points: int) -> int:
    """Calculate user level based on total points"""
    return (total_points // 100) + 1

def award_badges(user_data: dict, new_entry: dict) -> List[str]:
    """Award badges based on user behavior"""
    badges = user_data.get("badges", [])
    new_badges = []
    
    # First healthy choice badge
    if "healthy_start" not in badges and new_entry["ai_score"] >= 7:
        new_badges.append("healthy_start")
    
    # Streak badges
    if user_data.get("streak_days", 0) >= 7 and "week_warrior" not in badges:
        new_badges.append("week_warrior")
    
    # Points badges
    total_points = user_data.get("points", 0)
    if total_points >= 500 and "point_master" not in badges:
        new_badges.append("point_master")
    
    # AI detection badge
    if "ai_expert" not in badges and new_entry.get("image_data"):
        new_badges.append("ai_expert")
    
    return new_badges

# Utility functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_jwt_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def get_role_from_class_code(class_code: str) -> str:
    role_mapping = {
        "KLAS1": USER_ROLES["STUDENT_CLASS_1"],
        "KLAS2": USER_ROLES["STUDENT_CLASS_2"],
        "KLAS3": USER_ROLES["STUDENT_CLASS_3"],
        "DOCENT": USER_ROLES["TEACHER"],
        "ADMIN": USER_ROLES["ADMIN"]
    }
    return role_mapping.get(class_code.upper(), "")

async def update_user_streak(user_id: str):
    """Update user's daily streak"""
    today = datetime.now().strftime("%Y-%m-%d")
    user = await db.users.find_one({"id": user_id})
    
    if user:
        last_date = user.get("last_entry_date")
        current_streak = user.get("streak_days", 0)
        
        if last_date != today:
            # Check if it's consecutive day
            if last_date:
                last_datetime = datetime.strptime(last_date, "%Y-%m-%d")
                today_datetime = datetime.strptime(today, "%Y-%m-%d")
                days_diff = (today_datetime - last_datetime).days
                
                if days_diff == 1:
                    current_streak += 1
                elif days_diff > 1:
                    current_streak = 1
            else:
                current_streak = 1
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"last_entry_date": today, "streak_days": current_streak}}
            )

# Authentication endpoints - LOGIN ONLY
@api_router.post("/login")
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({
        "username": login_data.username,
        "class_code": login_data.class_code.upper()
    })
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "class_code": user["class_code"],
            "role": user["role"],
            "points": user.get("points", 0),
            "level": user.get("level", 1),
            "badges": user.get("badges", [])
        }
    }

# Food logging endpoints
@api_router.post("/food-entries")
async def create_food_entry(
    food_name: str = Form(...),
    meal_type: str = Form(...),
    quantity: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Handle image upload
    image_data = None
    if image:
        # Convert image to base64 for storage
        image_bytes = await image.read()
        image_data = base64.b64encode(image_bytes).decode('utf-8')
    
    # Analyze food with enhanced AI
    ai_analysis = await analyze_food_with_huggingface(food_name, image_data)
    points_earned = calculate_points(ai_analysis["score"])
    
    # Calculate estimated calories
    estimated_calories = estimate_calories(food_name, quantity, ai_analysis["calories_per_100g"])
    
    # Create food entry
    food_entry = FoodEntry(
        user_id=current_user.id,
        food_name=food_name,
        meal_type=meal_type,
        quantity=quantity,
        image_data=image_data,
        ai_score=ai_analysis["score"],
        ai_feedback=ai_analysis["feedback"],
        ai_suggestions=ai_analysis["suggestions"],
        calories_estimated=estimated_calories,
        nutrition_info={
            "calories_per_100g": ai_analysis["calories_per_100g"],
            "category": ai_analysis["category"],
            "detected_food": ai_analysis["detected_food"],
            "confidence": ai_analysis["confidence"]
        },
        points_earned=points_earned
    )
    
    await db.food_entries.insert_one(food_entry.dict())
    
    # Add to gallery if image is provided and score is good
    if image_data and ai_analysis["score"] >= 6:
        gallery_item = Gallery(
            user_id=current_user.id,
            username=current_user.username,
            food_name=food_name,
            image_data=image_data,
            ai_score=ai_analysis["score"]
        )
        await db.gallery.insert_one(gallery_item.dict())
    
    # Update user points and level
    new_total_points = current_user.points + points_earned
    new_level = check_level_up(new_total_points)
    
    # Check for new badges
    user_dict = current_user.dict()
    new_badges = award_badges(user_dict, food_entry.dict())
    all_badges = current_user.badges + new_badges
    
    # Update user in database
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "points": new_total_points,
            "level": new_level,
            "badges": all_badges
        }}
    )
    
    # Update user streak in background
    background_tasks.add_task(update_user_streak, current_user.id)
    
    return {
        **food_entry.dict(),
        "points_earned": points_earned,
        "new_badges": new_badges,
        "total_points": new_total_points,
        "level": new_level
    }

@api_router.get("/food-entries")
async def get_user_food_entries(current_user: User = Depends(get_current_user)):
    entries = await db.food_entries.find({"user_id": current_user.id}).sort("timestamp", -1).to_list(100)
    return [FoodEntry(**entry) for entry in entries]

@api_router.get("/food-entries/all")
async def get_all_food_entries(current_user: User = Depends(get_current_user)):
    # Only admin and teachers can see all entries
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Admin sees everything, teachers see limited data
    if current_user.role == USER_ROLES["ADMIN"]:
        entries = await db.food_entries.find().sort("timestamp", -1).to_list(1000)
        return [FoodEntry(**entry) for entry in entries]
    else:
        # Teachers see entries but without personal identifiable info
        entries = await db.food_entries.find({}, {"user_id": 0}).sort("timestamp", -1).to_list(1000)
        teacher_entries = []
        for entry in entries:
            entry_dict = entry.copy()
            if 'user_id' in entry_dict:
                del entry_dict['user_id']
            teacher_entry = {
                "id": entry_dict.get("id", str(uuid.uuid4())),
                "user_id": "hidden",
                "food_name": entry_dict.get("food_name", ""),
                "meal_type": entry_dict.get("meal_type", ""),
                "quantity": entry_dict.get("quantity", ""),
                "image_data": entry_dict.get("image_data"),
                "ai_score": entry_dict.get("ai_score"),
                "ai_feedback": entry_dict.get("ai_feedback"),
                "ai_suggestions": entry_dict.get("ai_suggestions", []),
                "calories_estimated": entry_dict.get("calories_estimated"),
                "nutrition_info": entry_dict.get("nutrition_info"),
                "points_earned": entry_dict.get("points_earned", 0),
                "timestamp": entry_dict.get("timestamp", datetime.utcnow())
            }
            teacher_entries.append(FoodEntry(**teacher_entry))
        return teacher_entries

# Calorie Checker
@api_router.post("/calorie-check")
async def check_calories(
    food_name: str = Form(...),
    quantity: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Get nutrition info from our database or AI
    ai_analysis = await analyze_food_with_huggingface(food_name)
    calories_per_100g = ai_analysis["calories_per_100g"]
    estimated_calories = estimate_calories(food_name, quantity, calories_per_100g)
    
    calorie_check = CalorieCheck(
        user_id=current_user.id,
        food_name=food_name,
        quantity=quantity,
        calories_per_100g=calories_per_100g,
        estimated_calories=estimated_calories,
        nutrition_breakdown={
            "score": ai_analysis["score"],
            "category": ai_analysis["category"],
            "tips": ai_analysis["feedback"]
        }
    )
    
    await db.calorie_checks.insert_one(calorie_check.dict())
    
    return calorie_check

# Food Comparison
@api_router.post("/food-compare")
async def compare_foods(
    food_1: str = Form(...),
    food_2: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    # Analyze both foods
    analysis_1 = await analyze_food_with_huggingface(food_1)
    analysis_2 = await analyze_food_with_huggingface(food_2)
    
    # Compare the foods
    comparison_result = {
        "food_1": {
            "name": food_1,
            "score": analysis_1["score"],
            "calories_per_100g": analysis_1["calories_per_100g"],
            "category": analysis_1["category"],
            "feedback": analysis_1["feedback"]
        },
        "food_2": {
            "name": food_2,
            "score": analysis_2["score"],
            "calories_per_100g": analysis_2["calories_per_100g"],
            "category": analysis_2["category"],
            "feedback": analysis_2["feedback"]
        },
        "winner": food_1 if analysis_1["score"] > analysis_2["score"] else food_2,
        "score_difference": abs(analysis_1["score"] - analysis_2["score"]),
        "calorie_difference": abs(analysis_1["calories_per_100g"] - analysis_2["calories_per_100g"]),
        "recommendation": generate_comparison_recommendation(analysis_1, analysis_2)
    }
    
    food_comparison = FoodComparison(
        user_id=current_user.id,
        food_1=food_1,
        food_2=food_2,
        comparison_result=comparison_result
    )
    
    await db.food_comparisons.insert_one(food_comparison.dict())
    
    return comparison_result

def generate_comparison_recommendation(analysis_1: Dict, analysis_2: Dict) -> str:
    """Generate recommendation based on food comparison"""
    if analysis_1["score"] > analysis_2["score"]:
        better_food = analysis_1
        worse_food = analysis_2
    else:
        better_food = analysis_2
        worse_food = analysis_1
    
    score_diff = better_food["score"] - worse_food["score"]
    
    if score_diff >= 3:
        return f"Duidelijke winnaar! De betere keuze heeft {score_diff} punten meer en is veel gezonder."
    elif score_diff >= 1:
        return f"Kleine maar belangrijke verschillen. De betere optie scoort {score_diff} punten hoger."
    else:
        return "Beide opties zijn vergelijkbaar qua gezondheid. Kies wat je lekkerder vindt!"

# Gallery endpoints
@api_router.get("/gallery")
async def get_gallery(current_user: User = Depends(get_current_user)):
    gallery_items = await db.gallery.find().sort("timestamp", -1).to_list(50)
    return [Gallery(**item) for item in gallery_items]

@api_router.post("/gallery/{item_id}/like")
async def like_gallery_item(item_id: str, current_user: User = Depends(get_current_user)):
    result = await db.gallery.update_one(
        {"id": item_id},
        {"$inc": {"likes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    return {"message": "Liked successfully"}

# Chat system
@api_router.post("/chat/send")
async def send_chat_message(
    message: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    chat_message = ChatMessage(
        user_id=current_user.id,
        username=current_user.username,
        message=message,
        is_admin=current_user.role == USER_ROLES["ADMIN"]
    )
    
    await db.chat_messages.insert_one(chat_message.dict())
    
    return chat_message

@api_router.get("/chat/messages")
async def get_chat_messages(current_user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find().sort("timestamp", -1).to_list(100)
    return [ChatMessage(**msg) for msg in messages]

# Daily questions endpoints
@api_router.post("/daily-questions")
async def create_daily_question(question_data: DailyQuestion, current_user: User = Depends(get_current_user)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admin can create questions")
    
    await db.daily_questions.insert_one(question_data.dict())
    return question_data

@api_router.get("/daily-questions/today")
async def get_todays_questions():
    today = datetime.now().strftime("%Y-%m-%d")
    questions = await db.daily_questions.find({"date": today, "active": True}).to_list(10)
    return [DailyQuestion(**q) for q in questions]

@api_router.post("/question-responses")
async def submit_question_response(
    response_data: QuestionResponseCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if user already answered this question
    existing_response = await db.question_responses.find_one({
        "user_id": current_user.id,
        "question_id": response_data.question_id
    })
    
    if existing_response:
        raise HTTPException(status_code=400, detail="Already answered this question")
    
    # Get question to determine points
    question = await db.daily_questions.find_one({"id": response_data.question_id})
    points_earned = question.get("points_reward", 5) if question else 5
    
    response = QuestionResponse(
        user_id=current_user.id,
        question_id=response_data.question_id,
        answer=response_data.answer,
        points_earned=points_earned
    )
    
    await db.question_responses.insert_one(response.dict())
    
    # Update user points
    new_total_points = current_user.points + points_earned
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"points": new_total_points}}
    )
    
    return response

# Analytics endpoints
@api_router.get("/analytics/class-summary")
async def get_class_summary(current_user: User = Depends(get_current_user)):
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get summary statistics by class
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "user"
            }
        },
        {
            "$unwind": "$user"
        },
        {
            "$group": {
                "_id": "$user.class_code",
                "total_entries": {"$sum": 1},
                "avg_score": {"$avg": "$ai_score"},
                "total_points": {"$sum": "$points_earned"},
                "avg_calories": {"$avg": "$calories_estimated"},
                "users_count": {"$addToSet": "$user_id"}
            }
        },
        {
            "$project": {
                "class_code": "$_id",
                "total_entries": 1,
                "avg_score": 1,
                "total_points": 1,
                "avg_calories": 1,
                "active_users": {"$size": "$users_count"}
            }
        }
    ]
    
    results = await db.food_entries.aggregate(pipeline).to_list(10)
    return results

@api_router.get("/analytics/user-stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    # Get user's personal statistics
    user_entries = await db.food_entries.find({"user_id": current_user.id}).to_list(1000)
    
    if not user_entries:
        return {
            "total_entries": 0,
            "avg_score": 0,
            "total_points": current_user.points,
            "level": current_user.level,
            "badges": current_user.badges,
            "streak_days": current_user.streak_days,
            "total_calories": 0,
            "avg_calories_per_day": 0
        }
    
    scores = [entry.get("ai_score", 0) for entry in user_entries if entry.get("ai_score")]
    calories = [entry.get("calories_estimated", 0) for entry in user_entries if entry.get("calories_estimated")]
    
    avg_score = sum(scores) / len(scores) if scores else 0
    total_calories = sum(calories) if calories else 0
    avg_calories_per_day = total_calories / len(set([entry["timestamp"].strftime("%Y-%m-%d") for entry in user_entries])) if user_entries else 0
    
    return {
        "total_entries": len(user_entries),
        "avg_score": round(avg_score, 2),
        "total_points": current_user.points,
        "level": current_user.level,
        "badges": current_user.badges,
        "streak_days": current_user.streak_days,
        "total_calories": round(total_calories, 0),
        "avg_calories_per_day": round(avg_calories_per_day, 0)
    }

@api_router.get("/leaderboard")
async def get_leaderboard(current_user: User = Depends(get_current_user)):
    # Get class leaderboard (only for same class)
    users = await db.users.find(
        {"class_code": current_user.class_code},
        {"username": 1, "points": 1, "level": 1, "badges": 1}
    ).sort("points", -1).to_list(20)
    
    return users

# Admin endpoints
@api_router.post("/admin/create-user")
async def admin_create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username, "class_code": user_data.class_code})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists in this class")
    
    # Determine role from class code or use provided role
    role = user_data.role or get_role_from_class_code(user_data.class_code)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid class code or role")
    
    # Create user
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        class_code=user_data.class_code.upper(),
        role=role
    )
    
    await db.users.insert_one(user.dict())
    
    return {
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "class_code": user.class_code,
            "role": user.role
        }
    }

@api_router.get("/admin/users")
async def admin_get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.post("/admin/create-question")
async def admin_create_question(
    question: str = Form(...),
    options: str = Form(...),  # JSON string of options
    date: str = Form(...),
    points_reward: int = Form(5),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        options_list = json.loads(options)
    except:
        raise HTTPException(status_code=400, detail="Invalid options format")
    
    daily_question = DailyQuestion(
        question=question,
        options=options_list,
        date=date,
        points_reward=points_reward
    )
    
    await db.daily_questions.insert_one(daily_question.dict())
    return daily_question

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "SnackCheck Research Platform API v3.0 - Full Featured with HuggingFace AI!"}

@api_router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "class_code": current_user.class_code,
        "role": current_user.role,
        "points": current_user.points,
        "level": current_user.level,
        "badges": current_user.badges,
        "streak_days": current_user.streak_days
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
