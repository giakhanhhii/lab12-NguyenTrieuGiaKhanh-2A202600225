from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

logger = logging.getLogger(__name__)

CATEGORIES = ["Ngữ pháp", "Từ vựng", "Bài tập mẫu", "Mẹo làm bài"]
DIFFICULTIES = ["Nhận biết", "Thông hiểu", "Vận dụng"]

# Từ gợi ý phân loại - dùng để hỗ trợ LLM
_CATEGORY_HINTS = {
    "Ngữ pháp": [
        "tense",
        "grammar",
        "structure",
        "clause",
        "subject",
        "verb",
        "present perfect",
        "past simple",
        "conditional",
        "passive",
        "article",
        "preposition",
        "conjunction",
        "modal",
        "relative",
        "thì ",
        "cấu trúc",
        "ngữ pháp",
        "câu điều kiện",
        "thể bị động",
    ],
    "Từ vựng": [
        "vocabulary",
        "word",
        "definition",
        "synonym",
        "antonym",
        "phrase",
        "idiom",
        "collocation",
        "prefix",
        "suffix",
        "từ vựng",
        "nghĩa",
        "định nghĩa",
        "thành ngữ",
    ],
    "Bài tập mẫu": [
        "exercise",
        "practice",
        "example",
        "sample",
        "fill in",
        "choose",
        "answer",
        "question",
        "task",
        "activity",
        "bài tập",
        "ví dụ",
        "điền vào",
        "câu hỏi",
        "chọn đáp án",
    ],
    "Mẹo làm bài": [
        "tip",
        "trick",
        "strategy",
        "note",
        "remember",
        "warning",
        "common mistake",
        "advice",
        "hint",
        "key point",
        "mẹo",
        "lưu ý",
        "ghi nhớ",
        "lỗi thường gặp",
        "chú ý",
    ],
}

_CLASSIFY_SYSTEM = """Bạn là chuyên gia giáo dục tiếng Anh.
Nhiệm vụ: Phân tích một đoạn văn bản từ sách giáo khoa tiếng Anh và trả về JSON.

Quy tắc phân loại category:
- "Ngữ pháp": giải thích cấu trúc ngữ pháp, thì, thể, mệnh đề
- "Từ vựng": danh sách từ, định nghĩa, collocations, idioms
- "Bài tập mẫu": bài tập có đáp án mẫu hoặc ví dụ minh họa có cấu trúc bài làm
- "Mẹo làm bài": tips, lưu ý, chiến lược, lỗi thường gặp

Quy tắc difficulty:
- "Nhận biết": nhớ/nhận diện kiến thức cơ bản
- "Thông hiểu": giải thích, so sánh, phân tích
- "Vận dụng": áp dụng vào bài tập hoặc tình huống thực tế

QUAN TRỌNG: Chỉ trả về JSON hợp lệ, không thêm markdown hay giải thích ngoài JSON."""

_CLASSIFY_TEMPLATE = """Phân tích đoạn văn bản dưới đây:

---
{segment}
---

Trả về JSON với định dạng chính xác:
{{
  "category": "<một trong: Ngữ pháp | Từ vựng | Bài tập mẫu | Mẹo làm bài>",
  "topic": "<chủ đề cụ thể, VD: Thì hiện tại hoàn thành, Từ vựng chủ đề môi trường>",
  "content": "<nội dung đã làm sạch, giữ nguyên tiếng Anh>",
  "keywords": ["từ khóa 1", "từ khóa 2", "..."],
  "difficulty": "<một trong: Nhận biết | Thông hiểu | Vận dụng>"
}}"""


