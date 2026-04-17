"""
chunker_cli.py — CLI cho PDF Chunker Pipeline
=============================================
Cách dùng:
  python -m src.chunker_cli <path_to_pdf> [options]

Ví dụ:
  python -m src.chunker_cli data/unit1.pdf
  python -m src.chunker_cli data/unit1.pdf --model gpt-4o --output-name my_chunks
  python -m src.chunker_cli data/unit1.pdf --no-llm   # dùng heuristic
  python -m src.chunker_cli data/               # xử lý tất cả PDF trong thư mục
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def _build_client(no_llm: bool, model: str):
    """Khởi tạo OpenAI client (nếu cần)."""
    if no_llm:
        return None, model

    try:
        from openai import OpenAI
        from .config import OPENAI_API_KEY

        if not OPENAI_API_KEY:
            print(
                "[WARN] OPENAI_API_KEY chưa được cấu hình trong .env. "
                "Chuyển sang chế độ heuristic.\n"
            )
            return None, model

        client = OpenAI(api_key=OPENAI_API_KEY)
        return client, model
    except Exception as e:
        print(f"[WARN] Không thể khởi tạo LLM client: {e}. Dùng heuristic.\n")
        return None, model


def _collect_pdfs(target: Path) -> list[Path]:
    if target.is_file():
        if target.suffix.lower() != ".pdf":
            print(f"[ERROR] File không phải PDF: {target}")
            sys.exit(1)
        return [target]
    elif target.is_dir():
        pdfs = sorted(target.glob("**/*.pdf"))
        if not pdfs:
            print(f"[ERROR] Không tìm thấy file PDF trong: {target}")
            sys.exit(1)
        return pdfs
    else:
        print(f"[ERROR] Đường dẫn không tồn tại: {target}")
        sys.exit(1)


def _print_summary(result_dict: dict) -> None:
    """In tóm tắt kết quả ra console."""
    chunks = result_dict.get("chunks", [])
    cats: dict[str, int] = {}
    diffs: dict[str, int] = {}
    for c in chunks:
        cats[c["category"]] = cats.get(c["category"], 0) + 1
        diffs[c["difficulty"]] = diffs.get(c["difficulty"], 0) + 1

    print("\n" + "=" * 55)
    print(f"  File       : {result_dict['source_file']}")
    print(f"  Trang      : {result_dict['total_pages']}")
    print(f"  Tổng chunks: {result_dict['total_chunks']}")
    print("  Phân loại  :")
    for cat, cnt in sorted(cats.items()):
        bar = "█" * min(cnt, 30)
        print(f"    {cat:15s} {cnt:4d}  {bar}")
    print("  Độ khó     :")
    for diff, cnt in sorted(diffs.items()):
        print(f"    {diff:15s} {cnt:4d}")
    if result_dict.get("errors"):
        print(f"  Lỗi        : {len(result_dict['errors'])}")
    print("=" * 55)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="chunker_cli",
        description="Chuyển đổi PDF sách giáo khoa tiếng Anh → Chunks JSON",
    )
    parser.add_argument(
        "target",
        help="Đường dẫn tới file PDF hoặc thư mục chứa các file PDF",
    )
    parser.add_argument(
        "--model",
        default="gpt-4o-mini",
        help="OpenAI model để phân loại (mặc định: gpt-4o-mini)",
    )
    parser.add_argument(
        "--output-dir",
        default="output/chunks",
        help="Thư mục lưu file JSON đầu ra (mặc định: output/chunks)",
    )
    parser.add_argument(
        "--output-name",
        default=None,
        help="Tên file JSON đầu ra (không cần .json). Chỉ dùng khi xử lý 1 file.",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=500,
        help="Số token tối đa mỗi chunk (mặc định: 500)",
    )
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="Tắt LLM, chỉ dùng heuristic (nhanh hơn, kém chính xác hơn)",
    )
    parser.add_argument(
        "--preview",
        type=int,
        default=0,
        metavar="N",
        help="In N chunks đầu tiên ra console để xem trước",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Hiện chi tiết log debug",
    )

    args = parser.parse_args(argv)
    _setup_logging(args.verbose)

    target = Path(args.target).expanduser().resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # Khởi tạo client
    client, model = _build_client(args.no_llm, args.model)

    # Import pipeline
    from .pdf_chunker import PDFChunkerPipeline

    pipeline = PDFChunkerPipeline(
        llm_client=client,
        model=model,
        output_dir=output_dir,
        max_tokens_per_chunk=args.max_tokens,
    )

    pdfs = _collect_pdfs(target)
    total = len(pdfs)
    print(f"\n📚 PDF Chunker — Đang xử lý {total} file(s)...\n")

    all_results = []
    for idx, pdf in enumerate(pdfs, 1):
        print(f"[{idx}/{total}] {pdf.name}")

        output_name = args.output_name if total == 1 else None
        result = pipeline.process(pdf)
        saved_path = pipeline.save(result, output_name)

        result_dict = result.to_dict()
        all_results.append(result_dict)

        _print_summary(result_dict)
        print(f"  ✅ Đã lưu: {saved_path}\n")

        # Preview
        if args.preview > 0 and result_dict["chunks"]:
            print(f"  📋 Xem trước {args.preview} chunk(s) đầu tiên:")
            for i, chunk in enumerate(result_dict["chunks"][: args.preview], 1):
                print(f"\n  ── Chunk #{i} ──")
                print(json.dumps(chunk, ensure_ascii=False, indent=4))

    # Nếu xử lý nhiều file → tạo thêm file tổng hợp
    if total > 1:
        combined_path = output_dir / "all_chunks_combined.json"
        combined_chunks = []
        for r in all_results:
            combined_chunks.extend(r["chunks"])
        combined_path.write_text(
            json.dumps(
                {"total_chunks": len(combined_chunks), "chunks": combined_chunks},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"📦 File tổng hợp: {combined_path} ({len(combined_chunks)} chunks)")

    print("\n✨ Hoàn thành!")


if __name__ == "__main__":
    main()
