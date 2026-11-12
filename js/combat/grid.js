// Géométrie de la grille : distances, directions, zones.
(function (K) {
  K.dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  // Direction selon l'axe dominant (lignes, zones en ligne, charges).
  K.dirAxis = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return null;
    return Math.abs(dx) >= Math.abs(dy) ? { x: sign(dx), y: 0 } : { x: 0, y: sign(dy) };
  };
  // Direction de poussée : autorise la diagonale parfaite.
  K.dirFrom = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return null;
    if (Math.abs(dx) === Math.abs(dy)) return { x: sign(dx), y: sign(dy) };
    return K.dirAxis(a, b);
  };

  // Cellules d'une zone, avant filtrage par la grille.
  K.rawZone = (zone, caster, tx, ty) => {
    const [type, n = 0] = zone;
    const out = [];
    if (type === 'single') out.push([tx, ty]);
    else if (type === 'circle') {
      for (let dx = -n; dx <= n; dx++)
        for (let dy = -n; dy <= n; dy++) if (Math.abs(dx) + Math.abs(dy) <= n) out.push([tx + dx, ty + dy]);
    } else if (type === 'cross') {
      out.push([tx, ty]);
      for (let i = 1; i <= n; i++) out.push([tx + i, ty], [tx - i, ty], [tx, ty + i], [tx, ty - i]);
    } else if (type === 'line' || type === 'perp') {
      const d = K.dirAxis(caster, { x: tx, y: ty }) || { x: 1, y: 0 };
      if (type === 'line') for (let i = 0; i < n; i++) out.push([tx + d.x * i, ty + d.y * i]);
      else for (let i = -n; i <= n; i++) out.push([tx + d.y * i, ty + d.x * i]);
    }
    return out;
  };

  K.zoneRadius = (zone) => {
    const [type, n = 0] = zone;
    return type === 'line' ? n - 1 : type === 'single' ? 0 : n;
  };

  K.zoneLabel = (zone) => {
    const [type, n] = zone;
    return { single: 'Monocible', circle: `Cercle de rayon ${n}`, cross: `Croix de taille ${n}`, line: `Ligne de ${n} cases`, perp: `Ligne perpendiculaire de ${2 * n + 1} cases` }[type];
  };
})(window.K);
