// Combined artifact shell: router, search, reading progress, menu, cinematic opening.
(function () {
  "use strict";
  var PAGES = window.__PAGES; // [{slug, title}]
  var slugs = PAGES.map(function (p) { return p.slug; });
  var guide = document.getElementById("guide");
  var ws = document.getElementById("ws");
  var intro = document.getElementById("intro");
  var header = document.querySelector(".site-header");
  var switchLink = document.getElementById("view-switch");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = null;
  var explorerLoaded = false;

  function headerHeight() {
    var h = header.offsetHeight;
    document.documentElement.style.setProperty("--hh", h + "px");
    return h;
  }

  // ---------- Router ----------
  function parse() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === "team" || h.indexOf("team-") === 0) return { view: "ws" };
    if (slugs.indexOf(h) >= 0) return { view: "guide", page: h };
    var cut = h.indexOf("--");
    if (cut > 0 && slugs.indexOf(h.slice(0, cut)) >= 0) return { view: "guide", page: h.slice(0, cut), anchor: h };
    if (h && document.getElementById(h)) {
      var holder = document.getElementById(h).closest(".page");
      if (holder) return { view: "guide", page: holder.dataset.page, anchor: h };
    }
    return { view: "guide", page: "start-here" };
  }

  function show() {
    var r = parse();
    var inWs = r.view === "ws";
    guide.hidden = inWs;
    ws.hidden = !inWs;
    switchLink.textContent = inWs ? "Back to the guide" : "Team workspace";
    switchLink.setAttribute("href", inWs ? "#start-here" : "#team");
    if (inWs) { document.title = "Team workspace | Printing in Residence"; current = null; return; }
    if (r.page !== current) {
      current = r.page;
      Array.prototype.forEach.call(document.querySelectorAll(".page"), function (el) { el.hidden = el.dataset.page !== current; });
      intro.hidden = current !== "start-here";
      Array.prototype.forEach.call(document.querySelectorAll("#site-nav a"), function (a) {
        var on = a.getAttribute("href") === "#" + current;
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
        if (a.parentElement) a.parentElement.classList.toggle("is-current", on);
      });
      var meta = PAGES[slugs.indexOf(current)];
      document.title = meta.title + " | Printing in Residence";
      setMenu(false);
      if (current === "printer-explorer") loadExplorer();
      if (current === "start-here") Intro.wake();
      if (!r.anchor) window.scrollTo(0, 0);
      watchSections();
    }
    if (r.anchor) {
      var target = document.getElementById(r.anchor);
      if (target) target.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
    }
  }

  function loadExplorer() {
    if (explorerLoaded) { window.dispatchEvent(new Event("resize")); return; }
    explorerLoaded = true;
    var s = document.createElement("script");
    s.src = "explorer.bundle.js";
    s.onerror = function () {
      var f = document.getElementById("explorer-fallback");
      if (f) f.hidden = false;
    };
    document.body.appendChild(s);
  }

  // ---------- Menu (small screens) ----------
  var menuButton = document.querySelector(".menu-button");
  var nav = document.getElementById("site-nav");
  function setMenu(open) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) nav.setAttribute("data-open", ""); else nav.removeAttribute("data-open");
  }
  if (menuButton) {
    menuButton.hidden = false;
    menuButton.addEventListener("click", function () { setMenu(menuButton.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // ---------- Part navigation on the explorer page ----------
  var partButtons = Array.prototype.slice.call(document.querySelectorAll(".part-button"));
  function stepPart(dir) {
    if (!partButtons.length) return;
    var at = partButtons.findIndex(function (b) { return b.getAttribute("aria-pressed") === "true"; });
    var next = partButtons[(at + dir + partButtons.length) % partButtons.length];
    if (at < 0) next = partButtons[dir > 0 ? 0 : partButtons.length - 1];
    next.click();
  }
  var prevPart = document.getElementById("part-prev"), nextPart = document.getElementById("part-next");
  if (prevPart) prevPart.addEventListener("click", function () { stepPart(-1); });
  if (nextPart) nextPart.addEventListener("click", function () { stepPart(1); });

  // ---------- Search ----------
  var index = [];
  Array.prototype.forEach.call(document.querySelectorAll(".page"), function (page) {
    var title = PAGES[slugs.indexOf(page.dataset.page)].title;
    var heads = page.querySelectorAll("h2[id]");
    Array.prototype.forEach.call(heads, function (h2) {
      var text = "", n = h2.nextElementSibling;
      while (n && n.tagName !== "H2") { if (!n.classList.contains("placeholder")) text += " " + n.textContent; n = n.nextElementSibling; }
      index.push({ page: title, id: h2.id, heading: h2.textContent, body: text.replace(/\s+/g, " ").trim() });
    });
    Array.prototype.forEach.call(page.querySelectorAll("dt[id], .glossary-term[id]"), function (dt) {
      index.push({ page: title, id: dt.id, heading: dt.textContent, body: dt.nextElementSibling ? dt.nextElementSibling.textContent : "" });
    });
  });
  var box = document.getElementById("guide-search"), out = document.getElementById("search-results"), none = document.getElementById("search-none");
  function search() {
    var q = box.value.trim().toLowerCase();
    out.textContent = ""; none.hidden = true;
    if (q.length < 2) return;
    var words = q.split(/\s+/);
    var hits = index.map(function (e) {
      var head = e.heading.toLowerCase(), hay = head + " " + e.body.toLowerCase(), score = 0;
      for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) < 0) return null; score += head.indexOf(words[i]) >= 0 ? 3 : 1; }
      return { e: e, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
    if (!hits.length) { none.hidden = false; return; }
    hits.forEach(function (h) {
      var li = document.createElement("li"), a = document.createElement("a"), w = document.createElement("span");
      a.href = "#" + h.e.id; a.textContent = h.e.heading;
      w.className = "where"; w.textContent = h.e.page;
      li.appendChild(a); li.appendChild(w); out.appendChild(li);
    });
  }
  if (box) box.addEventListener("input", search);

  // ---------- Reading progress and current section ----------
  var bar = document.querySelector(".read-progress span");
  var sectionObserver = null;
  function progress() {
    if (guide.hidden || !current) return;
    var page = document.querySelector('.page[data-page="' + current + '"]');
    if (!page) return;
    var rect = page.getBoundingClientRect();
    var span = rect.height - window.innerHeight * 0.6;
    var done = span > 0 ? Math.min(1, Math.max(0, (-rect.top + headerHeight()) / span)) : 1;
    bar.style.width = Math.round(done * 100) + "%";
  }
  window.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", function () { headerHeight(); progress(); });
  function watchSections() {
    if (sectionObserver) sectionObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;
    var page = document.querySelector('.page[data-page="' + current + '"]');
    var links = page.querySelectorAll(".toc a");
    if (!links.length) return;
    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(links, function (a) { a.classList.toggle("is-reading", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-20% 0px -65% 0px" });
    Array.prototype.forEach.call(page.querySelectorAll("h2[id]"), function (h) { sectionObserver.observe(h); });
    progress();
  }

  // ---------- Cinematic opening: a hand-projected drawing of the printer on a 2D canvas ----------
  var Intro = (function () {
    var canvas = intro.querySelector("canvas"), ctx = canvas.getContext && canvas.getContext("2d");
    var track = intro.querySelector(".intro-track"), copy = intro.querySelector(".intro-copy");
    var callout = document.getElementById("intro-callout"), stepEl = document.getElementById("intro-step");
    var hint = intro.querySelector(".intro-hint"), actions = intro.querySelector(".intro-actions");
    var names = {};
    partButtons.forEach(function (b) { names[b.dataset.part] = b.textContent; });
    var ORDER = ["frame", "top", "door", "gantry", "toolhead", "bed", "screws", "screen", "key"];
    // Same schematic layout as the 3D explorer. One unit is 10 cm; overall about 49 x 51 x 63 cm.
    var W = 4.9, D = 5.1, H = 6.3, boxes = [];
    var OFF = { frame: [0, 0, 0], top: [0, 1.6, 0], door: [0, 0, 2.1], gantry: [0, 0.8, 0], toolhead: [0, 0.8, 1.4], bed: [0, -0.2, 1.5], screws: [0, 0, -1.5], screen: [0.8, 0.2, 2.6], key: [0, 0, -2] };
    function B(part, w, h, d, x, y, z, tone, alpha) { boxes.push({ part: part, w: w, h: h, d: d, x: x, y: y, z: z, tone: tone, alpha: alpha || 1 }); }
    B("frame", W, 0.9, D, 0, 0.45, 0, 0.42);
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { B("frame", 0.28, H - 0.9, 0.28, sx * (W / 2 - 0.14), 0.9 + (H - 0.9) / 2, sz * (D / 2 - 0.14), 0.42); }); });
    B("frame", W, 0.22, 0.28, 0, H - 0.11, D / 2 - 0.14, 0.42); B("frame", W, 0.22, 0.28, 0, H - 0.11, -(D / 2 - 0.14), 0.42);
    B("frame", 0.28, 0.22, D, W / 2 - 0.14, H - 0.11, 0, 0.42); B("frame", 0.28, 0.22, D, -(W / 2 - 0.14), H - 0.11, 0, 0.42);
    B("frame", W - 0.3, H - 1.2, 0.08, 0, 0.9 + (H - 1.2) / 2, -(D / 2 - 0.05), 0.3, 0.45);
    B("top", W - 0.1, 0.1, D - 0.1, 0, H + 0.06, 0, 0.85, 0.16);
    B("door", W - 0.6, H - 1.3, 0.1, 0, 0.95 + (H - 1.3) / 2, D / 2 + 0.02, 0.85, 0.14);
    B("gantry", 0.14, 0.14, D - 0.9, -(W / 2 - 0.45), 5.45, 0, 0.2); B("gantry", 0.14, 0.14, D - 0.9, W / 2 - 0.45, 5.45, 0, 0.2);
    B("gantry", W - 0.9, 0.16, 0.16, 0, 5.45, 0.3, 0.2);
    B("gantry", 0.42, 0.42, 0.42, -(W / 2 - 0.45), 5.3, -(D / 2 - 0.5), 0.2); B("gantry", 0.42, 0.42, 0.42, W / 2 - 0.45, 5.3, -(D / 2 - 0.5), 0.2);
    B("toolhead", 0.62, 0.8, 0.52, 0.5, 5.2, 0.62, 0.16); B("toolhead", 0.22, 0.26, 0.22, 0.5, 4.72, 0.62, 0.8); B("toolhead", 0.1, 0.2, 0.1, 0.5, 4.5, 0.62, 0.8);
    B("bed", 3.7, 0.14, 3.5, 0, 2.7, 0.05, 0.18); B("bed", 3.5, 0.05, 3.3, 0, 2.8, 0.05, 0.78);
    [[-1.95, -1.5], [1.95, -1.5], [0, 1.95]].forEach(function (p) { B("screws", 0.1, 4.3, 0.1, p[0], 0.9 + 2.15, p[1] * 0.92, 0.8); });
    B("screen", 1.15, 0.7, 0.08, 1.45, 5.75, D / 2 + 0.1, 0.12);
    B("key", 0.3, 0.2, 0.22, -1.6, 1.3, -(D / 2 + 0.1), 0.9);

    var FACES = [[0, 1, 3, 2], [5, 4, 6, 7], [4, 0, 2, 6], [1, 5, 7, 3], [2, 3, 7, 6], [4, 5, 1, 0]];
    var LIGHT = (function () { var v = [-0.45, 0.75, -0.5], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
    var started = 0, visible = true, running = false, staticMode = false, stageH = 0, lastKey = "";
    function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

    function layout() {
      var hh = headerHeight();
      var vh = window.innerHeight;
      staticMode = reduce.matches || vh > 1500 || !ctx; // a very tall frame means the page is not the scroller
      stageH = Math.max(420, Math.min(staticMode ? 640 : vh - hh, 920));
      intro.style.setProperty("--stage-h", stageH + "px");
      intro.style.setProperty("--track-h", (staticMode ? stageH : Math.round(stageH * 3.6)) + "px");
      intro.classList.toggle("is-static", staticMode);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(stageH * dpr);
      lastKey = "";
    }

    function draw(yaw, light, explode, hi) {
      var w = canvas.width, h = canvas.height, dpr = w / Math.max(1, canvas.clientWidth);
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h * 0.6, f = Math.min(w * 1.25, h * 1.5), dist = 25, pitch = 0.3;
      var cyaw = Math.cos(yaw), syaw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      function cam(x, y, z) { // world to camera space
        y -= 3.4;
        var x1 = x * cyaw + z * syaw, z1 = -x * syaw + z * cyaw;
        var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        return [x1, y2, z2 + dist];
      }
      function proj(v) { return [cx + f * v[0] / v[2], cy - f * v[1] / v[2]]; }
      // Studio floor glow.
      var floor = proj(cam(0, 0, 0)), rx = f * 5.2 / dist, g = ctx.createRadialGradient(floor[0], floor[1], 0, floor[0], floor[1], rx);
      g.addColorStop(0, "rgba(127,208,162," + (0.16 * light) + ")"); g.addColorStop(1, "rgba(127,208,162,0)");
      ctx.save(); ctx.translate(floor[0], floor[1]); ctx.scale(1, 0.3); ctx.translate(-floor[0], -floor[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(floor[0], floor[1], rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      var quads = [], anchor = [0, 0, 0], count = 0;
      boxes.forEach(function (b) {
        var o = OFF[b.part], ex = b.x + o[0] * explode, ey = b.y + o[1] * explode, ez = b.z + o[2] * explode, c = [];
        for (var i = 0; i < 8; i++) c.push(cam(ex + (i & 1 ? 0.5 : -0.5) * b.w, ey + (i & 2 ? 0.5 : -0.5) * b.h, ez + (i & 4 ? 0.5 : -0.5) * b.d));
        if (b.part === hi) { var m = cam(ex, ey, ez); anchor[0] += m[0]; anchor[1] += m[1]; anchor[2] += m[2]; count++; }
        FACES.forEach(function (fc) {
          var a = c[fc[0]], p = c[fc[1]], q = c[fc[3]];
          var ux = p[0] - a[0], uy = p[1] - a[1], uz = p[2] - a[2], vx = q[0] - a[0], vy = q[1] - a[1], vz = q[2] - a[2];
          var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
          nx /= nl; ny /= nl; nz /= nl;
          var mx = (a[0] + c[fc[2]][0]) / 2, my = (a[1] + c[fc[2]][1]) / 2, mz = (a[2] + c[fc[2]][2]) / 2;
          if (nx * mx + ny * my + nz * mz > 0) { if (b.alpha === 1) return; nx = -nx; ny = -ny; nz = -nz; }
          var lit = 0.22 + 0.78 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
          quads.push({ z: mz, pts: fc.map(function (k) { return proj(c[k]); }), lit: lit, b: b });
        });
      });
      quads.sort(function (p, q) { return q.z - p.z; });
      ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1, dpr);
      quads.forEach(function (qd) {
        var b = qd.b, on = b.part === hi, v = (40 + 190 * b.tone) * qd.lit * light;
        var r = v, gg = v * 1.02, bl = v * 1.05;
        if (on) { r = r * 0.45 + 30 * light; gg = gg * 0.6 + 120 * qd.lit * light; bl = bl * 0.5 + 70 * qd.lit * light; }
        if (b.part === "key" && !on) { r = 40 * qd.lit * light; gg = 150 * qd.lit * light; bl = 95 * qd.lit * light; }
        ctx.beginPath(); ctx.moveTo(qd.pts[0][0], qd.pts[0][1]);
        for (var i = 1; i < 4; i++) ctx.lineTo(qd.pts[i][0], qd.pts[i][1]);
        ctx.closePath();
        ctx.fillStyle = "rgba(" + Math.round(r) + "," + Math.round(gg) + "," + Math.round(bl) + "," + (b.alpha === 1 ? 1 : b.alpha * (0.4 + 0.6 * light)) + ")";
        ctx.fill();
        ctx.strokeStyle = on ? "rgba(127,208,162,0.95)" : "rgba(230,236,232," + (0.1 + 0.2 * (1 - light) + (b.alpha < 1 ? 0.12 : 0)) + ")";
        ctx.stroke();
      });
      if (hi && count) {
        var pt = proj([anchor[0] / count, anchor[1] / count, anchor[2] / count]);
        var cw = canvas.clientWidth, px = pt[0] / dpr, py = pt[1] / dpr;
        callout.hidden = false; callout.textContent = names[hi] || "";
        var half = callout.offsetWidth / 2 + 8, lx = Math.min(Math.max(px, half), cw - half), ly = Math.max(py - 64, 56);
        callout.style.transform = "translate(" + Math.round(lx) + "px," + Math.round(ly) + "px) translate(-50%,-100%)";
        ctx.strokeStyle = "rgba(127,208,162,0.9)"; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.lineTo(lx * dpr, ly * dpr); ctx.stroke();
        ctx.fillStyle = "#7fd0a2"; ctx.beginPath(); ctx.arc(pt[0], pt[1], 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
      } else { callout.hidden = true; }
    }

    function frame(now) {
      running = false;
      if (intro.hidden || guide.hidden || !ctx) return;
      if (!started) started = now;
      var p = 0;
      if (!staticMode) {
        var rect = track.getBoundingClientRect(), span = rect.height - stageH;
        p = span > 0 ? Math.min(1, Math.max(0, (headerHeight() - rect.top) / span)) : 0;
      }
      var auto = staticMode ? 1 : smooth(300, 2600, now - started);
      var light = 0.04 + 0.96 * auto;
      var yaw = staticMode ? -0.62 : -0.62 + p * 4.6 + Math.sin((now - started) / 2600) * 0.05 * (1 - smooth(0, 0.08, p));
      var explode = smooth(0.34, 0.52, p) * (1 - smooth(0.9, 0.99, p));
      var hi = null, at = -1;
      if (p > 0.4 && p < 0.9) { at = Math.min(ORDER.length - 1, Math.floor((p - 0.4) / 0.5 * ORDER.length)); hi = ORDER[at]; }
      var key = [canvas.width, Math.round(yaw * 400), Math.round(light * 200), Math.round(explode * 300), hi].join("|");
      if (key !== lastKey) {
        lastKey = key;
        draw(yaw, light, explode, hi);
        copy.style.opacity = String(1 - smooth(0.06, 0.22, p));
        hint.style.opacity = String(1 - smooth(0.02, 0.1, p));
        stepEl.textContent = hi ? "Part " + (at + 1) + " of " + ORDER.length : "";
      }
      if (visible && !staticMode) request();
    }
    function request() { if (!running) { running = true; window.requestAnimationFrame(frame); } }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) request(); }).observe(intro);
    }
    window.addEventListener("resize", function () { if (!intro.hidden) { layout(); request(); } });
    window.addEventListener("scroll", request, { passive: true });
    if (reduce.addEventListener) reduce.addEventListener("change", function () { layout(); request(); });

    // Title letters rise one by one.
    var title = intro.querySelector(".intro-title");
    if (title && !reduce.matches) {
      var text = title.textContent; title.setAttribute("aria-label", text); title.textContent = "";
      text.split("").forEach(function (ch, i) { var s = document.createElement("span"); s.textContent = ch; s.style.setProperty("--i", i); s.setAttribute("aria-hidden", "true"); title.appendChild(s); });
    }
    document.getElementById("intro-skip").addEventListener("click", function () {
      document.getElementById("guide-body").scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
      var h1 = document.querySelector('.page[data-page="start-here"] h1');
      if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    });
    return { wake: function () { layout(); request(); } };
  })();

  window.addEventListener("hashchange", show);
  headerHeight();
  show();
})();
