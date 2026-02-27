from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# System message for the AI assistant
SYSTEM_MESSAGE = """Tu es Julie, une experte passionnée de tricot et crochet avec plus de 20 ans d'expérience.
Tu es l'assistante personnelle de l'application "Julie Créations".

Ton rôle est d'aider les utilisateurs avec:
- L'analyse de leurs projets en cours (photos)
- Les recommandations d'aiguilles et de crochets (tailles, matériaux)
- Le choix de la laine (poids, composition, quantité nécessaire)
- L'estimation du temps pour chaque projet
- Les techniques pour améliorer et accélérer le travail
- La correction d'erreurs et résolution de problèmes
- Des conseils sur les points et motifs

Tu dois toujours:
- Répondre en français
- Être chaleureuse et encourageante
- Donner des conseils précis et pratiques
- Expliquer les techniques de façon claire
- Suggérer des alternatives si nécessaire

Quand on te montre une photo d'un projet:
1. Identifie le type de projet (bonnet, écharpe, pull, etc.)
2. Analyse le point utilisé
3. Évalue la qualité du travail
4. Donne des conseils d'amélioration si nécessaire
5. Estime le temps restant si le projet est en cours
6. Suggère les outils et laines appropriés

Sois professionnelle mais accessible, comme une amie experte qui partage ses connaissances."""

# Models
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    image_base64: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Nouvelle conversation"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    image_base64: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    message_id: str

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    project_type: str  # bonnet, écharpe, pull, etc.
    yarn_type: Optional[str] = None
    needle_size: Optional[str] = None
    status: str = "en_cours"  # en_cours, terminé, en_pause
    image_base64: Optional[str] = None
    notes: Optional[str] = None
    estimated_time: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(BaseModel):
    name: str
    description: str
    project_type: str
    yarn_type: Optional[str] = None
    needle_size: Optional[str] = None
    image_base64: Optional[str] = None
    notes: Optional[str] = None

# Store active chat sessions
chat_sessions = {}

def get_or_create_chat(conversation_id: str) -> LlmChat:
    """Get existing chat session or create a new one"""
    if conversation_id not in chat_sessions:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message=SYSTEM_MESSAGE
        )
        # Use GPT-4o for vision capabilities
        chat.with_model("openai", "gpt-4o")
        chat_sessions[conversation_id] = chat
    return chat_sessions[conversation_id]

# Routes
@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur Julie Créations API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Julie Créations"}

# Chat endpoints
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the AI assistant"""
    try:
        # Create or get conversation
        if request.conversation_id:
            conversation_id = request.conversation_id
            # Check if conversation exists
            conv = await db.conversations.find_one({"id": conversation_id})
            if not conv:
                # Create new conversation
                conv = Conversation(id=conversation_id)
                await db.conversations.insert_one(conv.dict())
        else:
            # Create new conversation
            conv = Conversation()
            await db.conversations.insert_one(conv.dict())
            conversation_id = conv.id
        
        # Get or create chat session
        chat = get_or_create_chat(conversation_id)
        
        # Load previous messages from DB to maintain context
        previous_messages = await db.messages.find(
            {"conversation_id": conversation_id}
        ).sort("timestamp", 1).to_list(50)
        
        # Create user message
        if request.image_base64:
            # Clean base64 string if it has data URL prefix
            image_data = request.image_base64
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            image_content = ImageContent(image_base64=image_data)
            user_message = UserMessage(
                text=request.message,
                image_contents=[image_content]
            )
        else:
            user_message = UserMessage(text=request.message)
        
        # Send message and get response
        response_text = await chat.send_message(user_message)
        
        # Save user message to DB
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=request.message,
            image_base64=request.image_base64
        )
        await db.messages.insert_one(user_msg.dict())
        
        # Save assistant response to DB
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text
        )
        await db.messages.insert_one(assistant_msg.dict())
        
        # Update conversation title if it's the first message
        if len(previous_messages) == 0:
            # Generate a title based on the first message
            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
            await db.conversations.update_one(
                {"id": conversation_id},
                {"$set": {"title": title, "updated_at": datetime.utcnow()}}
            )
        else:
            await db.conversations.update_one(
                {"id": conversation_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
        
        return ChatResponse(
            conversation_id=conversation_id,
            response=response_text,
            message_id=assistant_msg.id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la communication avec l'assistant: {str(e)}")

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations():
    """Get all conversations"""
    conversations = await db.conversations.find().sort("updated_at", -1).to_list(100)
    return [Conversation(**conv) for conv in conversations]

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str):
    """Get all messages in a conversation"""
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(1000)
    return [Message(**msg) for msg in messages]

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and its messages"""
    await db.conversations.delete_one({"id": conversation_id})
    await db.messages.delete_many({"conversation_id": conversation_id})
    # Remove from active sessions
    if conversation_id in chat_sessions:
        del chat_sessions[conversation_id]
    return {"message": "Conversation supprimée"}

# Project endpoints
@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    project_obj = Project(**project.dict())
    await db.projects.insert_one(project_obj.dict())
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    projects = await db.projects.find().sort("updated_at", -1).to_list(100)
    return [Project(**proj) for proj in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return Project(**project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectCreate):
    """Update a project"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    update_data = project_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    updated_project = await db.projects.find_one({"id": project_id})
    return Project(**updated_project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return {"message": "Projet supprimé"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
