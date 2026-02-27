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

# Import du contenu additionnel
from data_content import LEXIQUE, TUTORIALS, SIZE_GUIDE
from patterns_extra import ADDITIONAL_PATTERNS

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
    # Also delete related comments
    await db.comments.delete_many({"project_id": project_id})
    return {"message": "Projet supprimé"}

# =====================
# GALLERY ENDPOINTS (Public Portfolio)
# =====================

class GalleryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str  # bonnet, écharpe, pull, etc.
    image_base64: Optional[str] = None
    price: Optional[str] = None  # Prix indicatif
    available: bool = True  # Disponible à la commande
    featured: bool = False  # Mis en avant
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GalleryItemCreate(BaseModel):
    title: str
    description: str
    category: str
    image_base64: Optional[str] = None
    price: Optional[str] = None
    available: bool = True
    featured: bool = False

@api_router.post("/gallery", response_model=GalleryItem)
async def create_gallery_item(item: GalleryItemCreate):
    """Add an item to the public gallery"""
    gallery_item = GalleryItem(**item.dict())
    await db.gallery.insert_one(gallery_item.dict())
    return gallery_item

@api_router.get("/gallery", response_model=List[GalleryItem])
async def get_gallery(category: Optional[str] = None, featured_only: bool = False):
    """Get all gallery items (public portfolio)"""
    query = {}
    if category:
        query["category"] = category
    if featured_only:
        query["featured"] = True
    items = await db.gallery.find(query).sort("created_at", -1).to_list(100)
    return [GalleryItem(**item) for item in items]

@api_router.get("/gallery/{item_id}", response_model=GalleryItem)
async def get_gallery_item(item_id: str):
    """Get a specific gallery item"""
    item = await db.gallery.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Élément non trouvé")
    return GalleryItem(**item)

@api_router.put("/gallery/{item_id}", response_model=GalleryItem)
async def update_gallery_item(item_id: str, item_update: GalleryItemCreate):
    """Update a gallery item"""
    item = await db.gallery.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Élément non trouvé")
    
    await db.gallery.update_one(
        {"id": item_id},
        {"$set": item_update.dict()}
    )
    updated_item = await db.gallery.find_one({"id": item_id})
    return GalleryItem(**updated_item)

@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str):
    """Delete a gallery item"""
    result = await db.gallery.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Élément non trouvé")
    return {"message": "Élément supprimé"}

# =====================
# CLIENT MESSAGES ENDPOINTS
# =====================

class ClientMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    subject: str
    message: str
    gallery_item_id: Optional[str] = None  # If related to a specific item
    project_id: Optional[str] = None  # If related to a project
    status: str = "nouveau"  # nouveau, lu, répondu, archivé
    reply: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None

class ClientMessageCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    subject: str
    message: str
    gallery_item_id: Optional[str] = None
    project_id: Optional[str] = None

class MessageReply(BaseModel):
    reply: str

@api_router.post("/messages", response_model=ClientMessage)
async def create_message(msg: ClientMessageCreate):
    """Create a new client message (public endpoint for visitors)"""
    message_obj = ClientMessage(**msg.dict())
    await db.client_messages.insert_one(message_obj.dict())
    return message_obj

@api_router.get("/messages", response_model=List[ClientMessage])
async def get_messages(status: Optional[str] = None, unread_only: bool = False):
    """Get all client messages (for Julie)"""
    query = {}
    if status:
        query["status"] = status
    if unread_only:
        query["status"] = "nouveau"
    messages = await db.client_messages.find(query).sort("created_at", -1).to_list(100)
    return [ClientMessage(**msg) for msg in messages]

@api_router.get("/messages/count")
async def get_unread_count():
    """Get count of unread messages"""
    count = await db.client_messages.count_documents({"status": "nouveau"})
    return {"unread_count": count}

