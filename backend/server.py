from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import json

# SQLAlchemy imports
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import Column, Integer, String, DateTime, JSON as SAJson, ForeignKey, Float, Boolean, Text, select, update, delete, func, distinct # Renamed JSON to SAJson to avoid conflict with 'import json'
from sqlalchemy.exc import IntegrityError
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

# Password Hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password."""
    return pwd_context.hash(password)


# SQLAlchemy Database Setup
DATABASE_URL = "sqlite+aiosqlite:///./snackcheck_local.db"  # Local SQLite file, ensure aiosqlite is in requirements.txt

async_engine = create_async_engine(DATABASE_URL, echo=True)  # echo=True for logging SQL queries
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)
Base = declarative_base()

# --- SQLAlchemy Database Models ---
class UserDb(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(100), index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    class_code: Mapped[str] = mapped_column(String(50), index=True)
    role: Mapped[str] = mapped_column(String(50))
    points: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    badges: Mapped[List[str]] = mapped_column(SAJson, default=lambda: []) # Use lambda for default mutable list
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_entry_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # Format YYYY-MM-DD
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class FoodEntryDb(Base):
    __tablename__ = "food_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    food_name: Mapped[str] = mapped_column(String(255))
    meal_type: Mapped[str] = mapped_column(String(50))
    quantity: Mapped[str] = mapped_column(String(100))
    image_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Base64 encoded image
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ai_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggestions: Mapped[Optional[List[str]]] = mapped_column(SAJson, nullable=True)
    calories_estimated: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nutrition_info: Mapped[Optional[Dict]] = mapped_column(SAJson, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class CalorieCheckDb(Base):
    __tablename__ = "calorie_checks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    food_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[str] = mapped_column(String(100))
    calories_per_100g: Mapped[float] = mapped_column(Float)
    estimated_calories: Mapped[float] = mapped_column(Float)
    nutrition_breakdown: Mapped[Optional[Dict]] = mapped_column(SAJson, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class FoodComparisonDb(Base):
    __tablename__ = "food_comparisons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    food_1: Mapped[str] = mapped_column(String(255))
    food_2: Mapped[str] = mapped_column(String(255))
    comparison_result: Mapped[Dict] = mapped_column(SAJson)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ChatMessageDb(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    username: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class DailyQuestionDb(Base):
    __tablename__ = "daily_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[List[str]] = mapped_column(SAJson)
    date: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-DD
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    points_reward: Mapped[int] = mapped_column(Integer, default=5)

class QuestionResponseDb(Base):
    __tablename__ = "question_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("daily_questions.id"), index=True)
    answer: Mapped[str] = mapped_column(Text)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class GalleryDb(Base):
    __tablename__ = "gallery_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    username: Mapped[str] = mapped_column(String(100))
    food_name: Mapped[str] = mapped_column(String(255))
    image_data: Mapped[str] = mapped_column(Text)  # Base64 encoded image
    ai_score: Mapped[float] = mapped_column(Float)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


# Dependency to get DB session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close() # Ensure session is closed

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
    image_b64: Optional[str] = None
    ai_score: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    likes: int = 0

class ClassSummaryStat(BaseModel):
    class_code: str
    total_entries: int
    avg_score: Optional[float] = None
    total_points_from_entries: int
    avg_calories: Optional[float] = None
    active_users: int

class UserStats(BaseModel):
    total_entries: int
    avg_score: Optional[float] = None
    total_points: int
    level: int
    badges: List[str]
    streak_days: int
    total_calories_consumed: int
    avg_calories_per_day: Optional[float] = None

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

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    users = load_users() # Defined for login, loads from users.json
    user_data_from_json = next((u for u in users if u.get('id') == user_id), None)

    if user_data_from_json is None:
        raise credentials_exception
    
    # Validate the user data from JSON against the User Pydantic model
    # This ensures the structure is correct for the rest of the application
    try:
        return User.model_validate(user_data_from_json)
    except Exception as e:
        print(f"Error validating user data from JSON for user_id {user_id}: {e}")
        raise credentials_exception

def get_role_from_class_code(class_code: str) -> str:
    role_mapping = {
        "KLAS1": USER_ROLES["STUDENT_CLASS_1"],
        "KLAS2": USER_ROLES["STUDENT_CLASS_2"],
        "KLAS3": USER_ROLES["STUDENT_CLASS_3"],
        "DOCENT": USER_ROLES["TEACHER"],
        "ADMIN": USER_ROLES["ADMIN"]
    }
    return role_mapping.get(class_code.upper(), "")

def update_user_data_for_new_entry(user_data: dict, points_awarded: int) -> dict:
    """
    Updates user's points, streak, level based on a new food entry.
    Operates on a dictionary representing the user.
    Returns the modified user_data dictionary.
    """
    # Ensure datetime and date are available (Python's built-in datetime module)
    from datetime import datetime, date

    today_str = date.today().strftime("%Y-%m-%d")

    # Update points
    user_data['points'] = user_data.get('points', 0) + points_awarded

    # Update streak
    last_entry_date_str = user_data.get('last_entry_date')
    current_streak = user_data.get('streak_days', 0)

    if last_entry_date_str != today_str:
        if last_entry_date_str:
            try:
                # Ensure comparison is between date objects
                last_date_obj = datetime.strptime(last_entry_date_str, "%Y-%m-%d").date()
                today_date_obj = date.today()
                days_diff = (today_date_obj - last_date_obj).days

                if days_diff == 1:
                    current_streak += 1
                elif days_diff > 1:
                    current_streak = 1  # Reset streak
                # If days_diff <= 0, it implies an entry from the future or same day handled by outer condition
            except ValueError:
                # Invalid date string in user_data, treat as first entry for streak
                current_streak = 1
        else:  # No last_entry_date, so first entry for streak purposes
            current_streak = 1
        
        user_data['last_entry_date'] = today_str
        user_data['streak_days'] = current_streak
    
    # Update level (example: 100 points per level, starting at level 1)
    # This logic can be expanded as needed.
    current_level = user_data.get('level', 1)
    # A simple way to calculate level: integer division of points by a threshold
    # Ensure points_per_level is defined, e.g., 100
    points_per_level = 100 
    new_level = (user_data['points'] // points_per_level) + 1
    if new_level > current_level:
        user_data['level'] = new_level
        # Optionally, add a badge or notification for leveling up
        # user_data.setdefault('badges', []).append(f"Level {new_level} Reached!")
    elif current_level == 0: # Ensure level is at least 1 if points are 0 or positive
        user_data['level'] = 1

    return user_data

# Authentication endpoints - LOGIN ONLY

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {USERS_FILE}: {e}")
        return []

FOOD_ENTRIES_FILE = "food_entries.json"

def load_food_entries():
    if not os.path.exists(FOOD_ENTRIES_FILE):
        return []
    try:
        with open(FOOD_ENTRIES_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {FOOD_ENTRIES_FILE}: {e}")
        return []

def save_food_entries(food_entries):
    try:
        with open(FOOD_ENTRIES_FILE, 'w') as f:
            json.dump(food_entries, f, indent=2)
    except IOError as e:
        print(f"Error writing to {FOOD_ENTRIES_FILE}: {e}")

@app.post("/login")
async def login_user(login_data: UserLogin): # Removed db_session and related imports for this function
    users = load_users()
    found_user = None
    for user_in_file in users:
        # Assuming class_code in JSON (from create_initial_admin.py) and login_data are directly comparable.
        # create_initial_admin.py stores ADMIN_CLASS_CODE (e.g., "admin") as is.
        # If case-insensitivity is needed, convert both to lower: e.g., user_in_file.get('class_code','').lower() == login_data.class_code.lower()
        if user_in_file.get('username') == login_data.username and \
           user_in_file.get('class_code') == login_data.class_code:
            found_user = user_in_file
            break

    if not found_user or not verify_password(login_data.password, found_user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(found_user['id'], found_user['role'])

    # Prepare user data for response, excluding password_hash
    # Assumes 'User' is a Pydantic model defined elsewhere in server.py for the user response structure
    user_data_for_response = {
        k: v for k, v in found_user.items() if k != 'password_hash'
    }
    user_response = User.model_validate(user_data_for_response)

    return {
        "token": token,
        "user": user_response
    }

# Food logging endpoints
@api_router.post("/food-entries")
async def create_food_entry(
    food_name: str = Form(...),
    meal_type: str = Form(...),
    quantity: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user) # Uses users.json
):
    image_url = None
    if image:
        upload_dir = "static/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer) # Ensure shutil is imported
            image_url = f"/static/uploads/{unique_filename}"
        except Exception as e:
            print(f"Error saving image: {e}")
            # Consider raising HTTPException(status_code=500, detail=f"Could not save image: {e}")

    # Analyze food item - assuming analyze_food_with_huggingface uses food_name primarily
    # If image analysis is needed, this function might need image_url or file_path
    ai_analysis_result = await analyze_food_with_huggingface(food_name)
    
    # Points awarded - directly from AI score or via calculate_points if defined
    points_earned = ai_analysis_result.get("score", 0)

    food_entry_id = str(uuid.uuid4())
    food_entry_data = {
        "id": food_entry_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "class_code": current_user.class_code,
        "food_name": food_name,
        "meal_type": meal_type,
        "quantity": quantity,
        "image_url": image_url,
        "ai_score": ai_analysis_result.get("score", 0), # from ai_analysis_result
        "ai_feedback": ai_analysis_result.get("feedback", ""),
        "ai_suggestions": ai_analysis_result.get("suggestions", []),
        "calories_per_100g": ai_analysis_result.get("calories_per_100g", 0),
        "protein": ai_analysis_result.get("protein", 0), # Added protein
        "fat": ai_analysis_result.get("fat", 0), # Added fat
        "carbs": ai_analysis_result.get("carbohydrates", 0), # Added carbs
        "nutrition_info": { # Retaining a similar structure for other AI info
            "category": ai_analysis_result.get("category", "unknown"),
            "detected_food": ai_analysis_result.get("detected_food", food_name),
            "confidence": ai_analysis_result.get("confidence", 0)
        },
        "points_earned": points_earned, # This is likely the same as ai_score for now
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    all_food_entries = load_food_entries()
    all_food_entries.append(food_entry_data)
    save_food_entries(all_food_entries)

    all_users = load_users()
    user_found_for_update = False
    for i, u_data in enumerate(all_users):
        if u_data.get('id') == current_user.id:
            updated_user_data = update_user_data_for_new_entry(u_data, points_earned)
            all_users[i] = updated_user_data
            user_found_for_update = True
            break
    
    if user_found_for_update:
        save_users(all_users)
    else:
        print(f"Error: User with ID {current_user.id} not found in users.json for update.")
        # Consider: raise HTTPException(status_code=404, detail=f"User {current_user.id} not found for update.")

    response_data = FoodEntry.model_validate(food_entry_data).model_dump()
    response_data["new_badges"] = [] # Badge logic removed for now
    # points_earned is already in response_data via FoodEntry model if it includes it

    return response_data

@api_router.get("/food-entries")
async def get_user_food_entries(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[FoodEntry]:
    # This endpoint still uses SQLAlchemy and needs to be migrated later
    result = await db_session.execute(
        select(FoodEntryDb)
        .where(FoodEntryDb.user_id == current_user.id)
        .order_by(FoodEntryDb.timestamp.desc())
        .limit(100)
    )
    entries_db = result.scalars().all()
    return [FoodEntry.model_validate(entry) for entry in entries_db]

@api_router.get("/food-entries/all")
async def get_all_food_entries(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[FoodEntry]:
    # This endpoint still uses SQLAlchemy and needs to be migrated later
    # Only admin and teachers can see all entries
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Admin sees everything, teachers see limited data
    if current_user.role == USER_ROLES["ADMIN"]:
        result = await db_session.execute(
            select(FoodEntryDb)
            .order_by(FoodEntryDb.timestamp.desc())
            .limit(1000) # Consider pagination for very large datasets
        )
        entries_db = result.scalars().all()
        return [FoodEntry.model_validate(entry) for entry in entries_db]
    else: # Teacher role
        result = await db_session.execute(
            select(FoodEntryDb)
            .order_by(FoodEntryDb.timestamp.desc())
            .limit(1000) # Consider pagination
        )
        entries_db = result.scalars().all()
        teacher_entries_response = []
        for entry_db in entries_db:
            pydantic_entry = FoodEntry.model_validate(entry_db)
            pydantic_entry.user_id = "hidden" # Anonymize user_id for teachers
            # Optionally nullify or anonymize other sensitive fields for teacher view
            # e.g., pydantic_entry.ai_feedback = None 
            teacher_entries_response.append(pydantic_entry)
        return teacher_entries_response
@api_router.get("/gallery")
async def get_gallery(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[Gallery]:
    result = await db_session.execute(
        select(GalleryDb)
        .order_by(GalleryDb.timestamp.desc())
        .limit(50)
    )
    gallery_items_db = result.scalars().all()
    return [Gallery.model_validate(item) for item in gallery_items_db]

@api_router.post("/gallery/{item_id}/like")
async def like_gallery_item(item_id: str, current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)):
    result = await db_session.execute(select(GalleryDb).where(GalleryDb.id == item_id))
    gallery_item_db = result.scalars().first()
    
    if not gallery_item_db:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    gallery_item_db.likes += 1
    # db_session.add(gallery_item_db) # Not strictly necessary as the object is already in session and tracked
    try:
        await db_session.commit()
        await db_session.refresh(gallery_item_db) # Optional: refresh to get the latest state if needed by client
    except IntegrityError: # Should not happen for a simple increment
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Database error while liking item.")

    return {"message": "Liked successfully", "likes": gallery_item_db.likes}

# Chat system
@api_router.post("/chat/send")
async def send_chat_message(
    message: str = Form(...),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
) -> ChatMessage:
    new_chat_message_db = ChatMessageDb(
        user_id=current_user.id,
        username=current_user.username,
        class_code=current_user.class_code,  # Added class_code
        message=message,
        is_admin=current_user.role == USER_ROLES["ADMIN"]
        # id and timestamp have defaults
    )
    
    db_session.add(new_chat_message_db)
    try:
        await db_session.commit()
        await db_session.refresh(new_chat_message_db)
    except IntegrityError:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Database error while sending message.")
    
    return ChatMessage.model_validate(new_chat_message_db)

@api_router.get("/chat/messages")
async def get_chat_messages(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[ChatMessage]:
    if current_user.role == USER_ROLES["ADMIN"]:
        # Admins see all messages from all classes, sorted by most recent
        stmt = select(ChatMessageDb).order_by(ChatMessageDb.timestamp.desc()).limit(100)
    else:
        # Regular users/teachers see messages from their own class, sorted by most recent
        stmt = (
            select(ChatMessageDb)
            .where(ChatMessageDb.class_code == current_user.class_code)
            .order_by(ChatMessageDb.timestamp.desc())
            .limit(100)
        )
    
    result = await db_session.execute(stmt)
    messages_db = result.scalars().all()
    return [ChatMessage.model_validate(msg) for msg in messages_db]

# Daily questions endpoints
@api_router.post("/daily-questions")
async def create_daily_question(question_data: DailyQuestion, current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> DailyQuestion:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admin can create questions")
    
    new_question_db = DailyQuestionDb(
        question_text=question_data.question_text,
        date=question_data.date, # Assuming date is already in 'YYYY-MM-DD' string format from Pydantic
        points_reward=question_data.points_reward,
        active=question_data.active
        # id will be generated
    )
    db_session.add(new_question_db)
    try:
        await db_session.commit()
        await db_session.refresh(new_question_db)
    except IntegrityError:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Database error creating daily question.")
    return DailyQuestion.model_validate(new_question_db)

@api_router.get("/daily-questions/today")
async def get_todays_questions(db_session: AsyncSession = Depends(get_db)) -> List[DailyQuestion]:
    today_str = datetime.now().strftime("%Y-%m-%d")
    # Assuming DailyQuestionDb.date is stored as String or Date type compatible with string comparison
    result = await db_session.execute(
        select(DailyQuestionDb)
        .where(DailyQuestionDb.date == today_str, DailyQuestionDb.active == True)
        .limit(10) # Keep limit if multiple questions per day are possible
    )
    questions_db = result.scalars().all()
    return [DailyQuestion.model_validate(q) for q in questions_db]

@api_router.post("/question-responses")
async def submit_question_response(
    response_data: QuestionResponseCreate,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
) -> QuestionResponse:
    # Check if user already answered this question
    existing_response_result = await db_session.execute(
        select(QuestionResponseDb).where(
            QuestionResponseDb.user_id == current_user.id,
            QuestionResponseDb.question_id == response_data.question_id
        )
    )
    existing_response_db = existing_response_result.scalars().first()
    
    if existing_response_db:
        raise HTTPException(status_code=400, detail="Already answered this question")
    
    # Get question to determine points
    question_result = await db_session.execute(
        select(DailyQuestionDb).where(DailyQuestionDb.id == response_data.question_id)
    )
    question_db = question_result.scalars().first()
    points_earned = question_db.points_reward if question_db else 5
    
    new_response_db = QuestionResponseDb(
        user_id=current_user.id,
        question_id=response_data.question_id,
        answer=response_data.answer,
        points_earned=points_earned
        # id and timestamp have defaults
    )
    db_session.add(new_response_db)
    
    # Update user points
    user_to_update_result = await db_session.execute(select(UserDb).where(UserDb.id == current_user.id))
    user_to_update_db = user_to_update_result.scalars().first()
    if not user_to_update_db:
        # Should not happen if current_user is valid
        await db_session.rollback() # Rollback the response addition
        raise HTTPException(status_code=404, detail="User not found for points update.")

    user_to_update_db.points += points_earned
    user_to_update_db.level = check_level_up(user_to_update_db.points)
    # db_session.add(user_to_update_db) # Already tracked

    try:
        await db_session.commit()
        await db_session.refresh(new_response_db)
        await db_session.refresh(user_to_update_db)
    except IntegrityError:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Database error submitting response.")
    
    return QuestionResponse.model_validate(new_response_db)

@api_router.get("/daily-questions/responses/{question_id}")
async def get_responses_for_question(question_id: str, current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[QuestionResponse]:
    # Authorization: Only admin or teacher can see all responses for a question
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        # Optionally, allow users to see responses if they've answered, or if the question is 'closed'
        # For now, restricting to admin/teacher for simplicity
        raise HTTPException(status_code=403, detail="Access denied. Admin or teacher role required.")

    result = await db_session.execute(
        select(QuestionResponseDb)
        .where(QuestionResponseDb.question_id == question_id)
        .order_by(QuestionResponseDb.timestamp.asc()) # Show in order of submission
    )
    responses_db = result.scalars().all()
    return [QuestionResponse.model_validate(response) for response in responses_db]

# Analytics endpoints
@api_router.get("/analytics/class-summary", response_model=List[ClassSummaryStat])
async def get_class_summary(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)):
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get summary statistics by class
    stmt = (
        select(
            UserDb.class_code,
            func.count(FoodEntryDb.id).label("total_entries"),
            func.avg(FoodEntryDb.ai_score).label("avg_score"),
            func.sum(FoodEntryDb.points_earned).label("total_points_from_entries"),
            func.avg(FoodEntryDb.calories_estimated).label("avg_calories"),
            func.count(distinct(FoodEntryDb.user_id)).label("active_users")
        )
        .join(UserDb, FoodEntryDb.user_id == UserDb.id)
        .group_by(UserDb.class_code)
        .order_by(UserDb.class_code)
    )

    result = await db_session.execute(stmt)
    results_db = result.all() # list of Row objects

    # Pydantic model conversion can be done here if needed, or directly by FastAPI if types match
    # For complex cases or when names don't match, manual mapping is safer:
    summaries = []
    for row in results_db:
        summaries.append(ClassSummaryStat(
            class_code=row.class_code,
            total_entries=row.total_entries or 0,
            avg_score=round(row.avg_score, 2) if row.avg_score is not None else None,
            total_points_from_entries=row.total_points_from_entries or 0,
            avg_calories=round(row.avg_calories, 1) if row.avg_calories is not None else None,
            active_users=row.active_users or 0
        ))
    return summaries

@api_router.get("/analytics/user-stats", response_model=UserStats)
async def get_user_stats(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)):
    # Get user's personal statistics from FoodEntryDb
    stmt = select(FoodEntryDb).where(FoodEntryDb.user_id == current_user.id)
    result = await db_session.execute(stmt)
    user_entries_db = result.scalars().all()

    if not user_entries_db:
        return UserStats(
            total_entries=0,
            avg_score=0,
            total_points=current_user.points,
            level=current_user.level,
            badges=current_user.badges,
            streak_days=current_user.streak_days,
            total_calories_consumed=0,
            avg_calories_per_day=0
        )

    scores = [entry.ai_score for entry in user_entries_db if entry.ai_score is not None]
    calories_values = [entry.calories_estimated for entry in user_entries_db if entry.calories_estimated is not None]
    
    avg_score_val = sum(scores) / len(scores) if scores else 0
    total_calories_val = sum(calories_values) if calories_values else 0
    
    # Calculate unique days with entries for avg_calories_per_day
    entry_dates = {entry.timestamp.date() for entry in user_entries_db}
    avg_calories_per_day_val = total_calories_val / len(entry_dates) if entry_dates else 0
    
    return UserStats(
        total_entries=len(user_entries_db),
        avg_score=round(avg_score_val, 2) if scores else None,
        total_points=current_user.points, # User's total points from User model
        level=current_user.level,
        badges=current_user.badges,
        streak_days=current_user.streak_days,
        total_calories_consumed=total_calories_val,
        avg_calories_per_day=round(avg_calories_per_day_val, 1) if entry_dates else None
    )

@api_router.get("/leaderboard")
async def get_leaderboard(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)) -> List[User]:
    # Get class leaderboard (only for same class)
    result = await db_session.execute(
        select(UserDb.id, UserDb.username, UserDb.points, UserDb.level, UserDb.badges, UserDb.class_code, UserDb.role, UserDb.streak_days, UserDb.last_entry_date, UserDb.created_at) # Explicitly list fields for Pydantic User model
        .where(UserDb.class_code == current_user.class_code)
        .order_by(UserDb.points.desc())
        .limit(20)
    )
    # users_db = result.scalars().all() # This would return only the first column if multiple are selected like this
    # Instead, we map the result rows to User Pydantic model
    leaderboard_users = []
    for row in result.all(): # .all() gives list of Row objects
        user_data = {
            "id": row.id,
            "username": row.username,
            "points": row.points,
            "level": row.level,
            "badges": row.badges,
            "class_code": row.class_code,
            "role": row.role,
            "streak_days": row.streak_days,
            "last_entry_date": row.last_entry_date,
            "created_at": row.created_at
        }
        leaderboard_users.append(User.model_validate(user_data))
    
    return leaderboard_users

# Admin endpoints
@api_router.post("/admin/create-user")
async def admin_create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if username already exists
    result = await db_session.execute(
        select(UserDb).where(
            UserDb.username == user_data.username,
            UserDb.class_code == user_data.class_code.upper() # Ensure class_code is compared in upper case
        )
    )
    existing_user_db = result.scalars().first()
    if existing_user_db:
        raise HTTPException(status_code=400, detail="Username already exists in this class")
    
    # Determine role from class code or use provided role
    role = user_data.role or get_role_from_class_code(user_data.class_code)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid class code or role")
    
    # Create user
    new_user_db = UserDb(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        class_code=user_data.class_code.upper(),
        role=role
        # id will be generated by default_factory
        # points, level, badges, streak_days, last_entry_date, created_at have defaults
    )
    
    db_session.add(new_user_db)
    try:
        await db_session.commit()
        await db_session.refresh(new_user_db)
    except IntegrityError: # Catch potential race conditions or other integrity issues
        await db_session.rollback()
        raise HTTPException(status_code=400, detail="Could not create user due to a database error.")
    
    return {
        "message": "User created successfully",
        "user": {
            "id": new_user_db.id,
            "username": new_user_db.username,
            "class_code": new_user_db.class_code,
            "role": new_user_db.role
        }
    }

@api_router.get("/admin/users")
async def admin_get_users(current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db_session.execute(select(UserDb).order_by(UserDb.created_at.desc()))
    users_db = result.scalars().all()
    # Convert list of UserDb to list of Pydantic User models, excluding password_hash
    # Note: Pydantic User model doesn't have password_hash by default in its schema for responses
    return [User.model_validate(user) for user in users_db]

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: User = Depends(get_current_user), db_session: AsyncSession = Depends(get_db)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # First, find the user to ensure it exists
    user_to_delete_result = await db_session.execute(select(UserDb).where(UserDb.id == user_id))
    user_to_delete = user_to_delete_result.scalars().first()

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    await db_session.delete(user_to_delete)
    try:
        await db_session.commit()
    except IntegrityError: # Should not happen on delete unless there are FK constraints not handled
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Could not delete user due to a database error.")
    
    return {"message": "User deleted successfully"}

@api_router.post("/admin/create-question")
async def admin_create_question(
    question: str = Form(...),
    options: str = Form(...),  # JSON string of options
    date: str = Form(...),
    points_reward: int = Form(5),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
) -> DailyQuestion:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        options_list = json.loads(options)
    except:
        raise HTTPException(status_code=400, detail="Invalid options format")
    
    # Create Pydantic model first for validation and structure
    daily_question_data = DailyQuestion(
        question=question,
        options=options_list,
        date=date, # Assuming date is already in 'YYYY-MM-DD' string format as expected by DailyQuestionDb
        points_reward=points_reward
        # id and timestamp will be set by DailyQuestionDb defaults
    )

    # Convert to DB model for saving
    new_question_db = DailyQuestionDb(
        id=daily_question_data.id, # Use id from Pydantic model if it's generated there
        question=daily_question_data.question,
        options=daily_question_data.options,
        date=daily_question_data.date,
        points_reward=daily_question_data.points_reward,
        is_active=daily_question_data.is_active # Ensure is_active is handled
    )
    
    db_session.add(new_question_db)
    try:
        await db_session.commit()
        await db_session.refresh(new_question_db)
    except IntegrityError:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail="Failed to create daily question due to a database error.")
    
    return DailyQuestion.model_validate(new_question_db)

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "SnackCheck Research Platform API v3.0 - Full Featured with HuggingFace AI!"}

@api_router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users/{user_id}/profile", response_model=User)
async def get_user_profile_by_id(user_id: str, db_session: AsyncSession = Depends(get_db)):
    result = await db_session.execute(select(UserDb).where(UserDb.id == user_id))
    user_db = result.scalars().first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    return User.model_validate(user_db)

# Include the router in the main app
async def create_db_and_tables():
    async with async_engine.begin() as conn:
        # For development, you might want to drop tables first (use with caution):
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    logging.info("Database tables created (if they didn't exist).")

@app.on_event("startup")
async def on_startup():
    logging.info("Application startup: creating database and tables...")
    await create_db_and_tables()
    logging.info("Application startup complete.")

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
async def on_shutdown():
    logging.info("Application shutdown.")
    # The SQLAlchemy async_engine does not require explicit closing here in the same way Motor client did.
    # Connections are managed by the pool and sessions.
    pass
