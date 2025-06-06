from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
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
# Password Hashing disabled
# pwd_context was here

def verify_password(plain_password: str, stored_password: str) -> bool:
    """Verifies a plain password against a stored (plain text) password."""
    return plain_password == stored_password

def get_password_hash(password: str) -> str:
    """Returns the password as is (no hashing)."""
    return password


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

# CORS Middleware Configuration
origins = [
    "https://onderzoek-snackcheck.vercel.app",  # Vercel frontend
     "https://snackcheck-opal.vercel.app",   
    "http://localhost:3000",  # Local React development
    "http://127.0.0.1:3000", # Local React development
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

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

class Gallery(BaseModel):
    id: str
    user_id: str
    username: str
    food_name: str
    image_url: str
    ai_score: float # Assuming ai_score can be float
    likes: int
    created_at: str # ISO format string

class CalorieCheckRequest(BaseModel):
    food_item: str

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

class DailyQuestionCreate(BaseModel):
    question: str
    options: List[str]
    date: str  # Expecting YYYY-MM-DD format
    active: bool = True
    points_reward: int = 5


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

class FeedbackCreate(BaseModel):
    feedback_text: str
    category: Optional[str] = None

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    feedback_text: str
    category: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AdminUpdatePointsRequest(BaseModel):
    new_points: int

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
    """Returns the password as is (no hashing). Was SHA256."""
    return password

def verify_password(password: str, stored_password: str) -> bool:
    """Verifies a plain password against a stored (plain text) password. Was SHA256."""
    return password == stored_password

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

GALLERY_ITEMS_FILE = "gallery_items.json"

def load_gallery_items():
    if not os.path.exists(GALLERY_ITEMS_FILE):
        with open(GALLERY_ITEMS_FILE, 'w') as f:
            json.dump([], f) # Create empty list if file doesn't exist
        return []
    try:
        with open(GALLERY_ITEMS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {GALLERY_ITEMS_FILE}: {e}")
        return []

def save_gallery_items(gallery_items):
    try:
        with open(GALLERY_ITEMS_FILE, 'w') as f:
            json.dump(gallery_items, f, indent=2)
    except IOError as e:
        print(f"Error writing to {GALLERY_ITEMS_FILE}: {e}")

CALORIE_CHECKS_FILE = "calorie_checks.json"

def load_calorie_checks():
    if not os.path.exists(CALORIE_CHECKS_FILE):
        with open(CALORIE_CHECKS_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(CALORIE_CHECKS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {CALORIE_CHECKS_FILE}: {e}")
        return []

def save_calorie_checks(checks):
    try:
        with open(CALORIE_CHECKS_FILE, 'w') as f:
            json.dump(checks, f, indent=2)
    except IOError as e:
        print(f"Error writing to {CALORIE_CHECKS_FILE}: {e}")

FOOD_COMPARISONS_FILE = "food_comparisons.json"

def load_food_comparisons():
    if not os.path.exists(FOOD_COMPARISONS_FILE):
        with open(FOOD_COMPARISONS_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(FOOD_COMPARISONS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {FOOD_COMPARISONS_FILE}: {e}")
        return []

def save_food_comparisons(comparisons):
    try:
        with open(FOOD_COMPARISONS_FILE, 'w') as f:
            json.dump(comparisons, f, indent=2)
    except IOError as e:
        print(f"Error writing to {FOOD_COMPARISONS_FILE}: {e}")

CHAT_MESSAGES_FILE = "chat_messages.json"

def load_chat_messages():
    if not os.path.exists(CHAT_MESSAGES_FILE):
        with open(CHAT_MESSAGES_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(CHAT_MESSAGES_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {CHAT_MESSAGES_FILE}: {e}")
        return []

def save_chat_messages(messages):
    try:
        with open(CHAT_MESSAGES_FILE, 'w') as f:
            json.dump(messages, f, indent=2)
    except IOError as e:
        print(f"Error writing to {CHAT_MESSAGES_FILE}: {e}")

DAILY_QUESTIONS_FILE = "daily_questions.json"

def load_daily_questions():
    if not os.path.exists(DAILY_QUESTIONS_FILE):
        with open(DAILY_QUESTIONS_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(DAILY_QUESTIONS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {DAILY_QUESTIONS_FILE}: {e}")
        return []

def save_daily_questions(questions):
    try:
        with open(DAILY_QUESTIONS_FILE, 'w') as f:
            json.dump(questions, f, indent=2)
    except IOError as e:
        print(f"Error writing to {DAILY_QUESTIONS_FILE}: {e}")

QUESTION_RESPONSES_FILE = "question_responses.json"

def load_question_responses():
    if not os.path.exists(QUESTION_RESPONSES_FILE):
        with open(QUESTION_RESPONSES_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(QUESTION_RESPONSES_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {QUESTION_RESPONSES_FILE}: {e}")
        return []

def save_question_responses(responses):
    try:
        with open(QUESTION_RESPONSES_FILE, 'w') as f:
            json.dump(responses, f, indent=2)
    except IOError as e:
        print(f"Error writing to {QUESTION_RESPONSES_FILE}: {e}")

FEEDBACK_ITEMS_FILE = "feedback_items.json"

def load_feedback_items():
    if not os.path.exists(FEEDBACK_ITEMS_FILE):
        with open(FEEDBACK_ITEMS_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(FEEDBACK_ITEMS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading or parsing {FEEDBACK_ITEMS_FILE}: {e}")
        return []

def save_feedback_items(feedback_items):
    try:
        with open(FEEDBACK_ITEMS_FILE, 'w') as f:
            json.dump(feedback_items, f, indent=2)
    except IOError as e:
        print(f"Error writing to {FEEDBACK_ITEMS_FILE}: {e}")

# Model for user data returned after successful login (excludes password_hash)
class UserResponse(BaseModel):
    id: str
    username: str
    class_code: str
    role: str
    points: Optional[int] = 0
    level: Optional[int] = 1
    badges: Optional[List[str]] = Field(default_factory=list)
    streak_days: Optional[int] = 0
    last_entry_date: Optional[str] = None
    created_at: str


@api_router.post("/login")
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
    user_response = UserResponse.model_validate(user_data_for_response)

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

    # Add to gallery if image exists and score is high enough
    # Ensure GALLERY_SCORE_THRESHOLD is defined, e.g., GALLERY_SCORE_THRESHOLD = 6
    GALLERY_SCORE_THRESHOLD = 6 # Define threshold here or globally
    if food_entry_data.get("image_url") and food_entry_data.get("ai_score", 0) >= GALLERY_SCORE_THRESHOLD:
        gallery_item_data = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.id,
            "username": current_user.username,
            "food_name": food_entry_data["food_name"],
            "image_url": food_entry_data["image_url"],
            "ai_score": food_entry_data["ai_score"],
            "likes": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        all_gallery_items = load_gallery_items()
        all_gallery_items.append(gallery_item_data)
        save_gallery_items(all_gallery_items)

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

@api_router.get("/food-entries", response_model=List[FoodEntry]) # Added response_model for clarity and validation
async def get_user_food_entries(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query the database for food entries for the current user
    stmt = (
        select(FoodEntryDb)
        .where(FoodEntryDb.user_id == current_user.id)
        .order_by(FoodEntryDb.timestamp.desc()) # Order by timestamp, newest first
        .limit(100) # Limit to 100 entries, similar to original logic
    )
    result = await db.execute(stmt)
    food_entries_db = result.scalars().all()

    # Convert SQLAlchemy model instances to Pydantic model instances
    # This assumes FoodEntry Pydantic model can be created from FoodEntryDb attributes
    # (e.g., if FoodEntry has model_config = ConfigDict(from_attributes=True))
    user_entries = [FoodEntry.model_validate(entry_db) for entry_db in food_entries_db]
    
    return user_entries

@api_router.get("/food-entries/all")
async def get_all_food_entries(current_user: User = Depends(get_current_user)) -> List[FoodEntry]:
    # Only admin and teachers can see all entries
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        raise HTTPException(status_code=403, detail="Access denied")

    all_food_entries_data = load_food_entries()
    
    # Sort all entries by date, recent first
    # Assuming 'created_at' is an ISO format string
    all_food_entries_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Limit the number of entries (e.g., to the most recent 1000)
    limited_entries_data = all_food_entries_data[:1000]

    processed_entries = []
    for entry_data in limited_entries_data:
        try:
            pydantic_entry = FoodEntry.model_validate(entry_data)
            if current_user.role == USER_ROLES["TEACHER"]:
                pydantic_entry.user_id = "hidden" # Anonymize user_id for teachers
                # Optionally nullify or anonymize other sensitive fields for teacher view:
                # pydantic_entry.ai_feedback = None 
                # pydantic_entry.username = "hidden" # If username is present and needs hiding
            processed_entries.append(pydantic_entry)
        except Exception as e:
            print(f"Error validating food entry data for /all endpoint: {e} - Data: {entry_data}")
            # Decide how to handle: skip this entry, raise error, etc.
            
    return processed_entries
@api_router.get("/gallery", response_model=List[Gallery]) # Added response_model for clarity and validation
async def get_gallery(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Query the database for gallery items
    stmt = (
        select(GalleryDb)
        .order_by(GalleryDb.timestamp.desc()) # Order by timestamp, newest first
        .limit(50) # Limit to 50 items, similar to original logic
    )
    result = await db.execute(stmt)
    gallery_items_db = result.scalars().all()

    # Convert SQLAlchemy model instances to Pydantic model instances
    # This assumes Gallery Pydantic model can be created from GalleryDb attributes
    # (e.g., if Gallery has model_config = ConfigDict(from_attributes=True))
    gallery_items_response = [Gallery.model_validate(item_db) for item_db in gallery_items_db]
    
    return gallery_items_response

@api_router.post("/gallery/{item_id}/like")
async def like_gallery_item(item_id: str, current_user: User = Depends(get_current_user)):
    all_gallery_items = load_gallery_items()
    item_found = False
    updated_likes = 0

    for item in all_gallery_items:
        if item.get("id") == item_id:
            item["likes"] = item.get("likes", 0) + 1
            updated_likes = item["likes"]
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    save_gallery_items(all_gallery_items)
    
    return {"message": "Like registered successfully", "item_id": item_id, "likes": updated_likes}

# Chat system
@api_router.post("/chat/send")
async def send_chat_message(
    message: str = Form(...),
    current_user: User = Depends(get_current_user)
) -> ChatMessage:
    chat_message_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "username": current_user.username,
        "class_code": current_user.class_code,
        "message": message,
        "is_admin": current_user.role == USER_ROLES["ADMIN"],
        "timestamp": datetime.now(timezone.utc).isoformat() # Store as ISO string
    }
    
    all_messages = load_chat_messages()
    all_messages.append(chat_message_data)
    save_chat_messages(all_messages)
    
    # Validate data before returning, ensuring it matches Pydantic model (especially timestamp)
    # The Pydantic model ChatMessage expects a datetime object for timestamp if not changed.
    # We need to ensure ChatMessage Pydantic model expects a string for timestamp or convert here.
    # For consistency with other JSON-stored models, let's assume ChatMessage.timestamp is also string.
    # If ChatMessage.timestamp is datetime, then: validated_message = ChatMessage.model_validate(chat_message_data)
    # and ensure Pydantic model handles string to datetime conversion if necessary or change model field to str.
    
    # Assuming ChatMessage Pydantic model's timestamp field is string or handles string conversion:
    try:
        validated_message = ChatMessage.model_validate(chat_message_data)
        return validated_message
    except Exception as e:
        print(f"Error validating chat message data: {e} - Data: {chat_message_data}")
        # This case should ideally not happen if data is constructed correctly
        raise HTTPException(status_code=500, detail="Error processing chat message after saving.")

@api_router.get("/chat/messages")
async def get_chat_messages(current_user: User = Depends(get_current_user)) -> List[ChatMessage]:
    all_messages_data = load_chat_messages()
    
    filtered_messages = []
    if current_user.role == USER_ROLES["ADMIN"]:
        filtered_messages = all_messages_data
    else:
        for msg_data in all_messages_data:
            if msg_data.get("class_code") == current_user.class_code:
                filtered_messages.append(msg_data)
    
    # Sort messages by timestamp (descending - recent first)
    # Assumes timestamp is an ISO string that can be sorted lexicographically
    filtered_messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Limit to the most recent 100 messages
    limited_messages_data = filtered_messages[:100]
    
    # Validate and convert to Pydantic models
    response_messages = []
    for msg_data in limited_messages_data:
        try:
            response_messages.append(ChatMessage.model_validate(msg_data))
        except Exception as e:
            print(f"Error validating chat message data for GET /chat/messages: {e} - Data: {msg_data}")
            # Optionally, decide to skip this item or handle error differently
            
    return response_messages

# Calorie Checker & Food Comparison Endpoints
@api_router.post("/calorie-check", response_model=Dict) # Assuming the analysis result is a Dict
async def check_calories(request: CalorieCheckRequest, current_user: User = Depends(get_current_user)):
    food_item_name = request.food_item
    
    try:
        # Call the existing HuggingFace analysis function
        # This function might need to be adapted if its output isn't directly what's needed
        analysis_result = await analyze_food_with_huggingface(food_item_name)
    except Exception as e:
        # Log the exception e
        print(f"Error during HuggingFace analysis for {food_item_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing food item: {e}")

    calorie_check_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "food_item": food_item_name,
        "result": analysis_result, # Store the full analysis
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    all_checks = load_calorie_checks()
    all_checks.append(calorie_check_data)
    save_calorie_checks(all_checks)
    
    return analysis_result # Return the analysis part to the user


class FoodCompareRequest(BaseModel):
    food_item1: str
    food_item2: str

@api_router.post("/food-compare", response_model=Dict) # Assuming the response is a Dict containing both analyses
async def compare_foods(request: FoodCompareRequest, current_user: User = Depends(get_current_user)):
    food1_name = request.food_item1
    food2_name = request.food_item2
    
    try:
        analysis1_result = await analyze_food_with_huggingface(food1_name)
    except Exception as e:
        print(f"Error during HuggingFace analysis for {food1_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing {food1_name}: {e}")

    try:
        analysis2_result = await analyze_food_with_huggingface(food2_name)
    except Exception as e:
        print(f"Error during HuggingFace analysis for {food2_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing {food2_name}: {e}")

    # For now, the comparison_result will just be a container for both analyses
    # More sophisticated comparison logic could be added here later.
    comparison_data_to_store = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "food_1_name": food1_name,
        "food_2_name": food2_name,
        "food_1_analysis": analysis1_result,
        "food_2_analysis": analysis2_result,
        "comparison_summary": f"Comparison between {food1_name} and {food2_name}.", # Basic summary
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    all_comparisons = load_food_comparisons()
    all_comparisons.append(comparison_data_to_store)
    save_food_comparisons(all_comparisons)
    
    return {
        "food_1_name": food1_name,
        "food_1_analysis": analysis1_result,
        "food_2_name": food2_name,
        "food_2_analysis": analysis2_result,
        "comparison_summary": comparison_data_to_store["comparison_summary"]
    }

# Daily questions endpoints
@api_router.post("/daily-questions")
async def create_daily_question(question_input: DailyQuestion, current_user: User = Depends(get_current_user)) -> DailyQuestion:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can create daily questions.")

    all_questions = load_daily_questions()

    # Check for date uniqueness
    for q_data in all_questions:
        # Compare date part of stored ISO string with input date object
        if date.fromisoformat(q_data['date']) == question_input.date:
            raise HTTPException(status_code=400, detail=f"A question for the date {question_input.date.isoformat()} already exists.")

    # Deactivate other active questions if this one is active
    if question_input.is_active:
        for q_data in all_questions:
            q_data['is_active'] = False

    # Prepare data for JSON storage, using Pydantic model defaults where appropriate
    # and converting date/datetime to ISO strings.
    new_question_data = {
        "id": question_input.id, # Use ID from Pydantic model (default_factory)
        "question_text": question_input.question_text,
        "date": question_input.date.isoformat(),
        "is_active": question_input.is_active,
        "created_by_user_id": current_user.id, # Explicitly set creator
        "created_at": question_input.created_at.isoformat() # Use datetime from Pydantic model (default_factory)
    }

    all_questions.append(new_question_data)
    save_daily_questions(all_questions)

    # Return the validated Pydantic model. Pydantic will parse ISO strings back to date/datetime.
    # The input `question_input` can be returned after setting `created_by_user_id` if preferred,
    # but constructing from `new_question_data` ensures what's returned matches what's stored.
    return DailyQuestion.model_validate(new_question_data)

@api_router.get("/daily-questions/today")
async def get_todays_questions() -> List[DailyQuestion]: # Removed db_session
    today_date_obj = date.today() # Get today as a date object
    all_questions_data = load_daily_questions()
    
    todays_active_questions_data = []
    for q_data in all_questions_data:
        question_date_obj = date.fromisoformat(q_data.get("date", "")) # Parse stored ISO string to date object
        if question_date_obj == today_date_obj and q_data.get("is_active", False):
            todays_active_questions_data.append(q_data)
            
    # Limit to 10, consistent with original logic, though ideally only one is active per day
    limited_questions_data = todays_active_questions_data[:10]
    
    response_questions = []
    for q_data in limited_questions_data:
        try:
            response_questions.append(DailyQuestion.model_validate(q_data))
        except Exception as e:
            print(f"Error validating daily question data for GET /daily-questions/today: {e} - Data: {q_data}")
            # Optionally skip this item
            
@api_router.post("/question-responses")
async def submit_question_response(
    response_data: QuestionResponseCreate,
    current_user: User = Depends(get_current_user)
) -> QuestionResponse:
    all_responses = load_question_responses()

    # Check if user already answered this question
    for resp in all_responses:
        if resp.get("user_id") == current_user.id and resp.get("question_id") == response_data.question_id:
            raise HTTPException(status_code=400, detail="You have already answered this question.")

    # Check if the question exists
    all_questions = load_daily_questions()
    target_question = next((q for q in all_questions if q.get("id") == response_data.question_id), None)
    if not target_question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Points logic: Fixed points for now, as DailyQuestion Pydantic model lacks points_reward
    points_earned = 5 

    # Update user points and streak in users.json
    users = load_users()
    user_found_for_update = False
    for user_dict in users:
        if user_dict.get("id") == current_user.id:
            user_dict["points"] = user_dict.get("points", 0) + points_earned
            # Simple streak increment; more complex logic (e.g., daily check) would require more state
            user_dict["streak"] = user_dict.get("streak", 0) + 1 
            user_found_for_update = True
            break
    if user_found_for_update:
        save_users(users)
    else:
        # This should ideally not happen if current_user is valid
        print(f"Warning: User with ID {current_user.id} not found in users.json for point update.")

    new_response_data = {
        "id": str(uuid.uuid4()),
        "question_id": response_data.question_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "response_text": response_data.response_text,
        "class_code": current_user.class_code,
        "points_earned": points_earned,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    all_responses.append(new_response_data)
    save_question_responses(all_responses)

    try:
        validated_response = QuestionResponse.model_validate(new_response_data)
        return validated_response
    except Exception as e:
        print(f"Error validating question response data: {e} - Data: {new_response_data}")
        raise HTTPException(status_code=500, detail="Error processing response after saving.")

@api_router.get("/daily-questions/responses/{question_id}")
async def get_responses_for_question(question_id: str, current_user: User = Depends(get_current_user)) -> List[QuestionResponse]:
    # Authorization: Only admin or teacher can see all responses for a question
    if current_user.role not in [USER_ROLES["ADMIN"], USER_ROLES["TEACHER"]]:
        # Optionally, allow users to see responses if they've answered, or if the question is 'closed'
        # For now, restricting to admin/teacher for simplicity
        raise HTTPException(status_code=403, detail="Access denied. Admin or teacher role required.")

    all_responses_data = load_question_responses()
    
    question_specific_responses = []
    for resp_data in all_responses_data:
        if resp_data.get("question_id") == question_id:
            question_specific_responses.append(resp_data)
            
    # Sort responses by timestamp (ascending - oldest first)
    # Assumes timestamp is an ISO string that can be sorted lexicographically
    question_specific_responses.sort(key=lambda x: x.get("timestamp", ""))
    
    # Validate and convert to Pydantic models
    validated_responses = []
    for resp_data in question_specific_responses:
        try:
            validated_responses.append(QuestionResponse.model_validate(resp_data))
        except Exception as e:
            print(f"Error validating question response data for GET /daily-questions/responses: {e} - Data: {resp_data}")
            # Optionally, decide to skip this item or handle error differently
            
    return validated_responses

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
    current_user: User = Depends(get_current_user)
):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    all_users = load_users()
    class_code_upper = user_data.class_code.upper()

    # Check if username already exists in this class
    for existing_user in all_users:
        if existing_user.get("username") == user_data.username and \
           existing_user.get("class_code") == class_code_upper:
            raise HTTPException(status_code=400, detail="Username already exists in this class")

    # Determine role from class code or use provided role
    role = user_data.role or get_role_from_class_code(class_code_upper)
    if not role:
        raise HTTPException(status_code=400, detail="Invalid class code or role not determinable")

    # Create new user dictionary
    new_user_id = str(uuid.uuid4())
    new_user_entry = {
        "id": new_user_id,
        "username": user_data.username,
        "password_hash": get_password_hash(user_data.password), # Use the correct hashing function
        "class_code": class_code_upper,
        "role": role,
        "points": 0,
        "level": 1,
        "badges": [],
        "streak_days": 0,
        "last_entry_date": None, # Stored as string or None
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "daily_calorie_goal_override": None,
        "daily_protein_goal_override": None
    }

    all_users.append(new_user_entry)
    save_users(all_users)

    # Return a subset of user info, similar to original, excluding password_hash
    return {
        "message": "User created successfully",
        "user": {
            "id": new_user_id,
            "username": new_user_entry["username"],
            "class_code": new_user_entry["class_code"],
            "role": new_user_entry["role"]
        }
    }


@api_router.post("/admin/users/{user_id}/reset-points-streak", response_model=User)
async def admin_reset_user_points_streak(
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    all_users = load_users()
    user_to_update = None
    user_index = -1

    for i, u in enumerate(all_users):
        if u.get("id") == user_id:
            user_to_update = u
            user_index = i
            break

    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_to_update["points"] = 0
    user_to_update["streak_days"] = 0
    # Potentially also reset level if it's derived from points, or last_entry_date if streak is reset
    # For now, only points and streak_days as per direct request.

    all_users[user_index] = user_to_update
    save_users(all_users)

    try:
        # Validate the updated user data before returning
        updated_user_model = User.model_validate(user_to_update)
        return updated_user_model
    except Exception as e:
        print(f"Error validating user data after reset: {e} - Data: {user_to_update}")
        # This should ideally not happen if the structure is maintained correctly
        raise HTTPException(status_code=500, detail="Error processing user data after reset.")


@api_router.post("/admin/users/{user_id}/update-points", response_model=User)
async def admin_update_user_points(
    user_id: str,
    points_data: AdminUpdatePointsRequest,
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    all_users = load_users()
    user_to_update = None
    user_index = -1

    for i, u in enumerate(all_users):
        if u.get("id") == user_id:
            user_to_update = u
            user_index = i
            break

    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if points_data.new_points < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Points cannot be negative.")

    user_to_update["points"] = points_data.new_points
    # Note: Level is not automatically recalculated here. This might be a future enhancement.

    all_users[user_index] = user_to_update
    save_users(all_users)

    try:
        updated_user_model = User.model_validate(user_to_update)
        return updated_user_model
    except Exception as e:
        print(f"Error validating user data after points update: {e} - Data: {user_to_update}")
        raise HTTPException(status_code=500, detail="Error processing user data after points update.")


@api_router.get("/admin/users", response_model=List[User])
async def admin_get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_users_data = load_users()
    
    # Sort users by created_at (descending - newest first)
    # Assumes created_at is an ISO string that can be sorted lexicographically
    all_users_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Validate and convert to Pydantic User models
    # Pydantic's User model does not include 'password_hash', so it will be excluded automatically.
    validated_users = []
    for user_data in all_users_data:
        try:
            validated_users.append(User.model_validate(user_data))
        except Exception as e:
            print(f"Error validating user data for GET /admin/users: {e} - Data: {user_data}")
            # Optionally, decide to skip this item or handle error differently
            
    return validated_users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_users = load_users()
    user_to_delete_index = -1
    for i, user_dict in enumerate(all_users):
        if user_dict.get("id") == user_id:
            user_to_delete_index = i
            break
            
    if user_to_delete_index == -1:
        raise HTTPException(status_code=404, detail="User not found")
    
    del all_users[user_to_delete_index]
    save_users(all_users)

    # Cascading delete for food_entries.json
    try:
        all_food_entries = load_food_entries()
        # Filter out food entries belonging to the deleted user
        updated_food_entries = [entry for entry in all_food_entries if entry.get("user_id") != user_id]
        if len(updated_food_entries) < len(all_food_entries):
            save_food_entries(updated_food_entries)
            food_entries_message = "Food entries for the user also deleted."
        else:
            food_entries_message = "No food entries found for the user to delete."
    except Exception as e:
        # Log this error but don't let it fail the whole user deletion process
        print(f"Error during cascading delete of food entries for user {user_id}: {e}")
        food_entries_message = "Could not process food entry deletion due to an error."

    # Cascading delete for chat_messages.json
    chat_messages_delete_message = ""
    try:
        all_chat_messages = load_chat_messages()
        updated_chat_messages = [msg for msg in all_chat_messages if msg.get("user_id") != user_id]
        if len(updated_chat_messages) < len(all_chat_messages):
            save_chat_messages(updated_chat_messages)
            chat_messages_delete_message = "Chat messages for the user also deleted."
        else:
            chat_messages_delete_message = "No chat messages found for the user to delete."
    except Exception as e:
        print(f"Error during cascading delete of chat messages for user {user_id}: {e}")
        chat_messages_delete_message = "Could not process chat message deletion due to an error."

    # Cascading delete for question_responses.json
    question_responses_delete_message = ""
    try:
        all_question_responses = load_question_responses()
        updated_question_responses = [resp for resp in all_question_responses if resp.get("user_id") != user_id]
        if len(updated_question_responses) < len(all_question_responses):
            save_question_responses(updated_question_responses)
            question_responses_delete_message = "Question responses for the user also deleted."
        else:
            question_responses_delete_message = "No question responses found for the user to delete."
    except Exception as e:
        print(f"Error during cascading delete of question responses for user {user_id}: {e}")
        question_responses_delete_message = "Could not process question response deletion due to an error."

    # Cascading delete for gallery_items.json
    gallery_items_delete_message = ""
    try:
        all_gallery_items = load_gallery_items()
        updated_gallery_items = [item for item in all_gallery_items if item.get("user_id") != user_id]
        if len(updated_gallery_items) < len(all_gallery_items):
            save_gallery_items(updated_gallery_items)
            gallery_items_delete_message = "Gallery items for the user also deleted."
        else:
            gallery_items_delete_message = "No gallery items found for the user to delete."
    except Exception as e:
        print(f"Error during cascading delete of gallery items for user {user_id}: {e}")
        gallery_items_delete_message = "Could not process gallery item deletion due to an error."

    # Cascading delete for calorie_checks.json
    calorie_checks_delete_message = ""
    try:
        all_calorie_checks = load_calorie_checks()
        updated_calorie_checks = [check for check in all_calorie_checks if check.get("user_id") != user_id]
        if len(updated_calorie_checks) < len(all_calorie_checks):
            save_calorie_checks(updated_calorie_checks)
            calorie_checks_delete_message = "Calorie checks for the user also deleted."
        else:
            calorie_checks_delete_message = "No calorie checks found for the user to delete."
    except Exception as e:
        print(f"Error during cascading delete of calorie checks for user {user_id}: {e}")
        calorie_checks_delete_message = "Could not process calorie check deletion due to an error."

    # Cascading delete for food_comparisons.json
    food_comparisons_delete_message = ""
    try:
        all_food_comparisons = load_food_comparisons()
        updated_food_comparisons = [comp for comp in all_food_comparisons if comp.get("user_id") != user_id]
        if len(updated_food_comparisons) < len(all_food_comparisons):
            save_food_comparisons(updated_food_comparisons)
            food_comparisons_delete_message = "Food comparisons for the user also deleted."
        else:
            food_comparisons_delete_message = "No food comparisons found for the user to delete."
    except Exception as e:
        print(f"Error during cascading delete of food comparisons for user {user_id}: {e}")
        food_comparisons_delete_message = "Could not process food comparison deletion due to an error."

    return {
        "message": f"User deleted successfully from users.json. {food_entries_message} {chat_messages_delete_message} {question_responses_delete_message} {gallery_items_delete_message} {calorie_checks_delete_message} {food_comparisons_delete_message}"
    }

@api_router.post("/admin/create-question", response_model=DailyQuestion)
async def admin_create_question(
    question_data: DailyQuestionCreate, 
    current_user: User = Depends(get_current_user)
) -> DailyQuestion:
    if current_user.role != USER_ROLES["ADMIN"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    all_questions = load_daily_questions()

    # Check if a question for this date already exists
    for q_dict in all_questions:
        if q_dict.get("date") == question_data.date:
            raise HTTPException(status_code=400, detail=f"A question for date {question_data.date} already exists.")

    # If the new question is set to active, deactivate any other active questions
    if question_data.active:
        for q_dict in all_questions:
            if q_dict.get("active") is True:
                q_dict["active"] = False # Deactivate existing active question

    new_question_entry = {
        "id": str(uuid.uuid4()),
        "question": question_data.question,
        "options": question_data.options,
        "date": question_data.date,
        "active": question_data.active,
        "points_reward": question_data.points_reward,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    all_questions.append(new_question_entry)
    save_daily_questions(all_questions)

    try:
        validated_question = DailyQuestion.model_validate(new_question_entry)
        return validated_question
    except Exception as e:
        print(f"Error validating daily question data: {e} - Data: {new_question_entry}")
        raise HTTPException(status_code=500, detail="Error processing question after saving.")

@api_router.post("/feedback", response_model=Feedback)
async def submit_feedback(feedback_input: FeedbackCreate, current_user: User = Depends(get_current_user)) -> Feedback:
    feedback_data = {
        "id": str(uuid.uuid4()), # Pydantic's default_factory for Feedback model will also generate one
        "user_id": current_user.id,
        "username": current_user.username,
        "feedback_text": feedback_input.feedback_text,
        "category": feedback_input.category,
        "timestamp": datetime.now(timezone.utc).isoformat() # Pydantic will parse this to datetime
    }

    all_feedback_items = load_feedback_items()
    all_feedback_items.append(feedback_data)
    save_feedback_items(all_feedback_items)

    # Validate the data with the Feedback Pydantic model before returning
    # This ensures the response conforms to the defined schema (e.g., ISO str to datetime)
    try:
        validated_feedback = Feedback.model_validate(feedback_data)
        return validated_feedback
    except Exception as e:
        print(f"Error validating feedback data: {e} - Data: {feedback_data}")
        # This case should ideally not happen if data is constructed correctly
        raise HTTPException(status_code=500, detail="Error processing feedback after saving.")

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
