(function () {
  "use strict";
  var article = document.querySelector('.essay-body');
  if (!article) return;
  var headings = Array.from(article.querySelectorAll('h2[id], h3[id]'));
  var links = Array.from(document.querySelectorAll('.toc-link'));
  var contents = document.querySelector('.essay-contents');
  var compact = matchMedia('(max-width: 1000px)');
  function setLayout() { contents.open = !compact.matches; }
  setLayout();
  compact.addEventListener('change', setLayout);
  var active = -1;
  function update() {
    var index = 0;
    headings.forEach(function (heading, i) {
      if (heading.getBoundingClientRect().top <= 160) index = i;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) index = headings.length - 1;
    if (active === index) return;
    active = index;
    links.forEach(function (link, i) {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    var nav = links[index].parentElement;
    if (!compact.matches) nav.scrollTop = links[index].offsetTop - nav.offsetTop - nav.clientHeight / 2;
  }
  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { update(); pending = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      if (compact.matches) contents.open = false;
      var heading = document.getElementById(link.hash.slice(1));
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
  });
  update();
})();
