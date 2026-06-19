from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import User, Message
from app.schemas import MessageResponse, UserResponse
from app.auth import get_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/global", response_model=List[MessageResponse])
async def get_global_messages(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent global chat messages."""
    result = await db.execute(
        select(Message)
        .where(and_(
            Message.receiver_id.is_(None),
        ))
        .options(selectinload(Message.sender))
        .order_by(desc(Message.timestamp))
        .limit(limit)
    )
    messages = result.scalars().all()
    return [MessageResponse.model_validate(m) for m in reversed(messages)]


@router.get("/dm/{other_user_id}", response_model=List[MessageResponse])
async def get_dm_messages(
    other_user_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get private message history with another user."""
    result = await db.execute(
        select(Message)
        .where(
            (
                (Message.sender_id == current_user.id) &
                (Message.receiver_id == other_user_id)
            ) | (
                (Message.sender_id == other_user_id) &
                (Message.receiver_id == current_user.id)
            )
        )
        .options(selectinload(Message.sender))
        .order_by(desc(Message.timestamp))
        .limit(limit)
    )
    messages = result.scalars().all()
    return [MessageResponse.model_validate(m) for m in reversed(messages)]


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all registered users."""
    result = await db.execute(select(User).order_by(User.username))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/online", response_model=List[UserResponse])
async def get_online_users(
    current_user: User = Depends(get_current_user),
):
    """Get currently online users from active WebSocket connections."""
    online_usernames = manager.get_active_usernames()
    # We need DB to get full user objects
    from app.database import async_session_maker
    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.username.in_(online_usernames))
        )
        users = result.scalars().all()
        return [UserResponse.model_validate(u) for u in users]
