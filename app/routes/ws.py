import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_maker
from app.models import User, Message
from app.websocket_manager import manager

router = APIRouter(tags=["websocket"])


async def authenticate_ws(token: str) -> User:
    """Decode JWT and return User from token passed via query param."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None

    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time chat.
    Client connects with: ws://host/ws?token=<jwt>

    Message format (JSON):
    - Send message: {"type": "message", "content": "hello", "receiver_id": null}
      receiver_id = null means global chat
    - System events received: {"type": "system", "data": {...}}
    - Chat messages received: {"type": "message", "data": {...}}
    """
    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await manager.connect(websocket, user.username, user.id)

    await manager.broadcast({
        "type": "system",
        "data": {
            "event": "user_joined",
            "username": user.username,
            "timestamp": datetime.utcnow().isoformat(),
        }
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "message":
                content = data.get("content", "").strip()
                receiver_id = data.get("receiver_id")

                if not content:
                    continue

                async with async_session_maker() as db:
                    msg = Message(
                        sender_id=user.id,
                        receiver_id=receiver_id,
                        content=content,
                    )
                    db.add(msg)
                    await db.flush()
                    await db.refresh(msg)
                    await db.commit()

                    msg_data = {
                        "id": msg.id,
                        "sender_id": msg.sender_id,
                        "sender": user.username,
                        "receiver_id": msg.receiver_id,
                        "content": msg.content,
                        "timestamp": msg.timestamp.isoformat(),
                    }

                if receiver_id is None or receiver_id == "" or receiver_id == "null":
                    await manager.broadcast({
                        "type": "message",
                        "data": msg_data,
                    })
                else:
                    async with async_session_maker() as db:
                        result = await db.execute(select(User).where(User.id == receiver_id))
                        receiver = result.scalar_one_or_none()

                    if receiver:
                        await manager.send_personal(receiver.username, {
                            "type": "message",
                            "data": msg_data,
                        })
                        await manager.send_personal(user.username, {
                            "type": "message",
                            "data": {**msg_data, "status": "sent"},
                        })
                    else:
                        await manager.send_personal(user.username, {
                            "type": "error",
                            "data": {"message": "Receiver not found"},
                        })

    except WebSocketDisconnect:
        await manager.broadcast_disconnect(user.username)
        await manager.broadcast({
            "type": "system",
            "data": {
                "event": "user_left",
                "username": user.username,
                "timestamp": datetime.utcnow().isoformat(),
            }
        })
