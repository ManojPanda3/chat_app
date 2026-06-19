from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Message, Conversation
from app.schemas import ConversationResponse, UserResponse, MessageResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationResponse])
async def get_my_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all conversations for the current user with last message and other user."""
    result = await db.execute(
        select(Conversation)
        .where(
            or_(
                Conversation.user1_id == current_user.id,
                Conversation.user2_id == current_user.id,
            )
        )
        .order_by(desc(Conversation.created_at))
    )
    conversations = result.scalars().all()
    
    response = []
    for conv in conversations:
        other_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
        
        # Get other user
        user_result = await db.execute(select(User).where(User.id == other_id))
        other_user = user_result.scalar_one_or_none()
        
        # Get last message
        last_msg_result = await db.execute(
            select(Message)
            .where(
                (
                    (Message.sender_id == current_user.id) &
                    (Message.receiver_id == other_id)
                ) | (
                    (Message.sender_id == other_id) &
                    (Message.receiver_id == current_user.id)
                )
            )
            .order_by(desc(Message.timestamp))
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        
        conv_response = ConversationResponse.model_validate(conv)
        conv_response.other_user = UserResponse.model_validate(other_user) if other_user else None
        
        if last_msg:
            conv_response.last_message = last_msg.content
            conv_response.last_message_at = last_msg.timestamp
        
        response.append(conv_response)
    
    return response


@router.post("/{other_user_id}", response_model=ConversationResponse)
async def create_or_get_conversation(
    other_user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get or create a conversation with another user."""
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Check if conversation already exists (either order)
    result = await db.execute(
        select(Conversation).where(
            or_(
                and_(Conversation.user1_id == current_user.id, Conversation.user2_id == other_user_id),
                and_(Conversation.user1_id == other_user_id, Conversation.user2_id == current_user.id),
            )
        )
    )
    conv = result.scalar_one_or_none()
    
    if not conv:
        conv = Conversation(user1_id=current_user.id, user2_id=other_user_id)
        db.add(conv)
        await db.flush()
        await db.refresh(conv)
    
    # Get other user info
    user_result = await db.execute(select(User).where(User.id == other_user_id))
    other_user = user_result.scalar_one_or_none()
    
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    response = ConversationResponse.model_validate(conv)
    response.other_user = UserResponse.model_validate(other_user)
    return response
