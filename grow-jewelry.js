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
  function stride() {
    return slides[1].offsetLeft - slides[0].offsetLeft;
  }
  function update() {
    index = Math.round(track.scrollLeft / stride());
    const maxScroll = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll - 2;
    const visible = slides.map((slide, i) => {
      const left = i * stride() - track.scrollLeft;
      return left < track.clientWidth - 2 && left + slide.clientWidth > 2;
    });
    const first = visible.indexOf(true) + 1;
    const last = visible.lastIndexOf(true) + 1;
    position.textContent = `${first === last ? first : `${first}–${last}`} / ${slides.length}`;
    slides.forEach((slide, i) => { slide.inert = !visible[i]; });
  }
  function move(direction) {
    track.scrollBy({ left: direction * stride(), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
    track.scrollTo({ left: index * stride(), behavior: "instant" });
    update();
  });
  update();
})();
