"""
Teachly local preview: API chat + static frontend on one port (default 8000).

Chạy từ thư mục gốc repo:
  uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000

Mở trình duyệt: http://127.0.0.1:8000/
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from anthropic import Anthropic
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import ANTHROPIC_API_KEY, DEFAULT_MODEL, LOG_LEVEL
from .database import DatabaseManager

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
if not FRONTEND_DIR.is_dir():
    _alt = REPO_ROOT / "Frontend"
    if _alt.is_dir():
        FRONTEND_DIR = _alt

MOCK_DIR = REPO_ROOT / "backend" / "mock"
MOCK_FILES = {
    "quiz": "quiz_thpt_en.json",
    "flashcard": "flashcard_en.json",
    "slide": "slide_thpt_en.json",
}

TEACHLY_SYSTEM = """Bạn là Teachly AI, trợ lý hỗ trợ giáo viên và học sinh ôn Tiếng Anh THPT QG (Việt Nam).
Trả lời rõ ràng, thân thiện; ưu tiên tiếng Việt khi người dùng dùng tiếng Việt.
Nếu được hỏi về slide, quiz, flashcard hoặc hình ảnh minh họa, gợi ý cấu trúc nội dung hữu ích (không cần tạo file thật trừ khi được mô tả rõ công cụ ngoài chat)."""

class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=32000)
    thread_id: str | None = None


class ChatOut(BaseModel):
    thread_id: str
    reply: str


class SessionSummary(BaseModel):
    thread_id: str
    created_at: str
    updated_at: str


class SessionListOut(BaseModel):
    sessions: list[SessionSummary]


class SessionMessage(BaseModel):
    id: int
    role: str
    text: str
    created_at: str


class SessionMessagesOut(BaseModel):
    thread_id: str
    limit: int
    offset: int
    total: int
    has_more: bool
    messages: list[SessionMessage]


def _get_client() -> Anthropic:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chưa cấu hình ANTHROPIC_API_KEY. Tạo file .env từ .env.example và thêm key.",
        )
    return Anthropic(api_key=ANTHROPIC_API_KEY)


def _run_reply(client: Anthropic, history: list[dict]) -> str:
    response = client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=4096,
        system=TEACHLY_SYSTEM,
        messages=history,
    )
    parts: list[str] = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip() or "(Không có nội dung phản hồi.)"


app = FastAPI(title="Teachly Local", version="0.1.0")
db = DatabaseManager(REPO_ROOT / "data" / "teachly.sqlite3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "frontend_dir_exists": FRONTEND_DIR.is_dir(),
    }


@app.get("/api/mock/{name}")
def mock_bundle(name: str):
    """JSON mẫu cho quiz / flashcard / slide — thay bằng API sinh nội dung khi có AI pipeline."""
    if name not in MOCK_FILES:
        raise HTTPException(status_code=404, detail="Unknown mock resource.")
    path = MOCK_DIR / MOCK_FILES[name]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Mock file missing.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        logger.exception("Invalid mock JSON: %s", path)
        raise HTTPException(status_code=500, detail=f"Invalid JSON: {e}") from e


@app.post("/api/chat", response_model=ChatOut)
def chat(body: ChatIn):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Tin nhắn trống.")

    client = _get_client()

    tid, user_message_id = db.append_message(body.thread_id, "user", text)
    history = db.get_recent_history(tid, limit=20, through_message_id=user_message_id)

    try:
        reply = _run_reply(client, history)
    except Exception as e:
        logger.exception("Chat error")
        db.delete_message_by_id(user_message_id)
        raise HTTPException(status_code=502, detail=str(e) or "Lỗi gọi mô hình.") from e

    db.append_message(tid, "assistant", reply)

    return ChatOut(thread_id=tid, reply=reply)


@app.get("/api/sessions", response_model=SessionListOut)
def list_sessions(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    sessions = [SessionSummary(**s) for s in db.list_sessions(limit=limit, offset=offset)]
    return SessionListOut(sessions=sessions)


@app.get("/api/sessions/{thread_id}/messages", response_model=SessionMessagesOut)
def get_session_messages(
    thread_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    rows, total = db.get_messages_page(thread_id, limit=limit, offset=offset)
    messages = [
        SessionMessage(
            id=item["id"],
            role="bot" if item["role"] == "assistant" else item["role"],
            text=item["content"],
            created_at=item["created_at"],
        )
        for item in rows
    ]
    has_more = offset + len(messages) < total
    return SessionMessagesOut(
        thread_id=thread_id,
        limit=limit,
        offset=offset,
        total=total,
        has_more=has_more,
        messages=messages,
    )


@app.get("/")
def root():
    if not FRONTEND_DIR.is_dir():
        return {
            "error": "Không tìm thấy thư mục frontend/",
            "hint": "Chạy server từ thư mục gốc repo (cùng cấp với frontend/).",
        }
    return RedirectResponse(url="/main_hub.html", status_code=302)


if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
