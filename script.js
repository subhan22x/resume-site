(function () {
  "use strict";

  var data = window.SITE_DATA;
  var profile = data.profile;
  var page = document.documentElement.dataset.page;

  var icons = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l1.41-1.41"></path></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5a5.4 5.4 0 0 0-1-3.5c.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5a13.4 13.4 0 0 0-8 0C6 2 5 2 5 2a6.1 6.1 0 0 0 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5A4 4 0 0 0 9 18v4"></path><path d="M9 18c-4.5 2-5-2-7-2"></path></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20"></path></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="4" height="12"></rect><circle cx="5" cy="4" r="2"></circle><path d="M11 21V9h4v2a5 5 0 0 1 6 5v5h-4v-5a2 2 0 0 0-4 0v5"></path></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-9 6a2 2 0 0 1-2 0L2 7"></path></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"></path></svg>'
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch (_) {}
    document.querySelectorAll(".js-theme").forEach(function (button) {
      button.innerHTML = theme === "dark" ? icons.sun : icons.moon;
    });
  }

  function fillSharedContent() {
    var pageTitle = document.documentElement.dataset.title;
    document.title = pageTitle ? pageTitle + " — " + profile.name : (page === "about" ? profile.title : (page.charAt(0).toUpperCase() + page.slice(1) + " — " + profile.name));
    document.querySelectorAll(".js-name").forEach(function (element) { element.textContent = profile.name; });

    var footer = document.getElementById("site-footer");
    footer.innerHTML =
      '<div class="footer-row"><div class="socials">' +
        '<a href="' + escapeHtml(profile.social.x) + '" aria-label="X">' + icons.x + '</a>' +
        '<a href="' + escapeHtml(profile.social.linkedin) + '" aria-label="LinkedIn">' + icons.linkedin + '</a>' +
        '<a href="' + escapeHtml(profile.social.github) + '" aria-label="GitHub">' + icons.github + '</a>' +
        '<a href="mailto:' + escapeHtml(profile.email) + '" aria-label="Email">' + icons.mail + '</a>' +
        '<a href="' + escapeHtml(profile.social.source) + '" aria-label="Website source">' + icons.code + '</a>' +
      '</div><div class="footer-mark" aria-hidden="true">← <span>✣</span> →</div></div>' +
      '<p>' + profile.copyrightYear + ' © ' + escapeHtml(profile.name) + '</p>';
  }

  function renderAbout() {
    var role = document.getElementById("role-line");
    if (!role) return;
    role.innerHTML = escapeHtml(profile.role) + ' <strong>@ ' + escapeHtml(profile.company) + '</strong>';
    document.getElementById("education-line").innerHTML = escapeHtml(profile.education) + ' <strong>@ ' + escapeHtml(profile.school) + '</strong>';
    document.getElementById("highlights").innerHTML = data.highlights.map(function (item) { return "<li>" + item + "</li>"; }).join("");
    document.getElementById("experience").innerHTML = data.experience.map(function (item) {
      return '<li>' + escapeHtml(item.role) + ' <span class="company-mark">' + escapeHtml(item.mark) + '</span> <strong>' + escapeHtml(item.company) + '</strong></li>';
    }).join("");
  }

  function projectHtml(project) {
    var title = escapeHtml(project.title);
    var url = project.url ? escapeHtml(project.url) : "";
    var source = project.source ? '<a href="' + escapeHtml(project.source) + '" aria-label="' + title + ' source">' + icons.github + '</a>' : "";
    var cardLink = url ? '<a class="project-card-link" href="' + url + '" aria-label="Open ' + title + '"></a>' : "";
    var art = project.thumbnail
      ? '<img class="project-thumbnail" src="' + escapeHtml(project.thumbnail) + '" alt="' + title + ' preview">'
      : '<span class="art-grid"></span><span class="art-window"><i></i><i></i><i></i><b>' + title + '</b><small>your work goes here</small></span>';
    return '<article class="project-card">' +
      cardLink +
      '<div class="project-art ' + escapeHtml(project.color) + '" aria-hidden="true">' + art + '</div>' +
      '<div class="project-copy"><div class="project-heading"><h1>' + title + '</h1><span>' + source +
        (url ? '<a href="' + url + '" aria-label="Open ' + title + '">' + icons.external + '</a>' : "") +
      '</span></div><p>' + escapeHtml(project.description) + '</p><div class="tags">' + project.tags.map(escapeHtml).join(" · ") + '</div></div></article>';
  }

  function renderProjects(list) {
    var container = document.getElementById("project-list");
    if (!container) return;
    container.innerHTML = list.length ? list.map(projectHtml).join("") : '<p class="empty">No projects match that search.</p>';
  }

  function renderWriting() {
    var container = document.getElementById("article-list");
    if (!container) return;
    container.innerHTML = data.articles.map(function (article) {
      return '<a href="' + escapeHtml(article.url) + '" class="article-row"><span>' + escapeHtml(article.title) + '</span><time>' + escapeHtml(article.date) + '</time></a>';
    }).join("");
  }

  function renderDesign() {
    var container = document.getElementById("ux-article-grid");
    if (!container) return;
    container.innerHTML = data.uxArticles.map(function (item) {
      return '<article class="ux-article-card"><div class="ux-card-art" aria-hidden="true"><span>' + escapeHtml(item.number) + '</span><i></i><i></i><i></i></div><div class="ux-card-copy"><small>case study · coming soon</small><h1>' + escapeHtml(item.title) + '</h1><p>' + escapeHtml(item.summary) + '</p><span class="read-label">read article →</span></div></article>';
    }).join("");
  }

  function renderBrandWork() {
    var container = document.getElementById("brand-grid");
    if (!container) return;
    container.innerHTML = data.designImages.map(function (filename, index) {
      var src = "assets/design/" + encodeURIComponent(filename);
      var label = "Brand and graphic design piece " + String(index + 1).padStart(2, "0");
      return '<a class="brand-item" href="' + src + '" target="_blank" rel="noopener" aria-label="Open ' + label + '"><img src="' + src + '" alt="' + label + '" decoding="async"></a>';
    }).join("");
  }

  function setupPalette() {
    var root = document.getElementById("command-palette");
    root.innerHTML = '<div class="palette-backdrop" hidden><section class="palette" role="dialog" aria-modal="true" aria-label="Command menu"><div class="palette-title"><span>Go somewhere</span><button class="js-palette-close" aria-label="Close command menu">×</button></div><a href="index.html">about</a><a href="projects.html">projects</a><a href="writing.html">writing</a><a href="design.html">design</a><button class="js-palette-theme">toggle theme</button></section></div>';
    var backdrop = root.querySelector(".palette-backdrop");
    function open() { backdrop.hidden = false; root.querySelector(".js-palette-close").focus(); }
    function close() { backdrop.hidden = true; }
    document.querySelectorAll(".js-palette-open").forEach(function (button) { button.addEventListener("click", open); });
    root.querySelector(".js-palette-close").addEventListener("click", close);
    root.querySelector(".js-palette-theme").addEventListener("click", function () { setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"); close(); });
    backdrop.addEventListener("click", function (event) { if (event.target === backdrop) close(); });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); backdrop.hidden ? open() : close(); }
      if (event.key === "Escape") close();
    });
  }

  fillSharedContent();
  renderAbout();
  renderProjects(data.projects);
  renderWriting();
  renderDesign();
  renderBrandWork();
  setupPalette();
  setTheme(document.documentElement.dataset.theme || "light");

  document.querySelectorAll(".js-theme").forEach(function (button) {
    button.addEventListener("click", function () { setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"); });
  });

  var search = document.getElementById("project-search");
  if (search) search.addEventListener("input", function () {
    var term = search.value.trim().toLowerCase();
    renderProjects(data.projects.filter(function (project) {
      return [project.title, project.description].concat(project.tags).join(" ").toLowerCase().indexOf(term) !== -1;
    }));
  });
})();
