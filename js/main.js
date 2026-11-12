// Démarrage : chargement de la sauvegarde et délégation des clics.
(function (K) {
  K.load();
  K.UI.initTips();

  document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal && !modal.dataset.locked) return K.UI.closeModal();
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = K.Actions[el.dataset.act];
    if (!fn) return;
    if (el.tagName !== 'INPUT') e.preventDefault();
    K.UI.hideTip();
    fn(el.dataset, el, e);
  });

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modal');
    if (e.key === 'Escape' && !modal.hidden && !modal.dataset.locked) K.UI.closeModal();
  });

  K.App.render();
})(window.K);
