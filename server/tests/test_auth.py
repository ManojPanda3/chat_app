class TestRegister:
    async def test_register_success(self, test_client):
        response = await test_client.post(
            "/api/auth/register",
            json={"username": "newuser", "password": "securepass"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "newuser"
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_username(self, test_client, authenticated_user):
        response = await test_client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "securepass"},
        )
        assert response.status_code == 409
        assert "Username already taken" in response.json()["detail"]

    async def test_register_short_username(self, test_client):
        response = await test_client.post(
            "/api/auth/register",
            json={"username": "ab", "password": "securepass"},
        )
        assert response.status_code == 422

    async def test_register_short_password(self, test_client):
        response = await test_client.post(
            "/api/auth/register",
            json={"username": "newuser", "password": "abc"},
        )
        assert response.status_code == 422

    async def test_register_missing_fields(self, test_client):
        response = await test_client.post(
            "/api/auth/register",
            json={"username": "newuser"},
        )
        assert response.status_code == 422


class TestLogin:
    async def test_login_success(self, test_client, authenticated_user):
        response = await test_client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "testuser"

    async def test_login_wrong_password(self, test_client, authenticated_user):
        response = await test_client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "wrongpass"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, test_client):
        response = await test_client.post(
            "/api/auth/login",
            json={"username": "nobody", "password": "nobody"},
        )
        assert response.status_code == 401


class TestGetMe:
    async def test_get_me_success(self, test_client, authenticated_user, auth_header_user1):
        response = await test_client.get(
            "/api/auth/me",
            headers={"Authorization": auth_header_user1},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"

    async def test_get_me_no_token(self, test_client):
        response = await test_client.get("/api/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(self, test_client):
        response = await test_client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401