class LLMClassifier:
    """
    Sử dụng LLM (GPT-4o hoặc tương đương) để phân loại và trích xuất metadata.
    Có fallback heuristic khi LLM không khả dụng.
    """

    def __init__(
        self,
        client: Any | None,
        model: str = "gpt-4o-mini",
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        self._client = client
        self._model = model
        self._max_retries = max_retries
        self._retry_delay = retry_delay

    def classify(self, segment: str, page_num: int = 0) -> dict[str, Any]:
        """
        Phân loại một đoạn văn. Trả về dict khớp schema Chunk.
        Nếu LLM lỗi -> dùng heuristic fallback.
        """
        if not segment.strip():
            return self._empty_chunk()

        if self._client:
            for attempt in range(self._max_retries):
                try:
                    return self._llm_classify(segment)
                except Exception as e:
                    logger.warning(
                        f"LLM classify attempt {attempt + 1}/{self._max_retries} failed: {e}"
                    )
                    if attempt < self._max_retries - 1:
                        time.sleep(self._retry_delay * (attempt + 1))

            logger.warning("LLM thất bại sau tất cả retry, dùng heuristic fallback")

        return self._heuristic_classify(segment)

    def _llm_classify(self, segment: str) -> dict[str, Any]:
        prompt = _CLASSIFY_TEMPLATE.format(segment=segment[:3000])

        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": _CLASSIFY_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        return self._validate_and_fix(data, segment)

    def _heuristic_classify(self, segment: str) -> dict[str, Any]:
        """Phân loại dựa trên từ khóa khi không có LLM."""
        seg_lower = segment.lower()
        scores: dict[str, int] = {cat: 0 for cat in CATEGORIES}
        for cat, hints in _CATEGORY_HINTS.items():
            for hint in hints:
                if hint in seg_lower:
                    scores[cat] += 1

        category = max(scores, key=lambda k: scores[k])
        if scores[category] == 0:
            category = "Ngữ pháp"

        keywords = self._extract_keywords_heuristic(segment)
        difficulty = self._guess_difficulty(segment)
        topic = self._guess_topic(segment, category)

        return {
            "category": category,
            "topic": topic,
            "content": segment.strip(),
            "keywords": keywords,
            "difficulty": difficulty,
        }

    def _validate_and_fix(self, data: dict, segment: str) -> dict[str, Any]:
        """Kiểm tra và sửa output LLM nếu thiếu hoặc sai field."""
        if data.get("category") not in CATEGORIES:
            data["category"] = self._heuristic_classify(segment)["category"]
        if data.get("difficulty") not in DIFFICULTIES:
            data["difficulty"] = "Thông hiểu"
        if not data.get("topic"):
            data["topic"] = "Chưa xác định"
        if not isinstance(data.get("keywords"), list):
            data["keywords"] = []
        if not data.get("content"):
            data["content"] = segment.strip()
        else:
            data["content"] = data["content"].strip()
        return data

    @staticmethod
    def _extract_keywords_heuristic(text: str) -> list[str]:
        """Trích xuất từ khóa đơn giản: từ viết hoa, từ trong ngoặc."""
        words = re.findall(r"\b[A-Z][a-z]{3,}\b|\b[A-Z]{2,}\b", text)
        quoted = re.findall(r'"([^"]{2,30})"', text)
        all_kw = list(dict.fromkeys(words + quoted))
        return all_kw[:10]

    @staticmethod
    def _guess_difficulty(text: str) -> str:
        tl = text.lower()
        if any(
            w in tl for w in ["apply", "practice", "exercise", "write", "use", "vận dụng"]
        ):
            return "Vận dụng"
        if any(w in tl for w in ["explain", "compare", "analyze", "why", "thông hiểu"]):
            return "Thông hiểu"
        return "Nhận biết"

    @staticmethod
    def _guess_topic(text: str, category: str) -> str:
        for line in text.splitlines():
            stripped = line.strip()
            if 5 < len(stripped) < 80 and not stripped.startswith(("•", "-", "*")):
                return stripped[:60]
        return f"{category} - Chủ đề chưa xác định"

    @staticmethod
    def _empty_chunk() -> dict[str, Any]:
        return {
            "category": "Ngữ pháp",
            "topic": "Không xác định",
            "content": "",
            "keywords": [],
            "difficulty": "Nhận biết",
        }
