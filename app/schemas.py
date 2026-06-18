from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# --- User ---
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    is_online: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Auth ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Message ---
class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    receiver_id: Optional[str] = None  # None = global

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: Optional[str]
    content: str
    is_read: bool
    timestamp: datetime
    sender: Optional[UserResponse] = None

    model_config = {"from_attributes": True}

# --- Conversation ---
class ConversationResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    created_at: datetime
    other_user: Optional[UserResponse] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

# --- WebSocket Events ---
class WSEvent(BaseModel):
    """Base WS message format."""
    type: str  # "message", "system", "typing", "error"
    data: dict = {}
