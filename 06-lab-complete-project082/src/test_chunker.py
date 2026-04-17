"""
test_chunker.py — Kiểm thử PDF Chunker Pipeline
================================================
Tạo PDF mẫu nội dung sách giáo khoa tiếng Anh và chạy pipeline.

Chạy:
  python -m src.test_chunker
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path


# ──────────────── Tạo PDF mẫu từ nội dung thực ────────────────

SAMPLE_CONTENT = """English Grammar & Vocabulary Textbook
Unit 5: The Present Perfect Tense

GRAMMAR: The Present Perfect Tense

The present perfect tense is used to talk about experiences, changes, and actions that happened at an unspecified time in the past and are relevant to the present.

Structure:
  Subject + have/has + past participle

Positive form:
  I have visited Paris.
  She has finished her homework.

Negative form:
  I have not (haven't) seen that movie.
  He has not (hasn't) called yet.

Question form:
  Have you ever tried sushi?
  Has she applied for the job?

Key Time Expressions:
- ever, never, already, yet, just, since, for, recently, lately

VOCABULARY: Environmental Issues

1. pollution (n) /pəˈluːʃən/ — the presence of harmful substances in the environment
   Example: Air pollution is a major problem in many cities.

2. biodiversity (n) /ˌbaɪəʊdaɪˈvɜːsəti/ — the variety of plant and animal life
   Example: Protecting biodiversity is essential for a healthy ecosystem.

3. renewable energy (n) — energy from sources that are not depleted when used
   Collocations: renewable energy sources, renewable energy sector

4. deforestation (n) /ˌdiːˌfɒrɪˈsteɪʃən/ — the clearing of forests
   Synonym: forest clearance

5. carbon footprint (n) — the amount of carbon dioxide released by an activity
   Tip: You can reduce your carbon footprint by using public transport.

PRACTICE EXERCISE: Fill in the Blanks

Complete the sentences using the present perfect tense.

1. I _____________ (never / see) a shooting star.
   Answer: I have never seen a shooting star.

2. She _____________ (just / finish) reading that novel.
   Answer: She has just finished reading that novel.

3. They _____________ (live) here since 2015.
   Answer: They have lived here since 2015.

4. _____________ you ever _____________ (try) Thai food?
   Answer: Have you ever tried Thai food?

TIPS & STRATEGIES: Common Mistakes to Avoid

Tip 1: Don't confuse Present Perfect with Simple Past.
   ❌ I have seen him yesterday.
   ✓  I saw him yesterday. (specific time → use simple past)
   ✓  I have seen him before. (no specific time → use present perfect)

Tip 2: "Since" vs "For"
   - Use SINCE with a point in time: since 2010, since Monday
   - Use FOR with a duration: for 5 years, for a long time

Tip 3: Remember irregular past participles.
   go → gone (NOT goed)
   see → seen (NOT seed)
   take → taken (NOT taked)

Note: The present perfect CANNOT be used with specific past time expressions
such as: yesterday, last year, in 1999, two days ago.
"""


def _create_sample_pdf(output_path: Path) -> None:
    """Tạo PDF mẫu sử dụng pdfplumber-compatible encoding."""
    try:
        from reportlab.lib.pagesizes import A4  # type: ignore
        from reportlab.pdfgen import canvas  # type: ignore

        c = canvas.Canvas(str(output_path), pagesize=A4)
        width, height = A4
        margin = 50
        y = height - margin
        font_size = 11

        c.setFont("Helvetica", font_size)
        for line in SAMPLE_CONTENT.strip().splitlines():
            if y < margin + 20:
                c.showPage()
                c.setFont("Helvetica", font_size)
                y = height - margin

            # Tiêu đề in đậm
            if line.isupper() and len(line) > 3:
                c.setFont("Helvetica-Bold", font_size + 1)
            else:
                c.setFont("Helvetica", font_size)

            c.drawString(margin, y, line[:110])  # giới hạn độ rộng
            y -= font_size + 4

        c.save()
        print(f"[OK] Đã tạo PDF mẫu (reportlab): {output_path}")

    except ImportError:
        # Fallback: tạo PDF đơn giản thủ công (minimal valid PDF)
        _create_minimal_pdf(output_path)


def _create_minimal_pdf(output_path: Path) -> None:
    """Tạo PDF tối giản không cần thư viện ngoài."""
    # Mã hóa text thành PDF objects đơn giản
    lines = SAMPLE_CONTENT.strip().splitlines()
    # Tạo nhiều trang (50 dòng/trang)
    pages_content = []
    page_lines = []
    for ln in lines:
        page_lines.append(ln)
        if len(page_lines) >= 45:
            pages_content.append(page_lines)
            page_lines = []
    if page_lines:
        pages_content.append(page_lines)

    objects = []
    # Object 1: Catalog
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    # Object 2: Pages (will patch after)
    objects.append(b"")  # placeholder
    page_obj_ids = []
    content_obj_ids = []
    obj_id = 3

    for page_lines_chunk in pages_content:
        # Escape special PDF chars
        safe_lines = []
        for ln in page_lines_chunk:
            ln = ln.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            safe_lines.append(ln)

        stream_parts = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"]
        for ln in safe_lines:
            # Chỉ giữ ASCII
            ascii_ln = ln.encode("ascii", errors="replace").decode("ascii")
            stream_parts.append(f"({ascii_ln[:100]}) Tj T*")
        stream_parts.append("ET")
        stream = "\n".join(stream_parts).encode("latin-1", errors="replace")

        content_id = obj_id
        objects.append(
            f"{content_id} 0 obj\n<< /Length {len(stream)} >>\nstream\n".encode()
            + stream
            + b"\nendstream\nendobj\n"
        )
        content_obj_ids.append(content_id)
        obj_id += 1

        page_id = obj_id
        objects.append(
            f"{page_id} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R "
            f"/MediaBox [0 0 595 842] "
            f"/Contents {content_id} 0 R "
            f"/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> "
            f">>\nendobj\n".encode()
        )
        page_obj_ids.append(page_id)
        obj_id += 1

    # Patch pages object
    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objects[1] = (
        f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(page_obj_ids)} >>\nendobj\n"
    ).encode()

    # Build body
    body = b"%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, 0):
        offsets.append(len(body))
        body += obj

    # xref
    xref_offset = len(body)
    xref = f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        xref += f"{off:010d} 00000 n \n"
    body += xref.encode()
    body += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode()

    output_path.write_bytes(body)
    print(f"[OK] Đã tạo PDF mẫu (built-in): {output_path}")


def run_test(use_llm: bool = True) -> None:
    print("=" * 60)
    print("  PDF CHUNKER — KIỂM THỬ PIPELINE")
    print("=" * 60)

    # Tạo PDF mẫu
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    sample_pdf = data_dir / "sample_english_textbook.pdf"

    if not sample_pdf.exists():
        _create_sample_pdf(sample_pdf)
    else:
        print(f"[INFO] Dùng PDF đã có: {sample_pdf}")

    # Khởi tạo client
    client = None
    model = "gpt-4o-mini"
    if use_llm:
        try:
            from openai import OpenAI
            from src.config import OPENAI_API_KEY

            if OPENAI_API_KEY:
                client = OpenAI(api_key=OPENAI_API_KEY)
                print(f"[INFO] Sử dụng LLM: {model}")
            else:
                print("[WARN] Không có OPENAI_API_KEY, dùng heuristic")
        except Exception as e:
            print(f"[WARN] {e} — dùng heuristic")
    else:
        print("[INFO] Chế độ heuristic (--no-llm)")

    # Chạy pipeline
    from src.pdf_chunker import PDFChunkerPipeline

    output_dir = Path("output/chunks")
    pipeline = PDFChunkerPipeline(
        llm_client=client,
        model=model,
        output_dir=output_dir,
        max_tokens_per_chunk=400,
    )

    result = pipeline.process(sample_pdf)
    saved_path = pipeline.save(result, "sample_test_output")

    # In kết quả
    print(f"\n📊 KẾT QUẢ KIỂM THỬ:")
    print(f"   File nguồn  : {result.source_file}")
    print(f"   Tổng trang  : {result.total_pages}")
    print(f"   Tổng chunks : {result.total_chunks}")

    if result.errors:
        print(f"   ⚠️  Lỗi ({len(result.errors)}): {result.errors[:3]}")

    print(f"\n📋 MẪU CÁC CHUNKS:\n")
    for i, chunk in enumerate(result.chunks[:4], 1):
        print(f"── Chunk #{i} ──────────────────────────────────────")
        print(json.dumps(chunk.to_dict(), ensure_ascii=False, indent=2))
        print()

    print(f"\n✅ File JSON đầy đủ: {saved_path}")
    print("=" * 60)


if __name__ == "__main__":
    no_llm = "--no-llm" in sys.argv
    run_test(use_llm=not no_llm)
