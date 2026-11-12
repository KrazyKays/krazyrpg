// Outils partagés. Tout le jeu vit dans l'espace de noms global K
// (scripts classiques : le jeu fonctionne aussi en ouvrant index.html directement).
(function () {
  const K = (window.K = {});

  K.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  K.chance = (p) => Math.random() * 100 < p;
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.sum = (arr, f = (x) => x) => arr.reduce((a, b) => a + f(b), 0);
  K.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  K.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  K.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  K.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  K.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  K.deepCopy = (o) => JSON.parse(JSON.stringify(o));
})();
