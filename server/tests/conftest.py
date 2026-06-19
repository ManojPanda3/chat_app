import pytest
import os
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User
from app.auth import create_access_token

TEST_DB_URL = "sqlite+aiosqlite:///./test_chat.db"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False, future=True)
    yield engine
    if os.path.exists("test_chat.db"):
        os.remove("test_chat.db")

@pytest.fixture(scope="session")
async def setup_db(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@pytest.fixture
async def db_session(test_engine, setup_db):
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()

@pytest.fixture
def auth_header(username: str = "testuser") -> str:
    token = create_access_token({"sub": username})
    return f"Bearer {token}"

@pytest.fixture
async def test_client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()

@pytest.fixture
async def authenticated_user(db_session):
    user = User(username="testuser")
    user.set_password("testpass123")
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def second_user(db_session):
    user = User(username="seconduser")
    user.set_password("testpass456")
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def auth_header_user1(authenticated_user):
    token = create_access_token({"sub": authenticated_user.username})
    return f"Bearer {token}"

@pytest.fixture
async def auth_header_user2(second_user):
    token = create_access_token({"sub": second_user.username})
    return f"Bearer {token}"
