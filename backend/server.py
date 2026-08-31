from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from google import genai
from google.genai import types
import base64
import time
from collections import defaultdict
from passlib.hash import bcrypt
from jose import jwt, JWTError

# Import du contenu additionnel
from data_content import LEXIQUE, TUTORIALS, SIZE_GUIDE
from patterns_extra import ADDITIONAL_PATTERNS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Gemini API Key (free tier)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

# Admin auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-in-production-' + str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
# Hash du mot de passe admin (sera initialisé au premier démarrage ou via env var)
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', '')

security = HTTPBearer(auto_error=False)

def create_jwt_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({**data, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    """Dependency that protects admin-only endpoints."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token d'authentification requis")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Accès administrateur requis")
        return True
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

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
SYSTEM_MESSAGE = """Tu es Julie Créations, l'assistante IA experte du monde du tricot et du crochet.

IDENTITÉ :
Tu es chaleureuse, précise et passionnée. Tu t'exprimes toujours en français, avec enthousiasme bienveillant.
Tu as 25 ans d'expérience comme créatrice textile et enseignante de tricot. Tu es l'amie experte que tout tricoteur rêve d'avoir.

TES EXPERTISES :
• Tricot sur aiguilles : jersey, point mousse, côtes, jacquard, colorwork, torsades, dentelle, entrelac
• Crochet : maille serrée, bride, double bride, amigurumi, dentelle, motifs 3D, granny square
• Fibres et laines : mérinos, alpaga, cachemire, coton, mohair, soie, acrylique, mélangés, planté-bas
• Marques : Drops Design, Phildar, Bergère de France, La Droguerie, BC Garn, Katia, Paintbox, WE ARE KNITTERS
• Calculs : conversions tailles mondiales, estimation de laine précise, tension/jauge, modifications de patron
• Matériel : aiguilles (bambou, métal, bois), crochets, markers, bloquage, compteurs

RÈGLES ABSOLUES :
1. Toujours répondre en français, avec chaleur et précision
2. Être CONCRÈTE : chiffres exacts (ex: "8 mm", "100g", "environ 3h"), pas de vague
3. Structurer les réponses longues avec listes et étapes numérotées
4. Pour les photos : décrire d'abord ce que tu vois, puis conseiller
5. Terminer par une question de suivi ou un conseil bonus inattendu
6. Jamais de “je ne peux pas” ou “je ne suis pas sûre” — toujours une réponse ou une alternative

ANALYSE DE PHOTOS (quand une image est partagée) :
1. Identifie : type de projet, technique utilisée, point(s) principal(aux)
2. Évalue : tension, régularité, qualité générale (bienveillamment)
3. Estime le stade d’avancement (%)
4. Formule 2-3 conseils d’amélioration très concrets
5. Recommande le matériel optimal si pertinent

CALCUL DE LAINE :
- Toujours demander : taille souhaitée, type de fil, technique (tricot ou crochet)
- Calculer précisément et arrondir à la pelote supérieure
- Toujours ajouter 10-15% de surplus (variation de tension + travaux futurs)
- Recommander des marques disponibles en France

STYLE DE RÉPONSE :
- Utilisations ponctuelles de 🧶 (fil/tricot) et ✨ (astuces) uniquement si naturel
- Réponses inédites et personnalisées, pas de formules génériques
- Tu mémorises tout ce que l’utilisatrice te dit dans la conversation (projets, matériel, niveau)
"""

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

# Store active chat sessions (conversation history per session)
chat_sessions: dict = {}

def _build_gemini_contents(conversation_id: str, message: str, image_base64: Optional[str] = None):
    """Build Gemini-compatible contents list from chat history."""
    contents = []

    # Add conversation history
    for msg in chat_sessions.get(conversation_id, [])[-20:]:
        role = "user" if msg["role"] == "user" else "model"
        text = msg["content"] if isinstance(msg["content"], str) else msg["content"][0].get("text", "") if isinstance(msg["content"], list) else str(msg["content"])
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))

    # Build current message parts
    parts = [types.Part.from_text(text=message)]
    if image_base64:
        img_data = image_base64
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        parts.append(types.Part.from_bytes(data=base64.b64decode(img_data), mime_type="image/jpeg"))

    contents.append(types.Content(role="user", parts=parts))
    return contents

async def send_message_to_ai(conversation_id: str, message: str, image_base64: Optional[str] = None) -> str:
    """Send a message to Gemini and return the response"""
    if not gemini_client:
        raise Exception("GEMINI_API_KEY non configurée")

    if conversation_id not in chat_sessions:
        chat_sessions[conversation_id] = []

    contents = _build_gemini_contents(conversation_id, message, image_base64)

    response = await gemini_client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_MESSAGE),
    )
    response_text = response.text

    # Store in session history
    chat_sessions[conversation_id].append({"role": "user", "content": message})
    chat_sessions[conversation_id].append({"role": "assistant", "content": response_text})
    return response_text

# Routes
@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur Julie Créations API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Julie Créations"}

# =====================
# ADMIN AUTH ENDPOINTS
# =====================

class AdminLoginRequest(BaseModel):
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    expires_in_hours: int = JWT_EXPIRE_HOURS

@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(req: AdminLoginRequest):
    """Authenticate as admin and get a JWT token."""
    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="Mot de passe admin non configuré sur le serveur")
    if not bcrypt.verify(req.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    token = create_jwt_token({"role": "admin", "sub": "julie"})
    return AdminLoginResponse(token=token)

@api_router.post("/admin/hash-password")
async def hash_password_util(req: AdminLoginRequest, _: bool = Depends(require_admin)):
    """Utility: generate a bcrypt hash for a new password. Admin-only."""
    return {"hash": bcrypt.hash(req.password)}

# Rate limiter: max 20 requêtes par heure par IP
_rate_store: dict = defaultdict(list)

def _check_rate_limit(ip: str, max_req: int = 20, window_sec: int = 3600):
    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < window_sec]
    if len(_rate_store[ip]) >= max_req:
        raise HTTPException(status_code=429, detail="Trop de requêtes. Réessayez dans une heure.")
    _rate_store[ip].append(now)

# Chat endpoints
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, req: Request):
    """Send a message to the AI assistant"""
    _check_rate_limit(req.client.host if req.client else "unknown")
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
        
        # Load previous messages from DB to maintain context
        previous_messages = await db.messages.find(
            {"conversation_id": conversation_id}
        ).sort("timestamp", 1).to_list(50)
        
        # Send message to AI and get response
        response_text = await send_message_to_ai(conversation_id, request.message, request.image_base64)
        
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


@api_router.post("/chat/stream")
async def chat_stream(request: ChatRequest, req: Request):
    """Streaming chat endpoint returning Server-Sent Events"""
    _check_rate_limit(req.client.host if req.client else "unknown")
    async def event_generator():
        if not gemini_client:
            yield f"data: {json.dumps({'error': 'GEMINI_API_KEY non configurée'})}\n\n"
            return
        try:
            # Get or create conversation
            conv_id = request.conversation_id
            if not conv_id:
                conv = Conversation()
                await db.conversations.insert_one(conv.dict())
                conv_id = conv.id
            else:
                conv = await db.conversations.find_one({"id": conv_id})
                if not conv:
                    new_conv = Conversation(id=conv_id)
                    await db.conversations.insert_one(new_conv.dict())

            if conv_id not in chat_sessions:
                chat_sessions[conv_id] = []

            # Save user message
            user_msg = Message(conversation_id=conv_id, role="user", content=request.message,
                               image_base64=request.image_base64)
            await db.messages.insert_one(user_msg.dict())

            # Send conversation_id first
            yield f"data: {json.dumps({'conversation_id': conv_id})}\n\n"

            # Build Gemini contents
            contents = _build_gemini_contents(conv_id, request.message, request.image_base64)

            # Stream Gemini response
            full_response = ""
            async for chunk in await gemini_client.aio.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=SYSTEM_MESSAGE),
            ):
                token = chunk.text or ""
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            yield "data: [DONE]\n\n"

            # Persist in session + DB
            chat_sessions[conv_id].append({"role": "user", "content": request.message})
            chat_sessions[conv_id].append({"role": "assistant", "content": full_response})
            asst_msg = Message(conversation_id=conv_id, role="assistant", content=full_response)
            await db.messages.insert_one(asst_msg.dict())
            await db.conversations.update_one(
                {"id": conv_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

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
async def delete_conversation(conversation_id: str, _: bool = Depends(require_admin)):
    """Delete a conversation and its messages (admin only)"""
    await db.conversations.delete_one({"id": conversation_id})
    await db.messages.delete_many({"conversation_id": conversation_id})
    # Remove from active sessions
    if conversation_id in chat_sessions:
        del chat_sessions[conversation_id]
    return {"message": "Conversation supprimée"}

# Project endpoints
@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate, _: bool = Depends(require_admin)):
    """Create a new project (admin only)"""
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
async def update_project(project_id: str, project_update: ProjectCreate, _: bool = Depends(require_admin)):
    """Update a project (admin only)"""
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
async def delete_project(project_id: str, _: bool = Depends(require_admin)):
    """Delete a project (admin only)"""
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
async def create_gallery_item(item: GalleryItemCreate, _: bool = Depends(require_admin)):
    """Add an item to the public gallery (admin only)"""
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
async def update_gallery_item(item_id: str, item_update: GalleryItemCreate, _: bool = Depends(require_admin)):
    """Update a gallery item (admin only)"""
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
async def delete_gallery_item(item_id: str, _: bool = Depends(require_admin)):
    """Delete a gallery item (admin only)"""
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
async def get_messages(status: Optional[str] = None, unread_only: bool = False, _: bool = Depends(require_admin)):
    """Get all client messages (admin only)"""
    query = {}
    if status:
        query["status"] = status
    if unread_only:
        query["status"] = "nouveau"
    messages = await db.client_messages.find(query).sort("created_at", -1).to_list(100)
    return [ClientMessage(**msg) for msg in messages]

@api_router.get("/messages/count")
async def get_unread_count(_: bool = Depends(require_admin)):
    """Get count of unread messages (admin only)"""
    count = await db.client_messages.count_documents({"status": "nouveau"})
    return {"unread_count": count}

@api_router.get("/messages/{message_id}", response_model=ClientMessage)
async def get_message(message_id: str, _: bool = Depends(require_admin)):
    """Get a specific message (admin only)"""
    msg = await db.client_messages.find_one({"id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return ClientMessage(**msg)

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, _: bool = Depends(require_admin)):
    """Mark a message as read (admin only)"""
    result = await db.client_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "lu", "read_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    return {"message": "Message marqué comme lu"}

@api_router.put("/messages/{message_id}/reply", response_model=ClientMessage)
async def reply_to_message(message_id: str, reply: MessageReply, _: bool = Depends(require_admin)):
    """Reply to a client message (admin only)"""
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
async def delete_message(message_id: str, _: bool = Depends(require_admin)):
    """Delete a message (admin only)"""
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
async def reply_to_comment(comment_id: str, reply: CommentReply, _: bool = Depends(require_admin)):
    """Reply to a comment (admin only)"""
    result = await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"reply": reply.reply, "replied_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commentaire non trouvé")
    
    updated_comment = await db.comments.find_one({"id": comment_id})
    return Comment(**updated_comment)

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, _: bool = Depends(require_admin)):
    """Delete a comment (admin only)"""
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
        "image_url": "",
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
            "accessories": [
                "1 marqueur de mailles",
                "1 aiguille à laine"
            ]
        },
        "gauge": "18 mailles x 24 rangs = 10cm en jersey",
        "sizes": {
            "S": "Tour de tête 54-56cm",
            "M": "Tour de tête 56-58cm",
            "L": "Tour de tête 58-60cm"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage des mailles et mise en rond",
                "instruction": "Prenez vos aiguilles circulaires de 4 mm et montez 80 (S), 88 (M) ou 96 (L) mailles (boucles formées sur l'aiguille pour démarrer le tricot). Placez un marqueur de mailles (un petit anneau en plastique qui glisse sur l'aiguille) juste après la dernière maille pour repérer le début du tour. Rejoignez le tricot en rond en tricotant la première maille avec le fil de la pelote, en veillant à ce que le bord des mailles ne soit pas vrillé (tordu autour du câble). Vous avez maintenant exactement 80 (S), 88 (M) ou 96 (L) mailles prêtes à être tricotées en cercle."
            },
            {
                "step": 2,
                "title": "Tricoter les côtes de la bordure",
                "instruction": "Tricotez en côtes 2/2 en alternant 2 mailles endroit (piquez l'aiguille de gauche à droite vers l'arrière) et 2 mailles envers (piquez de droite à gauche vers l'avant en passant le fil devant). Glissez votre marqueur de mailles de l'aiguille gauche vers la droite à la fin de chaque tour sans le tricoter. Répétez ce motif régulier sur une hauteur exacte de 5 cm, ce qui correspond à environ 12 tours. Vous obtenez ainsi une bordure très souple et extensible qui maintiendra parfaitement le bonnet sur votre tête."
            },
            {
                "step": 3,
                "title": "Tricoter le corps du bonnet",
                "instruction": "Prenez votre aiguille circulaire de 5 mm dans la main droite pour remplacer progressivement l'aiguille de 4 mm au fil du tricot. Tricotez toutes les mailles à l'endroit, ce qui forme le point de jersey endroit (un point lisse obtenu automatiquement en tricotant toujours à l'endroit en rond). Continuez ce travail tout à l'endroit tour après tour pendant 15 cm de hauteur, soit exactement 36 tours. À la fin de cette étape, votre bonnet doit mesurer 20 cm au total depuis le bord monté."
            },
            {
                "step": 4,
                "title": "Premières diminutions de la couronne",
                "instruction": "Pour réduire le haut du bonnet, tricotez le premier tour de diminutions : répétez 6 mailles endroit, puis 2 mailles ensemble à l'endroit (piquez l'aiguille droite dans les 2 mailles suivantes en même temps pour n'en faire qu'une seule) jusqu'à la fin du tour. Il vous reste alors 70 (S), 77 (M) ou 84 (L) mailles sur le câble. Tricotez ensuite 1 tour complet tout à l'endroit sans aucune diminution pour stabiliser le tricot."
            },
            {
                "step": 5,
                "title": "Deuxième tour de diminutions",
                "instruction": "Au tour suivant, tricotez en répétant 5 mailles endroit, puis 2 mailles ensemble à l'endroit sur l'ensemble du tour. Il vous reste désormais 60 (S), 66 (M) ou 72 (L) mailles au total sur l'aiguille. Tricotez de nouveau 1 tour complet tout à l'endroit sans faire de diminution. Cette alternance permet de resserrer doucement le haut du bonnet sans créer de plis."
            },
            {
                "step": 6,
                "title": "Diminutions progressives serrées",
                "instruction": "Tricotez un tour avec 4 mailles endroit, 2 mailles ensemble, puis faites 1 tour tout endroit (il reste 50 (S), 55 (M) ou 60 (L) mailles). Au tour suivant, répétez 3 mailles endroit, 2 mailles ensemble, puis faites 1 tour tout endroit (il reste 40 (S), 44 (M) ou 48 (L) mailles). Enchaînez directement avec un tour de 2 mailles endroit, 2 mailles ensemble (il reste 30 (S), 33 (M) ou 36 (L) mailles). Si le câble devient trop long, utilisez le Magic Loop (tirer une boucle de câble entre les mailles pour réduire la tension)."
            },
            {
                "step": 7,
                "title": "Dernières diminutions du sommet",
                "instruction": "Tricotez un tour en répétant 1 maille endroit, 2 mailles ensemble tout le long pour obtenir 20 (S), 22 (M) ou 24 (L) mailles. Au tour suivant, tricotez toutes les mailles deux par deux en faisant uniquement des 2 mailles ensemble à l'endroit. Il ne vous reste plus que 10 (S), 11 (M) ou 12 (L) mailles sur votre aiguille. Retirez délicatement votre marqueur de mailles de l'aiguille."
            },
            {
                "step": 8,
                "title": "Fermeture et finitions",
                "instruction": "Couper le fil de travail en gardant une longueur de 20 cm, puis enfilez-le sur une aiguille à laine (aiguille à bout rond avec un grand œillet). Passez l'aiguille à laine à travers les 10 (S), 11 (M) ou 12 (L) mailles restantes et retirez l'aiguille à tricoter. Tirez fermement sur le fil pour fermer hermétiquement le trou du sommet. Faites passer le fil à l'intérieur du bonnet puis procédez au rentrage des fils (cacher les extrémités en les serpentant dans les mailles invisibles de l'envers) avant de couper le surplus."
            }
        ],
        "tips": [
            "Faites un échantillon avant de commencer !",
            "Utilisez un marqueur pour repérer le début du rang",
            "Pour un bonnet plus chaud, ajoutez un pompon"
        ],
        "video_url": "https://www.youtube.com/results?search_query=tricoter+bonnet+debutant"
    },
    {
        "id": "echarpe-cotes",
        "name": "Écharpe Côtes Anglaises",
        "category": "echarpe",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "8-10 heures",
        "description": "Une écharpe moelleuse et réversible avec le point de côtes anglaises.",
        "image_url": "",
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
            "accessories": [
                "1 aiguille à laine"
            ]
        },
        "gauge": "14 mailles x 20 rangs = 10cm en côtes anglaises",
        "sizes": {
            "Standard": "20cm de large x 180cm de long",
            "Large": "25cm de large x 200cm de long"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage des mailles",
                "instruction": "Prenez votre aiguille de 6mm ou 7mm et votre fil gros de catégorie Chunky. Montez 31 mailles pour la taille Standard (20cm de large) ou 39 mailles pour la taille Large (25cm de large) avec la méthode du montage continental (technique de base pour placer les premières mailles sur l'aiguille). Veillez à garder vos mailles bien souples sans trop serrer le fil autour du bois. Ce nombre impair de mailles est indispensable pour obtenir des bordures parfaitement symétriques."
            },
            {
                "step": 2,
                "title": "Rang de préparation",
                "instruction": "Tenez l'aiguille contenant les mailles dans votre main gauche et l'aiguille vide dans votre main droite. Tricotez toutes les mailles à l'endroit (passer l'aiguille droite sous le brin avant de la maille, enrouler le fil de l'arrière vers l'avant et tirer une nouvelle boucle). Vous devez obtenir exactement 31 mailles pour la taille Standard ou 39 mailles pour la taille Large à la fin du rang. Ce premier rang prépare le tricot et stabilise la bordure de votre écharpe."
            },
            {
                "step": 3,
                "title": "Comprendre les gestes clés",
                "instruction": "Pour réussir le point de côtes anglaises, vous allez combiner deux mouvements très simples. Le jeté (action de faire passer le fil de travail par-dessus l'aiguille droite vers l'avant) crée une boucle supplémentaire. La maille glissée à l'envers (glisser une maille de l'aiguille gauche vers la droite sans la tricoter) permet de reporter la maille. La combinaison de ces gestes crée l'épaisseur ultra moelleuse et réversible de l'écharpe."
            },
            {
                "step": 4,
                "title": "Premier rang de motif (Rang 1)",
                "instruction": "Tricotez 1 maille endroit, puis ramenez le fil vers l'avant entre les aiguilles pour faire 1 jeté et glissez la maille suivante à l'envers sur l'aiguille droite. Répétez cette séquence d'actions sur tout le rang jusqu'à la dernière maille. Terminez le rang en tricotant la toute dernière maille à l'endroit. Vous obtenez un total de 31 mailles (Standard) ou 39 mailles (Large) accompagnées de leurs jetés."
            },
            {
                "step": 5,
                "title": "Deuxième rang de motif (Rang 2)",
                "instruction": "Tournez votre ouvrage et commencez toujours par 1 maille endroit. Tricotez ensemble à l'endroit le jeté et la maille glissée du rang précédent (piquez l'aiguille droite à travers les deux brin en même temps puis tirez le fil), puis faites 1 jeté et glissez la maille suivante à l'envers. Répétez ce motif jusqu'à la dernière maille que vous tricotez seule à l'endroit."
            },
            {
                "step": 6,
                "title": "Tricoter le corps de l'écharpe",
                "instruction": "Répétez uniquement l'étape du Rang 2 sur l'ensemble de votre écharpe. Tricotez ainsi 360 rangs au total pour obtenir une longueur de 180cm (taille Standard) ou 400 rangs pour atteindre 200cm (taille Large). Mesurez régulièrement votre travail à plat avec un mètre ruban pour vérifier que votre jauge respecte bien 14 mailles et 20 rangs pour un carré de 10cm sur 10cm."
            },
            {
                "step": 7,
                "title": "Rabattre les mailles",
                "instruction": "Une fois la longueur atteinte, vous allez rabattre les mailles (fermer le tricot pour empêcher les mailles de se défaire). Tricotez les deux premières mailles à l'endroit en traitant chaque groupe maille-jeté comme une seule maille, puis passez la première maille par-dessus la deuxième et laissez-la tomber de l'aiguille. Répétez jusqu'à ce qu'il ne reste qu'une maille, coupez le fil à 20cm et passez-le dans la boucle finale pour sécuriser."
            },
            {
                "step": 8,
                "title": "Rentrer les fils et finitions",
                "instruction": "Enfilez le fil restant sur votre aiguille à laine (aiguille épaisse à bout rond conçue pour la couture du tricot). Tissez le fil sur environ 5cm le long de la bordure intérieure pour le cacher proprement sans créer de bosse. Coupez le surplus de fil à ras de l'ouvrage, puis répétez l'opération pour le fil du début. Votre écharpe moelleuse est prête !"
            }
        ],
        "tips": [
            "Ce point consomme plus de laine qu'un point classique",
            "Ne serrez pas trop vos mailles pour garder l'élasticité",
            "Ajoutez des franges pour un look plus bohème"
        ]
    },
    {
        "id": "snood-simple",
        "name": "Snood / Tour de Cou",
        "category": "echarpe",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "4-5 heures",
        "description": "Un snood rapide à réaliser, parfait pour se protéger du froid.",
        "image_url": "",
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
            "accessories": [
                "1 marqueur de mailles"
            ]
        },
        "gauge": "10 mailles x 14 rangs = 10cm en jersey",
        "sizes": {
            "Unique": "60cm de circonférence x 30cm de haut"
        },
        "steps": [
            {
                "step": 1,
                "title": "Monter les mailles",
                "instruction": "Prenez votre aiguille circulaire de 9mm ou 10mm et votre pelote de laine très grosse (Super Bulky). Montez exactement 60 mailles sur votre aiguille pour obtenir la taille unique de 60cm de circonférence. Veillez à ne pas trop serrer vos mailles sur le câble pour garder une bonne souplesse. Vous devez obtenir une ligne uniforme de 60 mailles réparties sur le câble."
            },
            {
                "step": 2,
                "title": "Joindre le travail en rond",
                "instruction": "Placez votre marqueur de mailles (un petit anneau repère en plastique) sur l'aiguille droite pour marquer le début de chaque tour. Vérifiez attentivement que vos mailles ne sont pas vrillées (tordues sur elles-mêmes autour du câble). Prenez le fil venant de la pelote et tricotez la première maille montée pour fermer le cercle. Le marqueur glissera d'une aiguille à l'autre sans tomber à la fin de chaque tour."
            },
            {
                "step": 3,
                "title": "Démarrer les côtes 1/1",
                "instruction": "Vous allez commencer la bordure inférieure. Tricotez 1 maille endroit (piquez l'aiguille droite dans la maille de gauche d'avant en arrière, enroulez le fil et sortez la boucle), puis 1 maille envers (passez le fil devant, piquez d'arrière en avant, enroulez et sortez la boucle). Répétez cette alternance (1 maille endroit, 1 maille envers) tout au long du tour sur les 60 mailles."
            },
            {
                "step": 4,
                "title": "Tricoter la bordure en côtes",
                "instruction": "Continuez de tricoter en côtes 1/1 en tricotant toujours les mailles endroit à l'endroit et les mailles envers à l'envers. Réalisez ainsi 6 tours complets au total. Cela correspond exactement à une hauteur de 4cm pour votre bordure."
            },
            {
                "step": 5,
                "title": "Tricoter le corps en jersey",
                "instruction": "Passez maintenant au corps du snood en jersey endroit (en tricot circulaire, le jersey s'obtient simplement en tricotant toutes les mailles à l'endroit). Tricotez l'ensemble des 60 mailles à l'endroit, tour après tour, sans plus faire de mailles envers. Poursuivez sur 31 tours complets, soit exactement 22cm de hauteur de jersey."
            },
            {
                "step": 6,
                "title": "Tricoter la bordure supérieure",
                "instruction": "Reprenez le motif des côtes 1/1 pour la finition haute du tour de cou. Reprenez l'alternance d'une maille endroit puis d'une maille envers sur tout le tour. Tricotez à nouveau 6 tours complets (4cm de hauteur) pour atteindre la hauteur totale requise de 30cm."
            },
            {
                "step": 7,
                "title": "Rabattre les mailles",
                "instruction": "Rabattez (fermez) les 60 mailles souplement en suivant le motif des côtes. Tricotez les 2 premières mailles comme elles se présentent, puis avec l'aiguille gauche, passez la première maille par-dessus la seconde et laissez-la tomber. Tricotez la maille suivante, passez la précédente par-dessus, et répétez jusqu'à la dernière maille. Coupez le fil à 15cm du bord et passez-le dans la dernière boucle pour faire un nœud discret."
            },
            {
                "step": 8,
                "title": "Rentrer les fils",
                "instruction": "Enfilez le fil restant sur une aiguille à laine (une aiguille à bout rond avec un gros chat). Tissez ce fil sur l'envers de votre tricot en le faisant serpenter dans les mailles de la bordure sur 3 à 4cm pour le bloquer. Coupez le fil qui dépasse à ras, puis faites la même chose avec le fil du tout début du montage."
            }
        ],
        "tips": [
            "Idéal comme premier projet en rond",
            "Peut se porter en double tour pour plus de chaleur",
            "Personnalisez avec un bouton décoratif"
        ]
    },
    {
        "id": "couverture-bebe",
        "name": "Couverture Bébé",
        "category": "couverture",
        "technique": "aiguilles",
        "difficulty": "intermédiaire",
        "estimated_time": "20-25 heures",
        "description": "Une douce couverture pour bébé au point de riz, parfaite comme cadeau de naissance.",
        "image_url": "",
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
            "accessories": [
                "1 aiguille à laine",
                "4 marqueurs de mailles"
            ]
        },
        "gauge": "22 mailles x 30 rangs = 10cm au point de riz",
        "sizes": {
            "Unique": "70cm x 90cm"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage des mailles",
                "instruction": "Prenez vos aiguilles circulaires (deux aiguilles reliées par un câble souple) de 4 mm et votre fil de laine. Montez les mailles (action de créer la première série de boucles sur l'aiguille) pour obtenir exactement 155 mailles sur votre aiguille, ce qui correspond à une largeur de 70 cm. Veillez à garder un geste souple pour ne pas trop serrer les mailles lors de ce premier rang."
            },
            {
                "step": 2,
                "title": "Bordure inférieure au point mousse",
                "instruction": "Tricotez 10 rangs complets au point mousse (technique où l'on tricote toutes les mailles à l'endroit, le fil toujours placé derrière le travail). Au cours du 10ème rang, placez un marqueur de mailles (petit anneau repère que l'on glisse d'une aiguille à l'autre) après la 7ème maille et un autre juste avant les 7 dernières mailles. Ces 7 mailles situées de chaque côté formeront les bordures latérales qui empêcheront la couverture de rouler."
            },
            {
                "step": 3,
                "title": "Corps de la couverture - Rang 1",
                "instruction": "Tricotez les 7 premières mailles à l'endroit puis faites glisser le premier marqueur. Sur les 141 mailles centrales, commencez le motif en alternant 1 maille endroit (passer l'aiguille dans la boucle de bas en haut et attraper le fil par l'arrière) et 1 maille envers (ramener le fil devant l'aiguille puis piquer de haut en bas) jusqu'au second marqueur. Glissez le dernier marqueur et tricotez les 7 dernières mailles à l'endroit."
            },
            {
                "step": 4,
                "title": "Corps de la couverture - Rang 2",
                "instruction": "Tricotez les 7 premières mailles à l'endroit et glissez le marqueur. Pour former le point de riz (motif de petits grains où l'on tricote l'inverse de la maille qui se présente au rang précédent), tricotez 1 maille envers au-dessus de chaque maille endroit et 1 maille endroit au-dessus de chaque maille envers sur les 141 mailles centrales. Glissez le marqueur et terminez par les 7 mailles endroit de la bordure."
            },
            {
                "step": 5,
                "title": "Répétition du motif principal",
                "instruction": "Répétez alternativement les étapes 3 et 4 pour faire monter le corps de votre couverture. Continuez cette alternance de rangs jusqu'à ce que votre ouvrage mesure exactement 85 cm de hauteur totale depuis le bord de montage. Prenez le temps de mesurer régulièrement votre tricot à plat sans l'étirer."
            },
            {
                "step": 6,
                "title": "Bordure supérieure au point mousse",
                "instruction": "Une fois la hauteur de 85 cm atteinte, vous allez créer la bordure du haut. Tricotez 10 rangs complets uniquement à l'endroit sur l'ensemble des 155 mailles. Retirez simplement les deux marqueurs de mailles lorsqu'ils se présentent lors du premier rang de cette bordure."
            },
            {
                "step": 7,
                "title": "Rabattre les mailles",
                "instruction": "Pour terminer l'ouvrage, vous devez rabattre les mailles (action de fermer le tricot pour empêcher les boucles de se défaire). Tricotez 2 mailles endroit, puis avec la pointe de l'aiguille gauche, soulevez la première maille et passez-la par-dessus la deuxième maille pour la faire tomber de l'aiguille. Répétez ce geste maille par maille jusqu'à la dernière, puis coupez le fil à 20 cm et passez-le dans la dernière boucle pour la bloquer."
            },
            {
                "step": 8,
                "title": "Finitions et blocage",
                "instruction": "Utilisez votre aiguille à laine pour rentrer les fils (cacher les extrémités coupées en les faisant repasser discrètement à travers les mailles du bord sur environ 5 cm). Enfin, il est conseillé de bloquer (humidifier légèrement l'ouvrage et le sécher à plat épinglé aux dimensions exactes de 70 cm x 90 cm) pour uniformiser les mailles au point de riz et obtenir des bordures parfaitement droites."
            }
        ],
        "tips": [
            "Choisissez une laine lavable en machine pour les bébés",
            "Le point de riz est réversible, pas de mauvais côté !",
            "Ajoutez les initiales du bébé en broderie"
        ]
    },
    {
        "id": "chaussettes-basiques",
        "name": "Chaussettes Classiques",
        "category": "chaussettes",
        "technique": "aiguilles",
        "difficulty": "intermédiaire",
        "estimated_time": "12-15 heures (la paire)",
        "description": "Des chaussettes confortables tricotées du haut vers le bas avec talon renforcé.",
        "image_url": "",
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
            "accessories": [
                "1 marqueur de mailles",
                "1 aiguille à laine"
            ]
        },
        "gauge": "32 mailles x 42 rangs = 10cm en jersey",
        "sizes": {
            "S (36-38)": "56 mailles",
            "M (39-41)": "64 mailles",
            "L (42-44)": "72 mailles"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage et fermeture en rond",
                "instruction": "Montez 56 mailles pour la taille S, 64 mailles pour la taille M ou 72 mailles pour la taille L sur vos aiguilles de 2,5 mm, puis rejoignez en rond sans vriller le travail. Placez un marqueur de mailles (un petit anneau en plastique qui sert à repérer le début du tour) sur l'aiguille droite. Tricotez la première maille avec le brin venant de la pelote pour fermer le cercle et commencer à tricoter en rond."
            },
            {
                "step": 2,
                "title": "Côtes de la tige",
                "instruction": "Tricotez en côtes 2/2 (alternez 2 mailles endroit en piquant l'aiguille de gauche à droite, puis 2 mailles envers en passant le fil devant le travail) pendant 5 cm, soit environ 21 tours. Veillez à maintenir une tension régulière sans trop serrer votre fil pour garder de la souplesse. Ce bord élastique permet à la chaussette de bien tenir sur le mollet sans glisser."
            },
            {
                "step": 3,
                "title": "Tige en jersey",
                "instruction": "Continuez en jersey endroit (tricoter toutes les mailles à l'endroit de manière continue) pendant 15 cm, ce qui correspond à 63 tours depuis la fin des côtes. Vous obtenez un tube fluide qui forme la tige principale de la chaussette. Si vous préférez une chaussette plus courte ou plus longue, ajustez simplement cette hauteur en mesurant avec une règle."
            },
            {
                "step": 4,
                "title": "Talon renforcé",
                "instruction": "Travaillez uniquement sur la moitié des mailles, soit 28/32/36 mailles, en rangs aller-retour pendant 5 cm (environ 22 rangs) en laissant l'autre moitié en attente. Sur l'endroit du travail, répétez la séquence : 1 maille glissée (passer la maille de l'aiguille gauche vers la droite sans la tricoter), puis 1 maille endroit. Sur l'envers du travail, tricotez toutes les mailles à l'envers en passant le fil devant le travail."
            },
            {
                "step": 5,
                "title": "Tournant du talon",
                "instruction": "Pour former le creux du talon, tricotez à l'endroit sur 16/18/20 mailles, puis faites un surjet simple (glisser 1 maille sans la tricoter, tricoter la suivante à l'endroit, puis passer la maille glissée par-dessus la maille tricotée), tricotez 1 maille endroit et tournez l'ouvrage. Sur l'envers, glissez 1 maille, tricotez 5 mailles envers, puis faites 2 mailles ensemble à l'envers (piquer l'aiguille dans 2 mailles simultanément pour les tricoter ensemble), 1 maille envers et tournez. Répétez ce schéma sur chaque rang en intégrant une maille de chaque côté jusqu'à utiliser toutes les mailles latérales, pour obtenir 16/18/20 mailles restantes."
            },
            {
                "step": 6,
                "title": "Relevé des mailles du gousset",
                "instruction": "Relevez 12/14/16 mailles le long du premier bord vertical du talon en piquant votre aiguille sous les mailles lisières du bord. Tricotez ensuite à l'endroit les 28/32/36 mailles du dessus de pied qui étaient restées en attente. Relevez à nouveau 12/14/16 mailles sur le second bord du talon pour réobtenir la totalité de l'ouvrage, soit un total de 68/78/88 mailles réparties sur vos aiguilles."
            },
            {
                "step": 7,
                "title": "Diminutions du gousset et pied",
                "instruction": "Pour réduire le gousset et revenir à 56/64/72 mailles, effectuez des diminutions un tour sur deux en tricotant 2 mailles ensemble à l'endroit (piquer dans 2 mailles à la fois) avant le dessus du pied, et 1 surjet simple juste après le dessus du pied. Répétez ce tour de diminutions environ 6/7/8 fois jusqu'à retrouver votre nombre de mailles initial. Continuez ensuite tout droit en jersey endroit sur l'ensemble des mailles jusqu'à mesurer 18/20/22 cm depuis le fond du talon, soit environ 5 cm avant le bout de vos orteils."
            },
            {
                "step": 8,
                "title": "Diminutions de la pointe",
                "instruction": "Pour la pointe, divisez vos mailles en deux groupes égaux (28/32/36 mailles pour le dessus et pour le dessous du pied) et placez des marqueurs sur les côtés. Diminuez 4 mailles par tour (1 diminution à 2 mailles du bord de chaque côté du dessus et du dessous) tous les 2 tours pendant 5/6/7 fois, puis à chaque tour. Continuez ces diminutions régulières jusqu'à ce qu'il ne reste plus que 8 mailles au total sur vos aiguilles (4 mailles pour le dessus et 4 mailles pour le dessous)."
            },
            {
                "step": 9,
                "title": "Finitions et grafting",
                "instruction": "Coupez votre fil de laine en conservant une longueur de 30 cm puis enfilez ce brin sur une aiguille à laine. Fermez le bout du pied en reliant les mailles du dessus et du dessous avec un grafting (technique de couture invisible maille par maille qui imite le tricot). Passez le fil à l'intérieur de la chaussette, rentrez proprement les fils de début et de fin sur l'envers, puis coupez l'excédent de fil."
            }
        ],
        "tips": [
            "Le nylon dans la laine renforce la durabilité",
            "Tricotez les deux chaussettes en même temps pour éviter le 'syndrome de la 2ème chaussette'",
            "Renforcez talon et pointe avec un fil supplémentaire"
        ]
    },
    {
        "id": "mitaines-simples",
        "name": "Mitaines Sans Doigts",
        "category": "accessoire",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "4-5 heures (la paire)",
        "description": "Des mitaines pratiques qui gardent les mains au chaud tout en laissant les doigts libres.",
        "image_url": "",
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
            "accessories": [
                "2 marqueurs de mailles",
                "1 aiguille à laine",
                "1 épingle à nourrice ou arrêt de mailles"
            ]
        },
        "gauge": "22 mailles x 28 rangs = 10cm en jersey",
        "sizes": {
            "S": "Tour de main 16-18cm",
            "M": "Tour de main 18-20cm",
            "L": "Tour de main 20-22cm"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage des mailles et fermeture du rond",
                "instruction": "Montez 36 mailles pour la taille S, 40 mailles pour M, ou 44 mailles pour L sur vos aiguilles de 4mm. Placez un marqueur de mailles (un petit anneau en plastique glissé sur l'aiguille qui indique le début du tour) après la dernière maille. Vérifiez attentivement que la chaînette de montage ne vrille pas autour de l'aiguille, puis tricotez la première maille pour joindre en rond (technique qui consiste à tricoter en spirale continue sans jamais tourner l'ouvrage)."
            },
            {
                "step": 2,
                "title": "Tricoter le poignet en côtes 2/2",
                "instruction": "Tricotez en côtes 2/2 (alternez 2 mailles endroit, c'est-à-dire le fil vers l'arrière, et 2 mailles envers, fil vers l'avant) pendant 6 cm, soit exactement 17 tours. Glissez simplement le marqueur de début de tour d'une aiguille à l'autre à chaque fois que vous repassez devant. Cette bordure élastique permettra au poignet de la mitaine de bien tenir en place sans vous serrer."
            },
            {
                "step": 3,
                "title": "Début de la main en jersey endroit",
                "instruction": "Continuez maintenant en jersey endroit en rond (ce qui signifie tricoter toutes les mailles à l'endroit, tour après tour) sur les 36 (S), 40 (M) ou 44 (L) mailles. Tricotez ainsi pendant 2 cm, ce qui correspond à 6 tours complets. Vos mailles vont former un tissu très lisse et régulier sur la face extérieure de votre mitaine."
            },
            {
                "step": 4,
                "title": "Création du gousset du pouce",
                "instruction": "Tricotez 1 maille endroit, placez un deuxième marqueur, faites une augmentation intercalaire (soulever le brin de fil horizontal entre deux mailles avec l'aiguille gauche et le tricoter par le brin arrière pour ajouter une maille sans trou), tricotez 1 maille endroit, faites une autre augmentation, puis placez un troisième marqueur. Effectuez ce tour d'augmentations entre les deux marqueurs du pouce un tour sur deux, en tricotant un tour tout à l'endroit entre chaque. Répétez jusqu'à obtenir 12 mailles pour la taille S, 14 mailles pour M, ou 16 mailles pour L entre ces deux marqueurs du pouce."
            },
            {
                "step": 5,
                "title": "Mettre le pouce en attente",
                "instruction": "Glissez les 12 (S), 14 (M) ou 16 (L) mailles situées entre les deux marqueurs du pouce sur un arrêt de mailles (une grande épingle de sûreté pour bloquer les mailles sans qu'elles ne se défassent) en retirant ces deux marqueurs. Montez 2 nouvelles mailles directement sur l'aiguille droite au-dessus de l'espace créé pour combler le trou sous la main. Vous retrouvez ainsi votre nombre de mailles initial de 36 (S), 40 (M) ou 44 (L) mailles sur votre aiguille principale."
            },
            {
                "step": 6,
                "title": "Continuer le haut de la main",
                "instruction": "Continuez à tricoter toutes les mailles à l'endroit en rond sur ces 36 (S), 40 (M) ou 44 (L) mailles pendant 3,5 cm, soit environ 10 tours. Mesurez depuis le haut du trou du pouce jusqu'à atteindre la base de la première phalange de vos doigts. Vous pouvez essayer la mitaine sur votre main à ce stade pour vérifier que la hauteur vous convient."
            },
            {
                "step": 7,
                "title": "Bordure supérieure et rabattage",
                "instruction": "Tricotez 4 tours en côtes 1/1 (alternez 1 maille endroit et 1 maille envers) pour former une bordure supérieure souple qui ne roule pas. Rabattez ensuite toutes les mailles très souplement (tricotez 2 mailles, puis passez la première maille par-dessus la seconde avec votre aiguille gauche pour la fermer, et répétez). Coupez le fil en gardant 15 cm de longueur et tirez-le à travers la toute dernière boucle pour sécuriser le tricot."
            },
            {
                "step": 8,
                "title": "Tricoter le pouce",
                "instruction": "Remettez les 12 (S), 14 (M) ou 16 (L) mailles du pouce en attente sur vos aiguilles et relevez (piquer l'aiguille à travers le tissu tricoté pour attraper le fil et créer une maille) 2 mailles dans le creux supérieur du pouce pour éviter les trous. Tricotez ces 14 (S), 16 (M) ou 18 (L) mailles en jersey endroit pendant 2 cm (6 tours). Réalisez 2 tours en côtes 1/1, puis rabattez toutes les mailles très souplement."
            },
            {
                "step": 9,
                "title": "Finitions et seconde mitaine",
                "instruction": "À l'aide d'une aiguille à laine (une aiguille à bout rond spéciale pour la couture du tricot), rentrez proprement tous les fils sur l'envers en les glissant dans les mailles environnantes. Utilisez le fil du pouce pour resserrer et masquer discrètement les petits trous à sa base si nécessaire. Tricotez la seconde mitaine de manière totalement identique, le patron étant parfaitement symétrique."
            }
        ],
        "tips": [
            "Parfait pour utiliser, travailler sur téléphone",
            "Ajoutez un motif jacquard pour plus de style",
            "Tricotez la 2ème mitaine en miroir pour le pouce"
        ]
    },
    {
        "id": "bandeau-tresse",
        "name": "Bandeau Tressé",
        "category": "accessoire",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "2-3 heures",
        "description": "Un bandeau élégant avec une torsade centrale, parfait pour garder les oreilles au chaud.",
        "image_url": "",
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
            "accessories": [
                "1 aiguille à torsade ou double pointe",
                "1 aiguille à laine"
            ]
        },
        "gauge": "18 mailles x 24 rangs = 10cm en jersey",
        "sizes": {
            "S/M": "Tour de tête 52-56cm, largeur 10cm",
            "L": "Tour de tête 56-60cm, largeur 12cm"
        },
        "steps": [
            {
                "step": 1,
                "title": "Le montage des mailles",
                "instruction": "Monte 20 mailles pour la taille S/M ou 24 mailles pour la taille L sur tes aiguilles de 5 mm avec la méthode du montage continental (méthode de base pour placer les mailles sur l'aiguille à l'aide de deux brins de fil). Laisse un fil de 40 cm au début qui servira plus tard à la couture finale. Veille à ne pas trop serrer tes mailles sur l'aiguille pour pouvoir les tricoter facilement au rang suivant."
            },
            {
                "step": 2,
                "title": "Les côtes de départ",
                "instruction": "Tricote 4 rangs en côtes 2/2 (alternance de 2 mailles endroit et 2 mailles envers jusqu'à la fin du rang). Pour la maille endroit, pique l'aiguille de gauche à droite à travers la maille, et pour la maille envers, pique de droite à gauche avec le fil devant le travail. Ce bord élastique mesure environ 1,5 cm de hauteur et permet au bandeau de bien s'ajuster sur la tête."
            },
            {
                "step": 3,
                "title": "La première partie en jersey",
                "instruction": "Continue en point jersey (alterner un rang complet à l'endroit sur l'endroit de l'ouvrage et un rang complet à l'envers sur l'envers). Tricote ainsi pendant 22 cm soit 52 rangs pour la taille S/M, ou 24 cm soit 58 rangs pour la taille L. Compte bien tes rangs au fur et à mesure pour obtenir une longueur identique de chaque côté du bandeau."
            },
            {
                "step": 4,
                "title": "Tricoter le premier brin de la torsade",
                "instruction": "Pour préparer le croisement central, tricote uniquement les 10 premières mailles (S/M) ou 12 premières mailles (L) sur le rang endroit. Laisse les mailles restantes en attente sur un arrêt de mailles (outil en forme de grande épingle de sûreté pour sécuriser les mailles non tricotées). Tricote seulement ces 10 (S/M) ou 12 (L) mailles en point jersey pendant 24 rangs, soit environ 10 cm, puis glisse-les sur une aiguille à torsade (aiguille auxiliaire courte et courbée) et coupe le fil à 15 cm."
            },
            {
                "step": 5,
                "title": "Tricoter le second brin et croiser",
                "instruction": "Attache ton fil de pelote aux 10 (S/M) ou 12 (L) mailles laissées en attente et tricote-les aussi en point jersey pendant 24 rangs (10 cm). Croise ensuite la bande que tu viens de tricoter par-dessus la bande placée sur l'aiguille à torsade pour former le nœud. Tricote toutes les mailles sur le même rang endroit : d'abord les 10 (S/M) ou 12 (L) mailles de l'aiguille à torsade, puis celles de ton aiguille principale pour rassembler tes 20 (S/M) ou 24 (L) mailles."
            },
            {
                "step": 6,
                "title": "La seconde partie en jersey",
                "instruction": "Poursuis le tricot en point jersey sur l'ensemble des 20 (S/M) ou 24 (L) mailles désormais réunies. Tricote exactement la même longueur que pour la première partie, soit 22 cm (52 rangs) pour la taille S/M ou 24 cm (58 rangs) pour la taille L. Ton ouvrage doit mesurer au total environ 46 cm (S/M) ou 50 cm (L) avant la bordure finale."
            },
            {
                "step": 7,
                "title": "Les côtes de fin et le rabat",
                "instruction": "Tricote 4 rangs en côtes 2/2 pour créer une finition symétrique à celle du démarrage. Au rang suivant, rabats toutes les mailles (technique de fermeture consistant à tricoter 2 mailles puis à passer la première par-dessus la seconde, et ainsi de suite). Coupe le fil de travail en conservant une longueur de 40 cm pour réaliser l'assemblage."
            },
            {
                "step": 8,
                "title": "L'assemblage et les finitions",
                "instruction": "Plie le bandeau en deux en mettant le bord du début contre le bord de fin, endroit contre endroit. Utilise ton aiguille à laine (aiguille à bout rond dédiée à la couture du tricot) et l'un des fils de 40 cm pour coudre les deux extrémités au point arrière (couture solide effectuant un pas en arrière à chaque point). Rentre soigneusement les fils restants à l'intérieur des mailles sur l'envers avant de couper le surplus."
            }
        ],
        "tips": [
            "Projet idéal pour apprendre les torsades",
            "Utilisez une laine avec de l'élasticité pour un bon maintien",
            "Ajoutez un bouton décoratif sur la torsade"
        ]
    },
    {
        "id": "poncho-debutant",
        "name": "Poncho Simple",
        "category": "pull",
        "technique": "aiguilles",
        "difficulty": "débutant",
        "estimated_time": "15-20 heures",
        "description": "Un poncho facile composé de deux rectangles, idéal pour débuter les vêtements.",
        "image_url": "",
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
            "accessories": [
                "1 aiguille à laine"
            ]
        },
        "gauge": "12 mailles x 16 rangs = 10cm au point mousse",
        "sizes": {
            "S/M": "50cm x 60cm par rectangle",
            "L/XL": "60cm x 70cm par rectangle"
        },
        "steps": [
            {
                "step": 1,
                "title": "Montage des mailles du premier rectangle",
                "instruction": "Prenez vos aiguilles de 7mm ou 8mm et votre pelote de laine épaisse pour commencer. Réalisez d'abord un nœud coulant (la toute première boucle coulissante qui s'accroche à l'aiguille), puis montez exactement 60 mailles pour la taille S/M ou 72 mailles pour la taille L/XL (le montage est la méthode permettant d'aligner les mailles de départ sur l'aiguille). Veillez à ne pas trop serrer vos mailles autour de l'aiguille pour pouvoir y insérer le fil facilement lors du rang suivant."
            },
            {
                "step": 2,
                "title": "Tricot du premier rectangle au point mousse",
                "instruction": "Tricotez toutes vos mailles à l'endroit (glisser l'aiguille droite dans la maille de gauche, enrouler le fil autour et faire passer la boucle) à chaque rang pour former le point mousse (le motif le plus simple, où l'on tricote toujours à l'endroit). Continuez ainsi sur une hauteur de 60 cm, soit exactement 96 rangs pour la taille S/M, ou 70 cm, soit exactement 112 rangs pour la taille L/XL. Mesurez votre ouvrage à plat avec un mètre ruban sans étirer la laine pour vérifier la hauteur exacte."
            },
            {
                "step": 3,
                "title": "Rabattre les mailles du premier rectangle",
                "instruction": "Une fois la hauteur atteinte, vous devez rabattre les mailles (la technique permettant de fermer le bord du travail pour que le tricot ne se défasse pas). Tricotez 2 mailles à l'endroit, puis avec l'aiguille gauche, attrapez la première maille et passez-la par-dessus la seconde. Répétez l'opération jusqu'à fermer l'ensemble des 60 mailles (S/M) ou 72 mailles (L/XL) en gardant une tension très souple. Coupez le fil en conservant environ 40 cm de longueur puis passez-le dans la dernière boucle pour sécuriser."
            },
            {
                "step": 4,
                "title": "Tricot du second rectangle",
                "instruction": "Vous allez réaliser la seconde pièce du poncho de manière parfaitement identique à la première. Montez à nouveau 60 mailles (S/M) ou 72 mailles (L/XL) sur votre aiguille avec la pelote. Tricotez au point mousse pendant exactement 96 rangs pour atteindre 60 cm (S/M) ou 112 rangs pour atteindre 70 cm (L/XL). Rabattez enfin toutes les mailles très souplement et coupez le fil en laissant également 40 cm pour la couture."
            },
            {
                "step": 5,
                "title": "Positionnement des pièces pour l'assemblage",
                "instruction": "Posez vos deux rectangles tricotés à plat sur une grande table dégagée devant vous. Placez le premier rectangle verticalement (bord court de 50 cm S/M ou 60 cm L/XL en haut et en bas). Alignez le bord court du second rectangle contre le bord long supérieur droit du premier rectangle de façon à former une lettre L. Cette disposition crée la structure originale du poncho sans nécessiter d'emmanchures."
            },
            {
                "step": 6,
                "title": "Première couture de bordure",
                "instruction": "Enfilez le fil laissé en attente sur votre aiguille à laine (une aiguille à bout rond dotée d'un grand chat pour glisser la grosse laine). Cousez le bord court de 50 cm (S/M) ou 60 cm (L/XL) du premier rectangle le long du haut du bord long de 60 cm (S/M) ou 70 cm (L/XL) du second rectangle. Utilisez le point arrière (une couture solide réalisée en piquant une maille en arrière puis deux mailles en avant sur l'envers) en fixant bord à bord."
            },
            {
                "step": 7,
                "title": "Seconde couture et création de l'encolure",
                "instruction": "Rabattez le bord court resté libre du deuxième rectangle vers le bord long restant du premier rectangle pour fermer le vêtement. Cousez ce petit côté de 50 cm (S/M) ou 60 cm (L/XL) le long du grand côté restant avec la même méthode de couture au point arrière. Vous obtenez alors naturellement un poncho fermé avec une ouverture centrale pour passer la tête."
            },
            {
                "step": 8,
                "title": "Finitions et rentrage des fils",
                "instruction": "Pour terminer proprement, vous devez rentrer les fils (technique consistant à dissimuler les bouts de laine restants à l'intérieur du tricot). À l'aide de l'aiguille à laine, glissez chaque fil sur 4 à 5 cm à travers les mailles sur l'envers du poncho, puis coupez le surplus à ras. Votre ouvrage est terminé et prêt à être porté ; vous pouvez optionnellement nouer des franges en fil sur le bas du vêtement pour le personnaliser."
            }
        ],
        "tips": [
            "Le point mousse ne roule pas, parfait pour un poncho",
            "Ajoutez des franges pour un style bohème",
            "Peut se porter de différentes façons"
        ]
    },
    {
        "id": "echarpe-crochet-debutant",
        "name": "Écharpe au Crochet",
        "category": "echarpe",
        "technique": "crochet",
        "difficulty": "débutant",
        "estimated_time": "5-6 heures",
        "description": "Une écharpe simple au crochet, parfaite pour apprendre les bases.",
        "image_url": "",
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
            "accessories": [
                "1 aiguille à laine",
                "Ciseaux"
            ]
        },
        "gauge": "10 mailles x 8 rangs = 10cm en brides",
        "sizes": {
            "Standard": "20cm de large x 160cm de long"
        },
        "steps": [
            {
                "step": 1,
                "title": "Préparation et nœud coulant",
                "instruction": "Pour démarrer votre écharpe de taille Standard (20 cm de largeur), vous devez d'abord fixer votre laine lourde sur le crochet de 8 mm. Réalisez un nœud coulant (une boucle ajustable servant de point de départ) en formant une boucle avec le fil et en tirant le brin à travers. Glissez la boucle obtenue sur la tige de votre crochet et tirez doucement sur le fil pour la resserrer sans bloquer le glissement. Veillez à garder une tension souple pour pouvoir travailler facilement les premières mailles."
            },
            {
                "step": 2,
                "title": "La chaînette de base",
                "instruction": "Passez le fil par-dessus votre crochet d'arrière en avant (ce geste s'appelle un jeté) et tirez-le à travers la boucle sur le crochet pour former votre première maille en l'air (le point de base pour former une chaîne). Répétez ce mouvement exactement 25 fois pour obtenir une chaînette de 25 mailles en l'air mesurant environ 22 cm de long. Cette chaînette servira de fondation solide pour la largeur de votre écharpe de 20 cm. Prenez garde à ne pas trop serrer vos mailles pour pouvoir y insérer le crochet au rang suivant."
            },
            {
                "step": 3,
                "title": "Rang 1 : Premier rang de brides",
                "instruction": "Pour faire une bride (un point haut très souple), faites un jeté, piquez votre crochet dans la 4ème maille en l'air depuis le crochet, puis refaites un jeté et ramenez une boucle. Vous avez 3 boucles sur le crochet : faites un jeté, passez à travers les 2 premières boucles, faites un autre jeté et passez à travers les 2 dernières boucles. Répétez cette bride dans chacune des 21 mailles restantes de la chaînette jusqu'au bout. Vous devez obtenir exactement 22 brides (les 3 premières mailles sautées comptant pour 1 bride, soit 23 mailles au total au rang 1)."
            },
            {
                "step": 4,
                "title": "Rang 2 : Le demi-tour",
                "instruction": "À la fin du rang 1, réalisez 3 mailles en l'air qui serviront de chaîne de hauteur (une hauteur équivalente à la taille d'une bride) et tournez votre ouvrage comme une page de livre. Sautez la toute première maille située directement au pied des 3 mailles en l'air pour éviter de faire une augmentation (un ajout involontaire de maille). Piquez votre crochet dans la 2ème maille en prenant bien les deux brins du dessus et crochetez 1 bride. Continuez en faisant 1 bride dans chaque maille suivante, puis crochetez la dernière bride dans le haut des 3 mailles en l'air du rang précédent pour conserver un bord parfait à 23 mailles."
            },
            {
                "step": 5,
                "title": "Répétition jusqu'à la longueur finale",
                "instruction": "Répétez les explications du Rang 2 sur chaque rang suivant en conservant scrupuleusement le même nombre de 23 mailles à chaque étape. Continuez d'enchaîner les rangs jusqu'à réaliser un total de 128 rangs, soit une longueur totale mesurée de 160 cm pour la taille Standard. Si vous vous apercevez que le travail s'élargit ou s'étrécit, comptez vos mailles pour vérifier que vous avez toujours exactement 23 mailles par rang. N'hésitez pas à mesurer régulièrement votre travail à plat avec un mètre ruban sans étirer la laine."
            },
            {
                "step": 6,
                "title": "Arrêter le travail",
                "instruction": "Une fois le 128ème rang terminé et la longueur de 160 cm atteinte, coupez le fil de travail en laissant une queue de 15 cm. Effectuez une toute dernière maille en l'air, puis tirez complètement le fil coupé à travers la boucle restant sur le crochet. Tirez fermement sur le brin de fil pour sécuriser le nœud d'arrêt de votre écharpe. Ce nœud empêchera définitivement votre ouvrage de se détricoter."
            },
            {
                "step": 7,
                "title": "Rentrer les fils de finition",
                "instruction": "Enfilez le brin de fil coupé de 15 cm sur une aiguille à laine (une grande aiguille à bout rond spécialement conçue pour la couture du tricot et du crochet). Glissez l'aiguille à travers le cœur des brides sur 5 à 7 cm sur l'envers de l'ouvrage en changeant de direction pour bloquer le fil. Répétez l'opération avec le fil du tout début au niveau du nœud coulant de départ. Coupez les petits morceaux de fils qui dépassent à ras de l'ouvrage après les avoir bien camouflés."
            },
            {
                "step": 8,
                "title": "Création et pose des franges (optionnel)",
                "instruction": "À l'aide de vos ciseaux, coupez 46 brins de laine d'une longueur exacte de 25 cm chacun. Regroupez ces brins deux par deux pour obtenir 23 paires, puis pliez chaque paire en deux en formant une boucle à une extrémité. Passez cette boucle à travers la base de chaque maille sur les bords courts de l'écharpe en vous aidant de votre crochet de 8 mm. Glissez les extrémités des brins dans la boucle ainsi formée et tirez fermement pour créer un nœud solide de finition."
            }
        ],
        "tips": [
            "Comptez vos mailles à chaque rang pour garder la même largeur",
            "La bride est le point de base le plus polyvalent",
            "Variez les couleurs pour un effet rayé"
        ]
    },
    {
        "id": "bonnet-crochet",
        "name": "Bonnet au Crochet",
        "category": "bonnet",
        "technique": "crochet",
        "difficulty": "débutant",
        "estimated_time": "3-4 heures",
        "description": "Un bonnet simple au crochet, travaillé en spirale depuis le sommet.",
        "image_url": "",
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
            "accessories": [
                "1 marqueur de mailles",
                "1 aiguille à laine"
            ]
        },
        "gauge": "14 mailles x 7 rangs = 10cm en mailles serrées",
        "sizes": {
            "Adulte": "Tour de tête 54-58cm"
        },
        "steps": [
            {
                "step": 1,
                "title": "Préparation et cercle magique",
                "instruction": "Prenez votre crochet de 5,5 mm et votre laine moyenne pour réaliser un cercle magique (boucle coulissante ajustable servant de départ pour crocheter en rond sans laisser de trou au centre). Enroulez le fil deux fois autour de votre index, piquez le crochet sous le premier brin, attrapez le second brin puis tirez une boucle. Faites une maille en l'air (jeté autour du crochet et passage à travers la boucle) pour sécuriser ce cercle de départ. Cette étape fondamentale constitue la base ajustable de votre bonnet pour la taille Adulte (tour de tête 54 à 58 cm)."
            },
            {
                "step": 2,
                "title": "Rang 1 - Premier tour",
                "instruction": "Réalisez 6 mailles serrées (technique de base où l'on pique le crochet dans une maille, attrape le fil pour créer une boucle, puis refait un jeté pour passer à travers les 2 boucles) directement à l'intérieur du cercle magique. Tirez doucement sur le brin de fil libre pour resserrer complètement le trou central du sommet. Placez un marqueur de mailles (petit anneau servant à repérer le début du tour) dans la toute première maille serrée que vous venez de crocheter. Vous obtenez un total exact de 6 mailles serrées à la fin de ce premier rang."
            },
            {
                "step": 3,
                "title": "Rang 2 - Premières augmentations",
                "instruction": "Pour ce deuxième rang, effectuez une augmentation (action de crocheter 2 mailles dans une seule et même maille du rang précédent pour élargir le travail) dans chacune des 6 mailles du rang 1. Piquez votre crochet dans la première maille, faites une maille serrée, puis piquez à nouveau exactement au même endroit pour faire une seconde maille serrée. N'oubliez pas de déplacer votre marqueur de mailles sur la première maille du nouveau rang à chaque tour. Vous devez obtenir exactement 12 mailles serrées à la fin de ce rang."
            },
            {
                "step": 4,
                "title": "Rangs 3 à 6 - Élargissement du sommet",
                "instruction": "Au rang 3, alternez 1 maille serrée classique et 1 augmentation tout autour du cercle pour obtenir 18 mailles. Au rang 4, crochetez 2 mailles serrées puis 1 augmentation tout au long du tour pour arriver à 24 mailles. Poursuivez au rang 5 avec 3 mailles serrées suivies d'une augmentation (30 mailles), puis au rang 6 avec 4 mailles serrées et 1 augmentation (36 mailles). Déplacez consciencieusement votre marqueur de mailles dans la première maille de chaque rang pour garder un compte précis."
            },
            {
                "step": 5,
                "title": "Rangs 7 à 13 - Diamètre final du sommet",
                "instruction": "Continuez d'augmenter le cercle en ajoutant 1 maille serrée de plus entre chaque augmentation à chaque rang supplémentaire. Au rang 13, vous ferez 11 mailles serrées suivies d'une augmentation, répétées 6 fois, pour atteindre un total exact de 78 mailles. À la fin du rang 13, votre pièce à plat doit mesurer très exactement 18 cm de diamètre, ce qui correspond à la taille Adulte (54-58 cm). Si votre mesure diffère, vérifiez que votre jauge donne bien 14 mailles pour 10 cm."
            },
            {
                "step": 6,
                "title": "Rangs 14 à 32 - Le corps du bonnet",
                "instruction": "Du rang 14 au rang 32 inclus (soit 19 rangs au total), crochetez simplement 1 maille serrée dans chaque maille du rang précédent, sans faire aucune augmentation. Maintenez exactement vos 78 mailles à chaque tour en continuant de déplacer le marqueur de mailles au début de chaque rang. Au fur et à mesure des rangs, le travail va naturellement se courber pour former un tube arrondi sans couture. À la fin du rang 32, la hauteur totale du bonnet mesurée à plat depuis le sommet doit atteindre 20 cm."
            },
            {
                "step": 7,
                "title": "Rang 33 - Bordure de finition",
                "instruction": "Pour offrir une bordure nette à votre bonnet, réalisez un dernier rang composé uniquement de mailles coulées (maille très plate où l'on pique le crochet, attrape le fil et le passe directement à travers la boucle du crochet). Piquez dans la maille suivante, faites un jeté et traversez tout de suite la boucle présente sur votre crochet sans faire de jeté intermédiaire. Crochetez ainsi 1 maille coulée dans chacune des 78 mailles sans trop serrer votre fil pour conserver la souplesse de l'ourlet. Vous obtenez une hauteur totale finale de 21 cm."
            },
            {
                "step": 8,
                "title": "Finitions et rentrage des fils",
                "instruction": "Coupez le fil de travail en conservant une longueur de 15 cm, puis tirez complètement la boucle sur votre crochet pour fermer le dernier point. Enfilez ce fil sur une aiguille à laine (aiguille à bout rond dotée d'un grand chas pour tisser les fils sans les abîmer). Tissez le fil à l'intérieur de la bordure sur environ 5 cm avant de couper l'excédent à ras. Retournez ensuite le bonnet pour resserrer une dernière fois le fil du cercle magique au sommet et rentrez-le soigneusement sur l'envers."
            }
        ],
        "tips": [
            "Utilisez un marqueur pour repérer le début du rang",
            "Travaillez en spirale continue pour éviter la démarcation",
            "Ajoutez un pompon pour plus de style"
        ]
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
    image_url: str = "https://images.unsplash.com/photo-1591144984044-009a102ace51"  # Default knitting image

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

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
