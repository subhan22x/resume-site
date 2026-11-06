(() => {
  const track = document.querySelector("#jewelry-ux-track");
  if (!track) return;
  const carousel = track.closest(".jewelry-ux-carousel");
  const previous = carousel.querySelector(".jewelry-ux-prev");
  const next = carousel.querySelector(".jewelry-ux-next");
  const position = carousel.querySelector(".jewelry-ux-position");
  const slides = [...track.children];
  let index = 0;
  slides.forEach((slide, i) => {
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
  });
  function update() {
    index = Math.round(track.scrollLeft / track.clientWidth);
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    position.textContent = `${index + 1} / ${slides.length}`;
    slides.forEach((slide, i) => { slide.inert = i !== index; });
  }
  function move(direction) {
    const target = Math.max(0, Math.min(slides.length - 1, index + direction));
    track.scrollTo({ left: target * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("scroll", update, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
  });
  window.addEventListener("resize", () => {
    track.scrollTo({ left: index * track.clientWidth, behavior: "instant" });
    update();
  });
  update();
})();
