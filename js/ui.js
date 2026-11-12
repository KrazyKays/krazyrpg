'use strict';
/* KRAZY RPG — interface : écrans, actions du joueur, sauvegarde locale. */
(function (KR) {
  const { CLASSES, SKILLS, ZONES, RAR, SLOTS, UNIQUES, MOVES, PARAGON, STATS } = KR;
  const KEY = 'krazyrpg_save_v1';
  const app = document.querySelector('#app'), modalEl = document.querySelector('#modal');
  KR.delay = (fn, ms) => setTimeout(fn, ms);

  let S = null;          // sauvegarde
  let tab = 'aventure';  // onglet du camp
  let C = null;          // combat en cours
  let ctx = null;        // { type:'stage', z, s } | { type:'faille', f }
  let enc = null;        // rencontre en cours
  let target = 0, busy = false, failleSel = 1;

  /* ---------- Sauvegarde ---------- */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } };
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.cls && CLASSES[s.cls] ? s : null; } catch (e) { return null; } };

  /* ---------- Petits utilitaires d'affichage ---------- */
  const bar = (v, max, cls) => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i><span>${Math.round(v)} / ${Math.round(max)}</span></div>`;
  const modLines = mods => Object.keys(mods).map(k => `<li>${KR.modLabel(k, mods[k])}</li>`).join('');
  const STN = { saignement: '🩸', cauchemar: '🕸️', poison: '☠️', etourdi: '💫', fragile: '💔', affaibli: '📉', rage: '🔥', esquive: '💨', garde: '🛡️' };
  const STT = { saignement: 'Saignement', cauchemar: 'Cauchemar', poison: 'Poison', etourdi: 'Étourdi', fragile: 'Fragile', affaibli: 'Affaibli', rage: 'Rage', esquive: 'Feinte', garde: 'Garde' };
  const stIcons = u => u.st.map(x => `<span class="st" title="${STT[x.k]}">${STN[x.k]}${x.k === 'etourdi' ? '' : x.turns}</span>`).join('');
  const findItem = id => {
    id = +id;
    for (const sl in S.equip) if (S.equip[sl] && S.equip[sl].id === id) return { it: S.equip[sl], where: 'equip' };
    let it = S.inv.find(x => x.id === id); if (it) return { it, where: 'inv' };
    it = S.shop.find(x => x.id === id); if (it) return { it, where: 'shop' };
    return null;
  };
  const itemBtn = it => `<button class="item r${it.rar}" data-act="item" data-id="${it.id}">
    <span class="iic">${SLOTS[it.slot].ic}</span><b>${it.name}${it.up ? ' +' + it.up : ''}</b>
    <small>${RAR[it.rar].n} · niv. ${it.ilvl}</small></button>`;

  function modal(html) { modalEl.innerHTML = `<div class="mbox">${html}</div>`; modalEl.hidden = false; }
  function closeModal() { modalEl.hidden = true; modalEl.innerHTML = ''; }

  /* ================= Écran titre ================= */
  function renderTitle() {
    document.body.className = '';
    app.innerHTML = `<div class="title">
      <h1 class="logo">KRAZY<span>RPG</span></h1>
      <p class="sub">Le Miroir Brisé</p>
      <p class="lore">Le Grand Miroir qui reflétait la raison du monde s'est brisé. Depuis, la réalité se fissure et le
        <b>Délire</b> gagne tout… y compris toi. Apprends à danser avec ta propre folie pour recoller les morceaux.</p>
      <h2>Choisis ta voie</h2>
      <div class="classes">${Object.keys(CLASSES).map(k => {
        const c = CLASSES[k];
        return `<button class="class" data-act="newgame" data-cls="${k}">
          <span class="cic">${c.ic}</span><b>${c.name}</b><em>${c.tag}</em><p>${c.pitch}</p>
          <small>Stat principale : ${STATS[c.main]}</small></button>`;
      }).join('')}</div>
      <p class="foot">Sauvegarde automatique dans ton navigateur.</p></div>`;
  }

  /* ================= Camp ================= */
  function render() {
    if (!S) return renderTitle();
    if (C) return renderCombat();
    document.body.className = '';
    const H = KR.computeHero(S), c = CLASSES[S.cls], pts = KR.talentPoints(S);
    const fu = KR.failleUnlocked(S);
    const tabs = [['aventure', '🗺️ Aventure'], ['heros', '🎒 Héros'], ['talents', `🌳 Talents${pts > 0 ? ` <i class="pip">${pts}</i>` : ''}`], ['atelier', '⚒️ Atelier']];
    if (fu) tabs.push(['faille', '🕳️ Faille']);
    tabs.push(['options', '⚙️']);
    const xpMax = KR.xpNeed(S.lvl);
    app.innerHTML = `<header class="top">
        <div class="who"><span class="cic">${c.ic}</span><div><b>${c.name}</b><small>Niveau ${S.lvl}${S.lvl >= KR.MAX_LVL ? ' (max)' : ''}</small></div></div>
        <div class="xp">${bar(S.xp, xpMax, 'xpb')}</div>
        <div class="cur"><span title="Boutons (monnaie)">🔘 ${S.gold}</span>${fu ? `<span title="Fragments de miroir">💠 ${S.frag}</span>` : ''}</div>
      </header>
      <nav class="tabs">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('')}</nav>
      <main>${({ aventure: vAventure, heros: vHeros, talents: vTalents, atelier: vAtelier, faille: vFaille, options: vOptions })[tab](H)}</main>`;
  }

  function vAventure() {
    return `<p class="hint">Chaque zone compte 5 étapes et un boss 👑. Tes PV sont restaurés entre les combats, et perdre ne coûte rien : reviens plus fort.</p>` +
      ZONES.map((Z, z) => {
        const open = z === 0 || S.prog[z - 1] >= 6, p = S.prog[z];
        return `<section class="zone ${open ? '' : 'locked'}">
          <h3>${Z.ic} ${Z.name} <small>niv. ${Z.lvl}–${Z.lvl + 5}</small>${p >= 6 ? ' <span class="done">✔ terminée</span>' : ''}</h3>
          <p>${open ? Z.desc : '🔒 Termine la zone précédente pour y accéder.'}</p>
          ${open ? `<div class="stages">${[0, 1, 2, 3, 4, 5].map(s =>
            `<button class="stage ${s < p ? 'ok' : ''} ${s === p ? 'next' : ''}" ${s <= p ? '' : 'disabled'} data-act="stage" data-z="${z}" data-s="${s}">${s === 5 ? '👑' : s + 1}</button>`).join('')}</div>` : ''}
        </section>`;
      }).join('') +
      (KR.failleUnlocked(S) ? `<section class="zone"><h3>🕳️ La Faille Sans Fond</h3><p>Le Miroir est recollé… mais derrière lui, quelque chose descend sans fin. <button class="lnk" data-act="tab" data-tab="faille">Y descendre →</button></p></section>` : '');
  }

  function vHeros(H) {
    const st = [['for', '💪'], ['esp', '🔮'], ['vig', '❤️'], ['agi', '🪶']].map(([k, ic]) =>
      `<div class="stat ${H.main === k ? 'main' : ''}"><span>${ic} ${STATS[k]}</span><b>${H[k]}</b></div>`).join('');
    const der = `<div class="stat"><span>PV max</span><b>${H.maxHp}</b></div><div class="stat"><span>Armure</span><b>${H.armure}</b></div>
      <div class="stat"><span>Critique</span><b>${H.crit}%</b></div><div class="stat"><span>Esquive</span><b>${H.esquive}%</b></div>`;
    const eq = Object.keys(SLOTS).map(sl => S.equip[sl] ? itemBtn(S.equip[sl]) :
      `<div class="item empty"><span class="iic">${SLOTS[sl].ic}</span><b>${SLOTS[sl].n}</b><small>vide</small></div>`).join('');
    let par = '';
    if (S.lvl >= KR.MAX_LVL) {
      par = `<section><h3>✨ Éclats de lucidité <small>${S.par.pts} à dépenser — progression sans limite</small></h3><div class="grid4">${Object.keys(PARAGON).map(k => {
        const p = PARAGON[k];
        return `<button class="node" ${S.par.pts > 0 ? '' : 'disabled'} data-act="paragon" data-k="${k}"><b>${p.ic} ${p.n}</b><small>Rang ${S.par[k]}</small><p>${Object.keys(p.mods).map(m => KR.modLabel(m, p.mods[m])).join(', ')} par rang</p></button>`;
      }).join('')}</div></section>`;
    }
    return `<section><h3>Caractéristiques</h3><div class="grid4">${st}${der}</div>
        <p class="hint">La stat principale (en surbrillance) alimente tes dégâts. Vigueur = PV et armure. Agilité = critique et esquive.</p></section>
      <section><h3>Équipement</h3><div class="grid4">${eq}</div></section>${par}
      <section><h3>Sac <small>${S.inv.length} / ${KR.INV_MAX}</small>
        ${S.inv.some(i => i.rar === 0) ? '<button class="lnk" data-act="sellcommons">Vendre tous les objets communs</button>' : ''}</h3>
        <div class="grid4">${S.inv.map(itemBtn).join('') || '<p class="hint">Ton sac est vide. Les ennemis laissent tomber des objets.</p>'}</div></section>`;
  }

  function vTalents(H) {
    const c = CLASSES[S.cls], pts = KR.talentPoints(S), known = KR.knownSkills(S);
    const skCard = id => {
      const sk = SKILLS[id], on = S.loadout.includes(id);
      return `<button class="skill ${on ? 'on' : ''}" data-act="loadout" data-id="${id}">
        <b>${sk.ic} ${sk.name}</b><small>${on ? '✔ équipée' : 'en réserve'} · recharge ${sk.cd} · Délire ${sk.del > 0 ? '+' : ''}${sk.del}</small>
        <p>${KR.descFx(sk.fx, H.main)}</p>
        ${sk.krazy ? `<p class="kz">🌀 ${sk.krazy.name} : ${KR.descFx(sk.krazy.fx, H.main)}</p>` : ''}</button>`;
    };
    const tree = c.tree.map((br, b) => `<div class="branch"><h4>${br.ic} ${br.name}</h4><small>${br.desc}</small>${br.nodes.map((nd, n) => {
      const id = KR.nodeId(S.cls, b, n), r = S.talents[id] || 0, max = nd.p ? nd.max : 1;
      const prereq = n === 0 || S.talents[KR.nodeId(S.cls, b, n - 1)] > 0;
      const can = pts > 0 && r < max && prereq;
      let body;
      if (nd.p) body = `<b>${nd.p}</b><small>Rang ${r} / ${max}</small><p>${Object.keys(nd.mods).map(k => KR.modLabel(k, nd.mods[k])).join(', ')} par rang</p>`;
      else { const sk = SKILLS[nd.s]; body = `<b>${sk.ic} ${sk.name}</b><small>${r ? 'Technique apprise' : 'Nouvelle technique'}</small><p>${KR.descFx(sk.fx, H.main)}</p>`; }
      return `<button class="node ${r ? 'got' : ''} ${r >= max ? 'max' : ''} ${prereq ? '' : 'locked'}" ${can ? '' : 'disabled'} data-act="talent" data-id="${id}">${body}</button>`;
    }).join('<span class="link">▼</span>')}</div>`).join('');
    return `<section><h3>Techniques équipées <small>${S.loadout.length} / 4 — clique pour équiper ou retirer</small></h3>
        <div class="grid2">${known.map(skCard).join('')}</div>
        <p class="hint">Frappe et Se recentrer sont toujours disponibles. La ligne 🌀 montre la version transformée en état Krazy.</p></section>
      <section><h3>Arbre de talents <small>${pts} point${pts > 1 ? 's' : ''} disponible${pts > 1 ? 's' : ''} (1 par niveau)</small>
        <button class="lnk" data-act="respec">Réinitialiser (gratuit)</button></h3>
        <div class="tree">${tree}</div></section>`;
  }

  function vAtelier() {
    return `<section><h3>🧵 La Mercière <small>l'étal change après chaque victoire</small></h3>
        <div class="grid4">${S.shop.map(it => itemBtn(it).replace('</small>', ` · 🔘 ${KR.itemPrice(it)}</small>`)).join('') || '<p class="hint">Tout est vendu !</p>'}</div></section>
      <section><h3>⚒️ Forge</h3><p class="hint">Clique sur un objet (équipé ou dans ton sac, onglet Héros) pour l'<b>améliorer</b> jusqu'à +${KR.MAX_UP} avec des boutons 🔘 : chaque rang ajoute 8% à ses bonus.
        ${KR.failleUnlocked(S) ? ' Avec des fragments 💠 de la Faille, tu peux aussi le <b>refléter</b> : ses bonus sont retirés au hasard.' : ''}</p></section>`;
  }

  function vFaille() {
    const max = S.faille + 1; failleSel = Math.max(1, Math.min(failleSel, max));
    const e = KR.buildFaille(failleSel);
    return `<section class="zone"><h3>🕳️ La Faille Sans Fond <small>record : étage ${S.faille}</small></h3>
      <p>Des étages sans fin, de plus en plus déformés. Chaque étage impose une <b>Distorsion</b>. Tous les 5 étages, un boss.
        On y trouve des fragments 💠, des objets au-delà du niveau 30 et, à partir de l'étage 10, des objets <b class="t4">Mythiques</b>.</p>
      <div class="fsel"><button data-act="fsel" data-d="-1" ${failleSel > 1 ? '' : 'disabled'}>◀</button>
        <b>Étage ${failleSel}${failleSel % 5 === 0 ? ' 👑' : ''}</b>
        <button data-act="fsel" data-d="1" ${failleSel < max ? '' : 'disabled'}>▶</button></div>
      <p class="dist">Distorsion — <b>${e.dist.n}</b> : ${e.dist.d}</p>
      <button class="big" data-act="faille">Descendre</button></section>`;
  }

  function vOptions() {
    return `<section><h3>Aide</h3><button class="big2" data-act="help">Comment jouer ?</button></section>
      <section><h3>Sauvegarde</h3><p class="hint">Ta partie est enregistrée dans ce navigateur. Exporte-la pour la transférer ou la mettre à l'abri.</p>
        <textarea id="imp" placeholder="Colle ici une sauvegarde exportée…"></textarea>
        <div class="row"><button data-act="export">Exporter</button><button data-act="import">Importer</button><button class="danger" data-act="reset">Tout effacer</button></div></section>`;
  }

  /* ================= Combat ================= */
  const STATE_TXT = {
    lucide: '🧊 <b>Lucide</b> — tu subis moins de dégâts (−15%)',
    fele: '⚡ <b>Fêlé</b> — tu infliges +20% de dégâts',
    krazy: '🌀 <b>KRAZY</b> — +50% de dégâts et techniques transformées, mais tu subis +25%'
  };

  function renderCombat() {
    const h = C.hero, H = C.H, state = KR.dState(C), K = H.krazyAt;
    document.body.className = 'in-combat s-' + state;
    if (!C.foes[target] || C.foes[target].hp <= 0) target = C.foes.findIndex(f => f.hp > 0);
    const foes = C.foes.map((f, i) => f.hp <= 0 ? `<div class="foe dead" data-u="${i}"><span class="fic">💨</span><b>${f.n}</b></div>` :
      `<button class="foe ${i === target ? 'sel' : ''} ${f.boss ? 'boss' : ''}" data-act="target" data-i="${i}" data-u="${i}">
        <span class="intent" title="Prochaine action">${f.st.some(x => x.k === 'etourdi') ? '💫 Étourdi' : MOVES[f.intent].ic + ' ' + MOVES[f.intent].n}</span>
        <span class="fic">${f.ic}</span><b>${f.n}</b><small>niv. ${f.lvl}${f.shield > 0 ? ` · 🛡️ ${f.shield}` : ''}</small>
        ${bar(f.hp, f.maxHp, 'hp')}<div class="sts">${stIcons(f)}</div></button>`).join('');
    const btn = id => {
      const v = KR.skillView(C, id), cd = h.cds[id] || 0;
      return `<button class="act ${v.krazy ? 'kz' : ''}" ${cd > 0 || busy ? 'disabled' : ''} data-act="skill" data-id="${id}">
        <b>${v.ic} ${v.name}</b>
        <span class="chips">${v.del ? `<i class="${v.del > 0 ? 'up' : 'down'}">Délire ${v.del > 0 ? '+' : ''}${v.del}</i>` : ''}${cd > 0 ? `<i class="cd">⏳ ${cd}</i>` : ''}</span>
        <small>${KR.descFx(v.fx, H.main)}</small></button>`;
    };
    const acts = h.stun ? `<button class="act wide" ${busy ? 'disabled' : ''} data-act="skill" data-id="skip"><b>😵 Reprendre ses esprits</b><small>La Rupture t'a sonné : tu passes ce tour.</small></button>`
      : ['frappe', 'recentrer'].concat(S.loadout).map(btn).join('');
    const title = ctx.type === 'faille' ? `🕳️ Faille — étage ${ctx.f} · ${enc.dist.n}` : `${ZONES[ctx.z].ic} ${ZONES[ctx.z].name} — ${ctx.s === 5 ? 'Boss' : 'étape ' + (ctx.s + 1)}`;
    app.innerHTML = `<div class="combat">
      <div class="chead"><b>${title}</b><span>Tour ${C.round}</span><button class="lnk" data-act="flee">Fuir</button></div>
      ${S.wins < 3 ? '<p class="hint tip">💡 Clique un ennemi pour le cibler. L\'étiquette au-dessus de lui annonce sa prochaine action : face à un 💥 Coup lourd, pense à <b>Se recentrer</b>.</p>' : ''}
      <div class="foes">${foes}</div>
      <div class="log">${C.log.slice(-5).map(l => `<div>${l}</div>`).join('')}</div>
      <div class="hero" data-u="h">
        <div class="hrow"><span class="cic">${CLASSES[S.cls].ic}</span><div class="hbars">${bar(h.hp, h.maxHp, 'hp')}
          <div class="sts">${h.shield > 0 ? `<span class="st">🛡️${h.shield}</span>` : ''}${stIcons(h)}</div></div></div>
        <div class="delire" title="Jauge de Délire"><div class="dz l" style="width:34%"></div><div class="dz f" style="width:${K - 34}%"></div><div class="dz k" style="width:${100 - K}%"></div>
          <div class="dmark" style="left:${h.delire}%"></div><span>Délire ${h.delire} / 100</span></div>
        <p class="state">${STATE_TXT[state]}${h.delire >= 85 ? ' — <b class="warn">⚠️ Rupture à 100 !</b>' : ''}</p>
      </div>
      <div class="acts">${acts}</div></div>`;
    const evs = C.ev; C.ev = [];
    evs.forEach((e, i) => {
      const el = document.querySelector(`[data-u="${e.tgt}"]`); if (!el) return;
      const s = document.createElement('span'); s.className = 'floater ' + e.cls; s.textContent = e.txt;
      s.style.animationDelay = i * 90 + 'ms'; s.style.left = 30 + (i * 37) % 45 + '%';
      el.appendChild(s);
    });
  }

  function startFight(c, e) {
    ctx = c; enc = e; target = 0; busy = false;
    C = KR.startCombat(KR.computeHero(S), enc);
    render();
  }

  function doSkill(id) {
    if (!C || busy || C.over) return;
    KR.heroAct(C, id, target);
    busy = true; render();
    KR.delay(() => {
      if (!C) return;
      if (!C.over) KR.enemiesAct(C);
      busy = false; render();
      if (C.over) KR.delay(finish, 500);
    }, C.over ? 300 : 650);
  }

  function gainXp(xp) {
    const ups = [];
    S.xp += xp;
    while (S.xp >= KR.xpNeed(S.lvl)) {
      S.xp -= KR.xpNeed(S.lvl);
      if (S.lvl < KR.MAX_LVL) { S.lvl++; ups.push(`🎉 Niveau ${S.lvl} ! +1 point de talent.`); }
      else { S.par.pts++; ups.push('✨ +1 Éclat de lucidité (onglet Héros).'); }
    }
    return ups;
  }

  function finish() {
    if (!C) return;
    const won = C.over === 'win', foes = C.foes, c = ctx;
    C = null;
    if (!won) {
      render();
      return modal(`<h2>💫 Tu t'effondres…</h2><p>…et te réveilles au camp, indemne. Rien n'est perdu.</p>
        <p class="hint">Astuces : dépense tes points de talent, améliore ton équipement à la forge, surveille les intentions ennemies et utilise <b>Se recentrer</b> avant les gros coups.</p>
        <div class="row"><button data-act="close">Retour au camp</button><button data-act="retry">Réessayer</button></div>`);
    }
    const H = KR.computeHero(S);
    let xp = 0, gold = 0; const lines = [], items = [];
    foes.forEach(f => { const b = f.boss ? 5 : 1; xp += (10 + 6 * f.lvl) * b; gold += (3 + 2 * f.lvl) * b * (0.8 + Math.random() * 0.4); });
    const boss = foes.some(f => f.boss), lvl = foes[0].lvl;
    let next = null;
    if (c.type === 'stage') {
      if (S.prog[c.z] === c.s) {
        S.prog[c.z]++; xp *= 2; lines.push('⭐ Première victoire : expérience doublée !');
        if (c.s === 5) lines.push(c.z === ZONES.length - 1 ? '🪞 Le Grand Miroir est recollé ! Mais une <b>Faille Sans Fond</b> s\'ouvre derrière lui… (nouvel onglet)' : `🗺️ Nouvelle zone : ${ZONES[c.z + 1].name} !`);
      }
      if (c.s < 5) next = { act: 'stage', z: c.z, s: c.s + 1, n: 'Étape suivante' };
      if (Math.random() < (boss ? 1 : 0.55)) items.push(KR.genItem(S, lvl, KR.rollRarity(boss ? 0.5 : 0.05)));
      if (boss && Math.random() < 0.5) items.push(KR.genItem(S, lvl, KR.rollRarity(0.3)));
    } else {
      const f = c.f, fr = Math.ceil(f / 2) + (boss ? 5 : 0);
      S.frag += fr; lines.push(`💠 +${fr} fragments de miroir`);
      if (f > S.faille) { S.faille = f; lines.push(`🏆 Nouveau record : étage ${f} !`); }
      failleSel = f + 1; next = { act: 'faillenext', z: 0, s: 0, n: 'Étage suivant' };
      const myth = f >= 10 ? Math.min(15, (f - 5) / 2) : 0;
      items.push(KR.genItem(S, 30 + f / 2, KR.rollRarity(Math.min(1, 0.3 + f / 40) + (boss ? 0.3 : 0), myth * (boss ? 2 : 1))));
    }
    gold = Math.round(gold * (1 + (H.m.pGold || 0) / 100)); xp = Math.round(xp);
    S.gold += gold; S.wins++;
    const ups = gainXp(xp);
    items.forEach(it => {
      if (S.inv.length < KR.INV_MAX) S.inv.push(it);
      else { S.gold += KR.sellPrice(it); it.sold = true; }
    });
    KR.refreshShop(S); save(); render();
    modal(`<h2>🏅 Victoire !</h2><p>+${xp} expérience · +${gold} 🔘</p>
      ${lines.concat(ups).map(l => `<p>${l}</p>`).join('')}
      ${items.length ? `<div class="grid2">${items.map(it => it.sold ? `<p class="hint">Sac plein : ${it.name} vendu.</p>` : itemBtn(it)).join('')}</div>` : ''}
      <div class="row"><button data-act="close">Retour au camp</button>${next ? `<button class="pri" data-act="${next.act}" data-z="${next.z}" data-s="${next.s}">${next.n} →</button>` : ''}</div>`);
  }

  /* ================= Fenêtres ================= */
  function itemModal(id) {
    const f = findItem(id); if (!f) return;
    const { it, where } = f, eq = S.equip[it.slot];
    const mods = Object.assign({}, KR.itemMods(it));
    const uniq = it.u != null ? UNIQUES[it.u].mods : null;
    if (uniq) for (const k in uniq) delete mods[k];
    let btns = '';
    if (where === 'shop') btns = `<button class="pri" ${S.gold >= KR.itemPrice(it) ? '' : 'disabled'} data-act="buy" data-id="${it.id}">Acheter — 🔘 ${KR.itemPrice(it)}</button>`;
    else {
      btns = where === 'inv' ? `<button class="pri" data-act="equip" data-id="${it.id}">Équiper</button>` : `<button data-act="unequip" data-id="${it.id}">Retirer</button>`;
      if (it.up < KR.MAX_UP) btns += `<button ${S.gold >= KR.upCost(it) ? '' : 'disabled'} data-act="upgrade" data-id="${it.id}">Améliorer — 🔘 ${KR.upCost(it)}</button>`;
      if (KR.failleUnlocked(S)) btns += `<button ${S.frag >= KR.reflectCost(it) ? '' : 'disabled'} data-act="reflect" data-id="${it.id}">Refléter — 💠 ${KR.reflectCost(it)}</button>`;
      if (where === 'inv') btns += `<button class="danger" data-act="sell" data-id="${it.id}">Vendre — 🔘 ${KR.sellPrice(it)}</button>`;
    }
    modal(`<h2 class="t${it.rar}">${SLOTS[it.slot].ic} ${it.name}${it.up ? ' +' + it.up : ''}</h2>
      <small>${RAR[it.rar].n} · ${SLOTS[it.slot].n} · niveau ${it.ilvl}</small>
      <ul class="mods">${modLines(mods)}</ul>
      ${uniq ? `<ul class="mods uniq">${modLines(uniq)}</ul>` : ''}
      ${eq && eq !== it ? `<div class="cmp"><small>Actuellement équipé : <b class="t${eq.rar}">${eq.name}${eq.up ? ' +' + eq.up : ''}</b></small><ul class="mods">${modLines(KR.itemMods(eq))}</ul></div>` : ''}
      <div class="row">${btns}<button data-act="close">Fermer</button></div>`);
  }

  function helpModal() {
    modal(`<h2>Comment jouer</h2>
      <p><b>Le combat</b> se joue au tour par tour : tu agis, puis les ennemis exécutent l'action qu'ils avaient <b>annoncée</b> au-dessus de leur tête.</p>
      <p><b>Le Délire</b> est le cœur du jeu. Presque toutes tes techniques le font monter :</p>
      <ul class="mods"><li>🧊 <b>Lucide</b> (0–33) : tu encaisses mieux.</li><li>⚡ <b>Fêlé</b> (34–66) : tu frappes plus fort.</li>
        <li>🌀 <b>Krazy</b> (67+) : dégâts énormes, tes techniques se <b>transforment</b>… mais tu es fragile.</li>
        <li>💔 À 100, c'est la <b>Rupture</b> : tu perds 20% de tes PV et ton prochain tour.</li></ul>
      <p><b>Se recentrer</b> fait redescendre le Délire et réduit de moitié les dégâts du tour. Pour débuter, reste entre Lucide et Fêlé ; plus tard, apprends à surfer sur le Krazy.</p>
      <p><b>Progression</b> : chaque niveau donne 1 point de talent (réinitialisation gratuite). Les objets se trouvent, s'achètent et s'améliorent à la forge.</p>
      <div class="row"><button class="pri" data-act="close">Compris !</button></div>`);
  }

  /* ================= Actions ================= */
  function act(a, d) {
    switch (a) {
      case 'newgame': S = KR.newSave(d.cls); tab = 'aventure'; save(); render(); helpModal(); return;
      case 'tab': tab = d.tab; break;
      case 'close': closeModal(); return;
      case 'help': return helpModal();
      case 'stage': closeModal(); if (+d.s > S.prog[+d.z]) return; return startFight({ type: 'stage', z: +d.z, s: +d.s }, KR.buildStage(+d.z, +d.s));
      case 'fsel': failleSel += +d.d; break;
      case 'faille': case 'faillenext': closeModal(); failleSel = Math.max(1, Math.min(failleSel, S.faille + 1)); return startFight({ type: 'faille', f: failleSel }, KR.buildFaille(failleSel));
      case 'retry': closeModal(); return ctx.type === 'stage' ? act('stage', ctx) : act('faille', {});
      case 'target': target = +d.i; break;
      case 'skill': return doSkill(d.id);
      case 'flee': C = null; break;
      case 'item': return itemModal(d.id);
      case 'equip': { const f = findItem(d.id); if (!f || f.where !== 'inv') return; const it = f.it, old = S.equip[it.slot];
        S.inv = S.inv.filter(x => x !== it); if (old) S.inv.push(old); S.equip[it.slot] = it; closeModal(); break; }
      case 'unequip': { const f = findItem(d.id); if (!f || f.where !== 'equip' || S.inv.length >= KR.INV_MAX) return;
        S.equip[f.it.slot] = null; S.inv.push(f.it); closeModal(); break; }
      case 'sell': { const f = findItem(d.id); if (!f || f.where !== 'inv') return; S.inv = S.inv.filter(x => x !== f.it); S.gold += KR.sellPrice(f.it); closeModal(); break; }
      case 'sellcommons': S.inv.filter(i => i.rar === 0).forEach(i => { S.gold += KR.sellPrice(i); }); S.inv = S.inv.filter(i => i.rar !== 0); break;
      case 'buy': { const f = findItem(d.id); if (!f || f.where !== 'shop' || S.gold < KR.itemPrice(f.it) || S.inv.length >= KR.INV_MAX) return;
        S.gold -= KR.itemPrice(f.it); S.shop = S.shop.filter(x => x !== f.it); S.inv.push(f.it); closeModal(); break; }
      case 'upgrade': { const f = findItem(d.id); if (!f || f.where === 'shop' || f.it.up >= KR.MAX_UP || S.gold < KR.upCost(f.it)) return;
        S.gold -= KR.upCost(f.it); f.it.up++; save(); render(); return itemModal(d.id); }
      case 'reflect': { const f = findItem(d.id); if (!f || f.where === 'shop' || S.frag < KR.reflectCost(f.it)) return;
        S.frag -= KR.reflectCost(f.it); KR.rerollItem(S, f.it); save(); render(); return itemModal(d.id); }
      case 'talent': { const [, b, n] = d.id.split('_').map(Number), nd = CLASSES[S.cls].tree[b].nodes[n], r = S.talents[d.id] || 0;
        if (KR.talentPoints(S) < 1 || r >= (nd.p ? nd.max : 1) || (n > 0 && !S.talents[KR.nodeId(S.cls, b, n - 1)])) return;
        S.talents[d.id] = r + 1; if (nd.s && S.loadout.length < 4) S.loadout.push(nd.s); break; }
      case 'respec': S.talents = {}; S.loadout = CLASSES[S.cls].start.slice(); break;
      case 'loadout': { const i = S.loadout.indexOf(d.id); if (i >= 0) S.loadout.splice(i, 1); else if (S.loadout.length < 4 && KR.knownSkills(S).includes(d.id)) S.loadout.push(d.id); else return; break; }
      case 'paragon': if (S.par.pts < 1 || !PARAGON[d.k]) return; S.par.pts--; S.par[d.k]++; break;
      case 'export': { const t = document.querySelector('#imp'); if (t) { t.value = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); t.select(); } return; }
      case 'import': { const t = document.querySelector('#imp');
        try { const s = JSON.parse(decodeURIComponent(escape(atob(t.value.trim())))); if (!s.cls || !CLASSES[s.cls]) throw 0; S = s; tab = 'aventure'; }
        catch (e) { return modal('<h2>Import impossible</h2><p>Ce texte n\'est pas une sauvegarde valide.</p><div class="row"><button data-act="close">Fermer</button></div>'); }
        break; }
      case 'reset': return modal('<h2>Tout effacer ?</h2><p>Ta partie sera définitivement supprimée.</p><div class="row"><button data-act="close">Annuler</button><button class="danger" data-act="reset2">Effacer</button></div>');
      case 'reset2': closeModal(); S = null; C = null; try { localStorage.removeItem(KEY); } catch (e) { /* rien */ } return render();
      default: return;
    }
    save(); render();
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled) act(el.dataset.act, el.dataset);
    else if (e.target === modalEl) closeModal();
  });

  KR.ui = { act, state: () => ({ S, C, tab, busy }) };
  S = load();
  render();
})(globalThis.KR);
