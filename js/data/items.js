// Objets, panoplies et reliques.
// Chaque pièce a des fourchettes de jets : deux exemplaires du même objet ne se valent pas.
// Les bonus de panoplie sont donnés palier par palier (chaque palier remplace le précédent).
// Un palier peut contenir `mods` : modification de sorts de classe (PA, PO, relance, lancers, dommages).
(function (K) {
  const R = (n) => ({ reTerre: n, reFeu: n, reEau: n, reAir: n });
  const dmg = (el, min, max, extra) => Object.assign({ t: 'dmg', el, min, max }, extra);
  const W = (pa, po, fx, extra = {}) =>
    K.sp(Object.assign({ id: 'arme', pa, po, mod: false, per: 2, isWeapon: true, fx }, extra));

  K.ITEMS = {};
  K.SETS = {};

  function item(o) {
    K.ITEMS[o.id] = Object.assign({ i: K.TYPES[o.type].i }, o);
  }

  function set(id, n, zone, lvl, pieces, bonus) {
    const s = { id, n, zone, lvl, bonus, pieces: [] };
    for (const [type, p] of Object.entries(pieces)) {
      const iid = `${id}_${type}`;
      item({ id: iid, n: p[0], type, lvl, set: id, stats: p[1], w: p[2], i: p[3] || K.TYPES[type].i });
      s.pieces.push(iid);
    }
    K.SETS[id] = s;
  }

  // ─── Prés de Vermeil (1-9) ───
  set('sanglier', 'Panoplie du Sanglion', 'pres', 3, {
    coiffe: ['Hure de Sanglion', { vit: [5, 10], for: [4, 8] }],
    cape: ['Cape en Soies', { vit: [6, 12], for: [3, 6], ini: [5, 10] }],
    ceinture: ['Ceinture de Défenses', { for: [5, 8], reTerre: [2, 4] }],
    bottes: ['Sabots Boueux', { vit: [4, 8], for: [3, 5] }],
    arme: ['Défense Taillée', { for: [5, 10] }, W(4, [1, 1], [dmg('terre', 11, 15)]), '🔨'],
  }, {
    2: { for: 8, vit: 10 },
    3: { for: 14, vit: 20, do: 2 },
    4: { for: 20, vit: 30, do: 3 },
    5: { for: 28, vit: 40, do: 5, reTerre: 5 },
  });

  set('ruche', 'Panoplie de la Ruche', 'pres', 6, {
    coiffe: ["Voilette d'Apiculteur", { agi: [4, 8], int: [3, 6], ini: [10, 20] }],
    amulette: ['Amulette de Cire', { agi: [5, 10], crit: [1, 2] }],
    anneau: ['Anneau Alvéole', { agi: [3, 6], int: [3, 6], vit: [4, 8] }],
    bottes: ['Bottes Mielleuses', { agi: [3, 6], pp: [5, 10] }],
    arme: ['Dard Royal', { agi: [5, 8], crit: [1, 2] }, W(3, [1, 1], [dmg('air', 7, 9)], { per: 3, crit: 10 }), '🔪'],
  }, {
    2: { agi: 8, crit: 2 },
    3: { agi: 14, int: 8, crit: 3 },
    4: { agi: 20, int: 12, crit: 5, ini: 40 },
    5: { agi: 26, int: 16, crit: 6, ini: 60, pm: 1 },
  });

  // ─── Bois Murmurant (9-18) ───
  set('druide', 'Panoplie du Druide', 'bois', 12, {
    coiffe: ['Couronne de Lierre', { cha: [8, 12], soin: [2, 4], vit: [10, 15] }],
    cape: ['Cape de Mousse', { cha: [6, 10], vit: [12, 20], reEau: [2, 4] }],
    amulette: ['Amulette de Sève', { int: [6, 10], cha: [6, 10], soin: [2, 3] }],
    anneau: ["Anneau d'Écorce", { cha: [6, 9], vit: [8, 12] }],
    ceinture: ['Ceinture de Racines', { cha: [5, 8], reTerre: [3, 5], pp: [10, 15] }],
    arme: ['Bâton Noueux', { cha: [8, 12], soin: [2, 4] }, W(4, [1, 3], [dmg('eau', 9, 12, { vol: 0.5 })]), '🦯'],
  }, {
    2: { cha: 12, soin: 4 },
    3: { cha: 20, soin: 8, vit: 20 },
    4: { cha: 28, soin: 12, vit: 30, reEau: 5 },
    5: { cha: 36, soin: 16, vit: 40, reEau: 5, po: 1 },
    6: { cha: 45, soin: 20, vit: 50, reEau: 8, po: 1, pa: 1 },
  });

  set('chasseur', 'Panoplie du Pisteur', 'bois', 15, {
    coiffe: ['Capuche du Pisteur', { agi: [8, 12], crit: [1, 3] }],
    cape: ['Cape de Feuilles', { agi: [8, 12], vit: [10, 15], ini: [20, 30] }],
    anneau: ['Anneau du Traqueur', { agi: [6, 10], pctDist: [2, 3] }],
    ceinture: ['Ceinture-Carquois', { agi: [6, 10], do: [1, 3] }],
    bottes: ['Bottes Silencieuses', { agi: [6, 9], ini: [15, 25], vit: [8, 12] }],
    arme: ['Arc du Pisteur', { agi: [8, 12] }, W(4, [2, 7], [dmg('air', 10, 13)]), '🏹'],
  }, {
    2: { agi: 12, pctDist: 3 },
    3: { agi: 20, pctDist: 5, crit: 3 },
    4: { agi: 28, pctDist: 7, crit: 5, po: 1 },
    5: { agi: 36, pctDist: 9, crit: 6, po: 1 },
    6: { agi: 45, pctDist: 12, crit: 8, po: 1, pm: 1, mods: { rod_fleche: { dmg: 2 }, rod_pluie: { pa: -1 } } },
  });

  // ─── Grottes de Sel (18-26) ───
  set('cristal', 'Panoplie de Cristal', 'grottes', 20, {
    coiffe: ['Heaume de Quartz', { vit: [15, 25], reTerre: [3, 5], reFeu: [3, 5] }],
    cape: ['Cape Prismatique', { vit: [15, 25], reEau: [3, 5], reAir: [3, 5] }],
    amulette: ['Amulette Géode', { for: [8, 12], cha: [8, 12], do: [2, 4] }],
    anneau: ['Anneau de Sel', { for: [6, 10], cha: [6, 10], renvoi: [2, 4] }],
    ceinture: ['Ceinture Saline', { vit: [10, 20], do: [2, 3] }],
    bottes: ['Bottes de Cristal', { vit: [15, 20], for: [5, 8], cha: [5, 8] }],
    arme: ['Masse Cristalline', { for: [8, 12], cha: [8, 12] }, W(4, [1, 1], [dmg('terre', 8, 10), dmg('eau', 8, 10)]), '🔨'],
  }, {
    2: { vit: 20, renvoi: 3 },
    3: Object.assign({ vit: 30, renvoi: 5 }, R(3)),
    4: Object.assign({ vit: 45, renvoi: 7, do: 3 }, R(4)),
    5: Object.assign({ vit: 60, renvoi: 9, do: 5 }, R(5)),
    6: Object.assign({ vit: 75, renvoi: 11, do: 6 }, R(6)),
    7: Object.assign({ vit: 90, renvoi: 14, do: 8, pm: 1 }, R(8)),
  });

  set('mineur', 'Panoplie du Mineur', 'grottes', 24, {
    coiffe: ['Casque à Lanterne', { for: [12, 18], pp: [10, 20] }],
    amulette: ['Pépite Polie', { for: [10, 15], pui: [5, 10] }],
    anneau: ['Anneau de Filon', { for: [8, 12], vit: [12, 18] }],
    ceinture: ['Ceinture à Outils', { for: [8, 12], dpou: [3, 6] }],
    bottes: ['Bottes Ferrées', { for: [8, 12], vit: [10, 15], dpou: [2, 4] }],
    arme: ['Pioche du Contremaître', { for: [12, 16] }, W(5, [1, 1], [dmg('terre', 22, 28), { t: 'push', n: 1 }], { per: 1 }), '⛏️'],
  }, {
    2: { for: 15, dpou: 5 },
    3: { for: 25, dpou: 10, pui: 10 },
    4: { for: 35, dpou: 15, pui: 20 },
    5: { for: 45, dpou: 20, pui: 30, pm: 1 },
    6: { for: 55, dpou: 25, pui: 40, pm: 1, mods: { fer_seisme: { cd: -1, per: 1 }, fer_charge: { po: 1 } } },
  });

  // ─── Marais Fiévreux (26-34) ───
  set('marecage', 'Panoplie du Marécage', 'marais', 28, {
    coiffe: ['Chapeau de Jonc', { cha: [12, 18], vit: [20, 30] }],
    cape: ['Cape Vaseuse', { cha: [10, 15], pctPoison: [3, 5] }],
    amulette: ['Croc de Crapaud', { cha: [10, 15], pctPoison: [3, 5], pp: [10, 20] }],
    anneau: ['Anneau de Vase', { cha: [8, 12], vit: [15, 20] }],
    bottes: ['Bottes Palmées', { cha: [8, 12], ini: [30, 40] }],
    arme: ['Lance du Marais', { cha: [10, 14] }, W(4, [1, 2], [dmg('eau', 10, 13), { t: 'dot', el: 'eau', min: 3, max: 4, dur: 2 }]), '🔱'],
  }, {
    2: { cha: 15, pctPoison: 5 },
    3: { cha: 25, pctPoison: 10, vit: 20 },
    4: { cha: 35, pctPoison: 15, vit: 40 },
    5: { cha: 45, pctPoison: 20, vit: 50, pp: 30 },
    6: { cha: 55, pctPoison: 25, vit: 60, pp: 40, pa: 1, mods: { rod_venin: { cd: -1, per: 1 }, arc_combustion: { cd: -1, per: 1 } } },
  });

  set('sorciere', 'Panoplie de la Sorcière', 'marais', 32, {
    coiffe: ['Chapeau Pointu', { int: [15, 20], pui: [5, 10] }],
    cape: ['Cape de Plumes Noires', { int: [12, 18], vit: [20, 30] }],
    amulette: ['Talisman Hurlant', { int: [12, 16], crit: [2, 3] }],
    anneau: ['Anneau de Malice', { int: [10, 14], pui: [5, 10] }],
    ceinture: ["Ceinture d'Herbes", { int: [10, 14], soin: [4, 6] }],
    bottes: ['Bottes Crochues', { int: [10, 14], ini: [20, 30] }],
    arme: ['Baguette Fétide', { int: [12, 18] }, W(3, [1, 5], [dmg('feu', 9, 11)], { per: 3 }), '🪄'],
  }, {
    2: { int: 15, pui: 10 },
    3: { int: 25, pui: 20 },
    4: { int: 35, pui: 30, crit: 4 },
    5: { int: 45, pui: 40, crit: 5, po: 1 },
    6: { int: 55, pui: 50, crit: 6, po: 1 },
    7: { int: 65, pui: 60, crit: 8, po: 1, pa: 1, mods: { arc_bouleFeu: { pa: -1 }, arc_meteore: { cd: -1 } } },
  });

  // ─── Forteresse de Cendre (34-42) ───
  set('cendre', 'Panoplie de Cendre', 'forteresse', 36, {
    coiffe: ['Heaume Calciné', { for: [12, 16], int: [12, 16], vit: [25, 35] }],
    cape: ['Cape de Braise', { for: [10, 14], int: [10, 14], pctMelee: [3, 5] }],
    amulette: ['Médaillon Fumant', { for: [10, 14], int: [10, 14], do: [3, 5] }],
    ceinture: ['Ceinturon Noirci', { vit: [30, 40], pctMelee: [2, 4] }],
    bottes: ['Solerets Cendrés', { for: [8, 12], int: [8, 12], reFeu: [5, 8] }],
    arme: ['Grande Épée Cendrée', { for: [12, 16], int: [12, 16] }, W(5, [1, 1], [dmg('terre', 11, 13), dmg('feu', 11, 13)]), '🗡️'],
  }, {
    2: { for: 15, int: 15, pctMelee: 3 },
    3: { for: 25, int: 25, pctMelee: 6 },
    4: { for: 35, int: 35, pctMelee: 9, vit: 50 },
    5: { for: 45, int: 45, pctMelee: 12, vit: 70, pa: 1 },
    6: { for: 55, int: 55, pctMelee: 15, vit: 90, pa: 1, mods: { fer_fendoir: { pa: -1 }, fer_braise: { per: 1 } } },
  });

  set('legion', 'Panoplie de la Légion', 'forteresse', 40, {
    coiffe: ['Casque de Légionnaire', { vit: [40, 60], pui: [10, 15] }],
    cape: ['Étendard Déchiré', { vit: [30, 50], pui: [10, 15], soin: [5, 8] }],
    amulette: ['Insigne de Centurion', { pui: [15, 20], ini: [30, 50] }],
    anneau: ['Chevalière de Légion', { pui: [10, 15], vit: [20, 30] }],
    ceinture: ['Baudrier', { vit: [30, 40], reTerre: [4, 6], reFeu: [4, 6] }],
    bottes: ['Bottes de Marche', { vit: [30, 40], reEau: [4, 6], reAir: [4, 6] }],
    arme: ['Glaive de Légion', { pui: [15, 20] }, W(4, [1, 1], [dmg('terre', 8, 10), dmg('air', 8, 10)]), '🗡️'],
  }, {
    2: { vit: 40, pui: 10 },
    3: Object.assign({ vit: 60, pui: 20 }, R(3)),
    4: Object.assign({ vit: 90, pui: 30 }, R(5)),
    5: Object.assign({ vit: 120, pui: 40, pm: 1 }, R(6)),
    6: Object.assign({ vit: 150, pui: 50, pm: 1 }, R(7)),
    7: Object.assign({ vit: 180, pui: 60, pm: 1, mods: { ora_bulle: { cd: -1 }, chr_sablier: { cd: -1 }, chr_accel: { cd: -1 } } }, R(8)),
  });

  // ─── Cime des Tempêtes (42-50) ───
  set('tempete', 'Panoplie de la Tempête', 'cime', 44, {
    coiffe: ["Couronne d'Éclairs", { agi: [18, 25], cha: [10, 15], crit: [2, 4] }],
    cape: ["Cape d'Orage", { agi: [15, 20], cha: [15, 20], vit: [30, 40] }],
    amulette: ['Amulette Foudre', { agi: [15, 20], do: [4, 6], pui: [10, 15] }],
    anneau: ['Anneau Cyclonique', { agi: [12, 16], cha: [12, 16] }],
    bottes: ['Bottes de Vent', { agi: [12, 16], ini: [40, 60] }],
    arme: ['Arc Tonnerre', { agi: [15, 20] }, W(4, [2, 8], [dmg('air', 11, 13), dmg('eau', 6, 8)]), '🏹'],
  }, {
    2: { agi: 20, cha: 20 },
    3: { agi: 30, cha: 30, crit: 5 },
    4: { agi: 40, cha: 40, crit: 8, do: 5 },
    5: { agi: 50, cha: 50, crit: 10, do: 8, pa: 1 },
    6: { agi: 60, cha: 60, crit: 12, do: 10, pa: 1, po: 1, mods: { rod_pluie: { per: 1 }, chr_paradoxe: { pa: -1 }, arc_rafale: { dmg: 3 } } },
  });

  set('titan', 'Panoplie du Titan', 'cime', 48, {
    coiffe: ['Heaume du Titan', { for: [20, 28], vit: [50, 70] }],
    cape: ['Manteau de Granit', { for: [18, 24], vit: [50, 70], reAir: [5, 8] }],
    amulette: ['Cœur de Pierre', { for: [18, 24], pui: [15, 20] }],
    anneau: ['Anneau Tellurique', { for: [15, 20], dpou: [5, 10] }],
    ceinture: ['Ceinture Colossale', { vit: [60, 80], do: [4, 6] }],
    bottes: ['Bottes de Séisme', { for: [15, 20], dpou: [5, 10] }],
    arme: ['Marteau Titanesque', { for: [20, 25] }, W(6, [1, 1], [dmg('terre', 38, 46), { t: 'push', n: 2 }], { per: 1 }), '🔨'],
  }, {
    2: { for: 25, vit: 50 },
    3: { for: 40, vit: 80, dpou: 10 },
    4: { for: 55, vit: 120, dpou: 20, pctMelee: 5 },
    5: { for: 70, vit: 160, dpou: 30, pctMelee: 8, pm: 1 },
    6: { for: 85, vit: 200, dpou: 40, pctMelee: 10, pm: 1, pa: 1 },
    7: { for: 100, vit: 240, dpou: 50, pctMelee: 12, pm: 1, pa: 1, mods: { fer_titan: { cd: -1 }, fer_seisme: { dmg: 5 } } },
  });

  // ─── Reliques (butin des boss, jets fixes) ───
  const relic = (id, n, lvl, zone, stats, i) => {
    const st = {};
    for (const k in stats) st[k] = [stats[k], stats[k]];
    item({ id, n, type: 'relique', lvl, zone, stats: st, i, relic: true });
  };
  relic('relique_gelee', 'Gelée Royale', 9, 'pres', { vit: 30, regen: 3 }, '🍯');
  relic('relique_gland', 'Gland Millénaire', 18, 'bois', { cha: 25, soin: 8, shieldStart: 10 }, '🌰');
  relic('relique_cristal', 'Cœur de Cristal', 26, 'grottes', Object.assign({ renvoi: 6 }, R(4)), '💎');
  relic('relique_hydre', "Œil d'Hydre", 34, 'marais', { crit: 6, doCrit: 10, pctPoison: 10 }, '👁️');
  relic('relique_braise', 'Braise Éternelle', 42, 'forteresse', { pui: 40, killPa: 1 }, '🔥');
  relic('relique_plume', 'Plume de Tempête', 50, 'cime', { pa: 1, ini: 50 }, '🪶');

  // ─── Armes de départ ───
  item({ id: 'start_epee', n: "Épée d'Entraînement", type: 'arme', lvl: 1, stats: {}, w: W(3, [1, 1], [dmg('terre', 7, 10)], { per: 3 }), i: '🗡️' });
  item({ id: 'start_baguette', n: "Baguette d'Apprenti", type: 'arme', lvl: 1, stats: {}, w: W(3, [1, 4], [dmg('feu', 5, 7)], { per: 3 }), i: '🪄' });
  item({ id: 'start_fronde', n: 'Fronde de Berger', type: 'arme', lvl: 1, stats: {}, w: W(3, [2, 5], [dmg('air', 5, 7)], { per: 3 }), i: '🪃' });
  item({ id: 'start_baton', n: 'Bâton de Source', type: 'arme', lvl: 1, stats: {}, w: W(3, [1, 3], [dmg('eau', 5, 7)], { per: 3 }), i: '🦯' });

  K.START_WEAPON = {
    ferrailleur: 'start_epee',
    arcaniste: 'start_baguette',
    oracle: 'start_baton',
    rodeur: 'start_fronde',
    chronomancien: 'start_baton',
  };

  // Paliers d'un set : liste triée des nombres de pièces donnant un bonus.
  K.setTiers = (set) => Object.keys(set.bonus).map(Number).sort((a, b) => a - b);
  K.setBonusFor = (set, count) => {
    let best = null;
    for (const t of K.setTiers(set)) if (t <= count) best = t;
    return best ? { tier: best, bonus: set.bonus[best] } : null;
  };
})(window.K);
