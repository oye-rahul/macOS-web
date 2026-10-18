(function () {
  const t = localStorage.getItem('tahoe-wallpaper-type');
  const s = localStorage.getItem('tahoe-wallpaper');
  const wallpaper = (t === 'stock' && s)
    ? `url('${s}')`
    : ((t === 'image' || t === 'video') ? 'none' : "url('assets/8z3jfEOqjrpCUxVsODP05JhlKOk.webp')");
  document.documentElement.style.setProperty('--initial-wallpaper', wallpaper);
})();
