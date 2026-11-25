/* Evie warm-up chart, styled like the "Evie warm-up calibration" report:
   -20..+20 °C, 0..50 min, dashed predicted lines, solid actual trend,
   filled circle = reached target, yellow square = didn't reach (values in the tooltip).
   30% wider than the card, horizontally drag-scrollable. Theme-aware (dark default). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("evie-data").textContent);
  var box = document.getElementById("chart");
  var sc = document.getElementById("chart-scroll") || box.parentElement;
  var NS = "http://www.w3.org/2000/svg";
  var hidden = {};
  var NAMES = { dry: "5 cm of snow or less", snow: "More than 5 cm of fresh snow" };
  var X0 = -20, X1 = 20, Y0 = 0, Y1 = 50;
  var WIDEN = 1.3;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s; return t;
  }
  function clip(pts) { return pts.filter(function (p) { return p[0] >= X0 - 1e-9 && p[0] <= X1 + 1e-9; }); }
  function path(pts, X, Y) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join(" ");
  }
  function bandPath(band, X, Y) {
    var pts = clip(band);
    if (pts.length < 2) return "";
    var lo = pts.map(function (p) { return [p[0], p[1]]; });
    var hi = pts.map(function (p) { return [p[0], p[2]]; }).reverse();
    return path(lo, X, Y) + " " + path(hi, X, Y).replace(/^M/, "L") + " Z";
  }
  function axisY(svg, m, H, Y, fs, tick, axis, surface, narrow) {
    el("rect", { x: 0, y: 0, width: m.l, height: H, fill: surface }, svg);
    for (var y = Y0; y <= Y1; y += 10)
      txt(svg, m.l - 8, Y(y) + 4, y, { "text-anchor": "end", fill: tick });
    var cy = (m.t + H - m.b) / 2;
    txt(svg, 14, cy, narrow ? "Minutes" : "Warm-up time (minutes)", { "text-anchor": "middle", fill: axis, "font-size": fs + 1,
      transform: "rotate(-90 14 " + cy + ")" });
  }

  var tip = document.createElement("div"); tip.className = "tip";
  var hideTipFn = function () { tip.classList.remove("on"); };
  sc.addEventListener("scroll", function () { hideTipFn(); }, { passive: true });

  function draw() {
    var cw = Math.max(300, sc.clientWidth);
    var W = Math.round(cw * WIDEN);
    var narrow = cw < 560;
    var H = Math.round(W * (narrow ? 0.78 : 440 / 760));
    var m = { l: narrow ? 40 : 56, r: narrow ? 10 : 20, t: 20, b: narrow ? 44 : 52 };
    var fs = narrow ? 10 : 11;
    var X = function (x) { return m.l + (x - X0) / (X1 - X0) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - (y - Y0) / (Y1 - Y0) * (H - m.t - m.b); };

    var isDark = document.documentElement.getAttribute("data-theme") !== "light";
    var cs = getComputedStyle(document.documentElement);
    var v = function (n, d) { return (cs.getPropertyValue(n) || "").trim() || d; };
    var surface = v("--chart-bg", isDark ? "#11141a" : "#ffffff");
    var grid = v("--chart-grid", isDark ? "#232a35" : "#f0f0f0");
    var tick = v("--chart-tick", isDark ? "#9aa3b2" : "#666666");
    var axis = v("--chart-axis", isDark ? "#c9ced8" : "#444444");
    var col = { dry: v("--chart-dry", D.colors.dry), snow: v("--chart-snow", D.colors.snow) };
    var miss = v("--chart-miss", isDark ? "#f0c674" : "#c49214");
    var missStroke = v("--chart-miss-stroke", isDark ? "#d4a017" : "#8a6a00");
    var rHit = 2.5, rMiss = 2.5;

    box.innerHTML = "";
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "font-size": fs,
      "font-family": "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", class: "chart-svg" }, box);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: surface }, svg);

    for (var x = X0; x <= X1; x += 5) {
      el("line", { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b, stroke: grid }, svg);
      txt(svg, X(x), H - m.b + 18, x, { "text-anchor": "middle", fill: tick });
    }
    for (var y = Y0; y <= Y1; y += 10)
      el("line", { x1: m.l, x2: W - m.r, y1: Y(y), y2: Y(y), stroke: grid }, svg);
    axisY(svg, m, H, Y, fs, tick, axis, surface, narrow);
    txt(svg, (m.l + W - m.r) / 2, H - 10, "Outside temperature (°C)", { "text-anchor": "middle", fill: axis, "font-size": fs + 1 });

    var hits = [];
    ["dry", "snow"].forEach(function (s) {
      if (hidden[s]) return;
      var band = ((D.pred_band || {})[s]) || [];
      var bd = bandPath(band, X, Y);
      if (bd) el("path", { d: bd, fill: col[s], "fill-opacity": "0.18", stroke: "none" }, svg);
      el("path", { d: path(clip(D.pred_smooth[s] || []), X, Y), fill: "none", stroke: col[s], "stroke-width": 1.5,
        "stroke-dasharray": "6 4", opacity: 0.7 }, svg);
      var kind = ((D.pred_kind || {})[s]) || "rules";
      var fit = (D.fit || {})[s] || {};
      var label = kind === "fit" ? "Fitted time-to-target" : "Starting rules";
      (D.pred[s] || []).forEach(function (p) {
        if (p[0] < X0 || p[0] > X1) return;
        var extra = "";
        if (kind === "fit" && fit.formula) extra = "<br>" + fit.formula + " min, n=" + fit.n + ", R²=" + fit.r2;
        if (p[2] === "cool") extra += " (cool-down)";
        hits.push({ x: X(p[0]), y: Y(p[1]), html: "<b>" + label + "</b> · " + NAMES[s] + "<br>" + p[0] + " °C → " + p[1] + " min" + extra });
      });
    });
    ["dry", "snow"].forEach(function (s) {
      if (hidden[s]) return;
      var tr = clip(D.trend[s] || []);
      if (tr.length > 1) el("path", { d: path(tr, X, Y), fill: "none", stroke: col[s], "stroke-width": 2.5 }, svg);
    });
    ["dry", "snow"].forEach(function (s) {
      if (hidden[s]) return;
      var c = col[s];
      D.actual[s].forEach(function (p) {
        var px = X(Math.max(X0, Math.min(X1, p.x))), py = Y(Math.max(Y0, Math.min(Y1, p.y)));
        if (p.hit) el("circle", { cx: px, cy: py, r: rHit, fill: c }, svg);
        else el("rect", { x: px - rMiss, y: py - rMiss, width: rMiss * 2, height: rMiss * 2,
          fill: miss, stroke: missStroke, "stroke-width": 0.8 }, svg);
        hits.push({ x: px, y: py, html: "<b>" + p.date + "</b> · " + NAMES[s] + "<br>" + p.x + " °C · " +
          (p.hit ? "reached " + (p.target ? p.target + " °C" : "target") + " in " + p.y + " min"
                 : "didn't reach " + (p.target ? p.target + " °C" : "target") + " in the " + p.y + "-min lead") });
      });
    });
    box.appendChild(tip);

    var oldY = sc.querySelector("svg.chart-y");
    if (oldY) oldY.remove();
    var yov = el("svg", { viewBox: "0 0 " + m.l + " " + H, width: m.l, height: H, "font-size": fs,
      "font-family": "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", class: "chart-y" }, sc);
    axisY(yov, m, H, Y, fs, tick, axis, surface, narrow);
    yov.style.marginTop = -H + "px";

    var dragging = false, startX = 0, startY = 0, tracking = false;
    function isMouse(ev) { return ev.pointerType === "mouse" || ev.pointerType === ""; }
    function hideTip() { tip.classList.remove("on"); }
    function near(ev) {
      var r = svg.getBoundingClientRect(), k = W / r.width;
      var px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k, best = null, bd = 20 * k;
      hits.forEach(function (h) { var d = Math.hypot(h.x - px, h.y - py); if (d < bd) { bd = d; best = h; } });
      if (best) {
        tip.innerHTML = best.html; tip.classList.add("on");
        var left = best.x / k, w = tip.offsetWidth;
        left = Math.min(Math.max(left, w / 2 + 2), r.width - w / 2 - 2);
        tip.style.left = left + "px"; tip.style.top = (best.y / k) + "px";
      } else hideTip();
    }
    function onDown(ev) {
      tracking = true; dragging = false; startX = ev.clientX; startY = ev.clientY;
      if (isMouse(ev)) near(ev);
    }
    function onMove(ev) {
      if (isMouse(ev)) { near(ev); return; }
      if (!tracking) return;
      if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) {
        dragging = true; hideTip();
      }
    }
    function onUp(ev) {
      if (tracking && !isMouse(ev) && !dragging) near(ev);
      tracking = false; dragging = false;
    }
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", function () { tracking = false; dragging = false; hideTip(); });
    svg.addEventListener("pointerleave", function (ev) { if (isMouse(ev)) hideTip(); });
    hideTipFn = hideTip;
  }

  document.querySelectorAll("#legend button").forEach(function (b) {
    b.addEventListener("click", function () {
      var s = b.getAttribute("data-s"); hidden[s] = !hidden[s];
      b.setAttribute("aria-pressed", hidden[s] ? "false" : "true"); draw();
    });
  });
  var last = 0;
  window.addEventListener("resize", function () { if (sc.clientWidth !== last) { last = sc.clientWidth; draw(); } });
  window.addEventListener("evie-theme", function () { draw(); });
  last = sc.clientWidth; draw();
})();
