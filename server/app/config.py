from pydantic_settings import BaseSettings
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    # App
    APP_NAME: str = os.getenv("APP_NAME", "ChatApp")
    DEBUG: bool = os.getenv("DEBUG", "true") == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./chat.db")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Static
    STATIC_DIR: Path = Path(__file__).parent.parent / "static"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
