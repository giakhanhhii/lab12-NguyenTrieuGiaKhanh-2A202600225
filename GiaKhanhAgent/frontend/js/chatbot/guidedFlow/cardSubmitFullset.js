/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFullsetCardSubmit(guided, cardType, payload) {
  if (guided.kind === "fullset" && guided.step === "await_pdf_confirm" && cardType === "fullset_pdf") {
    if (payload.__auto === "1") {
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text: "Bỏ qua tải PDF — nhờ Teachly tự động soạn nội dung" },
          {
            type: "pushBot",
            text:
              "Đã ghi nhận: bạn không tải PDF.\n\nTeachly sẽ tự động đề xuất nội dung khi pipeline AI sẵn sàng. Bạn có thể tiếp tục chat hoặc quay về trang chủ.",
          },
        ],
      };
    }
    const name = payload.fileName || "—";
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `Đã chọn tệp PDF: ${name}` },
        {
          type: "pushBot",
          text:
            "Cảm ơn bạn! Tệp đã được ghi nhận trên giao diện.\n\nBước chuyển Markdown bằng Chandra OCR2 sẽ được kích hoạt khi tích hợp backend — bạn có thể tiếp tục trò chuyện hoặc quay về trang chủ để chọn chức năng khác.",
        },
      ],
    };
  }

  if (guided.kind === "fullset" && guided.step === "await_topic_form" && cardType === "fullset_topic") {
    const lines = [];
    if (payload.__auto === "1") lines.push("[Chế độ Teachly tự động]");
    lines.push(
      `[Full Set — chủ đề] ${payload.topic}`,
      `Trình độ: ${payload.level}`,
      `Số lượng — Slide: ${payload.slides}, Quiz: ${payload.quiz}, Flashcard: ${payload.flash}`,
    );
    if (payload.extra) lines.push(`Yêu cầu thêm: ${payload.extra}`);

    const topic = payload.topic || "—";
    const openedAt = new Date().toISOString();
    const experienceId =
      globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const resumeDock = {
      title: `Full set — ${topic}`,
      experienceId,
      fullsetMixed: {
        topic,
        level: String(payload.level || "—"),
        slides: String(payload.slides || "0"),
        quiz: String(payload.quiz || "0"),
        flash: String(payload.flash || "0"),
        extra: String(payload.extra || ""),
        __experienceId: experienceId,
      },
      items: [
        {
          kind: "slide",
          meta: {
            topic,
            count: String(payload.slides || "—"),
            notes: "Full set (demo mock)",
            __experienceId: `${experienceId}:slide`,
          },
          experienceId: `${experienceId}:slide`,
          title: `Slide — ${topic}`,
          openedAt,
        },
        {
          kind: "quiz",
          meta: {
            topic,
            count: String(payload.quiz || "—"),
            notes: "Full set (demo mock)",
            __experienceId: `${experienceId}:quiz`,
          },
          experienceId: `${experienceId}:quiz`,
          title: `Trắc nghiệm — ${topic}`,
          openedAt,
        },
        {
          kind: "flash",
          meta: {
            source: topic,
            count: String(payload.flash || "—"),
            extra: "Full set (demo mock)",
            __experienceId: `${experienceId}:flash`,
          },
          experienceId: `${experienceId}:flash`,
          title: `Flashcard — ${topic}`,
          openedAt,
        },
      ],
    };
    const baseBot =
      payload.__auto === "1"
        ? "Bạn đã chọn để Teachly tự động soạn Full Set (giao diện demo). Khi backend sẵn sàng, hệ thống sẽ sinh nội dung phù hợp.\n\nBạn có thể tiếp tục chat hoặc quay về trang chủ."
        : "Teachly đã nhận đủ thông tin để chuẩn bị Full Set theo chủ đề của bạn (giao diện demo).\n\nViệc sinh nội dung thực tế sẽ được nối với backend/AI ở bước sau.";
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: lines.join("\n") },
        {
          type: "pushBot",
          text: `${baseBot}\n\nNhấn "Mở tất cả" để làm một phiên trộn cả ba dạng trong một luồng (tổng mục = tổng ba ô, tối đa 40). Hoặc mở riêng Slide / Quiz / Flashcard bên dưới — mỗi nút "Mở" dùng đúng số lượng bạn đã nhập cho loại đó.`,
          resumeDock,
        },
      ],
    };
  }

  return null;
}

