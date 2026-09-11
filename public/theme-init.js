(function () {
  try {
    var allowed = { daylight: 1, midnight: 1, temple: 1, ocean: 1 };
    var stored = localStorage.getItem('tpt_theme');
    var theme = allowed[stored] ? stored : 'daylight';
    document.documentElement.setAttribute('data-theme', theme);
    var colors = { daylight: '#f3efe6', midnight: '#121722', temple: '#f3e3bc', ocean: '#0b1f27' };
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme]);
  } catch (e) { /* theme can wait for React */ }
}());
