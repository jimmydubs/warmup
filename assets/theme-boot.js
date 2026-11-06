/* Apply saved (or default dark) theme before first paint. Blocking, no defer/async. */
(function () {
  var KEY = "evie-warmup-theme";
  var t = "dark";
  try {
    var s = localStorage.getItem(KEY);
    if (s === "light" || s === "dark") t = s;
  } catch (e) {}
  document.documentElement.setAttribute("data-theme", t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", t === "dark" ? "#0f1115" : "#ffffff");
})();
