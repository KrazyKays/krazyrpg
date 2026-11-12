// Monstres, zones (donjons) et tables de butin.
// Les statistiques d'un monstre dépendent de son niveau, fixé par la salle où il apparaît.
(function (K) {
  const sp = K.sp;
  const dmg = (el, min, max, extra) => Object.assign({ t: 'dmg', el, min, max }, extra);
  K.MONSTERS = {};
  const mob = (o) => {
    K.MONSTERS[o.id] = Object.assign({ pa: 6, pm: 3, k: 1, res: {}, ai: 'melee', pref: 1, pow: 1 }, o);
  };

  // ─── Prés de Vermeil ───
  mob({ id: 'bourdonneur', n: 'Bourdonneur', i: '🐝', k: 0.7, pm: 4, res: { reAir: 10, reTerre: -10 },
    spells: [sp({ id: 'm_piqure', n: 'Piqûre', i: '🐝', pa: 3, po: [1, 2], per: 2, fx: [dmg('air', 6, 8)] })] });
  mob({ id: 'sanglion', n: 'Sanglion', i: '🐗', k: 1.2, res: { reTerre: 15, reFeu: -10 },
    spells: [
      sp({ id: 'm_boutoir', n: 'Coup de boutoir', i: '🐗', pa: 4, po: [1, 1], per: 1, fx: [dmg('terre', 8, 11), { t: 'push', n: 1 }] }),
      sp({ id: 'm_grogne', n: 'Grognement', i: '😤', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'buff', stat: 'pui', val: 30, dur: 2 }] }),
    ] });
  mob({ id: 'champignard', n: 'Champignard', i: '🍄', k: 0.9, pm: 2, ai: 'support', pref: 4, res: { reEau: 10, reFeu: -15 },
    spells: [
      sp({ id: 'm_spores', n: 'Spores', i: '🍄', pa: 3, po: [1, 5], per: 2, fx: [dmg('eau', 5, 7)] }),
      sp({ id: 'm_soinfong', n: 'Soin fongique', i: '✚', pa: 3, po: [0, 4], tgt: 'ally', cd: 2, fx: [{ t: 'heal', min: 8, max: 11 }] }),
    ] });
  mob({ id: 'reine', n: 'Reine Ruchée', i: '👑', boss: true, k: 4.5, pa: 8, res: { reAir: 15, reFeu: -5 },
    spells: [
      sp({ id: 'm_dardroyal', n: 'Dard royal', i: '🐝', pa: 4, po: [1, 3], per: 2, fx: [dmg('air', 10, 13)] }),
      sp({ id: 'm_essaim', n: 'Essaim', i: '🐝', pa: 4, po: [2, 5], tgt: 'any', zone: ['circle', 1], cd: 2, fx: [dmg('air', 7, 9)] }),
    ] });

  // ─── Bois Murmurant ───
  mob({ id: 'loup', n: 'Loup de Brume', i: '🐺', pm: 5, res: { reAir: 10, reEau: 10, reFeu: -10 },
    spells: [
      sp({ id: 'm_morsure', n: 'Morsure', i: '🐺', pa: 3, po: [1, 1], per: 2, fx: [dmg('air', 9, 12)] }),
      sp({ id: 'm_hurle', n: 'Hurlement', i: '🌕', pa: 2, po: [0, 0], tgt: 'self', cd: 4, fx: [{ t: 'buff', stat: 'pui', val: 40, dur: 2 }] }),
    ] });
  mob({ id: 'follet', n: 'Feu Follet', i: '🕯️', k: 0.7, pm: 4, ai: 'ranged', pref: 5, res: { reFeu: 25, reEau: -20 },
    spells: [sp({ id: 'm_flammeche', n: 'Flammèche', i: '🔥', pa: 3, po: [2, 6], per: 2, fx: [dmg('feu', 7, 9)] })] });
  mob({ id: 'sentinelle', n: "Sentinelle d'Écorce", i: '🌳', k: 1.7, pm: 2, res: { reTerre: 20, reEau: 10, reFeu: -20 },
    spells: [
      sp({ id: 'm_branche', n: 'Branche', i: '🌳', pa: 4, po: [1, 2], per: 1, fx: [dmg('terre', 10, 13)] }),
      sp({ id: 'm_racines', n: 'Racines', i: '🌱', pa: 2, po: [1, 4], cd: 2, fx: [dmg('terre', 4, 5), { t: 'buff', stat: 'pm', val: -2, dur: 1 }] }),
    ] });
  mob({ id: 'chene', n: 'Vieux Chêne', i: '🌲', boss: true, k: 4.5, pa: 9, pm: 1, ai: 'ranged', pref: 3, res: { reTerre: 20, reEau: 15, reFeu: -15 },
    spells: [
      sp({ id: 'm_ronces', n: 'Ronces', i: '🌿', pa: 4, po: [1, 5], tgt: 'any', zone: ['cross', 1], per: 2, fx: [dmg('terre', 9, 11)] }),
      sp({ id: 'm_seve', n: 'Sève', i: '✚', pa: 3, po: [0, 6], tgt: 'ally', cd: 2, fx: [{ t: 'heal', min: 15, max: 20 }] }),
      sp({ id: 'm_etreinte', n: 'Étreinte', i: '🪢', pa: 3, po: [2, 6], line: true, cd: 2, fx: [dmg('terre', 6, 8), { t: 'pull', n: 3 }] }),
    ] });

  // ─── Grottes de Sel ───
  mob({ id: 'crabe', n: 'Crabe de Sel', i: '🦀', k: 1.3, res: { reTerre: 25, reEau: 10, reAir: -15 },
    spells: [
      sp({ id: 'm_pince', n: 'Pince', i: '🦀', pa: 4, po: [1, 1], per: 1, fx: [dmg('eau', 10, 13)] }),
      sp({ id: 'm_carapace', n: 'Carapace', i: '🛡️', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'shield', pct: 20, dur: 2 }] }),
    ] });
  mob({ id: 'chauvesel', n: 'Chauve-Sel', i: '🦇', k: 0.8, pm: 5, ai: 'ranged', pref: 4, res: { reAir: 15, reTerre: -15 },
    spells: [
      sp({ id: 'm_cri', n: 'Cri strident', i: '🔊', pa: 3, po: [1, 5], per: 2, fx: [dmg('air', 7, 9)] }),
      sp({ id: 'm_suce', n: 'Morsure vampire', i: '🩸', pa: 3, po: [1, 1], per: 1, fx: [dmg('air', 6, 8, { vol: 0.5 })] }),
    ] });
  mob({ id: 'golem', n: 'Golem Cristallin', i: '🗿', k: 1.8, pm: 2, renvoi: 1, res: { reFeu: 15, reTerre: 15, reAir: -20, reEau: -10 },
    spells: [sp({ id: 'm_poing', n: 'Poing de quartz', i: '👊', pa: 4, po: [1, 1], per: 1, fx: [dmg('terre', 12, 15), { t: 'push', n: 2 }] })] });
  mob({ id: 'roicristal', n: 'Roi Cristal', i: '💎', boss: true, k: 3.5, pa: 9, pm: 2, ai: 'ranged', pref: 3, renvoi: 0.5, res: { reTerre: 15, reFeu: 15, reEau: 15, reAir: -5 },
    spells: [
      sp({ id: 'm_eclat', n: 'Éclat', i: '💠', pa: 3, po: [1, 5], per: 2, fx: [dmg('terre', 10, 13)] }),
      sp({ id: 'm_prisme', n: 'Prisme', i: '🔷', pa: 4, po: [1, 6], tgt: 'any', zone: ['circle', 1], cd: 2, fx: [dmg('eau', 9, 11)] }),
      sp({ id: 'm_cristallise', n: 'Cristallisation', i: '🛡️', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'shield', pct: 15, dur: 2 }] }),
    ] });

  // ─── Marais Fiévreux ───
  mob({ id: 'crapaud', n: 'Crapaud Bouffi', i: '🐸', k: 1.3, res: { reEau: 20, reAir: -15 },
    spells: [
      sp({ id: 'm_langue', n: 'Langue collante', i: '👅', pa: 3, po: [1, 3], per: 2, fx: [dmg('eau', 9, 12), { t: 'pull', n: 2 }] }),
      sp({ id: 'm_gonfle', n: 'Gonflement', i: '🎈', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'shield', pct: 15, dur: 2 }] }),
    ] });
  mob({ id: 'moustique', n: 'Moustique Géant', i: '🦟', k: 0.7, pm: 5, res: { reAir: 20, reFeu: -20 },
    spells: [sp({ id: 'm_trompe', n: 'Trompe', i: '🦟', pa: 3, po: [1, 1], per: 2, fx: [dmg('air', 6, 8, { vol: 0.5 }), { t: 'dot', el: 'air', min: 3, max: 4, dur: 2 }] })] });
  mob({ id: 'sorcierem', n: 'Sorcière des Marais', i: '🧙', k: 0.9, ai: 'support', pref: 5, res: { reFeu: 15, reEau: -10 },
    spells: [
      sp({ id: 'm_malefice', n: 'Maléfice', i: '🪄', pa: 3, po: [2, 6], per: 2, fx: [dmg('feu', 9, 12)] }),
      sp({ id: 'm_philtre', n: 'Philtre', i: '🧪', pa: 3, po: [0, 5], tgt: 'ally', cd: 2, fx: [{ t: 'heal', min: 12, max: 16 }] }),
    ] });
  mob({ id: 'hydre', n: 'Hydre des Fièvres', i: '🐉', boss: true, k: 5, pa: 10, pm: 2, res: { reEau: 20, reFeu: 10, reTerre: -10 },
    spells: [
      sp({ id: 'm_triple', n: 'Morsure triple', i: '🐉', pa: 4, po: [1, 1], per: 2, fx: [dmg('eau', 12, 15)] }),
      sp({ id: 'm_souffle', n: 'Souffle pestilent', i: '☁️', pa: 4, po: [1, 3], tgt: 'any', zone: ['line', 4], cd: 2, fx: [dmg('feu', 8, 10), { t: 'dot', el: 'eau', min: 4, max: 5, dur: 2 }] }),
    ] });

  // ─── Forteresse de Cendre ───
  mob({ id: 'soldat', n: 'Soldat Cendré', i: '💀', k: 1.4, res: { reFeu: 20, reTerre: 10, reEau: -15 },
    spells: [
      sp({ id: 'm_taille', n: 'Taille', i: '⚔️', pa: 4, po: [1, 1], per: 1, fx: [dmg('terre', 11, 14)] }),
      sp({ id: 'm_garde', n: 'Garde', i: '🛡️', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'shield', pct: 15, dur: 2 }] }),
    ] });
  mob({ id: 'mage', n: 'Mage de Braise', i: '🪔', k: 0.8, ai: 'ranged', pref: 5, res: { reFeu: 25, reEau: -20 },
    spells: [
      sp({ id: 'm_trait', n: 'Trait de braise', i: '🔥', pa: 3, po: [2, 7], per: 2, fx: [dmg('feu', 10, 12)] }),
      sp({ id: 'm_explo', n: 'Explosion', i: '💥', pa: 4, po: [2, 6], tgt: 'any', zone: ['circle', 1], cd: 2, fx: [dmg('feu', 9, 11)] }),
    ] });
  mob({ id: 'chien', n: 'Molosse Infernal', i: '🐕', k: 1.1, pm: 5, res: { reFeu: 20, reAir: -10 },
    spells: [sp({ id: 'm_crocs', n: 'Crocs ardents', i: '🔥', pa: 3, po: [1, 1], per: 2, fx: [dmg('feu', 9, 12)] })] });
  mob({ id: 'general', n: 'Général Cendre', i: '🪖', boss: true, k: 4.5, pa: 9, res: { reFeu: 20, reTerre: 20, reEau: -10 },
    spells: [
      sp({ id: 'm_fendoir', n: 'Fendoir', i: '🪓', pa: 4, po: [1, 1], tgt: 'any', zone: ['perp', 1], per: 2, fx: [dmg('terre', 13, 16)] }),
      sp({ id: 'm_cri_guerre', n: 'Cri de guerre', i: '📯', pa: 3, po: [0, 0], tgt: 'self', zone: ['circle', 3], cd: 3, fx: [{ t: 'buff', stat: 'pui', val: 40, dur: 2 }] }),
      sp({ id: 'm_charge', n: 'Charge brûlante', i: '🐎', pa: 3, po: [2, 4], line: true, cd: 2, fx: [{ t: 'dash', n: 3 }, dmg('feu', 10, 12)] }),
    ] });

  // ─── Cime des Tempêtes ───
  mob({ id: 'harpie', n: 'Harpie', i: '🦅', k: 0.9, pm: 5, ai: 'ranged', pref: 4, res: { reAir: 20, reTerre: -15 },
    spells: [
      sp({ id: 'm_serres', n: 'Serres', i: '🦅', pa: 3, po: [1, 4], per: 2, fx: [dmg('air', 10, 13)] }),
      sp({ id: 'm_rafaleh', n: 'Coup d’aile', i: '💨', pa: 3, po: [1, 3], cd: 2, fx: [dmg('air', 6, 8), { t: 'push', n: 2 }] }),
    ] });
  mob({ id: 'elemorage', n: "Élémentaire d'Orage", i: '⚡', ai: 'ranged', pref: 4, res: { reEau: 15, reAir: 15, reTerre: -20 },
    spells: [
      sp({ id: 'm_eclair', n: 'Éclair', i: '⚡', pa: 4, po: [1, 6], line: true, per: 2, fx: [dmg('eau', 11, 14)] }),
      sp({ id: 'm_tempete', n: 'Tempête', i: '🌩️', pa: 4, po: [2, 5], tgt: 'any', zone: ['circle', 1], cd: 2, fx: [dmg('air', 8, 10)] }),
    ] });
  mob({ id: 'titanroche', n: 'Titan de Roche', i: '🪨', k: 2, pm: 2, res: { reTerre: 25, reFeu: 15, reAir: -15 },
    spells: [
      sp({ id: 'm_ecrase', n: 'Écrasement', i: '🪨', pa: 5, po: [1, 1], per: 1, fx: [dmg('terre', 14, 18), { t: 'push', n: 1 }] }),
      sp({ id: 'm_secousse', n: 'Secousse', i: '💥', pa: 3, po: [0, 0], tgt: 'self', zone: ['circle', 1], cd: 2, fx: [dmg('terre', 8, 10)] }),
    ] });
  mob({ id: 'seigneur', n: 'Seigneur Tempête', i: '🌩️', boss: true, k: 4.5, pa: 10, ai: 'ranged', pref: 3, res: { reTerre: 5, reFeu: 20, reEau: 20, reAir: 20 },
    spells: [
      sp({ id: 'm_foudre', n: 'Foudre', i: '⚡', pa: 4, po: [1, 7], per: 2, fx: [dmg('eau', 13, 16)] }),
      sp({ id: 'm_ouragan', n: 'Ouragan', i: '🌪️', pa: 5, po: [2, 6], tgt: 'any', zone: ['circle', 2], cd: 2, fx: [dmg('air', 10, 12), { t: 'pull', n: 1, to: 'center' }] }),
      sp({ id: 'm_oeil', n: 'Œil du cyclone', i: '🌀', pa: 2, po: [0, 0], tgt: 'self', cd: 3, fx: [{ t: 'shield', pct: 15, dur: 2 }] }),
    ] });

  // Mannequin d'entraînement : encaisse sans jamais tomber.
  mob({ id: 'mannequin', n: "Mannequin d'entraînement", i: '🎯', k: 1, pa: 0, pm: 0, dummy: true, spells: [] });

  // ─── Zones ───
  K.ZONES = [
    { id: 'pres', n: 'Prés de Vermeil', i: '🌼', lvl: [1, 9], obst: '🪨', theme: 'pres', sets: ['sanglier', 'ruche'], relic: 'relique_gelee',
      desc: 'Des prairies bourdonnantes, idéales pour faire ses premières armes.',
      rooms: [
        { n: 'Lisière fleurie', mobs: ['bourdonneur', 'bourdonneur', 'sanglion'] },
        { n: 'Champ des sangliers', mobs: ['sanglion', 'sanglion', 'champignard'] },
        { n: 'Sous-bois humide', mobs: ['champignard', 'bourdonneur', 'sanglion', 'bourdonneur'] },
        { n: 'Ruche royale', boss: true, mobs: ['reine', 'bourdonneur', 'bourdonneur'] },
      ] },
    { id: 'bois', n: 'Bois Murmurant', i: '🌲', lvl: [9, 18], obst: '🌲', theme: 'bois', sets: ['druide', 'chasseur'], relic: 'relique_gland',
      desc: 'Une forêt brumeuse où les arbres eux-mêmes montent la garde.',
      rooms: [
        { n: 'Clairière brumeuse', mobs: ['loup', 'follet', 'loup'] },
        { n: 'Allée des feux', mobs: ['follet', 'follet', 'sentinelle'] },
        { n: 'Cœur du bois', mobs: ['sentinelle', 'loup', 'follet', 'loup'] },
        { n: 'Le Vieux Chêne', boss: true, mobs: ['chene', 'sentinelle', 'follet'] },
      ] },
    { id: 'grottes', n: 'Grottes de Sel', i: '💠', lvl: [18, 26], obst: '💠', theme: 'grottes', sets: ['cristal', 'mineur'], relic: 'relique_cristal',
      desc: 'Galeries scintillantes. Les créatures de cristal renvoient une partie des coups.',
      rooms: [
        { n: 'Galerie des crabes', mobs: ['crabe', 'chauvesel', 'crabe'] },
        { n: 'Puits sonore', mobs: ['golem', 'chauvesel', 'chauvesel'] },
        { n: 'Filon profond', mobs: ['golem', 'crabe', 'chauvesel', 'crabe'] },
        { n: 'Trône de quartz', boss: true, mobs: ['roicristal', 'golem', 'chauvesel'] },
      ] },
    { id: 'marais', n: 'Marais Fiévreux', i: '🌾', lvl: [26, 34], obst: '🌾', theme: 'marais', sets: ['marecage', 'sorciere'], relic: 'relique_hydre',
      desc: 'Une eau stagnante, des poisons partout, et quelque chose de gros sous la vase.',
      rooms: [
        { n: 'Berges vaseuses', mobs: ['crapaud', 'moustique', 'moustique'] },
        { n: 'Cabane de la sorcière', mobs: ['sorcierem', 'crapaud', 'moustique'] },
        { n: 'Tourbière', mobs: ['crapaud', 'sorcierem', 'moustique', 'crapaud'] },
        { n: "Antre de l'Hydre", boss: true, mobs: ['hydre', 'sorcierem', 'crapaud'] },
      ] },
    { id: 'forteresse', n: 'Forteresse de Cendre', i: '🏰', lvl: [34, 42], obst: '🧱', theme: 'forteresse', sets: ['cendre', 'legion'], relic: 'relique_braise',
      desc: "Une citadelle calcinée tenue par une légion qui ne connaît pas le repos.",
      rooms: [
        { n: 'Porte brûlée', mobs: ['soldat', 'chien', 'chien'] },
        { n: 'Chemin de ronde', mobs: ['mage', 'soldat', 'mage'] },
        { n: "Cour d'armes", mobs: ['soldat', 'chien', 'mage', 'soldat'] },
        { n: 'Salle du Général', boss: true, mobs: ['general', 'soldat', 'mage'] },
      ] },
    { id: 'cime', n: 'Cime des Tempêtes', i: '🌩️', lvl: [42, 50], obst: '☁️', theme: 'cime', sets: ['tempete', 'titan'], relic: 'relique_plume',
      desc: "Le sommet du monde, battu par la foudre. Le défi ultime de vos builds.",
      rooms: [
        { n: 'Corniche venteuse', mobs: ['harpie', 'elemorage', 'harpie'] },
        { n: 'Éboulis', mobs: ['titanroche', 'elemorage', 'harpie'] },
        { n: 'Pic foudroyé', mobs: ['titanroche', 'harpie', 'elemorage', 'harpie'] },
        { n: "L'Œil de la tempête", boss: true, mobs: ['seigneur', 'titanroche', 'elemorage'] },
      ] },
  ];
  K.ZONE = {};
  K.ZONES.forEach((z, idx) => {
    z.idx = idx;
    K.ZONE[z.id] = z;
  });
  K.roomLevel = (zone, r) => Math.round(zone.lvl[0] + ((zone.lvl[1] - zone.lvl[0]) * r) / (zone.rooms.length - 1));

  // ─── Tables de butin ───
  // Les pièces des panoplies de la zone sont réparties entre ses monstres ; le boss peut tout lâcher, et la relique.
  K.DROPS = {};
  K.SOURCES = {}; // itemId → [{mob, p}]
  const addDrop = (mobId, itemId, p) => {
    (K.DROPS[mobId] = K.DROPS[mobId] || []).push({ id: itemId, p });
    (K.SOURCES[itemId] = K.SOURCES[itemId] || []).push({ mob: mobId, p });
  };
  for (const z of K.ZONES) {
    const ids = [...new Set(z.rooms.flatMap((r) => r.mobs))];
    const regular = ids.filter((id) => !K.MONSTERS[id].boss);
    const boss = ids.find((id) => K.MONSTERS[id].boss);
    z.mobs = ids;
    const pieces = z.sets.flatMap((s) => K.SETS[s].pieces);
    pieces.forEach((iid, n) => {
      const weapon = K.ITEMS[iid].type === 'arme';
      addDrop(regular[n % regular.length], iid, weapon ? 3 : 6);
      if (boss) addDrop(boss, iid, weapon ? 6 : 10);
    });
    if (boss) addDrop(boss, z.relic, 8);
  }
})(window.K);
