/**
 * Main Hub card grid for empty chat — mirrors `frontend/main_hub.html` structure & SVGs.
 * @param {(flow: "fullset"|"quiz"|"slide"|"flashcard") => void} onPick
 */
export function createStartupHubElement(onPick) {
  const handlePick = typeof onPick === "function" ? onPick : null;
  const wrap = document.createElement("div");
  wrap.className = "chat-startup-hub";
  wrap.innerHTML = `
  <div class="forest-page forest-page--embedded">
    <svg class="trees-bg" viewBox="0 0 900 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;" aria-hidden="true">
      <polygon points="30,120 60,40 90,120" fill="#388e3c" opacity="0.5" />
      <polygon points="55,120 90,30 125,120" fill="#2e7d32" opacity="0.45" />
      <polygon points="10,120 38,60 66,120" fill="#43a047" opacity="0.3" />
      <polygon points="800,120 830,38 860,120" fill="#388e3c" opacity="0.5" />
      <polygon points="830,120 865,28 900,120" fill="#2e7d32" opacity="0.4" />
      <polygon points="775,120 808,55 841,120" fill="#43a047" opacity="0.3" />
      <polygon points="420,120 445,70 470,120" fill="#66bb6a" opacity="0.18" />
    </svg>
    <div class="hero-area">
      <div class="headline-area">
        <p class="startup-hub-instruction">Bạn muốn tạo mới thẻ nào, chọn 1 thẻ để tạo mới</p>
      </div>
    </div>
    <div class="cards-row">
      <button type="button" class="card" data-flow="fullset" aria-label="Tạo Full Set">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="startupForestGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1a237e" />
              <stop offset="100%" stop-color="#1b5e20" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#startupForestGrad1)" />
          <circle cx="155" cy="30" r="18" fill="#fff9c4" opacity="0.9" />
          <circle cx="163" cy="25" r="13" fill="#1a237e" />
          <polygon points="0,116 20,70 40,116" fill="#0d3b0d" />
          <polygon points="25,116 50,50 75,116" fill="#1b5e20" />
          <polygon points="60,116 80,62 100,116" fill="#0d3b0d" />
          <polygon points="140,116 160,55 180,116" fill="#0d3b0d" />
          <polygon points="165,116 185,48 200,116" fill="#1b5e20" />
          <circle cx="40" cy="20" r="1.5" fill="#fff" opacity="0.8" />
          <circle cx="80" cy="15" r="1.5" fill="#fff" opacity="0.7" />
          <circle cx="120" cy="22" r="1" fill="#fff" opacity="0.9" />
          <circle cx="60" cy="35" r="1" fill="#fff" opacity="0.6" />
          <path d="M98 55 L100 47 L102 55 L110 57 L102 59 L100 67 L98 59 L90 57 Z" fill="#fff9c4" opacity="0.9" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo Full Set</div>
          <div class="card-desc">Tạo bộ 3 slide, quiz, hình ảnh</div>
          <div class="badge badge-recommend">
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <polygon points="6,1 7.5,4.5 11,4.8 8.5,7.2 9.2,11 6,9 2.8,11 3.5,7.2 1,4.8 4.5,4.5" fill="#2e7d32" />
            </svg>
            KHUYẾN KHÍCH
          </div>
        </div>
      </button>
      <button type="button" class="card" data-flow="slide" aria-label="Tạo slide">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="startupForestGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a5d6a7" />
              <stop offset="55%" stop-color="#388e3c" />
              <stop offset="100%" stop-color="#1b5e20" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#startupForestGrad2)" />
          <polygon points="0,116 28,62 52,116" fill="#0d3b0d" opacity="0.35" />
          <polygon points="168,116 188,58 200,116" fill="#0d3b0d" opacity="0.4" />
          <rect x="58" y="34" width="84" height="56" rx="6" fill="#e8f5e9" opacity="0.45" transform="rotate(-4 100 62)" />
          <rect x="52" y="38" width="88" height="58" rx="6" fill="#fff" opacity="0.55" transform="rotate(-2 96 67)" />
          <rect x="48" y="42" width="92" height="60" rx="7" fill="#f1f8e9" stroke="#2e7d32" stroke-width="2" />
          <rect x="58" y="52" width="48" height="6" rx="2" fill="#81c784" opacity="0.85" />
          <rect x="58" y="64" width="72" height="4" rx="1.5" fill="#a5d6a7" opacity="0.9" />
          <rect x="58" y="72" width="64" height="4" rx="1.5" fill="#c8e6c9" opacity="0.95" />
          <rect x="58" y="80" width="56" height="4" rx="1.5" fill="#c8e6c9" opacity="0.85" />
          <ellipse cx="175" cy="22" rx="14" ry="9" fill="#66bb6a" transform="rotate(25 175 22)" opacity="0.7" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo slide</div>
          <div class="card-desc">Tạo slide theo nội dung của bạn</div>
        </div>
      </button>
      <button type="button" class="card" data-flow="quiz" aria-label="Tạo quiz">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="startupForestGrad3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#33691e" />
              <stop offset="50%" stop-color="#2e7d32" />
              <stop offset="100%" stop-color="#1b5e20" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#startupForestGrad3)" />
          <ellipse cx="100" cy="128" rx="95" ry="48" fill="#1b5e20" opacity="0.5" />
          <rect x="44" y="22" width="112" height="78" rx="8" fill="#f1f8e9" stroke="#558b2f" stroke-width="2" />
          <text x="100" y="44" font-size="13" font-weight="800" text-anchor="middle" fill="#33691e" font-family="Nunito, sans-serif">?</text>
          <line x1="54" y1="52" x2="146" y2="52" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round" />
          <circle cx="58" cy="64" r="7" fill="#e8f5e9" stroke="#43a047" stroke-width="1.5" />
          <text x="58" y="68" font-size="9" font-weight="800" text-anchor="middle" fill="#2e7d32" font-family="sans-serif">A</text>
          <rect x="72" y="60" width="66" height="8" rx="2" fill="#c8e6c9" />
          <circle cx="58" cy="80" r="7" fill="#e8f5e9" stroke="#43a047" stroke-width="1.5" />
          <text x="58" y="84" font-size="9" font-weight="800" text-anchor="middle" fill="#2e7d32" font-family="sans-serif">B</text>
          <rect x="72" y="76" width="58" height="8" rx="2" fill="#c8e6c9" />
          <circle cx="58" cy="96" r="7" fill="#43a047" stroke="#1b5e20" stroke-width="1.5" />
          <text x="58" y="100" font-size="9" font-weight="800" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text>
          <rect x="72" y="92" width="62" height="8" rx="2" fill="#a5d6a7" />
          <ellipse cx="24" cy="28" rx="12" ry="7" fill="#66bb6a" transform="rotate(-35 24 28)" opacity="0.5" />
          <ellipse cx="178" cy="88" rx="11" ry="7" fill="#8bc34a" transform="rotate(20 178 88)" opacity="0.45" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo quiz</div>
          <div class="card-desc">Tạo quiz cho nội dung thi THPTQG tiếng anh</div>
          <div class="badge badge-new">MỚI</div>
        </div>
      </button>
      <button type="button" class="card" data-flow="flashcard" aria-label="Tạo flashcard">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="startupForestGrad4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff9c4" />
              <stop offset="35%" stop-color="#aed581" />
              <stop offset="100%" stop-color="#2e7d32" />
            </linearGradient>
            <linearGradient id="startupFrameSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#b3e5fc" />
              <stop offset="100%" stop-color="#81c784" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#startupForestGrad4)" />
          <polygon points="0,116 35,72 68,116" fill="#1b5e20" opacity="0.25" />
          <polygon points="140,116 170,68 200,116" fill="#1b5e20" opacity="0.28" />
          <rect x="54" y="18" width="92" height="82" rx="10" fill="#5d4037" />
          <rect x="58" y="22" width="84" height="70" rx="6" fill="url(#startupFrameSky)" stroke="#33691e" stroke-width="1" />
          <polygon points="58,88 78,58 98,88" fill="#388e3c" />
          <polygon points="88,92 110,52 132,92" fill="#2e7d32" />
          <polygon points="118,90 138,62 158,90" fill="#43a047" />
          <circle cx="128" cy="38" r="10" fill="#fff9c4" opacity="0.95" />
          <path d="M44 34 L46 28 L48 34 L54 36 L48 38 L46 44 L44 38 L38 36 Z" fill="#fffde7" opacity="0.95" />
          <path d="M158 26 L159.5 22 L161 26 L165 27 L161 28 L159.5 32 L158 28 L154 27 Z" fill="#fff9c4" opacity="0.9" />
          <circle cx="168" cy="78" r="2" fill="#fff" opacity="0.85" />
          <circle cx="32" cy="88" r="1.5" fill="#fff" opacity="0.7" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo flashcard</div>
          <div class="card-desc">Tạo flashcard từ vựng và phát âm chuẩn cho bài giảng của bạn</div>
        </div>
      </button>
    </div>
  </div>`;

  wrap.querySelectorAll(".card[data-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const flow = /** @type {string} */ (btn.getAttribute("data-flow") || "");
      if (!handlePick) return;
      if (flow === "fullset" || flow === "quiz" || flow === "slide" || flow === "flashcard") {
        handlePick(flow);
      }
    });
  });

  return wrap;
}
