/* Evie warm-up chart, styled like the "Evie warm-up calibration" report:
   -20..+20 °C, 0..50 min, dashed predicted lines (no dots), solid actual trend,
   filled circle = reached target (minutes to target), hollow square = didn't reach (">" lead).
   Self-contained, no external libraries. Data comes from #evie-data. Theme-aware (dark default). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("evie-data").textContent);
  var box = document.getElementById("chart");
  var NS = "http://www.w3.org/2000/svg";
  var hidden = {};
  var NAMES = { dry: "5 cm of snow or less", snow: "More than 5 cm of fresh snow" };
  var X0 = -20, X1 = 20, Y0 = 0, Y1 = 50;

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

  var tip = document.createElement("div"); tip.className = "tip";

  function draw() {
    var W = Math.max(300, box.clientWidth);
    var narrow = W < 560;
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

    box.innerHTML = "";
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "font-size": fs,
      "font-family": "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif", class: "chart-svg" }, box);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: surface }, svg);

    for (var x = X0; x <= X1; x += 5) {
      el("line", { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b, stroke: grid }, svg);
      txt(svg, X(x), H - m.b + 18, x, { "text-anchor": "middle", fill: tick });
    }
    for (var y = Y0; y <= Y1; y += 10) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(y), y2: Y(y), stroke: grid }, svg);
      txt(svg, m.l - 8, Y(y) + 4, y, { "text-anchor": "end", fill: tick });
    }
    txt(svg, (m.l + W - m.r) / 2, H - 10, "Outside temperature (°C)", { "text-anchor": "middle", fill: axis, "font-size": fs + 1 });
    var cy = (m.t + H - m.b) / 2;
    txt(svg, 14, cy, narrow ? "Minutes" : "Warm-up time (minutes)", { "text-anchor": "middle", fill: axis, "font-size": fs + 1,
      transform: "rotate(-90 14 " + cy + ")" });

    var hits = [];
    // predicted dashed lines first (behind), then trends, then dots, like the report
    ["dry", "snow"].forEach(function (s) {
      if (hidden[s]) return;
      el("path", { d: path(clip(D.pred_smooth[s]), X, Y), fill: "none", stroke: col[s], "stroke-width": 1.5,
        "stroke-dasharray": "6 4", opacity: 0.7 }, svg);
      D.pred[s].forEach(function (p) {
        if (p[0] < X0 || p[0] > X1) return;
        hits.push({ x: X(p[0]), y: Y(p[1]), html: "<b>Predicted</b> · " + NAMES[s] + "<br>" + p[0] + " °C → " + p[1] + " min" + (p[2] === "cool" ? " (cool-down)" : "") });
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
        if (p.hit) el("circle", { cx: px, cy: py, r: 5, fill: c }, svg);
        else el("rect", { x: px - 5, y: py - 5, width: 10, height: 10, fill: surface, stroke: c, "stroke-width": 2 }, svg);
        txt(svg, px + 7, py - 7, (p.hit ? "" : ">") + p.y, { fill: c, "paint-order": "stroke", stroke: surface,
          "stroke-width": 3, "stroke-linejoin": "round" });
        hits.push({ x: px, y: py, html: "<b>" + p.date + "</b> · " + NAMES[s] + "<br>" + p.x + " °C · " +
          (p.hit ? "reached " + (p.target ? p.target + " °C" : "target") + " in " + p.y + " min"
                 : "didn't reach " + (p.target ? p.target + " °C" : "target") + " in the " + p.y + "-min lead") });
      });
    });
    box.appendChild(tip);

    function near(ev) {
      var r = svg.getBoundingClientRect(), k = W / r.width;
      var px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k, best = null, bd = 22 * k;
      hits.forEach(function (h) { var d = Math.hypot(h.x - px, h.y - py); if (d < bd) { bd = d; best = h; } });
      if (best) {
        tip.innerHTML = best.html; tip.classList.add("on");
        var left = best.x / k, w = tip.offsetWidth;
        left = Math.min(Math.max(left, w / 2 + 2), r.width - w / 2 - 2);
        tip.style.left = left + "px"; tip.style.top = (best.y / k) + "px";
      } else tip.classList.remove("on");
    }
    svg.addEventListener("pointermove", near);
    svg.addEventListener("pointerdown", near);
    svg.addEventListener("pointerleave", function () { tip.classList.remove("on"); });
  }

  document.querySelectorAll("#legend button").forEach(function (b) {
    b.addEventListener("click", function () {
      var s = b.getAttribute("data-s"); hidden[s] = !hidden[s];
      b.setAttribute("aria-pressed", hidden[s] ? "false" : "true"); draw();
    });
  });
  var last = 0;
  window.addEventListener("resize", function () { if (box.clientWidth !== last) { last = box.clientWidth; draw(); } });
  window.addEventListener("evie-theme", function () { draw(); });
  last = box.clientWidth; draw();
})();
