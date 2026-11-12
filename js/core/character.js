// Personnages : progression, calcul des caractéristiques, panoplies et synergies d'équipe.
(function (K) {
  K.xpNext = (lvl) => Math.floor(50 * Math.pow(lvl, 1.8));
  K.ptsTotal = (c) => 5 * (c.lvl - 1);
  K.ptsFree = (c) => K.ptsTotal(c) - K.sum(K.CARAC, (k) => c.pts[k] || 0);

  K.newChar = (name, cls) => ({
    id: K.uid(),
    name,
    cls,
    lvl: 1,
    xp: 0,
    pts: { vit: 0, sag: 0, for: 0, int: 0, cha: 0, agi: 0 },
    equip: {},
    spells: K.CLASSES[cls].spells.filter((s) => s.lvl <= 1).map((s) => s.id),
  });

  K.unlockedSpells = (c) => K.CLASSES[c.cls].spells.filter((s) => s.lvl <= c.lvl);

  // Gagne de l'XP ; renvoie le nombre de niveaux pris.
  K.gainXp = (c, xp) => {
    let ups = 0;
    c.xp += xp;
    while (c.lvl < K.MAX_LVL && c.xp >= K.xpNext(c.lvl)) {
      c.xp -= K.xpNext(c.lvl);
      c.lvl++;
      ups++;
      for (const s of K.unlockedSpells(c))
        if (s.lvl === c.lvl && c.spells.length < K.MAX_SPELLS && !c.spells.includes(s.id)) c.spells.push(s.id);
    }
    if (c.lvl >= K.MAX_LVL) c.xp = 0;
    return ups;
  };

  // Objets équipés : [{slot, inst, base}]
  K.equipped = (c, equipOverride) => {
    const eq = equipOverride || c.equip;
    const out = [];
    for (const s of K.SLOTS) {
      const uid = eq[s.id];
      if (!uid) continue;
      const inst = K.item(uid);
      if (inst) out.push({ slot: s.id, inst, base: K.ITEMS[inst.id] });
    }
    return out;
  };

  // Calcul complet. `team` : bonus de synergie à ajouter (ou null). `equipOverride` : pour les comparaisons.
  K.computeStats = (c, teamBonus, equipOverride) => {
    const s = K.zeroStats();
    s.pa = 6;
    s.pm = 3;
    s.crit = 5;
    s.pp = 100;
    for (const k of K.CARAC) s[k] += c.pts[k] || 0;
    K.addStats(s, K.CLASSES[c.cls].passive.stats);

    const items = K.equipped(c, equipOverride);
    const setCount = {};
    for (const { inst, base } of items) {
      K.addStats(s, inst.st);
      if (base.set) setCount[base.set] = (setCount[base.set] || 0) + 1;
    }
    const sets = [];
    const mods = {};
    for (const [sid, count] of Object.entries(setCount)) {
      const set = K.SETS[sid];
      const cur = K.setBonusFor(set, count);
      const nextTier = K.setTiers(set).find((t) => t > count);
      sets.push({ set, count, cur, next: nextTier ? { tier: nextTier, bonus: set.bonus[nextTier] } : null });
      if (cur) {
        K.addStats(s, cur.bonus);
        if (cur.bonus.mods)
          for (const [spId, m] of Object.entries(cur.bonus.mods)) {
            const t = (mods[spId] = mods[spId] || {});
            for (const k in m) t[k] = (t[k] || 0) + m[k];
          }
      }
    }
    sets.sort((a, b) => b.count - a.count);
    if (teamBonus) K.addStats(s, teamBonus);

    s.ini += s.for + s.int + s.cha + s.agi;
    s.pp += Math.floor(s.cha / 10);
    const pvMax = Math.max(1, Math.round((50 + 5 * c.lvl + s.vit) * (1 + s.pvPct / 100)));
    return { s, pvMax, sets, mods, items };
  };

  K.mainElement = (s) => {
    let best = null;
    let bv = 0;
    for (const el of K.EL_ORDER) {
      const v = s[K.ELEMENTS[el].stat];
      if (v > bv) {
        bv = v;
        best = el;
      }
    }
    return best;
  };

  // ─── Synergies d'équipe ───
  K.SYNERGIES = [
    { id: 'terre', n: 'Résonance tellurique', i: '⛰️', el: 'terre', need: 'personnages à dominante Terre', tiers: { 2: { pvPct: 10 }, 3: { pvPct: 20, reTerre: 5, reFeu: 5, reEau: 5, reAir: 5 } } },
    { id: 'feu', n: 'Résonance ardente', i: '🔥', el: 'feu', need: 'personnages à dominante Feu', tiers: { 2: { pui: 25 }, 3: { pui: 50, crit: 5 } } },
    { id: 'eau', n: 'Résonance des flots', i: '💧', el: 'eau', need: 'personnages à dominante Eau', tiers: { 2: { soin: 10, pp: 30 }, 3: { soin: 20, pp: 60, volVie: 8 } } },
    { id: 'air', n: 'Résonance céleste', i: '🌪️', el: 'air', need: 'personnages à dominante Air', tiers: { 2: { ini: 50, crit: 4 }, 3: { ini: 100, crit: 8, pm: 1 } } },
    { id: 'prisme', n: 'Prisme', i: '🌈', need: 'éléments dominants tous différents', tiers: { 3: { pctDmg: 6 } } },
    { id: 'escouade', n: 'Escouade', i: '🎖️', need: 'classes toutes différentes', tiers: { 3: { ini: 30, reTerre: 3, reFeu: 3, reEau: 3, reAir: 3 } } },
    { id: 'fratrie', n: 'Fratrie', i: '👥', need: 'personnages de la même classe', tiers: { 3: { pui: 40 } } },
  ];

  // Synergies pour une liste de personnages. Renvoie {list:[{syn,count,tier}], bonus}
  K.computeSynergies = (chars) => {
    const els = chars.map((c) => K.mainElement(K.computeStats(c).s));
    const elCount = {};
    for (const e of els) if (e) elCount[e] = (elCount[e] || 0) + 1;
    const clsCount = {};
    for (const c of chars) clsCount[c.cls] = (clsCount[c.cls] || 0) + 1;
    const counts = {
      terre: elCount.terre || 0,
      feu: elCount.feu || 0,
      eau: elCount.eau || 0,
      air: elCount.air || 0,
      prisme: els.every((e) => e) && new Set(els).size === els.length ? els.length : 0,
      escouade: Object.keys(clsCount).length === chars.length ? chars.length : 0,
      fratrie: chars.length ? Math.max(...Object.values(clsCount)) : 0,
    };
    const bonus = {};
    const list = [];
    for (const syn of K.SYNERGIES) {
      const count = counts[syn.id];
      let tier = null;
      for (const t of Object.keys(syn.tiers).map(Number)) if (count >= t) tier = t;
      if (tier) K.addStats(bonus, syn.tiers[tier]);
      list.push({ syn, count, tier });
    }
    return { list, bonus, els };
  };

  K.teamChars = () => K.state.team.map((id) => K.charById(id)).filter(Boolean);

  // Stats d'un personnage dans le contexte de l'équipe (synergies incluses s'il en fait partie).
  K.fullStats = (c, equipOverride) => {
    const team = K.teamChars();
    const bonus = team.includes(c) ? K.computeSynergies(team).bonus : null;
    return K.computeStats(c, bonus, equipOverride);
  };

  // ─── Sorts ───
  K.resolveSpell = (def, mod) => {
    const s = K.deepCopy(def);
    if (mod) {
      s.pa = Math.max(1, s.pa + (mod.pa || 0));
      s.po = [s.po[0], s.po[1] + (mod.po || 0)];
      s.cd = Math.max(0, s.cd + (mod.cd || 0));
      s.per = Math.max(1, s.per + (mod.per || 0));
      if (mod.dmg)
        for (const f of s.fx)
          if (f.t === 'dmg') {
            f.min += mod.dmg;
            f.max += mod.dmg;
          }
      s.mod_ = mod;
    }
    return s;
  };

  K.weaponSpell = (c) => {
    const inst = c.equip.arme && K.item(c.equip.arme);
    const base = inst && K.ITEMS[inst.id];
    if (!base || !base.w) return K.deepCopy(K.FIST);
    return Object.assign(K.deepCopy(base.w), { n: base.n, i: base.i, isWeapon: true, desc: 'Attaque de votre arme.' });
  };

  K.charSpells = (c, mods) => [
    K.weaponSpell(c),
    ...c.spells.filter((id) => K.SPELLS[id]).map((id) => K.resolveSpell(K.SPELLS[id], mods && mods[id])),
  ];
})(window.K);
