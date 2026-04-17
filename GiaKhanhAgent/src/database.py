from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path
from threading import Lock


class DatabaseManager:
    def __init__(self, db_path: Path):
        self._db_path = db_path
        self._lock = Lock()
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._initialize()

    def _initialize(self) -> None:
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL;")
            self._conn.execute("PRAGMA synchronous=NORMAL;")
            self._conn.execute("PRAGMA foreign_keys=ON;")
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    thread_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    thread_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY(thread_id) REFERENCES sessions(thread_id) ON DELETE CASCADE
                );
                """
            )
            self._conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_thread_id_id
                ON messages(thread_id, id DESC);
                """
            )
            self._conn.commit()

    def _ensure_session_locked(self, thread_id: str | None) -> str:
        tid = (thread_id or "").strip() or str(uuid.uuid4())
        self._conn.execute(
            """
            INSERT INTO sessions (thread_id, created_at, updated_at)
            VALUES (?, datetime('now'), datetime('now'))
            ON CONFLICT(thread_id) DO UPDATE SET updated_at = datetime('now');
            """,
            (tid,),
        )
        return tid

    def append_message(self, thread_id: str | None, role: str, content: str) -> tuple[str, int]:
        with self._lock:
            tid = self._ensure_session_locked(thread_id)
            cursor = self._conn.execute(
                "INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?);",
                (tid, role, content),
            )
            self._conn.execute(
                "UPDATE sessions SET updated_at = datetime('now') WHERE thread_id = ?;",
                (tid,),
            )
            self._conn.commit()
            return tid, int(cursor.lastrowid)

    def delete_message_by_id(self, message_id: int) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM messages WHERE id = ?;", (message_id,))
            self._conn.commit()

    def get_recent_history(
        self,
        thread_id: str,
        limit: int = 20,
        through_message_id: int | None = None,
    ) -> list[dict[str, str]]:
        rows = []
        with self._lock:
            if through_message_id is None:
                rows = self._conn.execute(
                    """
                    SELECT role, content
                    FROM messages
                    WHERE thread_id = ?
                    ORDER BY id DESC
                    LIMIT ?;
                    """,
                    (thread_id, max(1, limit)),
                ).fetchall()
            else:
                rows = self._conn.execute(
                    """
                    SELECT role, content
                    FROM messages
                    WHERE thread_id = ? AND id <= ?
                    ORDER BY id DESC
                    LIMIT ?;
                    """,
                    (thread_id, int(through_message_id), max(1, limit)),
                ).fetchall()
            # API expects oldest -> newest order.
            rows.reverse()
        return [{"role": str(r["role"]), "content": str(r["content"])} for r in rows]

    def get_messages_page(self, thread_id: str, limit: int = 20, offset: int = 0) -> tuple[list[dict], int]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        with self._lock:
            total_row = self._conn.execute(
                "SELECT COUNT(*) AS total FROM messages WHERE thread_id = ?;",
                (thread_id,),
            ).fetchone()
            rows = self._conn.execute(
                """
                SELECT id, role, content, created_at
                FROM messages
                WHERE thread_id = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?;
                """,
                (thread_id, safe_limit, safe_offset),
            ).fetchall()
        items = [
            {
                "id": int(r["id"]),
                "role": str(r["role"]),
                "content": str(r["content"]),
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]
        items.reverse()
        total = int(total_row["total"]) if total_row else 0
        return items, total

    def list_sessions(self, limit: int = 100, offset: int = 0) -> list[dict[str, str]]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT thread_id, created_at, updated_at
                FROM sessions
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?;
                """,
                (safe_limit, safe_offset),
            ).fetchall()
        return [
            {
                "thread_id": str(r["thread_id"]),
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"]),
            }
            for r in rows
        ]
