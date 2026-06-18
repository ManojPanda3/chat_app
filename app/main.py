import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    print(f"[+] {settings.APP_NAME} started. DB initialized.")
    yield
    print(f"[-] {settings.APP_NAME} shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = settings.STATIC_DIR
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def serve_index():
    """Serve the main chat page."""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return FileResponse(static_dir / "login.html")


# Register routers
from app.routes.auth import router as auth_router
from app.routes.messages import router as messages_router
from app.routes.ws import router as ws_router
from app.routes.conversations import router as conversations_router

app.include_router(auth_router)
app.include_router(messages_router)
app.include_router(ws_router)
app.include_router(conversations_router)
