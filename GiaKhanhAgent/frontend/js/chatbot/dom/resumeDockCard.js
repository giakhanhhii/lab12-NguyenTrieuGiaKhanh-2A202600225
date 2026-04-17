/** @typedef {{ kind: "quiz"|"slide"|"flash", meta: Record<string, string>, title?: string, openedAt?: string, experienceId?: string }} ResumeDockItem */

/**
 * @param {string} [iso]
 * @returns {string}
 */
function formatResumeTimeVi(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} ${d.getDate()} thg ${d.getMonth() + 1}`;
}

function quizDocIconSvg() {
  return `<svg class="resume-dock-icon-svg" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="6" y="4" width="28" height="32" rx="4" fill="#eceff1" stroke="#90a4ae" stroke-width="1.25"/>
  <path d="M12 12h16M12 17h10" stroke="#78909c" stroke-width="1.5" stroke-linecap="round"/>
  <text x="20" y="30" text-anchor="middle" font-size="12" font-weight="800" fill="#546e7a" font-family="system-ui,sans-serif">?</text>
</svg>`;
}

/**
 * @param {ResumeDockItem} item
 * @param {(item: ResumeDockItem) => void} onOpen
 * @returns {HTMLElement}
 */
function createLine(item, onOpen) {
  const line = document.createElement("div");
  line.className = "resume-dock-line";

  const mid = document.createElement("div");
  mid.className = "resume-dock-line-mid";

  const title = document.createElement("div");
  title.className = "resume-dock-line-title";
  title.textContent = item.title || item.kind;

  const time = document.createElement("div");
  time.className = "resume-dock-line-time";
  time.textContent = formatResumeTimeVi(item.openedAt);

  mid.appendChild(title);
  mid.appendChild(time);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "resume-dock-open-btn";
  btn.textContent = "Mở";
  btn.addEventListener("click", () => onOpen(item));

  line.appendChild(mid);
  line.appendChild(btn);
  return line;
}

/**
 * @typedef {Record<string, string>} FullSetMixedSpec
 */

/**
 * @param {ResumeDockItem | { items?: ResumeDockItem[], title?: string, fullsetMixed?: FullSetMixedSpec }} dock
 * @param {(item: ResumeDockItem) => void} onOpen
 * @param {(items: ResumeDockItem[], bundleTitle: string) => void} [onOpenAll]
 * @param {(spec: FullSetMixedSpec, bundleTitle: string) => void} [onOpenFullSetMixed]
 * @returns {HTMLElement}
 */
export function createResumeDockCard(dock, onOpen, onOpenAll, onOpenFullSetMixed) {
  const root = document.createElement("div");
  root.className = "resume-dock-card";

  const icon = document.createElement("div");
  icon.className = "resume-dock-icon-wrap";
  icon.innerHTML = quizDocIconSvg();
  root.appendChild(icon);

  const main = document.createElement("div");
  main.className = "resume-dock-main";

  if (dock && dock.fullsetMixed && typeof onOpenFullSetMixed === "function") {
    const bundleTitle = dock.title || "Full set";
    const allWrap = document.createElement("div");
    allWrap.className = "resume-dock-open-all-wrap";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "resume-dock-open-all-btn";
    allBtn.textContent = "Mở tất cả";
    allBtn.addEventListener("click", () => onOpenFullSetMixed(dock.fullsetMixed, bundleTitle));
    allWrap.appendChild(allBtn);
    main.appendChild(allWrap);
    const head = document.createElement("div");
    head.className = "resume-dock-bundle-head";
    head.textContent = bundleTitle;
    main.appendChild(head);
    if (Array.isArray(dock.items) && dock.items.length && typeof onOpen === "function") {
      dock.items.forEach((it) => {
        main.appendChild(createLine(it, onOpen));
      });
    }
    root.appendChild(main);
    return root;
  }

  if (dock && Array.isArray(dock.items) && dock.items.length) {
    const bundleTitle = dock.title || "Bộ học liệu";
    if (dock.items.length >= 2 && typeof onOpenAll === "function") {
      const allWrap = document.createElement("div");
      allWrap.className = "resume-dock-open-all-wrap";
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "resume-dock-open-all-btn";
      allBtn.textContent = "Mở tất cả";
      allBtn.addEventListener("click", () => onOpenAll(dock.items, bundleTitle));
      allWrap.appendChild(allBtn);
      main.appendChild(allWrap);
    }
    const head = document.createElement("div");
    head.className = "resume-dock-bundle-head";
    head.textContent = bundleTitle;
    main.appendChild(head);
    dock.items.forEach((it) => {
      main.appendChild(createLine(it, onOpen));
    });
  } else {
    /** @type {ResumeDockItem} */
    const item = /** @type {ResumeDockItem} */ (dock);
    main.appendChild(createLine(item, onOpen));
  }

  root.appendChild(main);
  return root;
}
