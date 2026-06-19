import pytest
from app.websocket_manager import ConnectionManager


class TestConnectionManager:
    @pytest.mark.asyncio
    async def test_init_empty(self):
        manager = ConnectionManager()
        assert len(manager.active_connections) == 0
        assert manager.get_active_usernames() == []

    @pytest.mark.asyncio
    async def test_disconnect_unknown_user(self):
        manager = ConnectionManager()
        manager.disconnect("nobody")

    @pytest.mark.asyncio
    async def test_get_active_usernames_empty(self):
        manager = ConnectionManager()
        assert manager.get_active_usernames() == []
