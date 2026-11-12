// Composants d'interface partagés : infobulles, fenêtres, notifications, fiches d'objets et de sorts.
(function (K) {
  const esc = K.esc;
  const UI = (K.UI = {});

  // ─── Notifications ───
  UI.toast = (html, cls = '') => {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.innerHTML = html;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  };

  // ─── Fenêtre modale ───
  UI.modal = (html, opts = {}) => {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="modal-card ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      ${opts.noClose ? '' : '<button class="modal-x" data-act="closeModal" aria-label="Fermer">✕</button>'}
      ${html}</div>`;
    m.hidden = false;
    m.dataset.locked = opts.noClose ? '1' : '';
    UI.hideTip();
  };
  UI.closeModal = () => {
    const m = document.getElementById('modal');
    m.hidden = true;
    m.innerHTML = '';
  };

  // ─── Infobulles ───
  UI.tips = {};
  UI.hideTip = () => {
    const t = document.getElementById('tip');
    if (t) t.hidden = true;
  };
  UI.initTips = () => {
    const tip = document.getElementById('tip');
    let cur = null;
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-tip]');
      if (el === cur) return;
      cur = el;
      if (!el) return (tip.hidden = true);
      const [kind, ...args] = el.dataset.tip.split('|');
      const fn = UI.tips[kind];
      const html = fn && fn(...args);
      if (!html) return (tip.hidden = true);
      tip.innerHTML = html;
      tip.hidden = false;
      place(e);
    });
    document.addEventListener('mousemove', (e) => {
      if (!tip.hidden) place(e);
    });
    document.addEventListener('scroll', () => (tip.hidden = true), true);
    function place(e) {
      const r = tip.getBoundingClientRect();
      let x = e.clientX + 16;
      let y = e.clientY + 16;
      if (x + r.width > innerWidth - 8) x = Math.max(8, e.clientX - r.width - 16);
      if (y + r.height > innerHeight - 8) y = Math.max(8, innerHeight - r.height - 8);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }
  };

  // ─── Formatage ───
  UI.el = (el) => `<span class="el el-${el}">${K.ELEMENTS[el].i} ${K.ELEMENTS[el].n}</span>`;
  UI.statLine = (k, v, extra = '') => {
    const d = K.STATS[k];
    return `<div class="sline ${v < 0 ? 'neg' : ''}"><span class="si">${d.i}</span><span>${v > 0 ? '+' : ''}${v}${d.p ? ' %' : ''} ${d.n}</span>${extra}</div>`;
  };
  UI.statsBlock = (obj) => K.statLines(obj).map((l) => UI.statLine(l.k, l.v)).join('');

  // Pseudo-unité pour calculer les dommages d'un sort depuis l'écran de build.
  UI.fakeUnit = (full, c) => new K.Unit({ s: full.s, pvMax: full.pvMax, pv: full.pvMax, lvl: c.lvl, side: 'ally' });

  UI.fxText = (fx, u) => {
    const range = (a, b) => (a === b ? `${a}` : `${a}–${b}`);
    switch (fx.t) {
      case 'dmg': {
        const el = K.ELEMENTS[fx.el];
        let calc = '';
        if (u) {
          const lo = K.dmgValue(u, null, fx, fx.min, false, false);
          const hi = K.dmgValue(u, null, fx, fx.max, false, false);
          const clo = K.dmgValue(u, null, fx, K.critRoll(fx.min), true, false);
          const chi = K.dmgValue(u, null, fx, K.critRoll(fx.max), true, false);
          calc = ` <span class="calc">→ <b>${range(lo, hi)}</b> <span class="muted">(crit ${range(clo, chi)})</span></span>`;
        }
        return `<span class="el-${fx.el}">${el.i} ${range(fx.min, fx.max)} dommages ${el.n}</span>${calc}${fx.vol ? ` <span class="muted">· vole ${Math.round(fx.vol * 100)} %</span>` : ''}`;
      }
      case 'heal': {
        const calc = u ? ` <span class="calc">→ <b>${range(K.healValue(u, fx, fx.min, false), K.healValue(u, fx, fx.max, false))}</b></span>` : '';
        return `<span class="heal">✚ Soigne ${range(fx.min, fx.max)}</span>${calc}`;
      }
      case 'dot': {
        const v = u ? K.dotValues(u, fx) : null;
        return `<span class="el-${fx.el}">☠️ Poison ${K.ELEMENTS[fx.el].n} ${range(fx.min, fx.max)} × ${fx.dur} tours</span>${v ? ` <span class="calc">→ <b>${range(v.min, v.max)}</b>/tour</span>` : ''}`;
      }
      case 'shield':
        return `🛡️ Bouclier de ${fx.pct} % des PV max (${fx.dur} tours)`;
      case 'buff': {
        const d = K.STATS[fx.stat];
        const who = fx.val < 0 ? 'Malus' : 'Bonus';
        return `${fx.val < 0 ? '🔻' : '🔺'} ${who} ${fx.val > 0 ? '+' : ''}${fx.val}${d.p ? ' %' : ''} ${d.n} (${fx.dur} tour${fx.dur > 1 ? 's' : ''})`;
      }
      case 'push':
        return `↔️ Repousse de ${fx.n} case${fx.n > 1 ? 's' : ''}${fx.from === 'center' ? ' depuis le centre' : ''}`;
      case 'pull':
        return `🧲 Attire de ${fx.n} case${fx.n > 1 ? 's' : ''}${fx.to === 'center' ? ' vers le centre' : ''}`;
      case 'dash':
        return `💨 Fonce de ${fx.n} cases vers la cible`;
      case 'tp':
        return '🌀 Téléportation';
      case 'swap':
        return '🔄 Échange de place';
    }
    return '';
  };

  UI.spellMeta = (sp, u) => {
    const r = u ? { min: sp.po[0], max: Math.max(sp.po[0], sp.po[1] + (sp.mod ? u.stat('po') : 0)) } : { min: sp.po[0], max: sp.po[1] };
    const po = sp.tgt === 'self' ? 'Sur soi' : `${r.min === r.max ? r.min : r.min + '–' + r.max} PO${sp.mod ? '' : ' fixe'}`;
    const bits = [`<b class="pa">${sp.pa} PA</b>`, po];
    if (sp.line) bits.push('En ligne');
    if (sp.ldv === false) bits.push('Sans ligne de vue');
    if (sp.zone[0] !== 'single') bits.push(K.zoneLabel(sp.zone));
    if (sp.cd > 1) bits.push(`Relance ${sp.cd} tours`);
    else if (sp.cd === 1 || sp.per === 1) bits.push('1×/tour');
    else bits.push(`${sp.per}×/tour`);
    if (sp.crit && sp.fx.some((f) => f.t === 'dmg' || f.t === 'heal')) bits.push(`+${sp.crit} % crit`);
    return bits.join(' · ');
  };

  UI.modText = (m) => {
    const out = [];
    if (m.pa) out.push(`${m.pa > 0 ? '+' : ''}${m.pa} PA`);
    if (m.po) out.push(`+${m.po} PO`);
    if (m.cd) out.push(`${m.cd} tour de relance`);
    if (m.per) out.push(`+${m.per} lancer/tour`);
    if (m.dmg) out.push(`+${m.dmg} dommages`);
    return out.join(', ');
  };

  UI.spellCard = (sp, u, opts = {}) => `
    <div class="spell-card ${opts.cls || ''}">
      <div class="sc-head"><span class="sc-ico">${sp.i}</span><div><b>${esc(sp.n)}</b>${sp.lvl > 1 && !sp.isWeapon ? ` <span class="muted">niv. ${sp.lvl}</span>` : ''}
      <div class="sc-meta">${UI.spellMeta(sp, u)}</div></div></div>
      <div class="sc-fx">${sp.fx.map((f) => `<div>${UI.fxText(f, u)}</div>`).join('')}</div>
      ${sp.mod_ ? `<div class="sc-mod">✦ Modifié par panoplie : ${UI.modText(sp.mod_)}</div>` : ''}
      ${sp.desc ? `<div class="sc-desc">${esc(sp.desc)}</div>` : ''}
    </div>`;

  // ─── Objets ───
  UI.itemName = (base) => `<span class="iname ${base.relic ? 'relic' : base.set ? 'setitem' : ''}">${esc(base.n)}</span>`;

  UI.itemHTML = (inst, base, opts = {}) => {
    base = base || K.ITEMS[inst.id];
    const set = base.set && K.SETS[base.set];
    const lines = Object.entries(base.stats)
      .map(([k, [a, b]]) => {
        const v = inst ? inst.st[k] : null;
        const range = a === b ? '' : `<span class="range">[${a}–${b}]</span>`;
        if (inst) return UI.statLine(k, v, range);
        return `<div class="sline"><span class="si">${K.STATS[k].i}</span><span>${a === b ? a : `${a} à ${b}`}${K.STATS[k].p ? ' %' : ''} ${K.STATS[k].n}</span></div>`;
      })
      .join('');
    const exo = inst && inst.exo ? `<div class="sline exo"><span class="si">✦</span><span>+1 ${K.STATS[inst.exo].n} (exotique)</span></div>` : '';
    const weapon = base.w ? `<div class="i-weapon"><div class="muted small">Attaque de l'arme</div>${UI.spellCard(Object.assign({}, base.w, { n: base.n, i: base.i, desc: '' }), opts.unit)}</div>` : '';
    const owner = inst && K.ownerOf(inst.uid);
    let setHtml = '';
    if (set) {
      const have = opts.char ? K.computeStats(opts.char).sets.find((s) => s.set.id === set.id) : null;
      const n = have ? have.count : 0;
      setHtml = `<div class="i-set"><div><b>${esc(set.n)}</b> <span class="muted">(${set.pieces.length} pièces${opts.char ? `, ${n} portée${n > 1 ? 's' : ''}` : ''})</span></div>
        ${K.setTiers(set)
          .map((t) => `<div class="tier ${n >= t ? 'on' : ''}"><span class="tn">${t}</span>${setBonusText(set.bonus[t])}</div>`)
          .join('')}</div>`;
    }
    return `<div class="item-card">
      <div class="ic-head"><span class="ic-ico">${base.i}</span><div>${UI.itemName(base)}
        <div class="muted small">${K.TYPES[base.type].n} · niveau ${base.lvl}${inst && !base.relic && Object.keys(base.stats).length ? ` · jet ${K.jet(inst)} %` : ''}</div>
        ${owner ? `<div class="small owner">Équipé par ${esc(owner.name)}</div>` : ''}</div></div>
      <div class="ic-stats">${lines}${exo}${!lines && !exo ? '<div class="muted small">Aucune caractéristique</div>' : ''}</div>
      ${weapon}${opts.noSet ? '' : setHtml}
    </div>`;
  };

  const setBonusText = (b) => {
    const parts = K.statLines(b).map((l) => `<span class="${l.v < 0 ? 'neg' : ''}">${l.txt}</span>`);
    if (b.mods)
      for (const [id, m] of Object.entries(b.mods))
        parts.push(`<span class="modtxt">✦ ${esc(K.SPELLS[id].n)} : ${UI.modText(m)}</span>`);
    return `<span class="btxt">${parts.join(', ')}</span>`;
  };
  UI.setBonusText = setBonusText;

  // Différence de stats (pour comparer un objet à l'équipement actuel).
  UI.diffHTML = (a, b) => {
    const rows = [];
    if (b.pvMax !== a.pvMax) rows.push({ k: 'pv', d: b.pvMax - a.pvMax, n: 'PV max', i: '❤️' });
    for (const k of K.STAT_KEYS) {
      if (k === 'vit') continue;
      const d = (b.s[k] || 0) - (a.s[k] || 0);
      if (d) rows.push({ k, d, n: K.STATS[k].n, i: K.STATS[k].i, p: K.STATS[k].p });
    }
    const setsA = new Map(a.sets.map((s) => [s.set.id, s.cur ? s.cur.tier : 0]));
    const setsB = new Map(b.sets.map((s) => [s.set.id, s.cur ? s.cur.tier : 0]));
    const setNotes = [];
    for (const [id, t] of setsB) if (t > (setsA.get(id) || 0)) setNotes.push(`<div class="up small">▲ ${esc(K.SETS[id].n)} : palier ${t} atteint</div>`);
    for (const [id, t] of setsA) if ((setsB.get(id) || 0) < t) setNotes.push(`<div class="down small">▼ ${esc(K.SETS[id].n)} : palier ${t} perdu</div>`);
    if (!rows.length && !setNotes.length) return '<div class="muted small">Aucun changement</div>';
    return (
      rows
        .map((r) => `<div class="dline ${r.d > 0 ? 'up' : 'down'}"><span class="si">${r.i}</span>${r.d > 0 ? '+' : ''}${r.d}${r.p ? ' %' : ''} ${r.n}</div>`)
        .join('') + setNotes.join('')
    );
  };

  // ─── Infobulles prédéfinies ───
  UI.tips.item = (uid) => {
    const inst = K.item(uid);
    if (!inst) return '';
    const c = K.App && K.App.selChar();
    return UI.itemHTML(inst, null, { char: c, unit: c ? UI.fakeUnit(K.fullStats(c), c) : null });
  };
  UI.tips.base = (id) => {
    const b = K.ITEMS[id];
    if (!b) return '';
    const src = (K.SOURCES[id] || []).map((s) => `${K.MONSTERS[s.mob].i} ${esc(K.MONSTERS[s.mob].n)} (${s.p} %)`).join(', ');
    return UI.itemHTML(null, b) + (src ? `<div class="tip-src small">Butin : ${src}</div>` : '');
  };
  UI.tips.set = (id) => {
    const set = K.SETS[id];
    if (!set) return '';
    return `<div class="item-card"><b>${esc(set.n)}</b> <span class="muted small">niveau ${set.lvl}</span>
      <div class="small muted">${set.pieces.map((p) => esc(K.ITEMS[p].n)).join(' · ')}</div>
      <div class="i-set">${K.setTiers(set).map((t) => `<div class="tier"><span class="tn">${t}</span>${setBonusText(set.bonus[t])}</div>`).join('')}</div></div>`;
  };
  UI.tips.stat = (k) => {
    const d = K.STATS[k];
    const help = {
      vit: '1 point = 1 PV.',
      sag: "+1 % d'expérience gagnée par point.",
      for: '+1 % de dommages Terre par point. Compte dans l’initiative.',
      int: '+1 % de dommages Feu et de soins par point.',
      cha: '+1 % de dommages Eau par point. +1 Prospection tous les 10 points.',
      agi: '+1 % de dommages Air par point. Compte dans l’initiative.',
      pui: '+1 % de dommages dans tous les éléments par point.',
      pa: "Points d'action : servent à lancer les sorts.",
      pm: 'Points de mouvement : une case par PM.',
      po: 'Augmente la portée maximale des sorts à portée modifiable.',
      ini: "Détermine l'ordre de jeu.",
      crit: 'Chance de coup critique (+25 % de jet de base).',
      do: 'Ajouté à chaque ligne de dommages.',
      doCrit: 'Ajouté aux dommages en cas de coup critique.',
      soin: 'Ajouté à chaque soin.',
      dpou: 'Dommages infligés quand une cible poussée percute un obstacle.',
      pp: "Multiplie les chances de butin (moyenne de l'équipe).",
      renvoi: 'Renvoie des dommages à chaque coup reçu.',
      pctPoison: 'Augmente les dommages des poisons.',
    }[k];
    return d ? `<b>${d.i} ${d.n}</b>${help ? `<div class="small">${help}</div>` : ''}` : '';
  };
})(window.K);
