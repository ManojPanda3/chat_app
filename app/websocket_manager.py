import json
from typing import Dict, Optional
from fastapi import WebSocket

class WebSocketManager:
    """Manages WebSocket connections and message routing."""
    
    def __init__(self):
        # Maps username -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # Maps username -> user_id
        self.user_ids: Dict[str, int] = {}
    
    def connect(self, websocket: WebSocket, username: str, user_id: int) -> None:
        """Accept connection and register user."""
        self.active_connections[username] = websocket
        self.user_ids[username] = user_id
        websocket.username = username
        websocket.user_id = user_id
    
    def disconnect(self, username: str) -> None:
        """Remove user on disconnect."""
        self.active_connections.pop(username, None)
        self.user_ids.pop(username, None)
    
    def get_user_id(self, username: str) -> Optional[int]:
        """Get user ID from username."""
        return self.user_ids.get(username)
    
    def is_online(self, username: str) -> bool:
        """Check if a user is currently connected."""
        return username in self.active_connections
    
    async def send_personal_message(self, username: str, message: dict) -> None:
        """Send a message to a specific user."""
        websocket = self.active_connections.get(username)
        if websocket:
            await websocket.send_json(message)
    
    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> None:
        """Broadcast a message to all connected users, optionally excluding one."""
        disconnected = []
        for username, websocket in self.active_connections.items():
            if username != exclude:
                try:
                    await websocket.send_json(message)
                except Exception:
                    disconnected.append(username)
        # Clean up disconnected users
        for username in disconnected:
            self.disconnect(username)
    
    async def broadcast_global(self, message: dict) -> None:
        """Broadcast to all connected users (global chat)."""
        await self.broadcast(message)
    
    async def send_dm(self, sender: str, receiver: str, message: dict) -> None:
        """Send a direct message between two users."""
        # Send to receiver
        await self.send_personal_message(receiver, message)
        # Send confirmation back to sender
        await self.send_personal_message(sender, message)
    
    async def broadcast_user_joined(self, username: str) -> None:
        """Notify all users that someone joined."""
        await self.broadcast({
            "type": "user.joined",
            "data": {"username": username}
        })
    
    async def broadcast_user_left(self, username: str) -> None:
        """Notify all users that someone left."""
        await self.broadcast({
            "type": "user.left",
            "data": {"username": username}
        })
    
    def get_online_users(self) -> list[dict]:
        """Get list of currently online users."""
        return [
            {"username": username, "user_id": uid}
            for username, uid in self.user_ids.items()
        ]

# Singleton instance
manager = WebSocketManager()
