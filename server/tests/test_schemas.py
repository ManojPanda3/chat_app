import pytest
from datetime import datetime
from app.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    MessageCreate, MessageResponse, ConversationResponse, WSEvent,
)


class TestUserCreate:
    def test_valid_user_create(self):
        data = UserCreate(username="validuser", password="secure123")
        assert data.username == "validuser"

    def test_username_too_short(self):
        with pytest.raises(Exception):
            UserCreate(username="ab", password="secure123")

    def test_username_too_long(self):
        with pytest.raises(Exception):
            UserCreate(username="a" * 51, password="secure123")

    def test_password_too_short(self):
        with pytest.raises(Exception):
            UserCreate(username="validuser", password="abc")


class TestUserLogin:
    def test_valid_login(self):
        data = UserLogin(username="user", password="pass")
        assert data.username == "user"


class TestMessageCreate:
    def test_valid_message(self):
        data = MessageCreate(content="hello")
        assert data.content == "hello"
        assert data.receiver_id is None

    def test_message_with_receiver(self):
        data = MessageCreate(content="hello", receiver_id="user-id")
        assert data.receiver_id == "user-id"

    def test_empty_content(self):
        with pytest.raises(Exception):
            MessageCreate(content="")

    def test_content_too_long(self):
        with pytest.raises(Exception):
            MessageCreate(content="a" * 2001)


class TestTokenResponse:
    def test_token_response_fields(self):
        data = TokenResponse(access_token="abc123", user=UserResponse(id="1", username="u", created_at="2024-01-01T00:00:00"))
        assert data.access_token == "abc123"
        assert data.token_type == "bearer"


class TestWSEvent:
    def test_ws_event(self):
        event = WSEvent(type="message", data={"content": "hi"})
        assert event.type == "message"
        assert event.data == {"content": "hi"}
