"""
API Endpoints pour les notifications et le chat JobyJoba.
"""

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core.auth import get_required_token, get_current_user_id
from core.logging_config import get_logger
from services.database import db_service
from services.billing import BillingService
from services.joby_joba import joby_joba_service

logger = get_logger()

router = APIRouter(prefix="/api/v2", tags=["Notifications & Chat"])

billing_service = BillingService(db_service)


# ===========================================
# MODELS
# ===========================================

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    application_id: Optional[str] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    read: bool = False
    created_at: str


class ChatMessage(BaseModel):
    role: str  # 'user' ou 'assistant'
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    application_id: str


class ChatResponse(BaseModel):
    response: str
    remaining_messages: int
    session_id: str


class ChatSessionResponse(BaseModel):
    session_id: str
    application_id: str
    messages: List[ChatMessage]
    remaining_messages: int
    status: str


# ===========================================
# NOTIFICATIONS ENDPOINTS
# ===========================================

@router.get("/notifications")
async def get_notifications(
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id),
    unread_only: bool = False,
    limit: int = 20
):
    """Récupère les notifications de l'utilisateur."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    query = client.table("notifications").select("*").order("created_at", desc=True).limit(limit)
    
    if unread_only:
        query = query.eq("read", False)
    
    result = query.execute()
    
    notifications = []
    unread_count = 0
    
    for notif in (result.data or []):
        notifications.append(NotificationResponse(
            id=notif["id"],
            type=notif["type"],
            title=notif["title"],
            message=notif.get("message"),
            application_id=notif.get("application_id"),
            action_url=notif.get("action_url"),
            action_label=notif.get("action_label"),
            read=notif.get("read", False),
            created_at=notif["created_at"]
        ))
        if not notif.get("read", False):
            unread_count += 1
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """Marque une notification comme lue."""
    client = db_service.get_user_client(token)
    if not client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    client.table("notifications").update({
        "read": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", notification_id).execute()
    
    return {"status": "ok"}


@router.post("/notifications/{notification_id}/accept-jobyjoba")
async def accept_jobyjoba_offer(
    notification_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """
    Accepte l'offre JobyJoba et crée une session de chat.
    Coût: 1 crédit
    """
    # Utiliser admin client pour éviter les problèmes d'encodage UTF-8
    admin_client = db_service.admin_client
    user_client = db_service.get_user_client(token)
    
    if not admin_client or not user_client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    # Vérifier que la notification existe et appartient à l'utilisateur
    notif_result = admin_client.table("notifications").select("*").eq("id", notification_id).eq("user_id", user_id).limit(1).execute()
    
    if not notif_result.data or len(notif_result.data) == 0:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    notif = notif_result.data[0]
    if notif["type"] != "offer_jobyjoba":
        raise HTTPException(status_code=400, detail="Cette notification n'est pas une offre JobyJoba")
    
    application_id = notif.get("application_id")
    if not application_id:
        raise HTTPException(status_code=400, detail="Application non trouvée")
    
    # Vérifier les crédits
    can_use, credits = await billing_service.can_search(user_id, token)
    if not can_use:
        raise HTTPException(
            status_code=402,
            detail=f"Crédits insuffisants. Vous avez {credits} crédit(s), il en faut 1."
        )
    
    # Vérifier qu'il n'y a pas déjà une session active
    existing = admin_client.table("chat_sessions").select("id").eq("application_id", application_id).eq("status", "active").limit(1).execute()
    if existing.data and len(existing.data) > 0:
        return {
            "session_id": existing.data[0]["id"],
            "message": "Session existante trouvée",
            "already_exists": True
        }
    
    # Débiter le crédit
    await billing_service._debit_credits(user_id, token, 1, "jobyjoba_session")
    
    # Récupérer le contexte de l'application
    app_result = admin_client.table("applications_v2").select("*").eq("id", application_id).limit(1).execute()
    
    if not app_result.data or len(app_result.data) == 0:
        raise HTTPException(status_code=404, detail="Application non trouvée")
    
    app_data = app_result.data[0]
    
    # Créer le message de bienvenue
    final_choice = app_data.get("final_choice", {})
    welcome_message = joby_joba_service.get_welcome_message(
        job_title=final_choice.get("title", app_data.get("job_title", "ce poste")),
        company=final_choice.get("company", "cette entreprise")
    )
    
    # Créer la session de chat avec le message de bienvenue
    initial_messages = [{
        "role": "assistant",
        "content": welcome_message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }]
    
    # Utiliser admin client pour l'insertion
    admin_client = db_service.admin_client
    session_result = admin_client.table("chat_sessions").insert({
        "user_id": user_id,
        "application_id": application_id,
        "messages": initial_messages,
        "message_count": 0,  # Le message de bienvenue ne compte pas
        "max_messages": 10,
        "status": "active"
    }).execute()
    
    session_id = session_result.data[0]["id"]
    
    # Marquer la notification comme lue
    admin_client.table("notifications").update({
        "read": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", notification_id).execute()
    
    logger.info(f"🎉 Session JobyJoba créée: {session_id[:8]} pour {user_id[:8]}")
    
    return {
        "session_id": session_id,
        "message": "Session JobyJoba créée avec succès !",
        "remaining_messages": 10,
        "welcome_message": welcome_message
    }


# ===========================================
# CHAT ENDPOINTS
# ===========================================

@router.get("/chat/session/{application_id}")
async def get_chat_session(
    application_id: str,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """Récupère la session de chat pour une application."""
    admin_client = db_service.admin_client
    if not admin_client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    result = admin_client.table("chat_sessions").select("*").eq("application_id", application_id).eq("user_id", user_id).limit(1).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Session de chat non trouvée")
    
    session = result.data[0]
    remaining = session["max_messages"] - session["message_count"]
    
    return ChatSessionResponse(
        session_id=session["id"],
        application_id=session["application_id"],
        messages=[ChatMessage(**msg) for msg in session.get("messages", [])],
        remaining_messages=max(0, remaining),
        status=session["status"]
    )


@router.post("/chat/send")
async def send_chat_message(
    request: ChatRequest,
    token: str = Depends(get_required_token),
    user_id: str = Depends(get_current_user_id)
):
    """Envoie un message à JobyJoba et reçoit une réponse."""
    client = db_service.get_user_client(token)
    admin_client = db_service.admin_client
    
    if not client or not admin_client:
        raise HTTPException(status_code=500, detail="Erreur connexion base de données")
    
    # Récupérer la session
    session_result = admin_client.table("chat_sessions").select("*").eq("application_id", request.application_id).eq("user_id", user_id).limit(1).execute()
    
    if not session_result.data or len(session_result.data) == 0:
        raise HTTPException(status_code=404, detail="Session de chat non trouvée. Acceptez d'abord l'offre JobyJoba.")
    
    session = session_result.data[0]
    
    # Vérifier le statut et les messages restants
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Cette session de chat est terminée.")
    
    remaining = session["max_messages"] - session["message_count"]
    if remaining <= 0:
        # Marquer comme terminée
        admin_client.table("chat_sessions").update({
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session["id"]).execute()
        
        raise HTTPException(
            status_code=400, 
            detail="Tu as utilisé tous tes messages ! Cette session est maintenant terminée. 🎉"
        )
    
    # Récupérer le contexte de l'application
    app_result = admin_client.table("applications_v2").select("*").eq("id", request.application_id).limit(1).execute()
    app_data = app_result.data[0] if app_result.data else {}
    
    final_choice = app_data.get("final_choice", {})
    
    context = {
        "job_title": final_choice.get("title", app_data.get("job_title")),
        "company": final_choice.get("company"),
        "location": app_data.get("location"),
        "contract_type": app_data.get("contract_type"),
        "cv_text": "",  # TODO: Récupérer depuis l'OCR si stocké
        "cover_letter": app_data.get("cover_letter_html", "")
    }
    
    # Historique des messages
    messages_history = session.get("messages", [])
    
    # Appel à JobyJoba
    assistant_response = await joby_joba_service.chat(
        user_message=request.message,
        conversation_history=messages_history,
        context=context,
        remaining_messages=remaining - 1  # -1 car on compte celui-ci
    )
    
    # Mettre à jour la session
    now = datetime.now(timezone.utc).isoformat()
    
    new_messages = messages_history + [
        {"role": "user", "content": request.message, "timestamp": now},
        {"role": "assistant", "content": assistant_response, "timestamp": now}
    ]
    
    new_count = session["message_count"] + 1
    new_remaining = session["max_messages"] - new_count
    new_status = "active" if new_remaining > 0 else "completed"
    
    admin_client.table("chat_sessions").update({
        "messages": new_messages,
        "message_count": new_count,
        "status": new_status,
        "updated_at": now
    }).eq("id", session["id"]).execute()
    
    logger.info(f"💬 Chat JobyJoba: {session['id'][:8]} - {new_count}/10 messages")
    
    return ChatResponse(
        response=assistant_response,
        remaining_messages=new_remaining,
        session_id=session["id"]
    )
