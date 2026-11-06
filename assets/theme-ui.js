/* Theme toggle: flips data-theme, remembers in localStorage, asks chart to redraw. */
(function () {
  var KEY = "evie-warmup-theme";
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#0f1115" : "#ffffff");
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title", t === "dark" ? "Light mode" : "Dark mode");
    try { window.dispatchEvent(new CustomEvent("evie-theme", { detail: t })); } catch (e) {}
  }
  apply(current());
  btn.addEventListener("click", function () {
    apply(current() === "dark" ? "light" : "dark");
  });
})();
