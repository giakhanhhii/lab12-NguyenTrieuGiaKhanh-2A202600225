from __future__ import annotations

import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Regex nhận biết dòng rác (số trang, header/footer lặp lại)
_NOISE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),
    re.compile(r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$", re.IGNORECASE),
    re.compile(r"^\s*©.*$"),
    re.compile(r"^\s*www\.\S+\s*$"),
]


class PDFExtractor:
    """Trích xuất văn bản thô từ PDF sử dụng pdfplumber."""

    def extract(self, pdf_path: Path) -> list[tuple[int, str]]:
        """
        Trả về list[(page_number, raw_text)] — 1-indexed page numbers.
        Raises RuntimeError nếu không đọc được file.
        """
        try:
            import pdfplumber  # type: ignore
        except ImportError as e:
            raise RuntimeError(
                "Thiếu dependency 'pdfplumber'. Chạy: pip install pdfplumber"
            ) from e

        pages: list[tuple[int, str]] = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append((i, text))

        logger.info(f"Đã trích xuất {len(pages)} trang từ '{pdf_path.name}'")
        return pages


class NoiseFilter:
    """
    Lọc bỏ nhiễu: số trang, header/footer lặp lại, ký tự rác.
    Nhận diện header/footer bằng thuật toán tần suất xuất hiện.
    """

    def __init__(self, min_line_length: int = 3):
        self._min_len = min_line_length

    def filter_pages(
        self, pages: list[tuple[int, str]]
    ) -> list[tuple[int, str]]:
        """Lọc nhiễu trên toàn bộ danh sách trang, nhận diện header/footer chung."""
        if not pages:
            return []

        line_freq: dict[str, int] = {}
        for _, text in pages:
            seen = set()
            for line in text.splitlines():
                cleaned = line.strip()
                if cleaned and cleaned not in seen:
                    line_freq[cleaned] = line_freq.get(cleaned, 0) + 1
                    seen.add(cleaned)

        threshold = max(2, int(len(pages) * 0.3))
        repeated_lines = {ln for ln, cnt in line_freq.items() if cnt >= threshold}
        logger.debug(f"Phát hiện {len(repeated_lines)} dòng header/footer lặp lại")

        cleaned: list[tuple[int, str]] = []
        for page_num, text in pages:
            filtered = self._filter_text(text, repeated_lines)
            cleaned.append((page_num, filtered))
        return cleaned

    def _filter_text(self, text: str, repeated_lines: set[str]) -> str:
        lines = text.splitlines()
        good: list[str] = []
        for line in lines:
            stripped = line.strip()
            if len(stripped) < self._min_len:
                continue
            if stripped in repeated_lines:
                continue
            if any(p.match(stripped) for p in _NOISE_PATTERNS):
                continue
            cleaned = re.sub(r"[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF\n\t]", "", line)
            if cleaned.strip():
                good.append(cleaned)
        return "\n".join(good)