@api_router.get("/messages/{message_id}", response_model=ClientMessage)
async def get_message(message_id: str):
    """Get a specific message"""
    msg = await db.client_messages.find_one({"id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return ClientMessage(**msg)

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    result = await db.client_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "lu", "read_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return {"message": "Message marqué comme lu"}

@api_router.put("/messages/{message_id}/reply", response_model=ClientMessage)
async def reply_to_message(message_id: str, reply: MessageReply):
    """Reply to a client message"""
    result = await db.client_messages.update_one(
        {"id": message_id},
        {"$set": {
            "reply": reply.reply,
            "status": "répondu",
            "replied_at": datetime.utcnow()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    updated_msg = await db.client_messages.find_one({"id": message_id})
    return ClientMessage(**updated_msg)

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    """Delete a message"""
    result = await db.client_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return {"message": "Message supprimé"}

# =====================
# PROJECT COMMENTS ENDPOINTS (Public questions on projects)
# =====================

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    author_name: str
    content: str
    reply: Optional[str] = None  # Julie's reply
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replied_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    project_id: str
    author_name: str
    content: str

class CommentReply(BaseModel):
    reply: str

@api_router.post("/comments", response_model=Comment)
async def create_comment(comment: CommentCreate):
    """Add a comment to a project (public)"""
    # Verify project exists
    project = await db.projects.find_one({"id": comment.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    comment_obj = Comment(**comment.dict())
    await db.comments.insert_one(comment_obj.dict())
    return comment_obj

@api_router.get("/projects/{project_id}/comments", response_model=List[Comment])
async def get_project_comments(project_id: str):
    """Get all comments for a project"""
    comments = await db.comments.find({"project_id": project_id}).sort("created_at", -1).to_list(100)
    return [Comment(**c) for c in comments]

@api_router.put("/comments/{comment_id}/reply", response_model=Comment)
async def reply_to_comment(comment_id: str, reply: CommentReply):
    """Reply to a comment (Julie only)"""
    result = await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"reply": reply.reply, "replied_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    
    updated_comment = await db.comments.find_one({"id": comment_id})
    return Comment(**updated_comment)

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    """Delete a comment"""
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    return {"message": "Commentaire supprimé"}

# =====================
# PREDEFINED PATTERNS (Recettes/Patrons)
# =====================

# Predefined knitting/crochet patterns with all details
PREDEFINED_PATTERNS = [
    {
        "id": "bonnet-basique",
        "name": "Bonnet Classique",
        "category": "bonnet",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "3-4 heures",
        "description": "Un bonnet simple et élégant, parfait pour débuter. Point jersey avec côtes.",
        "materials": {
            "yarn": {
                "type": "Laine mérinos ou acrylique",
                "weight": "Worsted / Aran (poids moyen)",
                "quantity": "100g (environ 200m)",
                "recommended": "Drops Nepal, Phildar Partner 6, ou similaire"
            },
            "needles": {
                "type": "Aiguilles circulaires",
                "size": "5mm et 4mm (pour les côtes)",
                "cable_length": "40cm"
            },
            "accessories": ["1 marqueur de mailles", "1 aiguille à laine"]
        },
        "gauge": "18 mailles x 24 rangs = 10cm en jersey",
        "sizes": {
            "S": "Tour de tête 54-56cm",
            "M": "Tour de tête 56-58cm",
            "L": "Tour de tête 58-60cm"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Avec les aiguilles 4mm, monter 80 (S), 88 (M) ou 96 (L) mailles. Joindre en rond en faisant attention de ne pas vriller."},
            {"step": 2, "title": "Côtes", "instruction": "Tricoter en côtes 2/2 (2 mailles endroit, 2 mailles envers) pendant 5cm."},
            {"step": 3, "title": "Corps du bonnet", "instruction": "Changer pour les aiguilles 5mm. Tricoter en jersey endroit (toutes les mailles à l'endroit) pendant 15cm."},
            {"step": 4, "title": "Diminutions", "instruction": "Commencer les diminutions: *Tricoter 6 mailles, 2 mailles ensemble*. Répéter tout le rang. Puis tricoter 1 rang sans diminution. Répéter en diminuant de plus en plus jusqu'à 8 mailles."},
            {"step": 5, "title": "Finition", "instruction": "Couper le fil en laissant 20cm. Passer dans les mailles restantes, serrer et rentrer les fils."}
        ],
        "tips": [
            "Faites un échantillon avant de commencer !",
            "Utilisez un marqueur pour repérer le début du rang",
            "Pour un bonnet plus chaud, ajoutez un pompon"
        ],
        "video_url": "https://www.youtube.com/results?search_query=tricoter+bonnet+debutant",
        "image_url": "bonnet"
    },
    {
        "id": "echarpe-cotes",
        "name": "Écharpe Côtes Anglaises",
        "category": "echarpe",
        "difficulty": "débutant",
        "estimated_time": "8-10 heures",
        "description": "Une écharpe moelleuse et réversible avec le point de côtes anglaises.",
        "materials": {
            "yarn": {
                "type": "Laine douce (alpaga, mérinos, ou mélange)",
                "weight": "Chunky / Bulky (gros fil)",
                "quantity": "200-250g (environ 300m)",
                "recommended": "Drops Air, Katia Merino Bulky, ou similaire"
            },
            "needles": {
                "type": "Aiguilles droites ou circulaires",
                "size": "6mm ou 7mm",
                "cable_length": "N/A pour droites, 60cm pour circulaires"
            },
            "accessories": ["1 aiguille à laine"]
        },
        "gauge": "14 mailles x 20 rangs = 10cm en côtes anglaises",
        "sizes": {
            "Standard": "20cm de large x 180cm de long",
            "Large": "25cm de large x 200cm de long"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 31 mailles (Standard) ou 39 mailles (Large). Le nombre doit être impair."},
            {"step": 2, "title": "Rang de préparation", "instruction": "Tricoter toutes les mailles à l'endroit."},
            {"step": 3, "title": "Rang 1 (côtes anglaises)", "instruction": "*1 maille endroit, 1 jeté, glisser 1 maille à l'envers*. Répéter jusqu'à la dernière maille, terminer par 1 maille endroit."},
            {"step": 4, "title": "Rang 2", "instruction": "*1 maille endroit, 1 jeté, glisser 1 maille à l'envers, tricoter ensemble le jeté et la maille suivante*. Répéter."},
            {"step": 5, "title": "Répéter", "instruction": "Répéter le rang 2 jusqu'à obtenir la longueur désirée (180cm ou 200cm)."},
            {"step": 6, "title": "Rabattre", "instruction": "Rabattre toutes les mailles souplement. Rentrer les fils."}
        ],
        "tips": [
            "Ce point consomme plus de laine qu'un point classique",
            "Ne serrez pas trop vos mailles pour garder l'élasticité",
            "Ajoutez des franges pour un look plus bohème"
        ],
        "image_url": "echarpe"
    },
    {
        "id": "snood-simple",
        "name": "Snood / Tour de Cou",
        "category": "echarpe",
        "difficulty": "débutant",
        "estimated_time": "4-5 heures",
        "description": "Un snood rapide à réaliser, parfait pour se protéger du froid.",
        "materials": {
            "yarn": {
                "type": "Laine épaisse et douce",
                "weight": "Super Bulky / très gros fil",
                "quantity": "150g (environ 120m)",
                "recommended": "Phildar Rapido, Bergère de France Barisienne, ou similaire"
            },
            "needles": {
                "type": "Aiguilles circulaires",
                "size": "9mm ou 10mm",
                "cable_length": "40cm ou 60cm"
            },
            "accessories": ["1 marqueur de mailles"]
        },
        "gauge": "10 mailles x 14 rangs = 10cm en jersey",
        "sizes": {
            "Unique": "60cm de circonférence x 30cm de haut"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 60 mailles. Joindre en rond."},
            {"step": 2, "title": "Côtes", "instruction": "Tricoter en côtes 1/1 (1 endroit, 1 envers) pendant 4cm."},
            {"step": 3, "title": "Corps", "instruction": "Tricoter en jersey endroit pendant 22cm."},
            {"step": 4, "title": "Côtes finales", "instruction": "Tricoter en côtes 1/1 pendant 4cm."},
            {"step": 5, "title": "Rabattre", "instruction": "Rabattre souplement en suivant le motif des côtes. Rentrer les fils."}
        ],
        "tips": [
            "Idéal comme premier projet en rond",
            "Peut se porter en double tour pour plus de chaleur",
            "Personnalisez avec un bouton décoratif"
        ],
        "image_url": "snood"
    },
    {
        "id": "couverture-bebe",
        "name": "Couverture Bébé",
        "category": "couverture",
        "difficulty": "intermédiaire",
        "estimated_time": "20-25 heures",
        "description": "Une douce couverture pour bébé au point de riz, parfaite comme cadeau de naissance.",
        "materials": {
            "yarn": {
                "type": "Laine bébé douce (coton, mérinos superwash, ou acrylique doux)",
                "weight": "DK / Light Worsted",
                "quantity": "400g (environ 1000m)",
                "recommended": "Phildar Phil Coton 3, Drops Baby Merino, ou similaire"
            },
            "needles": {
                "type": "Aiguilles circulaires (pour gérer le poids)",
                "size": "4mm",
                "cable_length": "80cm ou 100cm"
            },
            "accessories": ["1 aiguille à laine", "4 marqueurs de mailles"]
        },
        "gauge": "22 mailles x 30 rangs = 10cm au point de riz",
        "sizes": {
            "Unique": "70cm x 90cm"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 155 mailles."},
            {"step": 2, "title": "Bordure", "instruction": "Tricoter 10 rangs au point mousse (tout à l'endroit)."},
            {"step": 3, "title": "Corps - Rang impair", "instruction": "7 mailles endroit (bordure), *1 endroit, 1 envers* jusqu'aux 7 dernières mailles, 7 mailles endroit (bordure)."},
            {"step": 4, "title": "Corps - Rang pair", "instruction": "7 mailles endroit (bordure), *1 envers, 1 endroit* jusqu'aux 7 dernières mailles, 7 mailles endroit (bordure)."},
            {"step": 5, "title": "Répéter", "instruction": "Répéter les rangs 3 et 4 jusqu'à atteindre 85cm de hauteur."},
            {"step": 6, "title": "Bordure finale", "instruction": "Tricoter 10 rangs au point mousse."},
            {"step": 7, "title": "Finition", "instruction": "Rabattre toutes les mailles. Rentrer les fils. Bloquer légèrement si nécessaire."}
        ],
        "tips": [
            "Choisissez une laine lavable en machine pour les bébés",
            "Le point de riz est réversible, pas de mauvais côté !",
            "Ajoutez les initiales du bébé en broderie"
        ],
        "image_url": "couverture"
    },
    {
        "id": "chaussettes-basiques",
        "name": "Chaussettes Classiques",
        "category": "chaussettes",
        "difficulty": "intermédiaire",
        "estimated_time": "12-15 heures (la paire)",
        "description": "Des chaussettes confortables tricotées du haut vers le bas avec talon renforcé.",
        "materials": {
            "yarn": {
                "type": "Laine à chaussettes (mélange laine/nylon)",
                "weight": "Fingering / 4 ply",
                "quantity": "100g (environ 400m)",
                "recommended": "Regia 4-fädig, Drops Fabel, ou similaire"
            },
            "needles": {
                "type": "Aiguilles double pointes ou magic loop",
                "size": "2.5mm ou 2.75mm",
                "cable_length": "80cm si magic loop"
            },
            "accessories": ["1 marqueur de mailles", "1 aiguille à laine"]
        },
        "gauge": "32 mailles x 42 rangs = 10cm en jersey",
        "sizes": {
            "S (36-38)": "56 mailles",
            "M (39-41)": "64 mailles",
            "L (42-44)": "72 mailles"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 56/64/72 mailles selon la taille. Répartir sur 4 aiguilles ou utiliser le magic loop."},
            {"step": 2, "title": "Côtes de la tige", "instruction": "Tricoter en côtes 2/2 pendant 5cm."},
            {"step": 3, "title": "Tige", "instruction": "Continuer en jersey endroit pendant 15cm (ou longueur désirée)."},
            {"step": 4, "title": "Talon - Préparation", "instruction": "Tricoter sur la moitié des mailles (28/32/36) en rangs aller-retour pendant 5cm pour le talon."},
            {"step": 5, "title": "Tournant du talon", "instruction": "Diminutions centrales pour former le talon (suivre un tutoriel détaillé pour cette partie)."},
            {"step": 6, "title": "Gousset et pied", "instruction": "Relever les mailles sur les côtés du talon, puis tricoter le pied en rond jusqu'à 5cm avant la pointe."},
            {"step": 7, "title": "Pointe", "instruction": "Diminutions régulières jusqu'à 8 mailles. Fermer en grafting ou couture."}
        ],
        "tips": [
            "Le nylon dans la laine renforce la durabilité",
            "Tricotez les deux chaussettes en même temps pour éviter le 'syndrome de la 2ème chaussette'",
            "Renforcez talon et pointe avec un fil supplémentaire"
        ],
        "image_url": "chaussettes"
    },
    {
        "id": "mitaines-simples",
        "name": "Mitaines Sans Doigts",
        "category": "accessoire",
        "difficulty": "débutant",
        "estimated_time": "4-5 heures (la paire)",
        "description": "Des mitaines pratiques qui gardent les mains au chaud tout en laissant les doigts libres.",
        "materials": {
            "yarn": {
                "type": "Laine douce (mérinos, alpaga, ou mélange)",
                "weight": "DK / Light Worsted",
                "quantity": "50-80g (environ 150m)",
                "recommended": "Drops Karisma, Phildar Partner 3.5, ou similaire"
            },
            "needles": {
                "type": "Aiguilles double pointes ou magic loop",
                "size": "4mm",
                "cable_length": "40cm si circulaires"
            },
            "accessories": ["2 marqueurs de mailles", "1 aiguille à laine", "1 épingle à nourrice ou arrêt de mailles"]
        },
        "gauge": "22 mailles x 28 rangs = 10cm en jersey",
        "sizes": {
            "S": "Tour de main 16-18cm",
            "M": "Tour de main 18-20cm",
            "L": "Tour de main 20-22cm"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 36 (S), 40 (M) ou 44 (L) mailles. Joindre en rond."},
            {"step": 2, "title": "Poignet", "instruction": "Tricoter en côtes 2/2 pendant 6cm."},
            {"step": 3, "title": "Main - début", "instruction": "Tricoter en jersey endroit pendant 2cm."},
            {"step": 4, "title": "Gousset du pouce", "instruction": "Augmenter pour le pouce: placer 2 marqueurs, augmenter 1 maille de chaque côté tous les 2 rangs jusqu'à 12/14/16 mailles entre les marqueurs."},
            {"step": 5, "title": "Mettre le pouce en attente", "instruction": "Mettre les mailles du pouce sur un arrêt de mailles. Monter 2 mailles au-dessus pour combler."},
            {"step": 6, "title": "Main - suite", "instruction": "Continuer en jersey pendant 3-4cm (jusqu'à la base des doigts)."},
            {"step": 7, "title": "Bordure supérieure", "instruction": "Tricoter 4 rangs en côtes 1/1, puis rabattre souplement."},
            {"step": 8, "title": "Pouce", "instruction": "Reprendre les mailles du pouce, relever 2 mailles. Tricoter 2cm en jersey, puis 2 rangs de côtes. Rabattre."}
        ],
        "tips": [
            "Parfait pour utiliser, travailler sur téléphone",
            "Ajoutez un motif jacquard pour plus de style",
            "Tricotez la 2ème mitaine en miroir pour le pouce"
        ],
        "image_url": "mitaines"
    },
    {
        "id": "bandeau-tresse",
        "name": "Bandeau Tressé",
        "category": "accessoire",
        "difficulty": "débutant",
        "estimated_time": "2-3 heures",
        "description": "Un bandeau élégant avec une torsade centrale, parfait pour garder les oreilles au chaud.",
        "materials": {
            "yarn": {
                "type": "Laine épaisse et douce",
                "weight": "Worsted / Aran",
                "quantity": "50g (environ 80m)",
                "recommended": "Drops Nepal, Bergère de France Ideal, ou similaire"
            },
            "needles": {
                "type": "Aiguilles droites",
                "size": "5mm",
                "cable_length": "N/A"
            },
            "accessories": ["1 aiguille à torsade ou double pointe", "1 aiguille à laine"]
        },
        "gauge": "18 mailles x 24 rangs = 10cm en jersey",
        "sizes": {
            "S/M": "Tour de tête 52-56cm, largeur 10cm",
            "L": "Tour de tête 56-60cm, largeur 12cm"
        },
        "steps": [
            {"step": 1, "title": "Monter les mailles", "instruction": "Monter 20 (S/M) ou 24 (L) mailles."},
            {"step": 2, "title": "Côtes de départ", "instruction": "Tricoter 4 rangs en côtes 2/2."},
            {"step": 3, "title": "Corps", "instruction": "Tricoter en jersey jusqu'à environ 25cm du tour de tête final (laisser de la marge pour la torsade)."},
            {"step": 4, "title": "Créer la torsade", "instruction": "Diviser les mailles en 3 parties égales. Tresser comme une natte en croisant les sections. Ou faire une torsade simple en croisant les mailles centrales."},
            {"step": 5, "title": "Continuer", "instruction": "Tricoter la même longueur que la première partie."},
            {"step": 6, "title": "Côtes de fin", "instruction": "Terminer par 4 rangs en côtes 2/2."},
            {"step": 7, "title": "Assemblage", "instruction": "Coudre les deux extrémités ensemble. Rentrer les fils."}
        ],
        "tips": [
            "Projet idéal pour apprendre les torsades",
            "Utilisez une laine avec de l'élasticité pour un bon maintien",
            "Ajoutez un bouton décoratif sur la torsade"
        ],
        "image_url": "bandeau"
    },
    {
        "id": "poncho-debutant",
        "name": "Poncho Simple",
        "category": "pull",
        "difficulty": "débutant",
        "estimated_time": "15-20 heures",
        "description": "Un poncho facile composé de deux rectangles, idéal pour débuter les vêtements.",
        "materials": {
            "yarn": {
                "type": "Laine épaisse et chaude",
                "weight": "Chunky / Bulky",
                "quantity": "400-500g (environ 500m)",
                "recommended": "Drops Eskimo, Katia Maxi Merino, ou similaire"
            },
            "needles": {
                "type": "Aiguilles droites ou circulaires",
                "size": "7mm ou 8mm",
                "cable_length": "60cm si circulaires"
            },
            "accessories": ["1 aiguille à laine"]
        },
        "gauge": "12 mailles x 16 rangs = 10cm au point mousse",
        "sizes": {
            "S/M": "50cm x 60cm par rectangle",
            "L/XL": "60cm x 70cm par rectangle"
        },
        "steps": [
            {"step": 1, "title": "Premier rectangle", "instruction": "Monter 60 (S/M) ou 72 (L/XL) mailles."},
            {"step": 2, "title": "Tricoter", "instruction": "Tricoter tout au point mousse (toutes les mailles à l'endroit) pendant 60cm (S/M) ou 70cm (L/XL)."},
            {"step": 3, "title": "Rabattre", "instruction": "Rabattre toutes les mailles souplement."},
            {"step": 4, "title": "Deuxième rectangle", "instruction": "Répéter les étapes 1 à 3 pour le second rectangle."},
            {"step": 5, "title": "Assemblage", "instruction": "Placer les rectangles en L. Coudre le bord court du premier au bord long du second, en laissant une ouverture pour la tête."},
            {"step": 6, "title": "Finition", "instruction": "Rentrer tous les fils. Ajouter des franges si désiré."}
        ],
        "tips": [
            "Le point mousse ne roule pas, parfait pour un poncho",
            "Ajoutez des franges pour un style bohème",
            "Peut se porter de différentes façons"
        ],
        "image_url": "poncho"
    },
    {
        "id": "echarpe-crochet-debutant",
        "name": "Écharpe au Crochet",
        "category": "echarpe",
        "difficulty": "débutant",
        "estimated_time": "5-6 heures",
        "description": "Une écharpe simple au crochet, parfaite pour apprendre les bases.",
        "materials": {
            "yarn": {
                "type": "Laine douce et épaisse",
                "weight": "Chunky / Bulky",
                "quantity": "200g (environ 250m)",
                "recommended": "Drops Snow, Phildar Rapido, ou similaire"
            },
            "needles": {
                "type": "Crochet",
                "size": "7mm ou 8mm",
                "cable_length": "N/A"
            },
            "accessories": ["1 aiguille à laine", "Ciseaux"]
        },
        "gauge": "10 mailles x 8 rangs = 10cm en brides",
        "sizes": {
            "Standard": "20cm de large x 160cm de long"
        },
        "steps": [
            {"step": 1, "title": "Chaînette de base", "instruction": "Faire une chaînette de 25 mailles en l'air."},
            {"step": 2, "title": "Rang 1", "instruction": "1 bride dans la 4ème maille à partir du crochet, puis 1 bride dans chaque maille. (22 brides + 3 ml = 23 'mailles')"},
            {"step": 3, "title": "Rangs suivants", "instruction": "3 mailles en l'air pour tourner (compte comme 1 bride), 1 bride dans chaque maille jusqu'à la fin."},
            {"step": 4, "title": "Répéter", "instruction": "Continuer jusqu'à atteindre 160cm de longueur."},
            {"step": 5, "title": "Finition", "instruction": "Couper le fil, passer dans la dernière boucle et serrer. Rentrer les fils."},
            {"step": 6, "title": "Franges (optionnel)", "instruction": "Couper des brins de 25cm, plier en deux et attacher aux extrémités."}
        ],
        "tips": [
            "Comptez vos mailles à chaque rang pour garder la même largeur",
            "La bride est le point de base le plus polyvalent",
            "Variez les couleurs pour un effet rayé"
        ],
        "image_url": "echarpe-crochet"
    },
    {
        "id": "bonnet-crochet",
        "name": "Bonnet au Crochet",
        "category": "bonnet",
        "difficulty": "débutant",
        "estimated_time": "3-4 heures",
        "description": "Un bonnet simple au crochet, travaillé en spirale depuis le sommet.",
        "materials": {
            "yarn": {
                "type": "Laine moyenne à épaisse",
                "weight": "Worsted / Aran",
                "quantity": "100g (environ 180m)",
                "recommended": "Drops Nepal, Phildar Partner 6, ou similaire"
            },
            "needles": {
                "type": "Crochet",
                "size": "5.5mm ou 6mm",
                "cable_length": "N/A"
            },
            "accessories": ["1 marqueur de mailles", "1 aiguille à laine"]
        },
        "gauge": "14 mailles x 7 rangs = 10cm en mailles serrées",
        "sizes": {
            "Adulte": "Tour de tête 54-58cm"
        },
        "steps": [
            {"step": 1, "title": "Cercle magique", "instruction": "Faire un cercle magique (ou chaînette de 4ml fermée en rond)."},
            {"step": 2, "title": "Rang 1", "instruction": "6 mailles serrées dans le cercle. (6 ms)"},
            {"step": 3, "title": "Rang 2", "instruction": "2 mailles serrées dans chaque maille. (12 ms)"},
            {"step": 4, "title": "Rang 3", "instruction": "*1 ms, 2 ms dans la maille suivante*. Répéter. (18 ms)"},
            {"step": 5, "title": "Rangs 4-8", "instruction": "Continuer à augmenter régulièrement (+6 ms par rang) jusqu'à obtenir le diamètre souhaité (environ 18cm)."},
            {"step": 6, "title": "Corps", "instruction": "Crocheter sans augmentation jusqu'à la hauteur souhaitée (environ 20cm de profondeur)."},
            {"step": 7, "title": "Bordure", "instruction": "1 rang de mailles serrées pour une finition nette. Arrêter et rentrer les fils."}
        ],
        "tips": [
            "Utilisez un marqueur pour repérer le début du rang",
            "Travaillez en spirale continue pour éviter la démarcation",
            "Ajoutez un pompon pour plus de style"
        ],
        "image_url": "bonnet-crochet"
    }
]

class Pattern(BaseModel):
    id: str
    name: str
    category: str
    technique: Optional[str] = "aiguilles"
    difficulty: str
    estimated_time: str
    description: str
    materials: dict
    gauge: str
    sizes: dict
    steps: List[dict]
    tips: List[str]
    video_url: Optional[str] = None
    image_url: str

# Combiner les patrons de base avec les patrons supplémentaires
ALL_PATTERNS = PREDEFINED_PATTERNS + ADDITIONAL_PATTERNS

@api_router.get("/patterns", response_model=List[Pattern])
async def get_patterns(category: Optional[str] = None, difficulty: Optional[str] = None, technique: Optional[str] = None):
    """Get all predefined patterns (recipes), optionally filtered"""
    patterns = ALL_PATTERNS
    
    if category:
        patterns = [p for p in patterns if p["category"] == category]
    if difficulty:
        patterns = [p for p in patterns if p["difficulty"] == difficulty]
    if technique:
        patterns = [p for p in patterns if p.get("technique") == technique]
    
    return [Pattern(**p) for p in patterns]

@api_router.get("/patterns/{pattern_id}", response_model=Pattern)
async def get_pattern(pattern_id: str):
    """Get a specific pattern by ID"""
    for pattern in ALL_PATTERNS:
        if pattern["id"] == pattern_id:
            return Pattern(**pattern)
    raise HTTPException(status_code=404, detail="Patron non trouvé")

@api_router.get("/patterns/categories/list")
async def get_pattern_categories():
    """Get list of all pattern categories"""
    categories = list(set(p["category"] for p in ALL_PATTERNS))
    return {"categories": sorted(categories)}

@api_router.get("/patterns/difficulties/list")
async def get_pattern_difficulties():
    """Get list of all difficulty levels"""
    return {"difficulties": ["débutant", "intermédiaire", "avancé", "expert"]}

@api_router.get("/patterns/techniques/list")
async def get_pattern_techniques():
    """Get list of all techniques"""
    return {"techniques": ["aiguilles", "crochet"]}

# =====================
# LEXIQUE ENDPOINTS
# =====================

@api_router.get("/lexique")
async def get_lexique(category: Optional[str] = None):
    """Get all lexique terms, optionally filtered by category"""
    terms = LEXIQUE
    if category:
        terms = [t for t in terms if t["category"] == category]
    return terms

@api_router.get("/lexique/{term_id}")
async def get_lexique_term(term_id: str):
    """Get a specific lexique term"""
    for term in LEXIQUE:
        if term["id"] == term_id:
            return term
    raise HTTPException(status_code=404, detail="Terme non trouvé")

@api_router.get("/lexique/categories/list")
async def get_lexique_categories():
    """Get list of all lexique categories"""
    categories = list(set(t["category"] for t in LEXIQUE))
    return {"categories": sorted(categories)}

# =====================
# TUTORIALS ENDPOINTS
# =====================

@api_router.get("/tutorials")
async def get_tutorials(category: Optional[str] = None, technique: Optional[str] = None):
    """Get all tutorials, optionally filtered"""
    tutorials = TUTORIALS
    if category:
        tutorials = [t for t in tutorials if t["category"] == category]
    if technique:
        tutorials = [t for t in tutorials if t.get("technique") == technique]
    return tutorials

@api_router.get("/tutorials/{tutorial_id}")
async def get_tutorial(tutorial_id: str):
    """Get a specific tutorial"""
    for tutorial in TUTORIALS:
        if tutorial["id"] == tutorial_id:
            return tutorial
    raise HTTPException(status_code=404, detail="Tutoriel non trouvé")

# =====================
# SIZE GUIDE ENDPOINTS
# =====================

@api_router.get("/size-guide")
async def get_size_guide():
    """Get the complete size guide"""
    return SIZE_GUIDE

@api_router.get("/size-guide/{category}")
async def get_size_guide_category(category: str):
    """Get size guide for a specific category"""
    if category in SIZE_GUIDE:
        return SIZE_GUIDE[category]
    raise HTTPException(status_code=404, detail="Catégorie non trouvée")

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
