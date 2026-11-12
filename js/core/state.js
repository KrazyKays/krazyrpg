// État de la partie : sauvegarde, inventaire, équipement, butin et forgemagie.
(function (K) {
  const KEY = 'krazyrpg.v2';

  K.newState = () => ({ v: 2, roster: [], team: [], inv: [], eclats: 0, prog: {}, stats: { fights: 0, wins: 0 } });

  K.load = () => {
    let st = null;
    try {
      st = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      st = null;
    }
    if (!st || st.v !== 2) st = K.newState();
    st.inv = st.inv.filter((i) => K.ITEMS[i.id]);
    const uids = new Set(st.inv.map((i) => i.uid));
    for (const c of st.roster) {
      for (const slot in c.equip) if (!uids.has(c.equip[slot])) delete c.equip[slot];
      c.spells = c.spells.filter((id) => K.SPELLS[id]);
    }
    st.team = st.team.filter((id) => st.roster.some((c) => c.id === id));
    K.state = st;
    return st;
  };

  K.save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(K.state));
    } catch (e) {
      /* stockage indisponible : la partie continue sans sauvegarde */
    }
  };

  K.resetSave = () => {
    K.state = K.newState();
    K.save();
  };

  K.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(K.state))));
  K.importSave = (txt) => {
    const st = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
    if (!st || st.v !== 2) throw new Error('Format inconnu');
    localStorage.setItem(KEY, JSON.stringify(st));
    K.load();
  };

  K.charById = (id) => K.state.roster.find((c) => c.id === id);

  // ─── Objets ───
  K.rollItem = (id) => {
    const base = K.ITEMS[id];
    const st = {};
    for (const [k, [a, b]] of Object.entries(base.stats)) st[k] = K.rand(a, b);
    return { uid: K.uid(), id, st };
  };
  K.addItem = (id) => {
    const inst = K.rollItem(id);
    K.state.inv.push(inst);
    return inst;
  };
  K.item = (uid) => K.state.inv.find((i) => i.uid === uid);
  K.ownerOf = (uid) => K.state.roster.find((c) => Object.values(c.equip).includes(uid));

  // Qualité du jet, de 0 à 100 %.
  K.jet = (inst) => {
    const base = K.ITEMS[inst.id];
    const ks = Object.keys(base.stats).filter((k) => base.stats[k][1] > base.stats[k][0]);
    if (!ks.length) return 100;
    return Math.round(
      (100 * K.sum(ks, (k) => (inst.st[k] - base.stats[k][0]) / (base.stats[k][1] - base.stats[k][0]))) / ks.length
    );
  };

  K.canEquip = (c, inst, slot) => {
    const base = K.ITEMS[inst.id];
    if (base.lvl > c.lvl) return { ok: false, why: `Niveau ${base.lvl} requis` };
    const slots = K.slotsForType(base.type);
    if (slot && !slots.includes(slot)) return { ok: false, why: 'Mauvais emplacement' };
    const target = slot || slots.find((s) => !c.equip[s]) || slots[0];
    for (const s of slots) {
      if (s === target || !c.equip[s]) continue;
      const other = K.item(c.equip[s]);
      if (other && other.id === inst.id && other.uid !== inst.uid)
        return { ok: false, why: 'Impossible de porter deux fois le même objet' };
    }
    return { ok: true, slot: target };
  };

  K.equip = (c, uid, slot) => {
    const inst = K.item(uid);
    if (!inst) return { ok: false, why: 'Objet introuvable' };
    const chk = K.canEquip(c, inst, slot);
    if (!chk.ok) return chk;
    const owner = K.ownerOf(uid);
    if (owner) for (const s in owner.equip) if (owner.equip[s] === uid) delete owner.equip[s];
    c.equip[chk.slot] = uid;
    K.save();
    return chk;
  };

  K.unequip = (c, slot) => {
    delete c.equip[slot];
    K.save();
  };

  // Équipement simulé (pour comparer avant d'équiper)
  K.simulateEquip = (c, inst, slot) => {
    const chk = K.canEquip(c, inst, slot);
    const eq = Object.assign({}, c.equip);
    for (const s in eq) if (eq[s] === inst.uid) delete eq[s];
    eq[chk.slot || slot || K.slotsForType(K.ITEMS[inst.id].type)[0]] = inst.uid;
    return eq;
  };

  // ─── Recyclage et forgemagie ───
  K.recycleValue = (inst) => 3 + K.ITEMS[inst.id].lvl + (inst.exo ? 25 : 0);
  K.recycle = (uid) => {
    const inst = K.item(uid);
    if (!inst || K.ownerOf(uid)) return 0;
    const v = K.recycleValue(inst);
    K.state.inv = K.state.inv.filter((i) => i.uid !== uid);
    K.state.eclats += v;
    K.save();
    return v;
  };
  // Recycle les doublons non équipés en gardant le meilleur jet de chaque objet.
  K.recycleDuplicates = () => {
    const groups = {};
    for (const i of K.state.inv) (groups[i.id] = groups[i.id] || []).push(i);
    let n = 0;
    let gain = 0;
    for (const list of Object.values(groups)) {
      if (list.length < 2) continue;
      const keep = new Set(list.filter((i) => K.ownerOf(i.uid)).map((i) => i.uid));
      const free = list.filter((i) => !keep.has(i.uid)).sort((a, b) => (b.exo ? 1 : 0) - (a.exo ? 1 : 0) || K.jet(b) - K.jet(a));
      if (!keep.size) free.shift();
      for (const i of free) {
        gain += K.recycle(i.uid);
        n++;
      }
    }
    return { n, gain };
  };

  K.rerollCost = (inst) => 5 + 2 * K.ITEMS[inst.id].lvl;
  K.reroll = (uid) => {
    const inst = K.item(uid);
    const base = K.ITEMS[inst.id];
    const cost = K.rerollCost(inst);
    if (base.relic) return { ok: false, why: 'Les reliques ont des jets fixes' };
    if (K.state.eclats < cost) return { ok: false, why: "Pas assez d'éclats" };
    K.state.eclats -= cost;
    const before = Object.assign({}, inst.st);
    for (const [k, [a, b]] of Object.entries(base.stats)) inst.st[k] = K.rand(a, b);
    if (inst.exo) inst.st[inst.exo] = 1;
    K.save();
    return { ok: true, before };
  };

  K.EXO_STATS = ['pa', 'pm', 'po'];
  K.EXO_CHANCE = 20;
  K.exoCost = (inst) => 60 + 8 * K.ITEMS[inst.id].lvl;
  K.exo = (uid, stat) => {
    const inst = K.item(uid);
    const base = K.ITEMS[inst.id];
    const cost = K.exoCost(inst);
    if (base.relic) return { ok: false, why: 'Les reliques ne peuvent pas être modifiées' };
    if (inst.exo) return { ok: false, why: 'Cet objet possède déjà un exotique' };
    if (base.stats[stat]) return { ok: false, why: 'Cet objet donne déjà cette caractéristique' };
    if (K.state.eclats < cost) return { ok: false, why: "Pas assez d'éclats" };
    K.state.eclats -= cost;
    const win = K.chance(K.EXO_CHANCE);
    if (win) {
      inst.exo = stat;
      inst.st[stat] = 1;
    }
    K.save();
    return { ok: true, win };
  };

  // ─── Progression des donjons ───
  K.zoneUnlocked = (z) => z.idx === 0 || (K.state.prog[K.ZONES[z.idx - 1].id] || 0) >= K.ZONES[z.idx - 1].rooms.length;
  K.roomUnlocked = (z, r) => K.zoneUnlocked(z) && r <= (K.state.prog[z.id] || 0);

  // ─── Récompenses de fin de combat ───
  K.mobXp = (def, lvl) => Math.floor(def.k * 12 * Math.pow(lvl, 1.35));

  K.grantRewards = (cb) => {
    const st = K.state;
    const mobs = cb.units.filter((u) => u.side === 'enemy');
    const chars = cb.units.filter((u) => u.side === 'ally').map((u) => K.charById(u.ref)).filter(Boolean);
    const baseXp = K.sum(mobs, (m) => K.mobXp(K.MONSTERS[m.ref], m.lvl));
    const ppAvg = K.sum(cb.units.filter((u) => u.side === 'ally'), (u) => u.s.pp) / Math.max(1, chars.length);
    const res = { xp: [], drops: [], eclats: 0 };
    for (const c of chars) {
      const u = cb.units.find((x) => x.ref === c.id);
      const xp = Math.floor(baseXp * (1 + (u ? u.s.sag : 0) / 100));
      const before = c.lvl;
      const ups = K.gainXp(c, xp);
      res.xp.push({ c, xp, ups, before });
    }
    for (const m of mobs) {
      for (const d of K.DROPS[m.ref] || []) {
        const p = Math.min(90, (d.p * ppAvg) / 100);
        if (K.chance(p)) res.drops.push(K.addItem(d.id));
      }
      res.eclats += Math.ceil(m.lvl / 2);
    }
    st.eclats += res.eclats;
    st.stats.wins++;
    const prog = st.prog[cb.zone.id] || 0;
    if (cb.room + 1 > prog) {
      st.prog[cb.zone.id] = cb.room + 1;
      res.firstClear = true;
      if (cb.room === cb.zone.rooms.length - 1 && cb.zone.idx < K.ZONES.length - 1) res.unlock = K.ZONES[cb.zone.idx + 1];
    }
    K.save();
    return res;
  };
})(window.K);
