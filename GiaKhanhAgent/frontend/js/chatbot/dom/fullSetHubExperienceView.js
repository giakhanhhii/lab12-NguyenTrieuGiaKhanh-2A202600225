import { createExperienceTopBar } from "./experienceChrome.js";

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {{ title: string, items: { kind: string, meta: Record<string, string>, title?: string }[] }} bundle
 * @param {(item: { kind: string, meta: Record<string, string>, title?: string }) => void | Promise<void>} openChild
 */
export async function mountFullSetHubExperience(layerView, bundle, openChild) {
  layerView.prepareShow();
  const root = layerView.body;
  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-fullset-hub";

  shell.appendChild(
    createExperienceTopBar({
      title: bundle.title || "Full set",
    }),
  );

  const intro = document.createElement("p");
  intro.className = "exp-meta-line";
  intro.textContent =
    "Bộ demo gồm slide, trắc nghiệm và flashcard (mock). Chọn từng phần bên dưới — có thể quay lại chat bất cứ lúc nào.";

  const grid = document.createElement("div");
  grid.className = "exp-fullset-hub-grid";

  bundle.items.forEach((it) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "exp-fullset-hub-tile";
    const label = it.title || (it.kind === "quiz" ? "Trắc nghiệm" : it.kind === "slide" ? "Slide" : "Flashcard");
    b.textContent = label;
    b.addEventListener("click", () => {
      void openChild(it);
    });
    grid.appendChild(b);
  });

  shell.appendChild(intro);
  shell.appendChild(grid);
  root.appendChild(shell);
}
