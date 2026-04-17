"""
PDF Chunker - Pipeline xử lý sách giáo khoa tiếng Anh
=======================================================
Chuyển đổi PDF → Chunks JSON có cấu trúc để nạp vào knowledge base.

Luồng xử lý:
  PDF → Text (pdfplumber) → Làm sạch → Tách đoạn → LLM phân loại → JSON output
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from src.utils.chunk_classifier import LLMClassifier
from src.utils.ocr_helper import NoiseFilter, PDFExtractor
from src.utils.segment_splitter import SegmentSplitter

logger = logging.getLogger(__name__)


# ─────────────────────────── Data Models ───────────────────────────

@dataclass
class Chunk:
    """Một đơn vị kiến thức đã chuẩn hóa."""
    category: str
    topic: str
    content: str
    keywords: list[str]
    difficulty: str
    source_page: int = 0
    chunk_index: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "topic": self.topic,
            "content": self.content,
            "keywords": self.keywords,
            "difficulty": self.difficulty,
            "meta": {
                "source_page": self.source_page,
                "chunk_index": self.chunk_index,
            },
        }


@dataclass
class ProcessingResult:
    """Kết quả xử lý toàn bộ một file PDF."""
    source_file: str
    total_pages: int
    total_chunks: int
    chunks: list[Chunk] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_file": self.source_file,
            "total_pages": self.total_pages,
            "total_chunks": self.total_chunks,
            "chunks": [c.to_dict() for c in self.chunks],
            "errors": self.errors,
        }


# ─────────────────────────── Main Pipeline ───────────────────────────

class PDFChunkerPipeline:
    """
    Pipeline chính: kết hợp Extract → Filter → Split → Classify → Output JSON.
    """

    def __init__(
        self,
        llm_client: Any | None = None,
        model: str = "gpt-4o-mini",
        output_dir: Path | None = None,
        max_tokens_per_chunk: int = 500,
        batch_size: int = 5,
    ):
        self._extractor = PDFExtractor()
        self._filter = NoiseFilter()
        self._splitter = SegmentSplitter()
        self._classifier = LLMClassifier(llm_client, model)
        self._output_dir = output_dir or Path("output/chunks")
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._max_tokens = max_tokens_per_chunk
        self._batch_size = batch_size

    def process(self, pdf_path: Path) -> ProcessingResult:
        """Xử lý một file PDF. Trả về ProcessingResult."""
        logger.info(f"=== Bắt đầu xử lý: {pdf_path.name} ===")
        result = ProcessingResult(
            source_file=str(pdf_path),
            total_pages=0,
            total_chunks=0,
        )

        # 1. Trích xuất text
        try:
            pages = self._extractor.extract(pdf_path)
        except Exception as e:
            result.errors.append(f"Lỗi đọc PDF: {e}")
            logger.error(f"Không đọc được PDF: {e}")
            return result

        result.total_pages = len(pages)

        # 2. Lọc nhiễu
        clean_pages = self._filter.filter_pages(pages)

        # 3. Tách đoạn + Phân loại
        chunk_idx = 0
        for page_num, page_text in clean_pages:
            if not page_text.strip():
                continue

            segments = self._splitter.split(page_text, self._max_tokens)
            logger.info(f"Trang {page_num}: {len(segments)} đoạn")

            for seg in segments:
                try:
                    meta = self._classifier.classify(seg, page_num)
                    chunk = Chunk(
                        category=meta["category"],
                        topic=meta["topic"],
                        content=meta["content"],
                        keywords=meta["keywords"],
                        difficulty=meta["difficulty"],
                        source_page=page_num,
                        chunk_index=chunk_idx,
                    )
                    result.chunks.append(chunk)
                    chunk_idx += 1
                except Exception as e:
                    msg = f"Trang {page_num}: Phân loại thất bại — {e}"
                    result.errors.append(msg)
                    logger.warning(msg)

        result.total_chunks = len(result.chunks)
        logger.info(
            f"=== Hoàn thành: {result.total_chunks} chunks từ {result.total_pages} trang ==="
        )
        return result

    def save(self, result: ProcessingResult, output_name: str | None = None) -> Path:
        """Lưu kết quả ra file JSON."""
        if not output_name:
            stem = Path(result.source_file).stem
            output_name = f"{stem}_chunks.json"
        if not output_name.endswith(".json"):
            output_name += ".json"

        out_path = self._output_dir / output_name
        out_path.write_text(
            json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info(f"Đã lưu: {out_path}")
        return out_path

    def process_and_save(self, pdf_path: Path, output_name: str | None = None) -> Path:
        """Shortcut: xử lý và lưu ngay."""
        result = self.process(pdf_path)
        return self.save(result, output_name)
