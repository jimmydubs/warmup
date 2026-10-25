/* Evie warm-up chart: self-contained, no external libraries. Data comes from #evie-data. */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("evie-data").textContent);
  var box = document.getElementById("chart");
  var NS = "http://www.w3.org/2000/svg";
  var hidden = {};
  var NAMES = { dry: "5 cm of snow or less", snow: "More than 5 cm of fresh snow" };
  var XMIN = -40, XMAX = 40;

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
  function path(pts, X, Y) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join("");
  }

  var tip = document.createElement("div"); tip.className = "tip";

  function draw() {
    var W = Math.max(300, box.clientWidth);
    var narrow = W < 560;
    var H = Math.round(Math.min(460, Math.max(300, W * (narrow ? 0.82 : 0.56))));
    var m = { l: narrow ? 34 : 50, r: narrow ? 8 : 14, t: 26, b: narrow ? 38 : 44 };
    var fs = narrow ? 10 : 12.5;
    var all = [];
    ["dry", "snow"].forEach(function (s) {
      D.pred[s].forEach(function (p) { all.push(p[1]); });
      D.actual[s].forEach(function (p) { all.push(p.y); });
    });
    var ymax = Math.max(50, Math.ceil((Math.max.apply(null, all) + 4) / 10) * 10);
    var X = function (x) { return m.l + (x - XMIN) / (XMAX - XMIN) * (W - m.l - m.r); };
    var Y = function (y) { return H - m.b - y / ymax * (H - m.t - m.b); };

    box.innerHTML = "";
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, "font-size": fs,
      "font-family": "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" }, box);
    var ink = getComputedStyle(document.body).color;

    // target bands
    el("rect", { x: X(-40), y: m.t, width: X(15) - X(-40), height: H - m.t - m.b, fill: "#1f5fbf", "fill-opacity": .07 }, svg);
    el("rect", { x: X(25), y: m.t, width: X(40) - X(25), height: H - m.t - m.b, fill: "#c0392b", "fill-opacity": .08 }, svg);
    txt(svg, X(-40) + 5, m.t - 8, "Target 19 °C", { fill: "#1f5fbf", "font-size": fs });
    if (!narrow) txt(svg, X(20), m.t - 8, "21 °C", { fill: ink, opacity: .6, "text-anchor": "middle", "font-size": fs });
    txt(svg, X(40), m.t - 8, narrow ? "20.5 °C" : "Cool to 20.5 °C", { fill: "#c0392b", "text-anchor": "end", "font-size": fs });

    // grid + axes
    var g = el("g", { stroke: ink, "stroke-opacity": .12 }, svg);
    for (var y = 0; y <= ymax; y += 10) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(y), y2: Y(y) }, g);
      txt(svg, m.l - 6, Y(y) + 4, y, { "text-anchor": "end", fill: ink, opacity: .7 });
    }
    for (var x = XMIN; x <= XMAX; x += 10) {
      el("line", { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b }, g);
      txt(svg, X(x), H - m.b + 15, (x > 0 ? "+" : "") + x, { "text-anchor": "middle", fill: ink, opacity: .7 });
    }
    el("line", { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), stroke: ink, "stroke-opacity": .35 }, svg);
    txt(svg, (m.l + W - m.r) / 2, H - 6, "Outside temperature (°C)", { "text-anchor": "middle", fill: ink, opacity: .85 });
    var yl = txt(svg, 0, 0, narrow ? "Minutes" : "Warm-up lead time (minutes)", { "text-anchor": "middle", fill: ink, opacity: .85,
      transform: "translate(" + (narrow ? 10 : 13) + "," + ((m.t + H - m.b) / 2) + ") rotate(-90)" });

    var hits = [];
    ["dry", "snow"].forEach(function (s) {
      if (hidden[s]) return;
      var c = D.colors[s];
      var layer = el("g", {}, svg);
      // predicted: dashed smooth line + labelled dots
      el("path", { d: path(D.pred_smooth[s], X, Y), fill: "none", stroke: c, "stroke-width": 2, "stroke-dasharray": "6 5",
        "stroke-opacity": .8, "stroke-linecap": "round" }, layer);
      D.pred[s].forEach(function (p) {
        el("circle", { cx: X(p[0]), cy: Y(p[1]), r: narrow ? 3 : 3.6, fill: "#fff", stroke: c, "stroke-width": 1.6 }, layer);
        if (!narrow || p[0] % 10 === 0)
          txt(layer, X(p[0]), Y(p[1]) - 7, p[1], { "text-anchor": "middle", fill: c, "font-size": fs - 1, "paint-order": "stroke",
            stroke: "#fff", "stroke-width": 3, "stroke-opacity": .8 });
        hits.push({ x: X(p[0]), y: Y(p[1]), html: "<b>Predicted</b> · " + NAMES[s] + "<br>" + p[0] + " °C → " + p[1] + " min" + (p[2] === "cool" ? " (cool-down)" : "") });
      });
      // trend from actual trips
      if (D.trend[s] && D.trend[s].length > 1)
        el("path", { d: path(D.trend[s], X, Y), fill: "none", stroke: c, "stroke-width": 3, "stroke-linecap": "round" }, layer);
      D.actual[s].forEach(function (p) {
        el("circle", { cx: X(p.x), cy: Y(p.y), r: 5.5, fill: p.hit ? c : "#fff", stroke: c, "stroke-width": p.hit ? 1.5 : 2.5 }, layer);
        txt(layer, X(p.x) + 8, Y(p.y) + 4, p.y, { fill: c, "font-weight": 700, "font-size": fs, "paint-order": "stroke",
          stroke: "#fff", "stroke-width": 3 });
        hits.push({ x: X(p.x), y: Y(p.y), html: "<b>" + p.date + "</b> · " + NAMES[s] + "<br>" + p.x + " °C · " +
          (p.hit ? "reached target in " + p.y + " min" : "not at target after " + p.y + " min") });
      });
    });
    box.appendChild(tip);

    function near(ev) {
      var r = svg.getBoundingClientRect(), k = W / r.width;
      var px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k, best = null, bd = 26 * k;
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
  last = box.clientWidth; draw();
})();
