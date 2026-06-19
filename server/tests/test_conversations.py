class TestConversations:
    async def test_get_empty_conversations(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.get(
            "/api/conversations",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_create_conversation(self, test_client, authenticated_user, second_user, auth_header_user1):
        response = await test_client.post(
            f"/api/conversations/{second_user.id}",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user1_id"] in [authenticated_user.id, second_user.id]
        assert data["user2_id"] in [authenticated_user.id, second_user.id]
        assert data["other_user"]["username"] == "seconduser"

    async def test_get_conversation_again_returns_existing(self, test_client, authenticated_user, second_user, auth_header_user1):
        await test_client.post(
            f"/api/conversations/{second_user.id}",
            headers={"Authorization": auth_header_user1},
        )
        response = await test_client.post(
            f"/api/conversations/{second_user.id}",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        first_id = response.json()["id"]

        response2 = await test_client.get(
            "/api/conversations",
            headers={"Authorization": auth_header_user1},
        )
        assert response2.status_code == 200
        convs = response2.json()
        assert len(convs) == 1
        assert convs[0]["id"] == first_id

    async def test_cannot_message_self(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.post(
            f"/api/conversations/{authenticated_user.id}",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 400

    async def test_conversation_nonexistent_user(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.post(
            "/api/conversations/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 404

    async def test_conversations_requires_auth(self, test_client):
        response = await test_client.get("/api/conversations")
        assert response.status_code == 401
