# Backend mock — ghi chú tích hợp dữ liệu thật

Thư mục `mock/` chứa JSON mẫu để giao diện quiz / flashcard / slide hoạt động khi chưa có pipeline AI.

## Endpoint hiện tại

- `GET /api/mock/quiz` → `mock/quiz_thpt_en.json`
- `GET /api/mock/flashcard` → `mock/flashcard_en.json`
- `GET /api/mock/slide` → `mock/slide_thpt_en.json`

## Khi có dữ liệu từ AI

1. **Giữ contract JSON** (các key `title`, `questions` / `cards` / `slides`) để frontend không cần đổi; chỉ thay nguồn: trả cùng shape từ API khác (ví dụ `POST /api/generate/quiz` lưu DB rồi `GET` theo `session_id`).
2. Có thể **bỏ** các trường bắt đầu bằng `_` (ví dụ `_replace_note`) — client hiện không phụ thuộc chúng.
3. **Quiz:** mỗi `questions[]` cần `text`, `options[]`, `correctIndex` (0-based), `hint` (chuỗi, có thể rỗng).
4. **Flashcard:** `cards[]` với `front`, `back`; `hint` tùy chọn.
5. **Slide:** `slides[]` với `title`, `bullets[]` (mảng chuỗi).

Sau khi backend sinh nội dung thật, cập nhật `src/api_server.py` (hoặc service riêng) để trả JSON đúng schema thay vì đọc file tĩnh trong `mock/`.
