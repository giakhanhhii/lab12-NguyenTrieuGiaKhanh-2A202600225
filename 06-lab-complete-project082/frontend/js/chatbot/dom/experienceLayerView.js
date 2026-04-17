/**
 * @param {{ experienceLayer: HTMLElement, experienceBody: HTMLElement, chatPhase: HTMLElement }} els
 */
export function createExperienceLayerView(els) {
  const { experienceLayer, experienceBody, chatPhase } = els;
  return {
    hide() {
      experienceLayer.classList.remove("visible");
      experienceLayer.setAttribute("aria-hidden", "true");
      experienceBody.innerHTML = "";
      chatPhase.style.display = "";
    },
    prepareShow() {
      chatPhase.style.display = "none";
      experienceLayer.classList.add("visible");
      experienceLayer.setAttribute("aria-hidden", "false");
      experienceBody.innerHTML = "";
    },
    get body() {
      return experienceBody;
    },
  };
}
