import pytest
from app.models import User, Message, Conversation


class TestUserModel:
    def test_set_and_check_password(self):
        user = User(username="pwdtest")
        user.set_password("mysecret")
        assert user.check_password("mysecret") is True
        assert user.check_password("wrongpassword") is False

    def test_password_is_hashed(self):
        user = User(username="pwdtest")
        user.set_password("mysecret")
        assert user.password_hash != "mysecret"
        assert len(user.password_hash) > 50

    def test_different_passwords_produce_different_hashes(self):
        user1 = User(username="u1")
        user2 = User(username="u2")
        user1.set_password("samepass")
        user2.set_password("samepass")
        assert user1.password_hash != user2.password_hash


class TestMessageModel:
    def test_message_creation(self):
        msg = Message(
            sender_id="s1",
            receiver_id="r1",
            content="hello",
        )
        assert msg.content == "hello"
        assert msg.sender_id == "s1"
        assert msg.receiver_id == "r1"


class TestConversationModel:
    def test_conversation_creation(self):
        conv = Conversation(
            user1_id="u1",
            user2_id="u2",
        )
        assert conv.user1_id == "u1"
        assert conv.user2_id == "u2"
