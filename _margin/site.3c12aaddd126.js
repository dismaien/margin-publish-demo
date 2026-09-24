(function () {
  "use strict";
  var root = document.body.getAttribute("data-root") || "";
  var index = window.MARGIN_SEARCH_INDEX || [];
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");
  var toggle = document.querySelector(".nav-toggle");
  var scrim = document.querySelector(".scrim");
  var selected = -1;

  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (scrim) scrim.hidden = !open;
  }
  if (toggle) toggle.addEventListener("click", function () { setNav(!document.body.classList.contains("nav-open")); });
  if (scrim) scrim.addEventListener("click", function () { setNav(false); });

  function fold(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  var prepared = index.map(function (e) {
    return { e: e, title: fold(e.t), heads: fold(e.h.join(" ")), tags: fold(e.g.join(" ")), text: fold(e.x) };
  });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function snippet(entry, term) {
    var text = entry.e.x;
    var i = entry.text.indexOf(term);
    if (i < 0) return text.slice(0, 140);
    var start = Math.max(0, i - 50);
    return (start > 0 ? "…" : "") + text.slice(start, i + 110).replace(/\s+/g, " ") + "…";
  }

  function search(q) {
    var terms = fold(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    prepared.forEach(function (p) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (p.title.indexOf(t) >= 0) score += 12;
        else if (p.heads.indexOf(t) >= 0 || p.tags.indexOf(t) >= 0) score += 5;
        else if (p.text.indexOf(t) >= 0) score += 1;
        else return;
      }
      out.push({ p: p, score: score, term: terms[0] });
    });
    out.sort(function (a, b) { return b.score - a.score || a.p.e.t.localeCompare(b.p.e.t); });
    return out.slice(0, 20);
  }

  function render(list) {
    results.textContent = "";
    selected = -1;
    if (!input.value.trim()) { results.hidden = true; return; }
    if (!list.length) {
      results.appendChild(el("div", "r-empty", "No matching notes"));
    }
    list.forEach(function (r, i) {
      var a = el("a");
      a.href = root + r.p.e.u;
      a.setAttribute("role", "option");
      a.id = "search-option-" + i;
      a.appendChild(el("div", "r-title", r.p.e.t));
      a.appendChild(el("div", "r-snippet", snippet(r.p, r.term)));
      results.appendChild(a);
    });
    results.hidden = false;
  }

  function move(delta) {
    var items = results.querySelectorAll("a");
    if (!items.length) return;
    if (selected >= 0) items[selected].removeAttribute("aria-selected");
    selected = (selected + delta + items.length) % items.length;
    items[selected].setAttribute("aria-selected", "true");
    items[selected].scrollIntoView({ block: "nearest" });
  }

  if (input && results) {
    input.addEventListener("input", function () { render(search(input.value)); });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); move(1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); move(-1); }
      else if (ev.key === "Enter") {
        var items = results.querySelectorAll("a");
        var target = items[selected >= 0 ? selected : 0];
        if (target) { window.location.href = target.href; }
      } else if (ev.key === "Escape") { input.value = ""; render([]); input.blur(); }
    });
    document.addEventListener("keydown", function (ev) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if ((ev.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") || (ev.key === "k" && (ev.metaKey || ev.ctrlKey))) {
        ev.preventDefault(); input.focus(); input.select();
      }
    });
    document.addEventListener("click", function (ev) {
      if (!results.contains(ev.target) && ev.target !== input) results.hidden = true;
    });
  }

  // Highlight the heading currently in view in the table of contents.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[decodeURIComponent(a.getAttribute("href").slice(1))] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("active"); });
          var link = byId[entry.target.id];
          if (link) link.classList.add("active");
        }
      });
    }, { rootMargin: "-10% 0px -75% 0px" });
    Object.keys(byId).forEach(function (id) {
      var h = document.getElementById(id);
      if (h) observer.observe(h);
    });
  }
})();