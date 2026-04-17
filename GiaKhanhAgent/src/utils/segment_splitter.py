from __future__ import annotations

import re


class SegmentSplitter:
    """
    Tách văn bản đã làm sạch thành các đoạn ngữ nghĩa.
    Ưu tiên tách tại:
      1. Section headers rõ ràng (GRAMMAR:, VOCABULARY:, TIPS:, etc.)
      2. Dòng trống kép
      3. Kích thước tối đa (max_tokens_per_chunk)
    """

    # Section headers thường gặp trong sách giáo khoa
    _SECTION_HEADER = re.compile(
        r"^(?:"
        r"GRAMMAR|VOCABULARY|VOCAB|PRACTICE|EXERCISE|TIPS?|STRATEGIES|NOTE|READING|LISTENING|WRITING|SPEAKING"
        r"|NGỮ PHÁP|TỪ VỰNG|BÀI TẬP|MẸO|GHI NHỚ|LƯU Ý"
        r")[:\s]",
        re.IGNORECASE,
    )

    # Heading tổng quát: ALL CAPS >=4 ký tự hoặc đánh số
    _GENERIC_HEADING = re.compile(
        r"^(?:[A-Z][A-Z\s]{3,50}[:.]?|(?:\d+\.)+\s+\S|Unit\s+\d+|Chapter\s+\d+)"
    )

    def split(self, text: str, max_tokens_per_chunk: int = 500) -> list[str]:
        """
        Trả về list[str] — mỗi phần tử là một chunk ngữ nghĩa.
        Mỗi chunk không vượt quá ~max_tokens_per_chunk x 4 ký tự.
        """
        max_chars = max_tokens_per_chunk * 4

        # Bước 1: Tách dứt khoát tại section headers
        lines = text.splitlines()
        sections: list[list[str]] = [[]]
        for line in lines:
            stripped = line.strip()
            is_section = (
                self._SECTION_HEADER.match(stripped)
                or (
                    self._GENERIC_HEADING.match(stripped)
                    and len(stripped) > 4
                    and len(stripped) < 80
                )
            )
            if is_section and sections[-1]:
                sections.append([line])
            else:
                sections[-1].append(line)

        # Bước 2: Trong mỗi section -> tách theo đoạn trống kép
        raw_blocks: list[str] = []
        for sec_lines in sections:
            sec_text = "\n".join(sec_lines).strip()
            if not sec_text:
                continue
            sub_blocks = [b.strip() for b in re.split(r"\n\s*\n", sec_text) if b.strip()]
            raw_blocks.extend(sub_blocks)

        # Bước 3: Gộp/cắt theo max_chars
        result: list[str] = []
        buffer = ""
        for block in raw_blocks:
            # Block quá lớn -> bắt buộc cắt theo câu
            if len(block) > max_chars:
                if buffer:
                    result.append(buffer.strip())
                    buffer = ""
                result.extend(self._split_by_sentence(block, max_chars))
                continue

            # Block là section header -> flush buffer trước
            stripped_block = block.splitlines()[0].strip() if block else ""
            is_section_block = (
                self._SECTION_HEADER.match(stripped_block)
                or self._GENERIC_HEADING.match(stripped_block)
            )
            if is_section_block and buffer:
                result.append(buffer.strip())
                buffer = block
                continue

            # Gộp nếu còn đủ chỗ
            if buffer and (len(buffer) + len(block) + 2 <= max_chars):
                buffer = buffer + "\n\n" + block
            else:
                if buffer:
                    result.append(buffer.strip())
                buffer = block

        if buffer:
            result.append(buffer.strip())

        # Lọc đoạn quá ngắn (<30 ký tự)
        return [s for s in result if len(s) >= 30]

    @staticmethod
    def _split_by_sentence(text: str, max_chars: int) -> list[str]:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks: list[str] = []
        buf = ""
        for sent in sentences:
            if not buf or len(buf) + len(sent) + 1 <= max_chars:
                buf = (buf + " " + sent).strip() if buf else sent
            else:
                if buf:
                    chunks.append(buf)
                buf = sent
        if buf:
            chunks.append(buf)
        return chunks
