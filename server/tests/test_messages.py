class TestGlobalMessages:
    async def test_get_empty_global_messages(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.get(
            "/api/messages/global",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_global_messages_with_limit(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.get(
            "/api/messages/global?limit=10",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_global_messages_requires_auth(self, test_client):
        response = await test_client.get("/api/messages/global")
        assert response.status_code == 401


class TestDMMessages:
    async def test_get_dm_empty(self, test_client, authenticated_user, second_user, auth_header_user1):
        response = await test_client.get(
            f"/api/messages/dm/{second_user.id}",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_dm_requires_auth(self, test_client):
        response = await test_client.get("/api/messages/dm/some-id")
        assert response.status_code == 401


class TestUsers:
    async def test_get_users(self, test_client, authenticated_user, second_user, auth_header_user1):
        response = await test_client.get(
            "/api/messages/users",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        data = response.json()
        usernames = [u["username"] for u in data]
        assert "testuser" in usernames
        assert "seconduser" in usernames

    async def test_get_users_requires_auth(self, test_client):
        response = await test_client.get("/api/messages/users")
        assert response.status_code == 401
