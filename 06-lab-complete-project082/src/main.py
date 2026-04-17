from __future__ import annotations

from pathlib import Path

from .agent import LectureAgent


def main() -> int:
    agent = LectureAgent()
    prompt = input("Nhập prompt/chủ đề bài giảng: ").strip()
    if not prompt:
        print("Missing prompt.")
        return 2
    output_type = (input("Chọn định dạng (slide/video/both) [slide]: ").strip().lower() or "slide")
    result = agent.run(prompt, output_type=output_type)
    print("\nKết quả:")
    for k, v in result.items():
        print(f"- {k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
