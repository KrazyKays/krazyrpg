'use strict';
/* KRAZY RPG — moteur : calcul du héros, génération d'objets, combat.
   Aucune dépendance au DOM : ce fichier tourne aussi sous Node (tests / équilibrage). */
(function (KR) {
  const { CLASSES, SKILLS, ENEMIES, ZONES, RAR, UNIQUES, ITEM_NAMES, SLOTS, PARAGON, DISTORSIONS } = KR;
  const R = Math.random;
  const pick = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  KR.pick = pick;

  KR.MAX_LVL = 30;
  KR.xpNeed = l => Math.round(20 * Math.pow(Math.min(l, KR.MAX_LVL), 1.5));

  /* ================= Sauvegarde & héros ================= */

  KR.newSave = cls => {
    const s = {
      v: 1, cls, lvl: 1, xp: 0, gold: 40, frag: 0, nid: 1,
      talents: {}, loadout: CLASSES[cls].start.slice(),
      equip: { arme: null, armure: null, talisman: null, masque: null }, inv: [],
      prog: [0, 0, 0, 0, 0], faille: 0, wins: 0,
      par: { pts: 0, puissance: 0, vitalite: 0, precision: 0, fortune: 0 }, shop: []
    };
    s.equip.arme = KR.genItem(s, 1, 0, 'arme', true);
    KR.refreshShop(s);
    return s;
  };

  KR.nodeId = (cls, b, n) => `${cls}_${b}_${n}`;
  KR.talentPoints = s => s.lvl - 1 - Object.values(s.talents).reduce((a, b) => a + b, 0);

  KR.knownSkills = s => {
    const c = CLASSES[s.cls], out = c.start.slice();
    c.tree.forEach((br, b) => br.nodes.forEach((nd, n) => {
      if (nd.s && s.talents[KR.nodeId(s.cls, b, n)]) out.push(nd.s);
    }));
    return out;
  };

  KR.itemMods = it => {
    const o = {}, k = 1 + 0.08 * (it.up || 0);
    for (const key in it.mods) o[key] = Math.round(it.mods[key] * k);
    if (it.u != null) Object.assign(o, UNIQUES[it.u].mods);
    return o;
  };

  KR.computeHero = s => {
    const c = CLASSES[s.cls], m = {};
    const add = (mods, k = 1) => {
      for (const key in mods) {
        if (key === 'krazyThreshold') m[key] = Math.min(m[key] || 100, mods[key]);
        else if (key === 'startDelire') m[key] = Math.max(m[key] || 0, mods[key]);
        else m[key] = (m[key] || 0) + mods[key] * k;
      }
    };
    c.tree.forEach((br, b) => br.nodes.forEach((nd, n) => {
      const r = s.talents[KR.nodeId(s.cls, b, n)];
      if (r && nd.p) add(nd.mods, r);
    }));
    Object.values(s.equip).forEach(it => it && add(KR.itemMods(it)));
    for (const k in PARAGON) add(PARAGON[k].mods, s.par[k] || 0);

    const H = { cls: s.cls, main: c.main, lvl: s.lvl, m };
    ['for', 'esp', 'vig', 'agi'].forEach(st => {
      const pk = 'p' + st[0].toUpperCase() + st.slice(1);
      H[st] = Math.round((c.base[st] + c.grow[st] * (s.lvl - 1) + (m[st] || 0)) * (1 + (m[pk] || 0) / 100));
    });
    H.maxHp = Math.round((40 + H.vig * 8 + s.lvl * 5) * (1 + (m.pHp || 0) / 100));
    H.armure = Math.round(H.vig * 0.5 + (m.armure || 0));
    H.crit = Math.min(60, Math.round(5 + H.agi * 0.4 + (m.crit || 0)));
    H.critDmg = 1.5 + (m.critDmg || 0) / 100;
    H.esquive = Math.min(40, Math.round(H.agi * 0.25 + (m.esquive || 0)));
    H.krazyAt = m.krazyThreshold || 67;
    return H;
  };

  /* ================= Objets ================= */

  const AFFIX = {
    for: i => 1 + i * 0.45, esp: i => 1 + i * 0.45, vig: i => 1 + i * 0.45, agi: i => 1 + i * 0.45,
    armure: i => 2 + i * 0.8,
    crit: () => 2 + R() * 4, critDmg: () => 6 + R() * 10, esquive: () => 2 + R() * 3,
    vol: () => 2 + R() * 3, regen: () => 1 + R(), healPlus: () => 6 + R() * 8, dotPlus: () => 8 + R() * 8,
    dmgKrazy: () => 5 + R() * 7, dmgFele: () => 5 + R() * 6, redLucide: () => 3 + R() * 5
  };
  const FLAT = ['for', 'esp', 'vig', 'agi', 'armure'];
  const affVal = (k, ilvl) => {
    const v = AFFIX[k](ilvl) * (FLAT.includes(k) ? 0.8 + R() * 0.4 : 0.7 + ilvl / 60);
    return Math.max(1, Math.round(v));
  };

  KR.rollRarity = (bonus = 0, mythW = 0) => {
    const b = clamp(bonus, 0, 1);
    const w = [60 - 45 * b, 28 + 12 * b, 10 + 20 * b, 2 + 8 * b, mythW];
    let r = R() * w.reduce((a, x) => a + x, 0);
    for (let i = 0; i < w.length; i++) { if ((r -= w[i]) < 0) return i; }
    return 0;
  };

  const rollAffixes = (it, cls) => {
    const main = it.main, Rr = RAR[it.rar], i = it.ilvl, mods = {};
    const base = v => Math.max(1, Math.round(v * Rr.mul));
    if (it.slot === 'arme') mods[main] = base(2 + i * 1.2);
    if (it.slot === 'armure') { mods.armure = base(3 + i * 1.2); mods.vig = base(1 + i * 0.5); }
    if (it.slot === 'talisman') { mods[main] = base(1 + i * 0.5); mods.vig = base(1 + i * 0.4); }
    if (it.slot === 'masque') {
      mods[main] = base(1 + i * 0.4);
      const k = pick(['dmgKrazy', 'dmgFele', 'redLucide']); mods[k] = affVal(k, i);
    }
    const pool = Object.keys(AFFIX).filter(k => !(k in mods) && !(['for', 'esp', 'agi'].includes(k) && k !== main));
    for (let n = 0; n < Rr.aff && pool.length; n++) {
      const k = pool.splice(Math.floor(R() * pool.length), 1)[0];
      mods[k] = affVal(k, i);
    }
    it.mods = mods;
  };

  KR.genItem = (s, ilvl, rar, slot, forceMain) => {
    slot = slot || pick(Object.keys(SLOTS));
    const cmain = CLASSES[s.cls].main;
    const main = forceMain || R() < 0.75 ? cmain : pick(['for', 'esp', 'agi']);
    const it = { id: s.nid++, slot, rar, ilvl: Math.max(1, Math.round(ilvl)), up: 0, main };
    rollAffixes(it, s.cls);
    const names = ITEM_NAMES[slot];
    it.name = pick(Array.isArray(names) ? names : names[main]);
    if (rar >= 3) {
      const us = UNIQUES.map((u, i) => i).filter(i => UNIQUES[i].slot === slot);
      it.u = pick(us); it.name = UNIQUES[it.u].n;
    }
    return it;
  };
  KR.rerollItem = (s, it) => rollAffixes(it, s.cls);

  KR.itemPrice = it => Math.round((15 + it.ilvl * 10) * RAR[it.rar].price);
  KR.sellPrice = it => Math.round(KR.itemPrice(it) * 0.25);
  KR.upCost = it => Math.round((20 + it.ilvl * 8) * (it.up + 1) * [1, 1.5, 2, 3, 4][it.rar]);
  KR.reflectCost = it => 5 + it.rar * 5;
  KR.MAX_UP = 10;
  KR.INV_MAX = 40;

  KR.failleUnlocked = s => s.prog[ZONES.length - 1] >= 6;
  KR.refreshShop = s => {
    const lvl = KR.failleUnlocked(s) ? 30 + Math.floor(s.faille / 2) : s.lvl + 1;
    s.shop = [];
    for (let i = 0; i < 6; i++) s.shop.push(KR.genItem(s, lvl, KR.rollRarity(0.15)));
  };

  /* ================= Rencontres ================= */

  KR.buildStage = (z, st) => {
    const Z = ZONES[z], lvl = Z.lvl + st;
    let ids;
    if (st === 5) {
      ids = [Z.boss];
      if (z >= 1) ids.push(pick(Z.pool));
      if (z >= 4) ids.unshift(pick(Z.pool));
    } else {
      const n = st === 0 ? 1 : st < 3 ? 2 : 3;
      ids = Array.from({ length: n }, () => pick(Z.pool));
    }
    return { foes: ids.map(id => ({ id, lvl, boss: id === Z.boss })), opts: {}, lvl };
  };

  KR.buildFaille = f => {
    const lvl = 30 + f, boss = f % 5 === 0;
    const all = ZONES.flatMap(z => z.pool);
    let foes;
    if (boss) foes = [{ id: pick(all), lvl }, { id: pick(ZONES).boss, lvl, boss: true }, { id: pick(all), lvl }];
    else foes = Array.from({ length: 2 + (R() < 0.6 ? 1 : 0) }, () => ({ id: pick(all), lvl }));
    const dist = DISTORSIONS[(f * 7 + 3) % DISTORSIONS.length];
    const opts = Object.assign({ scaleHp: Math.pow(1.07, f), scaleAtk: Math.pow(1.05, f) }, dist.opts);
    return { foes, opts, lvl, dist, boss };
  };

  /* ================= Combat ================= */

  const DOTS = ['saignement', 'cauchemar', 'poison'];
  const has = (u, k) => u.st.some(x => x.k === k);
  const addSt = (u, k, turns, val) => {
    const e = u.st.find(x => x.k === k);
    if (e) { e.turns = Math.max(e.turns, turns); e.val = Math.max(e.val || 0, val || 0); }
    else u.st.push({ k, turns, val });
  };

  KR.startCombat = (H, enc) => {
    const o = enc.opts || {}, n = enc.foes.length;
    const c = {
      H, opts: o, round: 1, over: null, log: [], ev: [],
      hero: { hp: H.maxHp, maxHp: H.maxHp, shield: 0, st: [], cds: {}, stun: false,
        delire: Math.max(H.m.startDelire || 0, o.startDelire || 0) },
      foes: enc.foes.map(f => {
        const T = ENEMIES[f.id], L = f.lvl;
        const hpM = f.boss ? 3.4 : [1, 1, 0.75, 0.6][n], atkM = f.boss ? 1.1 : [1, 1, 0.8, 0.65][n];
        const hp = Math.round((28 + 12 * L) * (1 + 0.045 * L) * T.hp * hpM * (o.hpM || 1) * (o.scaleHp || 1));
        return {
          id: f.id, n: T.n, ic: T.ic, boss: !!f.boss, lvl: L, hp, maxHp: hp, shield: 0, st: [],
          atk: (4 + 1.8 * L) * (1 + 0.035 * L) * T.atk * atkM * (o.atkM || 1) * (o.scaleAtk || 1),
          arm: L * 1.2 * T.arm, moves: T.moves, intent: 'atk'
        };
      })
    };
    c.foes.forEach(f => pickIntent(c, f));
    return c;
  };

  KR.dState = c => (c.hero.delire >= c.H.krazyAt ? 'krazy' : c.hero.delire >= 34 ? 'fele' : 'lucide');
  const alive = c => c.foes.filter(f => f.hp > 0);
  const say = (c, t) => c.log.push(t);
  const ev = (c, tgt, txt, cls) => c.ev.push({ tgt, txt, cls });
  const idx = (c, f) => c.foes.indexOf(f);

  function pickIntent(c, f) {
    let opts = f.moves.filter(([m]) => {
      if (m === 'garde') return f.shield <= 0;
      if (m === 'soin') return alive(c).some(a => a.hp < a.maxHp * 0.8);
      return true;
    });
    if (!opts.length) opts = [['atk', 1]];
    let r = R() * opts.reduce((a, x) => a + x[1], 0);
    f.intent = opts[opts.length - 1][0];
    for (const [m, w] of opts) { if ((r -= w) < 0) { f.intent = m; break; } }
  }

  function dealFoe(c, f, d, crit, label) {
    d = Math.max(1, Math.round(d));
    const abs = Math.min(f.shield, d); f.shield -= abs;
    f.hp = Math.max(0, f.hp - (d - abs));
    ev(c, idx(c, f), (label || '') + '-' + d + (crit ? ' !' : ''), crit ? 'crit' : 'dmg');
    if (f.hp <= 0) { f.st = []; say(c, `☠️ ${f.n} est vaincu.`); }
    return d;
  }

  function dealHero(c, d) {
    const h = c.hero; d = Math.max(1, Math.round(d));
    const abs = Math.min(h.shield, d); h.shield -= abs;
    h.hp = Math.max(0, h.hp - (d - abs));
    ev(c, 'h', '-' + d, 'dmg');
    return d;
  }

  function healHero(c, v) {
    const h = c.hero;
    v = Math.round(v * (1 + (c.H.m.healPlus || 0) / 100) * (c.opts.hemo ? 0.5 : 1));
    v = Math.min(v, h.maxHp - h.hp);
    if (v > 0) { h.hp += v; ev(c, 'h', '+' + v, 'heal'); }
  }

  function addDelire(c, v) {
    const h = c.hero;
    if (v > 0 && c.opts.silence) v /= 2;
    h.delire = clamp(Math.round(h.delire + v), 0, 100);
    if (h.delire >= 100) rupture(c);
  }

  function rupture(c) {
    const h = c.hero, H = c.H;
    say(c, '💔 RUPTURE ! Ton esprit craque.');
    ev(c, 'h', 'RUPTURE', 'crit');
    if (H.m.ruptureHeal) healHero(c, h.maxHp * 0.2);
    else { h.hp = Math.max(1, h.hp - Math.round(h.maxHp * 0.2)); ev(c, 'h', '-' + Math.round(h.maxHp * 0.2), 'dmg'); }
    if (H.m.ruptureBlast) alive(c).forEach(f => dealFoe(c, f, H[H.main] * H.m.ruptureBlast * 100 / (100 + f.arm)));
    h.stun = true;
    h.delire = 40;
  }

  function dmgMult(c, state) {
    const m = c.H.m;
    let k = 1 + (m.pDmg || 0) / 100;
    if (state === 'fele') k += 0.2 + (m.dmgFele || 0) / 100;
    if (state === 'krazy') k += 0.5 + (m.dmgKrazy || 0) / 100;
    if (state === 'lucide') k += (m.dmgLucide || 0) / 100;
    if (has(c.hero, 'rage')) k += 0.3;
    if (has(c.hero, 'affaibli')) k *= 0.7;
    return k;
  }

  function heroHit(c, f, fx, state, delire) {
    const H = c.H;
    let d = H[fx.stat || H.main] * fx.m * (0.9 + R() * 0.2) * dmgMult(c, state);
    if (fx.scaleDelire) d *= Math.max(0.2, delire / 50);
    const critC = H.crit + (state === 'fele' ? (H.m.critFele || 0) : 0);
    const crit = (fx.critIfFele && state === 'fele') || R() * 100 < critC;
    if (crit) d *= H.critDmg;
    if (has(f, 'fragile')) d *= 1.3;
    d *= 100 / (100 + f.arm);
    const done = dealFoe(c, f, d, crit);
    if (H.m.vol) healHero(c, done * H.m.vol / 100);
  }

  function applyFx(c, list, target, state) {
    const H = c.H, h = c.hero, delire = h.delire;
    for (const fx of list) {
      const tgts = () => (fx.aoe ? alive(c) : (target && target.hp > 0 ? [target] : alive(c).slice(0, 1)));
      switch (fx.t) {
        case 'dmg':
          for (let i = 0; i < (fx.hits || 1); i++) {
            const ts = fx.rnd ? (alive(c).length ? [pick(alive(c))] : []) : tgts();
            ts.forEach(f => heroHit(c, f, fx, state, delire));
          }
          break;
        case 'dot': {
          const v = H[H.main] * fx.m * (1 + (H.m.dotPlus || 0) / 100) * dmgMult(c, state);
          tgts().forEach(f => addSt(f, fx.k, fx.turns, v));
          break;
        }
        case 'burst':
          tgts().forEach(f => {
            const tot = f.st.filter(x => DOTS.includes(x.k)).reduce((a, x) => a + x.val * x.turns, 0);
            if (tot > 0) { f.st = f.st.filter(x => !DOTS.includes(x.k)); dealFoe(c, f, tot * fx.m, false, '💥'); }
          });
          break;
        case 'stun':
          tgts().forEach(f => { if (R() < fx.chance) { addSt(f, 'etourdi', 1); ev(c, idx(c, f), 'Étourdi', 'info'); } });
          break;
        case 'debuff': tgts().forEach(f => addSt(f, fx.k, fx.turns)); break;
        case 'heal': healHero(c, fx.pct ? h.maxHp * fx.pct : H[H.main] * fx.m); break;
        case 'shield': {
          const v = Math.round((fx.pct ? h.maxHp * fx.pct : H[H.main] * fx.m) * (1 + (H.m.healPlus || 0) / 100) * (c.opts.hemo ? 0.5 : 1));
          h.shield = Math.min(h.maxHp, h.shield + v); ev(c, 'h', '🛡️+' + v, 'info');
          break;
        }
        case 'buff': addSt(h, fx.k, fx.turns); break;
        case 'delSet': h.delire = fx.v; break;
        case 'delToward': h.delire += clamp(fx.v - h.delire, -fx.by, fx.by); break;
        case 'selfDmg': h.hp = Math.max(1, h.hp - Math.round(h.maxHp * fx.pct)); ev(c, 'h', '-' + Math.round(h.maxHp * fx.pct), 'dmg'); break;
      }
    }
  }

  function check(c) {
    if (c.hero.hp <= 0) c.over = 'lose';
    else if (!alive(c).length) c.over = 'win';
    return c.over;
  }

  /* Variante active d'une technique selon l'état courant */
  KR.skillView = (c, id) => {
    const sk = SKILLS[id], kz = KR.dState(c) === 'krazy' && sk.krazy;
    return { name: kz ? sk.krazy.name : sk.name, fx: kz ? sk.krazy.fx : sk.fx,
      del: kz && sk.krazy.del !== undefined ? sk.krazy.del : sk.del, krazy: !!kz, ic: sk.ic, cd: sk.cd };
  };

  /* Tour du héros. id = technique, ou 'skip' si étourdi. */
  KR.heroAct = (c, id, tgtIdx) => {
    if (c.over) return;
    const h = c.hero;
    if (h.stun) { h.stun = false; say(c, '😵 Tu reprends tes esprits…'); return; }
    if (h.cds[id] > 0) return;
    const state = KR.dState(c), v = KR.skillView(c, id);
    say(c, `${v.ic} Tu utilises ${v.name}${v.krazy ? ' 🌀' : ''}.`);
    const times = SKILLS[id].cd > 0 && R() * 100 < (c.H.m.doubleCast || 0) ? 2 : 1;
    for (let i = 0; i < times; i++) {
      if (i) say(c, '🪞 Écho : la technique se répète !');
      applyFx(c, v.fx, c.foes[tgtIdx], state);
    }
    if (v.cd) h.cds[id] = v.cd + 1;
    if (v.del) addDelire(c, v.del);
    check(c);
  };

  function foeHit(c, f, m) {
    const H = c.H, h = c.hero, state = KR.dState(c);
    const esq = H.esquive + (has(h, 'esquive') ? 30 : 0) + (state === 'fele' ? (H.m.esqFele || 0) : 0);
    if (R() * 100 < esq) { ev(c, 'h', 'Esquive', 'info'); return false; }
    let d = f.atk * m * (0.9 + R() * 0.2);
    if (has(f, 'affaibli')) d *= 0.7;
    if (state === 'krazy') d *= 1.25;
    if (state === 'lucide') d *= Math.max(0.4, 0.85 - (H.m.redLucide || 0) / 100);
    if (has(h, 'garde')) d *= 0.5;
    d *= 100 / (100 + H.armure);
    const done = dealHero(c, d);
    if (H.m.thorns && f.hp > 0) dealFoe(c, f, done * H.m.thorns / 100);
    if (!H.m.noDelireHit && h.hp > 0) addDelire(c, 3);
    return true;
  }

  /* Tour des ennemis puis fin de manche. */
  KR.enemiesAct = c => {
    if (c.over) return;
    const h = c.hero;
    for (const f of c.foes) {
      if (f.hp <= 0 || h.hp <= 0) continue;
      const stun = f.st.find(x => x.k === 'etourdi');
      if (stun) { f.st = f.st.filter(x => x !== stun); say(c, `💫 ${f.n} est étourdi et perd son tour.`); continue; }
      const mv = f.intent;
      say(c, `${KR.MOVES[mv].ic} ${f.n} : ${KR.MOVES[mv].n}.`);
      switch (mv) {
        case 'atk': foeHit(c, f, 1); break;
        case 'lourd': foeHit(c, f, 1.9); break;
        case 'multi': foeHit(c, f, 0.6); if (h.hp > 0) foeHit(c, f, 0.6); break;
        case 'murmure': foeHit(c, f, 0.4); if (h.hp > 0) addDelire(c, 18); break;
        case 'apaise': foeHit(c, f, 0.5); addDelire(c, -20); break;
        case 'poison': if (foeHit(c, f, 0.5)) addSt(h, 'poison', 3, f.atk * 0.35); break;
        case 'affaiblir': if (foeHit(c, f, 0.5)) addSt(h, 'affaibli', 2); break;
        case 'garde': f.shield += Math.round(f.maxHp * 0.15); ev(c, idx(c, f), '🛡️', 'info'); break;
        case 'soin': {
          const t = alive(c).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          const v = Math.min(Math.round(t.maxHp * (t.boss ? 0.04 : 0.1)), t.maxHp - t.hp);
          t.hp += v; ev(c, idx(c, t), '+' + v, 'heal');
          break;
        }
      }
    }
    if (check(c)) return;

    // Fin de manche : maux, régénération, durées, recharges
    for (const f of alive(c)) {
      f.st.filter(x => DOTS.includes(x.k)).forEach(x => { if (f.hp > 0) dealFoe(c, f, x.val, false, x.k === 'saignement' ? '🩸' : '🕸️'); });
      f.st.forEach(x => { if (x.k !== 'etourdi') x.turns--; });
      f.st = f.st.filter(x => x.turns > 0);
    }
    const po = h.st.find(x => x.k === 'poison');
    if (po) { h.hp = Math.max(0, h.hp - Math.round(po.val)); ev(c, 'h', '☠️-' + Math.round(po.val), 'dmg'); }
    if (h.hp > 0 && c.H.m.regen) healHero(c, h.maxHp * c.H.m.regen / 100);
    h.st.forEach(x => x.turns--);
    h.st = h.st.filter(x => x.turns > 0);
    for (const k in h.cds) if (h.cds[k] > 0) h.cds[k]--;
    if (check(c)) return;
    if (c.opts.murmures) addDelire(c, c.opts.murmures);
    c.round++;
    alive(c).forEach(f => pickIntent(c, f));
  };

  /* ================= Descriptions automatiques ================= */

  const pc = v => Math.round(v * 100) + '%';
  const DOTN = { saignement: 'Saignement', cauchemar: 'Cauchemar' };
  const BUFFN = { rage: 'Rage (+30% dégâts)', esquive: 'Feinte (+30% esquive)', garde: 'Garde (−50% dégâts subis)' };
  const DEBN = { fragile: 'Fragilise (+30% dégâts subis)', affaibli: 'Affaiblit (−30% dégâts infligés)' };
  KR.descFx = (list, main) => list.map(f => {
    const all = f.aoe ? ' à tous les ennemis' : '', st = KR.STATS[main];
    const t = n => `${n} tour${n > 1 ? 's' : ''}`;
    switch (f.t) {
      case 'dmg': return `${pc(f.m)} ${st} de dégâts${f.hits > 1 ? ' ×' + f.hits : ''}${f.rnd ? ' (cibles au hasard)' : all}` +
        (f.scaleDelire ? ' × (Délire ÷ 50)' : '') + (f.critIfFele ? ', critique garanti si Fêlé' : '');
      case 'dot': return `${DOTN[f.k]}${all} : ${pc(f.m)} ${st} par tour pendant ${t(f.turns)}`;
      case 'burst': return `fait exploser les maux en cours${all} (×${f.m})`;
      case 'stun': return `${pc(f.chance)} de chance d'étourdir${all}`;
      case 'debuff': return `${DEBN[f.k]}${all}, ${t(f.turns)}`;
      case 'heal': return f.pct ? `soigne ${pc(f.pct)} des PV` : `soigne ${pc(f.m)} ${st}`;
      case 'shield': return f.pct ? `bouclier de ${pc(f.pct)} des PV` : `bouclier de ${pc(f.m)} ${st}`;
      case 'buff': return `${BUFFN[f.k]}, ${t(f.turns)}`;
      case 'delSet': return `fixe ton Délire à ${f.v}`;
      case 'delToward': return `rapproche ton Délire de ${f.v} (jusqu'à ${f.by})`;
      case 'selfDmg': return `te coûte ${pc(f.pct)} de tes PV`;
    }
    return '';
  }).join(' · ').replace(/^./, ch => ch.toUpperCase());

})(globalThis.KR);
