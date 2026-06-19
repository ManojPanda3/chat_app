"""
WebSocket connection manager.
Handles active connections, broadcasting to all/global, and sending to specific users.
"""
import json
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_maker
from app.models import User, Message


class ConnectionManager:
    def __init__(self):
        # username -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # username -> user_id
        self.user_ids: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, username: str, user_id: str):
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        self.active_connections[username] = websocket
        self.user_ids[username] = user_id
        # Set online status
        async with async_session_maker() as db:
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user:
                user.is_online = True
                await db.commit()

    def disconnect(self, username: str):
        """Remove a WebSocket connection."""
        self.active_connections.pop(username, None)
        self.user_ids.pop(username, None)

    async def send_personal(self, username: str, message: dict):
        """Send a message to a specific user."""
        ws = self.active_connections.get(username)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(username)

    async def send_personal_text(self, username: str, text: str):
        """Send raw text to a specific user."""
        ws = self.active_connections.get(username)
        if ws:
            try:
                await ws.send_text(text)
            except Exception:
                self.disconnect(username)

    async def broadcast(self, message: dict, exclude: Optional[str] = None):
        """Broadcast a JSON message to all connected users."""
        disconnected = []
        for username, ws in self.active_connections.items():
            if username == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(username)
        for username in disconnected:
            self.disconnect(username)

    async def broadcast_disconnect(self, username: str):
        """Mark user as offline and remove connection."""
        async with async_session_maker() as db:
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user:
                user.is_online = False
                await db.commit()
        self.disconnect(username)

    def get_active_usernames(self) -> list:
        """Return list of connected usernames."""
        return list(self.active_connections.keys())

    async def broadcast_typing(self, username: str, exclude: Optional[str] = None):
        """Broadcast that a user is typing (global)."""
        await self.broadcast({
            "type": "typing",
            "data": {"username": username}
        }, exclude=exclude or username)

    async def send_typing(self, from_user: str, to_user: str):
        """Send typing indicator to specific user."""
        await self.send_personal(to_user, {
            "type": "typing",
            "data": {"username": from_user}
        })

    async def clear_typing_broadcast(self, username: str, exclude: Optional[str] = None):
        """Clear typing indicator (global)."""
        await self.broadcast({
            "type": "typing_clear",
            "data": {"username": username}
        }, exclude=exclude or username)

    async def send_clear_typing(self, from_user: str, to_user: str):
        """Clear typing indicator for specific user."""
        await self.send_personal(to_user, {
            "type": "typing_clear",
            "data": {"username": from_user}
        })


# Singleton
manager = ConnectionManager()