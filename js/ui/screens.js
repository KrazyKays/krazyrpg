// Écrans hors combat : équipe, build, donjons, forge, codex.
(function (K) {
  const esc = K.esc;
  const UI = K.UI;

  const App = (K.App = {
    screen: 'equipe',
    selId: null,
    buildTab: 'equip',
    invType: 'all',
    invUsable: false,
    zoneSel: null,
    forgeSel: null,
    codexTab: 'sets',
    recruitCls: null,

    selChar() {
      return K.charById(this.selId) || K.state.roster[0] || null;
    },

    go(screen) {
      UI.closeModal();
      this.screen = screen;
      this.render();
      window.scrollTo(0, 0);
    },

    render() {
      UI.hideTip();
      const app = document.getElementById('app');
      if (this.screen === 'combat') return;
      const nav = [
        ['equipe', '👥', 'Équipe'],
        ['build', '🧩', 'Build'],
        ['donjons', '🗺️', 'Donjons'],
        ['forge', '⚒️', 'Forge'],
        ['codex', '📖', 'Codex'],
      ];
      app.innerHTML = `
        <header class="top">
          <div class="brand">KRAZY<span>RPG</span></div>
          <nav>${nav.map(([id, i, n]) => `<button class="nav ${this.screen === id ? 'on' : ''}" data-act="go" data-s="${id}"><span>${i}</span>${n}</button>`).join('')}</nav>
          <div class="wallet" data-tip="stat|eclats">💠 <b>${K.state.eclats}</b> éclats</div>
        </header>
        <main id="main" class="screen-${this.screen}">${Screens[this.screen]()}</main>`;
    },
  });
  UI.tips.stat = ((orig) => (k) => (k === 'eclats' ? '<b>💠 Éclats</b><div class="small">Obtenus en combat et en recyclant des objets. Servent à la forgemagie.</div>' : orig(k)))(UI.tips.stat);

  // ─── Cartes réutilisables ───
  const charCard = (c, opts = {}) => {
    const cls = K.CLASSES[c.cls];
    const full = K.fullStats(c);
    const el = K.mainElement(full.s);
    const inTeam = K.state.team.includes(c.id);
    const xpPct = c.lvl >= K.MAX_LVL ? 100 : Math.floor((100 * c.xp) / K.xpNext(c.lvl));
    return `<div class="ccard ${inTeam ? 'inteam' : ''}">
      <div class="cc-top"><span class="cc-ico">${cls.i}</span>
        <div class="cc-id"><b>${esc(c.name)}</b><div class="muted small">${cls.n} · niv. ${c.lvl}</div></div>
        ${el ? `<span class="badge el-${el}" title="Élément dominant">${K.ELEMENTS[el].i}</span>` : ''}</div>
      <div class="xpbar" title="${c.xp} / ${K.xpNext(c.lvl)} XP"><i style="width:${xpPct}%"></i></div>
      <div class="cc-stats"><span>❤️ ${full.pvMax}</span><span>⭐ ${full.s.pa}</span><span>👟 ${full.s.pm}</span><span>🎯 ${full.s.po}</span>${K.ptsFree(c) ? `<span class="hint">+${K.ptsFree(c)} pts</span>` : ''}</div>
      <div class="cc-act">
        <button class="btn sm" data-act="openBuild" data-id="${c.id}">🧩 Build</button>
        ${opts.team ? `<button class="btn sm ghost" data-act="teamToggle" data-id="${c.id}">Retirer</button>` : `<button class="btn sm ${inTeam ? 'ghost' : ''}" data-act="teamToggle" data-id="${c.id}">${inTeam ? 'Retirer' : 'Dans l’équipe'}</button>`}
        ${opts.team ? '' : `<button class="btn sm danger ghost" data-act="dismiss" data-id="${c.id}" title="Renvoyer">✕</button>`}
      </div></div>`;
  };

  const synergyPanel = () => {
    const team = K.teamChars();
    const { list } = K.computeSynergies(team);
    return `<div class="syn-list">${list
      .map(({ syn, count, tier }) => {
        const tiers = Object.keys(syn.tiers).map(Number);
        return `<div class="syn ${tier ? 'on' : ''}">
          <div class="syn-h"><span class="syn-i">${syn.i}</span><b>${syn.n}</b><span class="syn-c">${count}/${Math.max(...tiers)}</span></div>
          <div class="small muted">${syn.need}</div>
          ${tiers.map((t) => `<div class="tier ${tier && t <= tier ? 'on' : ''}"><span class="tn">${t}</span>${UI.setBonusText(syn.tiers[t])}</div>`).join('')}
        </div>`;
      })
      .join('')}</div>`;
  };

  // ─── Écrans ───
  const Screens = {
    equipe() {
      const st = K.state;
      const team = K.teamChars();
      if (!st.roster.length)
        return `<section class="hero">
          <h1>Bienvenue dans KRAZY RPG</h1>
          <p>Recrute une équipe de trois aventuriers, monte leurs <b>builds</b> en combinant les <b>panoplies</b> et leurs bonus,
          choisis leurs <b>sorts</b>, puis mets tout ça à l'épreuve dans des <b>combats tactiques</b> sur grille.</p>
          <ul class="hero-list">
            <li>🧩 Chaque objet a des jets aléatoires : farme pour le jet parfait.</li>
            <li>🔗 Les panoplies donnent des bonus croissants, et parfois modifient tes sorts.</li>
            <li>🌈 Les éléments dominants de ton équipe débloquent des synergies.</li>
            <li>🗺️ Chaque donjon lâche ses propres panoplies : choisis où farmer selon ton build.</li>
          </ul>
          <button class="btn big" data-act="recruitOpen">Recruter mon premier personnage</button>
        </section>`;
      const slots = [];
      for (let i = 0; i < K.TEAM_SIZE; i++) {
        const c = team[i];
        slots.push(
          c
            ? charCard(c, { team: true })
            : `<button class="ccard empty" data-act="${st.roster.length > team.length ? 'noop' : 'recruitOpen'}">${st.roster.length > team.length ? 'Ajoute une recrue depuis la liste ci-dessous' : '+ Recruter'}</button>`
        );
      }
      const bench = st.roster.filter((c) => !st.team.includes(c.id));
      return `
        <section class="panel">
          <div class="ph"><h2>Équipe de combat</h2><span class="muted">${team.length}/${K.TEAM_SIZE}</span></div>
          <div class="cards">${slots.join('')}</div>
        </section>
        <section class="panel">
          <div class="ph"><h2>Synergies d'équipe</h2><span class="muted small">L'élément dominant d'un personnage est sa caractéristique élémentaire la plus haute.</span></div>
          ${synergyPanel()}
        </section>
        <section class="panel">
          <div class="ph"><h2>Recrues</h2><span class="muted">${st.roster.length}/${K.MAX_ROSTER}</span>
            ${st.roster.length < K.MAX_ROSTER ? '<button class="btn sm" data-act="recruitOpen">+ Recruter</button>' : ''}</div>
          ${bench.length ? `<div class="cards">${bench.map((c) => charCard(c)).join('')}</div>` : '<p class="muted">Toutes tes recrues sont dans l’équipe.</p>'}
        </section>
        <section class="panel options">
          <div class="ph"><h2>Sauvegarde</h2></div>
          <p class="muted small">La partie est enregistrée automatiquement dans ce navigateur. ${st.stats.wins} victoire(s) sur ${st.stats.fights} combat(s).</p>
          <div class="row"><button class="btn sm ghost" data-act="exportSave">Exporter</button><button class="btn sm ghost" data-act="importSave">Importer</button><button class="btn sm danger ghost" data-act="resetSave">Recommencer de zéro</button></div>
        </section>`;
    },

    build() {
      const c = App.selChar();
      if (!c) return `<section class="panel"><p>Aucun personnage. <button class="btn sm" data-act="go" data-s="equipe">Recruter</button></p></section>`;
      App.selId = c.id;
      const full = K.fullStats(c);
      const tabs = [
        ['equip', 'Équipement'],
        ['carac', `Caractéristiques${K.ptsFree(c) ? ` <span class="pill">${K.ptsFree(c)}</span>` : ''}`],
        ['sorts', 'Sorts'],
      ];
      return `
        <div class="char-tabs">${K.state.roster
          .map((x) => `<button class="ctab ${x.id === c.id ? 'on' : ''}" data-act="selChar" data-id="${x.id}">${K.CLASSES[x.cls].i} ${esc(x.name)} <span class="muted">${x.lvl}</span></button>`)
          .join('')}</div>
        <div class="build">
          <div class="build-main">
            <div class="subtabs">${tabs.map(([id, n]) => `<button class="stab ${App.buildTab === id ? 'on' : ''}" data-act="buildTab" data-t="${id}">${n}</button>`).join('')}</div>
            ${Build[App.buildTab](c, full)}
          </div>
          <aside class="sheet">${statSheet(c, full)}</aside>
        </div>`;
    },

    donjons() {
      const team = K.teamChars();
      if (!App.zoneSel || !K.zoneUnlocked(K.ZONE[App.zoneSel])) {
        const open = K.ZONES.filter((z) => K.zoneUnlocked(z));
        App.zoneSel = open[open.length - 1].id;
      }
      const z = K.ZONE[App.zoneSel];
      const prog = K.state.prog[z.id] || 0;
      return `
        ${team.length ? '' : '<div class="warn">⚠️ Ton équipe est vide. <button class="btn sm" data-act="go" data-s="equipe">Composer l’équipe</button></div>'}
        <div class="zones">${K.ZONES.map((zz) => {
          const un = K.zoneUnlocked(zz);
          const p = K.state.prog[zz.id] || 0;
          return `<button class="zcard theme-${zz.theme} ${zz.id === z.id ? 'on' : ''} ${un ? '' : 'locked'}" data-act="${un ? 'zoneSel' : 'noop'}" data-z="${zz.id}">
            <span class="zi">${un ? zz.i : '🔒'}</span><b>${zz.n}</b><span class="small">niv. ${zz.lvl[0]}–${zz.lvl[1]}</span>
            <span class="zprog">${'●'.repeat(p)}${'○'.repeat(zz.rooms.length - p)}</span></button>`;
        }).join('')}</div>
        <section class="panel zone-detail theme-${z.theme}">
          <div class="ph"><h2>${z.i} ${z.n}</h2><span class="muted">niveaux ${z.lvl[0]} à ${z.lvl[1]}</span></div>
          <p class="muted">${z.desc}</p>
          <div class="loot-row"><span class="muted small">Butin :</span>
            ${z.sets.map((s) => `<span class="chip" data-tip="set|${s}">🔗 ${esc(K.SETS[s].n)}</span>`).join('')}
            <span class="chip relic" data-tip="base|${z.relic}">${K.ITEMS[z.relic].i} ${esc(K.ITEMS[z.relic].n)}</span></div>
          <div class="rooms">${z.rooms
            .map((r, i) => {
              const L = K.roomLevel(z, i);
              const un = K.roomUnlocked(z, i);
              return `<div class="room ${r.boss ? 'boss' : ''} ${un ? '' : 'locked'}">
                <div class="room-h"><span class="rn">${i + 1}</span><b>${esc(r.n)}</b>${r.boss ? '<span class="badge boss">BOSS</span>' : ''}${i < prog ? '<span class="done">✓</span>' : ''}</div>
                <div class="room-mobs">${r.mobs.map((id) => `<span class="mob" data-tip="mob|${id}|${K.MONSTERS[id].boss ? L + 1 : L}">${K.MONSTERS[id].i}</span>`).join('')}</div>
                <div class="room-f"><span class="muted small">niveau ${L}</span>
                <button class="btn sm" data-act="fight" data-z="${z.id}" data-r="${i}" ${un && team.length ? '' : 'disabled'}>${un ? 'Combattre' : '🔒'}</button></div>
              </div>`;
            })
            .join('')}</div>
        </section>
        <section class="panel training">
          <div class="ph"><h2>🎯 Salle d'entraînement</h2></div>
          <p class="muted small">Teste ton build sur des mannequins increvables, sans risque ni récompense. Les dommages infligés par chaque personnage sont comptés.</p>
          <div class="row">
            <button class="btn sm" data-act="training" data-res="0" ${team.length ? '' : 'disabled'}>Mannequins sans résistance</button>
            <button class="btn sm ghost" data-act="training" data-res="20" ${team.length ? '' : 'disabled'}>Mannequins à 20 % de résistance</button>
          </div>
        </section>`;
    },

    forge() {
      const items = K.state.inv.filter((i) => !K.ITEMS[i.id].relic).sort(sortItems);
      const sel = App.forgeSel && K.item(App.forgeSel);
      let detail = '<p class="muted">Choisis un objet dans la liste.</p>';
      if (sel) {
        const base = K.ITEMS[sel.id];
        const bars = Object.entries(base.stats)
          .map(([k, [a, b]]) => {
            const v = sel.st[k];
            const pct = b > a ? Math.round((100 * (v - a)) / (b - a)) : 100;
            return `<div class="jet"><span>${K.STATS[k].i} ${K.STATS[k].n}</span><span class="jbar"><i style="width:${pct}%" class="${pct === 100 ? 'perfect' : ''}"></i></span><b>${v}</b><span class="range">${a}–${b}</span></div>`;
          })
          .join('');
        const rc = K.rerollCost(sel);
        const xc = K.exoCost(sel);
        detail = `${UI.itemHTML(sel, null, { noSet: true })}
          ${bars ? `<h3>Jets</h3><div class="jets">${bars}</div>` : ''}
          <div class="forge-actions">
            <div class="fa"><div><b>Retenter les jets</b><div class="small muted">Tire de nouvelles valeurs pour toutes les caractéristiques. Le résultat remplace l'ancien.</div></div>
              <button class="btn" data-act="reroll" data-uid="${sel.uid}" ${K.state.eclats >= rc && bars ? '' : 'disabled'}>💠 ${rc}</button></div>
            <div class="fa"><div><b>Exotique</b><div class="small muted">${K.EXO_CHANCE} % de chances d'ajouter +1 PA, PM ou PO. Une seule fois par objet.</div></div>
              <div class="row">${K.EXO_STATS.map((k) => `<button class="btn sm" data-act="exo" data-uid="${sel.uid}" data-k="${k}" ${sel.exo || base.stats[k] || K.state.eclats < xc ? 'disabled' : ''}>+1 ${K.STATS[k].s}</button>`).join('')}<span class="muted small">💠 ${xc}</span></div></div>
            <div class="fa"><div><b>Recycler</b><div class="small muted">Détruit l'objet contre des éclats.</div></div>
              <button class="btn ghost danger" data-act="recycle" data-uid="${sel.uid}" ${K.ownerOf(sel.uid) ? 'disabled title="Équipé"' : ''}>+💠 ${K.recycleValue(sel)}</button></div>
          </div>`;
      }
      return `<div class="forge">
        <section class="panel">
          <div class="ph"><h2>⚒️ Objets</h2><button class="btn sm ghost" data-act="recycleDup" title="Garde le meilleur jet de chaque objet">♻️ Recycler les doublons</button></div>
          <div class="ilist">${items.map((i) => itemRow(i, null, { act: 'forgeSel', on: App.forgeSel === i.uid })).join('') || '<p class="muted">Inventaire vide.</p>'}</div>
        </section>
        <section class="panel">${detail}</section>
      </div>`;
    },

    codex() {
      const tabs = [
        ['sets', 'Panoplies'],
        ['relics', 'Reliques'],
        ['classes', 'Classes'],
        ['bestiaire', 'Bestiaire'],
        ['regles', 'Règles'],
      ];
      return `<div class="subtabs">${tabs.map(([id, n]) => `<button class="stab ${App.codexTab === id ? 'on' : ''}" data-act="codexTab" data-t="${id}">${n}</button>`).join('')}</div>
        ${Codex[App.codexTab]()}`;
    },
  };

  // ─── Build ───
  const sortItems = (a, b) => K.ITEMS[b.id].lvl - K.ITEMS[a.id].lvl || K.ITEMS[a.id].n.localeCompare(K.ITEMS[b.id].n) || K.jet(b) - K.jet(a);

  const itemRow = (inst, c, opts = {}) => {
    const base = K.ITEMS[inst.id];
    const owner = K.ownerOf(inst.uid);
    const tooHigh = c && base.lvl > c.lvl;
    const jet = Object.keys(base.stats).length && !base.relic ? K.jet(inst) : null;
    return `<div class="irow ${tooHigh ? 'toohigh' : ''} ${opts.on ? 'on' : ''}" data-act="${opts.act || 'itemOpen'}" data-uid="${inst.uid}" data-tip="item|${inst.uid}">
      <span class="ii">${base.i}</span>
      <span class="in">${UI.itemName(base)}${inst.exo ? ' <span class="exo">✦</span>' : ''}<span class="small muted">${base.set ? esc(K.SETS[base.set].n.replace('Panoplie ', '')) : K.TYPES[base.type].n}</span></span>
      <span class="il ${tooHigh ? 'neg' : ''}">niv. ${base.lvl}</span>
      ${jet != null ? `<span class="ij ${jet >= 90 ? 'great' : ''}">${jet} %</span>` : '<span class="ij"></span>'}
      ${owner ? `<span class="iown" title="Équipé par ${esc(owner.name)}">${K.CLASSES[owner.cls].i}</span>` : '<span class="iown"></span>'}
    </div>`;
  };

  const Build = {
    equip(c, full) {
      const doll = K.SLOTS.map((s) => {
        const inst = c.equip[s.id] && K.item(c.equip[s.id]);
        const base = inst && K.ITEMS[inst.id];
        return `<div class="slot ${inst ? 'full' : ''} ${App.invType === s.type ? 'on' : ''}" data-act="${inst ? 'itemOpen' : 'invType'}" data-uid="${inst ? inst.uid : ''}" data-t="${s.type}" ${inst ? `data-tip="item|${inst.uid}"` : ''}>
          <span class="slot-i">${inst ? base.i : s.i}</span>
          <span class="slot-n">${inst ? UI.itemName(base) : `<span class="muted">${s.n}</span>`}</span>
          ${inst ? `<button class="slot-x" data-act="unequip" data-slot="${s.id}" title="Retirer">✕</button>` : ''}
        </div>`;
      }).join('');
      const sets = full.sets
        .filter((s) => s.count)
        .map(
          (s) => `<div class="setbox ${s.cur ? 'on' : ''}" data-tip="set|${s.set.id}">
            <div class="sb-h"><b>${esc(s.set.n)}</b><span class="pieces">${'◆'.repeat(s.count)}${'◇'.repeat(s.set.pieces.length - s.count)}</span></div>
            ${s.cur ? `<div class="small">${UI.setBonusText(s.cur.bonus)}</div>` : '<div class="small muted">Aucun bonus pour l’instant</div>'}
            ${s.next ? `<div class="small next">À ${s.next.tier} pièces : ${UI.setBonusText(s.next.bonus)}</div>` : '<div class="small up">Panoplie complète !</div>'}
          </div>`
        )
        .join('');
      const types = ['all', ...Object.keys(K.TYPES)];
      let items = K.state.inv.slice();
      if (App.invType !== 'all') items = items.filter((i) => K.ITEMS[i.id].type === App.invType);
      if (App.invUsable) items = items.filter((i) => K.ITEMS[i.id].lvl <= c.lvl);
      items.sort(sortItems);
      return `
        <div class="equip-grid">
          <div class="doll">${doll}</div>
          <div class="sets"><h3>Panoplies portées</h3>${sets || '<p class="muted small">Équipe plusieurs pièces d’une même panoplie pour débloquer ses bonus.</p>'}</div>
        </div>
        <div class="inv">
          <div class="inv-h"><h3>Inventaire <span class="muted">(${K.state.inv.length})</span></h3>
            <label class="check"><input type="checkbox" data-act="invUsable" ${App.invUsable ? 'checked' : ''}> Niveau ≤ ${c.lvl}</label></div>
          <div class="chips">${types.map((t) => `<button class="chip ${App.invType === t ? 'on' : ''}" data-act="invType" data-t="${t}">${t === 'all' ? 'Tout' : K.TYPES[t].i + ' ' + K.TYPES[t].n}</button>`).join('')}</div>
          <div class="ilist">${items.map((i) => itemRow(i, c)).join('') || '<p class="muted small">Rien ici. Les donjons regorgent de butin !</p>'}</div>
        </div>`;
    },

    carac(c, full) {
      const free = K.ptsFree(c);
      const help = {
        vit: '1 point = 1 PV',
        sag: '+1 % d’XP',
        for: 'Dommages ⛰️ Terre',
        int: 'Dommages 🔥 Feu, soins',
        cha: 'Dommages 💧 Eau, prospection',
        agi: 'Dommages 🌪️ Air',
      };
      return `<div class="carac">
        <div class="carac-h"><div><b class="big">${free}</b> point${free > 1 ? 's' : ''} à répartir <span class="muted small">(5 par niveau)</span></div>
          <button class="btn sm ghost" data-act="ptsReset">Réinitialiser (gratuit)</button></div>
        ${K.CARAC.map((k) => {
          const p = c.pts[k] || 0;
          const tot = full.s[k];
          return `<div class="crow" data-tip="stat|${k}">
            <span class="ci">${K.STATS[k].i}</span><span class="cn"><b>${K.STATS[k].n}</b><span class="small muted">${help[k]}</span></span>
            <span class="cv"><b>${tot}</b><span class="small muted">${p} investis</span></span>
            <span class="cb">
              <button class="btn xs ghost" data-act="pt" data-k="${k}" data-n="-10" ${p ? '' : 'disabled'}>−10</button>
              <button class="btn xs ghost" data-act="pt" data-k="${k}" data-n="-1" ${p ? '' : 'disabled'}>−1</button>
              <button class="btn xs" data-act="pt" data-k="${k}" data-n="1" ${free ? '' : 'disabled'}>+1</button>
              <button class="btn xs" data-act="pt" data-k="${k}" data-n="10" ${free ? '' : 'disabled'}>+10</button>
            </span></div>`;
        }).join('')}
        <p class="muted small">Astuce : un build « mono-élément » tape très fort avec peu de sorts ; un build « multi » profite des armes et sorts de deux éléments et contourne les résistances des monstres.</p>
      </div>`;
    },

    sorts(c, full) {
      const cls = K.CLASSES[c.cls];
      const u = UI.fakeUnit(full, c);
      const weapon = K.weaponSpell(c);
      return `<div class="sorts">
        <div class="passive"><b>Passif — ${cls.passive.n}</b> <span class="muted">${cls.passive.d}</span></div>
        <h3>Attaque d'arme <span class="muted small">(toujours disponible)</span></h3>
        ${UI.spellCard(weapon, u)}
        <h3>Sorts équipés <span class="muted">${c.spells.length}/${K.MAX_SPELLS}</span> <span class="muted small">— clique pour équiper ou retirer</span></h3>
        <div class="spell-grid">${cls.spells
          .map((s) => {
            const locked = s.lvl > c.lvl;
            const on = c.spells.includes(s.id);
            const resolved = K.resolveSpell(s, full.mods[s.id]);
            return `<div class="spell-pick ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="${locked ? 'noop' : 'spellToggle'}" data-id="${s.id}">
              ${locked ? `<div class="lockmsg">🔒 Niveau ${s.lvl}</div>` : on ? '<div class="onmsg">✓ Équipé</div>' : ''}
              ${UI.spellCard(resolved, u)}</div>`;
          })
          .join('')}</div>
      </div>`;
    },
  };

  const statSheet = (c, full) => {
    const s = full.s;
    const cls = K.CLASSES[c.cls];
    const inTeam = K.state.team.includes(c.id);
    const row = (k, v = s[k]) => `<div class="srow" data-tip="stat|${k}"><span>${K.STATS[k].i} ${K.STATS[k].n}</span><b class="${v < 0 ? 'neg' : ''}">${v}${K.STATS[k].p ? ' %' : ''}</b></div>`;
    const extras = ['pctMelee', 'pctDist', 'pctDmg', 'pctPoison', 'volVie', 'renvoi', 'regen', 'killPa', 'shieldStart'].filter((k) => s[k]);
    const xpPct = c.lvl >= K.MAX_LVL ? 100 : Math.floor((100 * c.xp) / K.xpNext(c.lvl));
    const syn = inTeam ? K.computeSynergies(K.teamChars()).list.filter((x) => x.tier) : [];
    return `
      <div class="sh-head"><span class="cc-ico">${cls.i}</span><div><b>${esc(c.name)}</b><div class="small muted">${cls.n} · niveau ${c.lvl}</div></div></div>
      <div class="xpbar"><i style="width:${xpPct}%"></i></div><div class="small muted center">${c.lvl >= K.MAX_LVL ? 'Niveau maximum' : `${c.xp} / ${K.xpNext(c.lvl)} XP`}</div>
      <div class="big4">
        <div><span>❤️</span><b>${full.pvMax}</b><small>PV</small></div>
        <div data-tip="stat|pa"><span>⭐</span><b>${s.pa}</b><small>PA</small></div>
        <div data-tip="stat|pm"><span>👟</span><b>${s.pm}</b><small>PM</small></div>
        <div data-tip="stat|po"><span>🎯</span><b>${s.po}</b><small>PO</small></div>
      </div>
      <div class="sgroup">${row('ini')}${row('crit')}${row('pp')}${row('sag')}</div>
      <table class="eltab"><thead><tr><th></th><th>Carac.</th><th>Résist.</th></tr></thead><tbody>
        ${K.EL_ORDER.map((el) => {
          const E = K.ELEMENTS[el];
          const r = s[E.res];
          return `<tr><td class="el-${el}">${E.i} ${E.n}</td><td data-tip="stat|${E.stat}"><b>${s[E.stat]}</b></td><td class="${r < 0 ? 'neg' : ''}">${r} %${r > 50 ? ' <span class="muted small">(max 50)</span>' : ''}</td></tr>`;
        }).join('')}
      </tbody></table>
      <div class="sgroup">${row('pui')}${row('do')}${row('doCrit')}${row('soin')}${row('dpou')}${extras.map((k) => row(k)).join('')}</div>
      ${inTeam ? `<div class="small muted">${syn.length ? 'Synergies incluses : ' + syn.map((x) => `${x.syn.i} ${x.syn.n}`).join(', ') : 'Aucune synergie d’équipe active.'}</div>` : '<div class="small muted">Hors de l’équipe : synergies non comptées.</div>'}`;
  };

  // ─── Codex ───
  const Codex = {
    sets() {
      const owned = new Set(K.state.inv.map((i) => i.id));
      return K.ZONES.map(
        (z) => `<section class="panel"><div class="ph"><h2>${z.i} ${z.n}</h2><span class="muted">niv. ${z.lvl[0]}–${z.lvl[1]}</span></div>
          <div class="codex-sets">${z.sets
            .map((sid) => {
              const set = K.SETS[sid];
              return `<div class="cset"><div class="ph"><h3>${esc(set.n)}</h3><span class="muted small">niveau ${set.lvl} · ${set.pieces.filter((p) => owned.has(p)).length}/${set.pieces.length} trouvées</span></div>
                <div class="cset-pieces">${set.pieces
                  .map((p) => `<span class="chip ${owned.has(p) ? 'owned' : ''}" data-tip="base|${p}">${K.ITEMS[p].i} ${esc(K.ITEMS[p].n)}</span>`)
                  .join('')}</div>
                <div class="i-set">${K.setTiers(set).map((t) => `<div class="tier"><span class="tn">${t}</span>${UI.setBonusText(set.bonus[t])}</div>`).join('')}</div></div>`;
            })
            .join('')}</div></section>`
      ).join('');
    },
    relics() {
      const owned = new Set(K.state.inv.map((i) => i.id));
      return `<section class="panel"><p class="muted">Les reliques ont des jets fixes. Elles ne tombent que sur les boss (8 %, modifié par la prospection). Deux emplacements, deux reliques différentes.</p>
        <div class="relics">${Object.values(K.ITEMS)
          .filter((b) => b.relic)
          .map((b) => `<div class="relic-card ${owned.has(b.id) ? 'owned' : ''}">${UI.itemHTML(null, b)}<div class="small muted">Boss de : ${K.ZONE[b.zone].n}</div></div>`)
          .join('')}</div></section>`;
    },
    classes() {
      return Object.values(K.CLASSES)
        .map(
          (cls) => `<section class="panel"><div class="ph"><h2>${cls.i} ${cls.n}</h2><span class="muted">${cls.role}</span></div>
          <p>${cls.desc}</p><p class="small"><b>Passif — ${cls.passive.n} :</b> ${cls.passive.d}</p>
          <div class="spell-grid">${cls.spells.map((s) => UI.spellCard(s, null)).join('')}</div></section>`
        )
        .join('');
    },
    bestiaire() {
      return K.ZONES.map(
        (z) => `<section class="panel"><div class="ph"><h2>${z.i} ${z.n}</h2></div>
          <div class="bestiary">${z.mobs
            .map((id) => {
              const m = K.MONSTERS[id];
              return `<div class="beast" data-tip="mob|${id}|${z.lvl[1]}"><span class="bi">${m.i}</span><div><b>${esc(m.n)}</b>${m.boss ? ' <span class="badge boss">BOSS</span>' : ''}
                <div class="small">${resLine(m.res)}</div>
                <div class="small muted">${(K.DROPS[id] || []).length} objets possibles</div></div></div>`;
            })
            .join('')}</div></section>`
      ).join('');
    },
    regles() {
      return `<section class="panel rules">
        <h2>Combat</h2>
        <ul>
          <li>Chaque personnage dispose de <b>PA</b> (sorts) et de <b>PM</b> (déplacement, une case par PM) qui se rechargent à son tour.</li>
          <li>L'ordre de jeu dépend de l'<b>initiative</b> (somme des caractéristiques élémentaires + bonus).</li>
          <li>Les distances se comptent en cases, sans diagonale. Obstacles et créatures bloquent la <b>ligne de vue</b>.</li>
          <li>Pousser une cible contre un obstacle ou une créature inflige des <b>dommages de poussée</b>.</li>
          <li>Les poisons frappent au début du tour de la cible ; bonus et malus expirent à la fin de son tour.</li>
        </ul>
        <h2>Dommages</h2>
        <p><code>jet × (100 + caractéristique + puissance) / 100 + dommages</code>, puis bonus % (mêlée / distance / finaux), puis résistance de la cible (maximum 50 %). Un coup critique augmente le jet de 25 % et ajoute les dommages critiques.</p>
        <h2>Butin</h2>
        <p>Chaque monstre lâche certaines pièces de la zone. La chance est multipliée par la prospection moyenne de l'équipe / 100. Les boss peuvent lâcher toutes les pièces de leur zone et leur relique.</p>
        <h2>Raccourcis en combat</h2>
        <p><kbd>1</kbd>–<kbd>7</kbd> choisir un sort · <kbd>Échap</kbd> ou clic droit : annuler · <kbd>Entrée</kbd> : fin du tour.</p>
      </section>`;
    },
  };

  const resLine = (res) =>
    K.EL_ORDER.map((el) => {
      const v = res[K.ELEMENTS[el].res] || 0;
      return `<span class="res ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${K.ELEMENTS[el].i}${v}%</span>`;
    }).join(' ');
  UI.resLine = resLine;

  UI.tips.mob = (id, lvl) => {
    const m = K.MONSTERS[id];
    if (!m) return '';
    lvl = Number(lvl);
    const u = K.makeMobUnit(id, lvl);
    const drops = (K.DROPS[id] || []).map((d) => `${K.ITEMS[d.id].i} ${esc(K.ITEMS[d.id].n)} <span class="muted">${d.p} %</span>`);
    return `<div class="item-card"><div class="ic-head"><span class="ic-ico">${m.i}</span><div><b>${esc(m.n)}</b> <span class="muted">niv. ${lvl}</span>
      <div class="small">❤️ ${u.pvMax} · ⭐ ${u.s.pa} · 👟 ${u.s.pm}</div></div></div>
      <div class="small">Résistances : ${resLine(m.res)}</div>
      <div class="small">${m.spells.map((s) => `${s.i} ${esc(s.n)}`).join(' · ')}</div>
      ${drops.length ? `<div class="small tip-src">${drops.join('<br>')}</div>` : ''}</div>`;
  };

  // ─── Actions ───
  const A = (K.Actions = {});
  A.noop = () => {};
  A.go = (d) => App.go(d.s);
  A.closeModal = () => UI.closeModal();

  A.recruitOpen = () => {
    if (K.state.roster.length >= K.MAX_ROSTER) return UI.toast('Effectif complet (6 recrues).', 'bad');
    App.recruitCls = App.recruitCls || 'ferrailleur';
    renderRecruit();
  };
  const renderRecruit = () => {
    const sel = K.CLASSES[App.recruitCls];
    const prev = document.getElementById('rname');
    const name = prev ? prev.value : K.pick(K.NAMES.filter((n) => !K.state.roster.some((c) => c.name === n)));
    UI.modal(
      `<h2>Recruter un personnage</h2>
      <div class="cls-grid">${Object.values(K.CLASSES)
        .map((c) => `<button class="cls ${c.id === sel.id ? 'on' : ''}" data-act="recruitPick" data-cls="${c.id}"><span class="cls-i">${c.i}</span><b>${c.n}</b><span class="small muted">${c.role}</span><span>${c.els.map((e) => K.ELEMENTS[e].i).join(' ')}</span></button>`)
        .join('')}</div>
      <div class="cls-detail"><p>${sel.desc}</p><p class="small"><b>Passif — ${sel.passive.n} :</b> ${sel.passive.d}</p>
        <div class="small muted">Sorts : ${sel.spells.map((s) => `${s.i} ${esc(s.n)}${s.lvl > 1 ? ` <span class="muted">(${s.lvl})</span>` : ''}`).join(' · ')}</div></div>
      <div class="row"><label>Nom <input id="rname" maxlength="16" value="${esc(name)}"></label>
      <button class="btn" data-act="recruitConfirm">Recruter</button></div>`,
      { wide: true }
    );
  };
  A.recruitPick = (d) => {
    App.recruitCls = d.cls;
    renderRecruit();
  };
  A.recruitConfirm = () => {
    const name = (document.getElementById('rname').value || '').trim() || K.pick(K.NAMES);
    const c = K.newChar(name.slice(0, 16), App.recruitCls);
    K.state.roster.push(c);
    if (K.state.team.length < K.TEAM_SIZE) K.state.team.push(c.id);
    const w = K.addItem(K.START_WEAPON[c.cls]);
    K.equip(c, w.uid);
    K.save();
    UI.closeModal();
    UI.toast(`${K.CLASSES[c.cls].i} <b>${esc(c.name)}</b> rejoint l'aventure !`);
    App.selId = c.id;
    App.render();
  };
  A.teamToggle = (d) => {
    const t = K.state.team;
    const i = t.indexOf(d.id);
    if (i >= 0) t.splice(i, 1);
    else if (t.length >= K.TEAM_SIZE) return UI.toast('Équipe complète : retire d’abord quelqu’un.', 'bad');
    else t.push(d.id);
    K.save();
    App.render();
  };
  A.dismiss = (d) => {
    const c = K.charById(d.id);
    if (!c || !confirm(`Renvoyer ${c.name} ? Son équipement retourne dans l'inventaire.`)) return;
    K.state.roster = K.state.roster.filter((x) => x.id !== c.id);
    K.state.team = K.state.team.filter((x) => x !== c.id);
    K.save();
    App.render();
  };
  A.openBuild = (d) => {
    App.selId = d.id;
    App.go('build');
  };
  A.selChar = (d) => {
    App.selId = d.id;
    App.render();
  };
  A.buildTab = (d) => {
    App.buildTab = d.t;
    App.render();
  };
  A.invType = (d) => {
    App.invType = d.t;
    App.buildTab = 'equip';
    App.render();
  };
  A.invUsable = () => {
    App.invUsable = !App.invUsable;
    App.render();
  };

  A.itemOpen = (d) => {
    const inst = K.item(d.uid);
    if (!inst) return;
    const c = App.selChar();
    const base = K.ITEMS[inst.id];
    let compare = '';
    let buttons = '';
    if (c) {
      const cur = K.fullStats(c);
      const ownedHere = Object.entries(c.equip).find(([, u]) => u === inst.uid);
      if (ownedHere) {
        buttons += `<button class="btn ghost" data-act="unequip" data-slot="${ownedHere[0]}" data-close="1">Retirer de ${esc(c.name)}</button>`;
      } else {
        for (const slot of K.slotsForType(base.type)) {
          const chk = K.canEquip(c, inst, slot);
          const occupant = c.equip[slot] && K.item(c.equip[slot]);
          const after = chk.ok ? K.fullStats(c, K.simulateEquip(c, inst, slot)) : null;
          compare += `<div class="cmp"><div class="small"><b>${K.SLOTS.find((s) => s.id === slot).n}</b> ${occupant ? `— remplace ${esc(K.ITEMS[occupant.id].n)}` : '— emplacement libre'}</div>
            ${chk.ok ? UI.diffHTML(cur, after) : `<div class="neg small">${chk.why}</div>`}
            <button class="btn sm" data-act="equip" data-uid="${inst.uid}" data-slot="${slot}" ${chk.ok ? '' : 'disabled'}>Équiper ici</button></div>`;
        }
      }
    }
    const owner = K.ownerOf(inst.uid);
    buttons += `<button class="btn ghost" data-act="forgeOpen" data-uid="${inst.uid}">⚒️ Forge</button>`;
    if (!owner) buttons += `<button class="btn ghost danger" data-act="recycle" data-uid="${inst.uid}" data-close="1">♻️ Recycler (+💠 ${K.recycleValue(inst)})</button>`;
    UI.modal(
      `<div class="item-modal">${UI.itemHTML(inst, null, { char: c, unit: c ? UI.fakeUnit(K.fullStats(c), c) : null })}
        ${c && compare ? `<div class="cmp-box"><h3>Pour ${esc(c.name)}</h3>${compare}</div>` : ''}</div>
        <div class="row">${buttons}</div>`,
      { wide: !!compare }
    );
  };
  A.equip = (d) => {
    const c = App.selChar();
    const r = K.equip(c, d.uid, d.slot);
    if (!r.ok) return UI.toast(r.why, 'bad');
    UI.closeModal();
    App.render();
  };
  A.unequip = (d) => {
    K.unequip(App.selChar(), d.slot);
    if (d.close) UI.closeModal();
    App.render();
  };
  A.recycle = (d) => {
    const v = K.recycle(d.uid);
    if (!v) return UI.toast('Impossible de recycler un objet équipé.', 'bad');
    UI.toast(`♻️ +${v} 💠`);
    if (App.forgeSel === d.uid) App.forgeSel = null;
    if (d.close) UI.closeModal();
    App.render();
  };
  A.recycleDup = () => {
    const r = K.recycleDuplicates();
    UI.toast(r.n ? `♻️ ${r.n} doublon(s) recyclé(s) : +${r.gain} 💠` : 'Aucun doublon à recycler.');
    if (App.forgeSel && !K.item(App.forgeSel)) App.forgeSel = null;
    App.render();
  };
  A.forgeOpen = (d) => {
    UI.closeModal();
    App.forgeSel = d.uid;
    App.go('forge');
  };
  A.forgeSel = (d) => {
    App.forgeSel = d.uid;
    App.render();
  };
  A.reroll = (d) => {
    const r = K.reroll(d.uid);
    if (!r.ok) return UI.toast(r.why, 'bad');
    const inst = K.item(d.uid);
    const delta = Object.keys(inst.st).map((k) => inst.st[k] - (r.before[k] || 0)).reduce((a, b) => a + b, 0);
    UI.toast(`Nouveau jet : ${K.jet(inst)} % ${delta > 0 ? '▲' : delta < 0 ? '▼' : '='}`, delta >= 0 ? '' : 'bad');
    App.render();
  };
  A.exo = (d) => {
    const r = K.exo(d.uid, d.k);
    if (!r.ok) return UI.toast(r.why, 'bad');
    UI.toast(r.win ? `✦ Exotique réussi : +1 ${K.STATS[d.k].n} !` : 'La rune se brise… échec.', r.win ? 'good' : 'bad');
    App.render();
  };

  A.pt = (d) => {
    const c = App.selChar();
    const n = Number(d.n);
    if (n > 0) c.pts[d.k] = (c.pts[d.k] || 0) + Math.min(n, K.ptsFree(c));
    else c.pts[d.k] = Math.max(0, (c.pts[d.k] || 0) + n);
    K.save();
    App.render();
  };
  A.ptsReset = () => {
    const c = App.selChar();
    for (const k of K.CARAC) c.pts[k] = 0;
    K.save();
    App.render();
  };
  A.spellToggle = (d) => {
    const c = App.selChar();
    const i = c.spells.indexOf(d.id);
    if (i >= 0) c.spells.splice(i, 1);
    else if (c.spells.length >= K.MAX_SPELLS) return UI.toast(`Maximum ${K.MAX_SPELLS} sorts équipés.`, 'bad');
    else c.spells.push(d.id);
    K.save();
    App.render();
  };

  A.zoneSel = (d) => {
    App.zoneSel = d.z;
    App.render();
  };
  A.codexTab = (d) => {
    App.codexTab = d.t;
    App.render();
  };

  A.resetSave = () => {
    if (!confirm('Effacer toute la progression ? Cette action est définitive.')) return;
    K.resetSave();
    App.selId = null;
    App.go('equipe');
  };
  A.exportSave = () => {
    UI.modal(`<h2>Exporter la sauvegarde</h2><p class="small muted">Copie ce texte pour transférer ta partie.</p><textarea class="savebox" readonly>${K.exportSave()}</textarea>`);
    const t = document.querySelector('.savebox');
    t.focus();
    t.select();
  };
  A.importSave = () => {
    UI.modal(`<h2>Importer une sauvegarde</h2><p class="small muted">Colle le texte exporté. La partie actuelle sera remplacée.</p><textarea class="savebox" id="importbox"></textarea><div class="row"><button class="btn" data-act="importConfirm">Importer</button></div>`);
  };
  A.importConfirm = () => {
    try {
      K.importSave(document.getElementById('importbox').value);
      UI.closeModal();
      UI.toast('Sauvegarde importée.');
      App.go('equipe');
    } catch (e) {
      UI.toast('Sauvegarde invalide.', 'bad');
    }
  };

  // ─── Lancer un combat ───
  A.fight = (d) => App.startFight(K.ZONE[d.z], Number(d.r));
  A.training = (d) => App.startFight(K.ZONES[0], 0, { training: true, dummyRes: { reTerre: +d.res, reFeu: +d.res, reEau: +d.res, reAir: +d.res } });

  App.startFight = (zone, room, opts = {}) => {
    if (!K.teamChars().length) return UI.toast("Ton équipe est vide.", 'bad');
    const cb = K.createCombat(zone, room, opts);
    App.screen = 'combat';
    UI.closeModal();
    K.CombatView.open(cb, {
      onEnd: (result) => App.afterFight(cb, result, zone, room, opts),
    });
  };

  App.afterFight = (cb, result, zone, room, opts) => {
    if (cb.training) {
      const allies = cb.units.filter((u) => u.side === 'ally');
      const rounds = Math.max(1, cb.round);
      UI.modal(
        `<h2>🎯 Bilan d'entraînement</h2><p class="muted small">${rounds} tour(s) joué(s).</p>
        <table class="eltab"><thead><tr><th></th><th>Dommages</th><th>Par tour</th><th>Soins</th></tr></thead><tbody>
        ${allies.map((u) => `<tr><td>${u.i} ${esc(u.name)}</td><td><b>${u.dealt}</b></td><td>${Math.round(u.dealt / rounds)}</td><td>${u.healed}</td></tr>`).join('')}
        </tbody></table><div class="row"><button class="btn" data-act="leaveFight">Retour</button></div>`,
        { noClose: true }
      );
      return;
    }
    K.state.stats.fights++;
    if (result !== 'win') {
      K.save();
      UI.modal(
        `<h2 class="lose">${result === 'flee' ? '🏳️ Abandon' : '💀 Défaite'}</h2>
        <p>Ton équipe se replie. Ajuste ton build — éléments, résistances, sorts — et retente ta chance.</p>
        <div class="row"><button class="btn" data-act="refight" data-z="${zone.id}" data-r="${room}">Réessayer</button><button class="btn ghost" data-act="leaveFight">Retour aux donjons</button></div>`,
        { noClose: true }
      );
      return;
    }
    const res = K.grantRewards(cb);
    const nextOk = room + 1 < zone.rooms.length;
    UI.modal(
      `<h2 class="win">🏆 Victoire !</h2>
      <div class="rew-xp">${res.xp
        .map((x) => `<div>${K.CLASSES[x.c.cls].i} <b>${esc(x.c.name)}</b> +${x.xp} XP ${x.ups ? `<span class="lvlup">▲ niveau ${x.c.lvl} !</span>` : ''}</div>`)
        .join('')}</div>
      <div class="small muted">+${res.eclats} 💠 éclats</div>
      ${res.unlock ? `<div class="unlock">🗺️ Nouvelle zone débloquée : <b>${res.unlock.n}</b></div>` : ''}
      <h3>Butin</h3>
      <div class="ilist">${res.drops.length ? res.drops.map((i) => itemRow(i, null, { act: 'noop' })).join('') : '<p class="muted small">Rien cette fois… La prospection augmente les chances.</p>'}</div>
      <div class="row">
        <button class="btn" data-act="refight" data-z="${zone.id}" data-r="${room}">🔁 Rejouer</button>
        ${nextOk ? `<button class="btn" data-act="refight" data-z="${zone.id}" data-r="${room + 1}">➡️ Salle suivante</button>` : ''}
        <button class="btn ghost" data-act="leaveFight" data-to="build">🧩 Build</button>
        <button class="btn ghost" data-act="leaveFight">Donjons</button>
      </div>`,
      { noClose: true, wide: true }
    );
  };
  A.refight = (d) => {
    K.CombatView.close();
    App.startFight(K.ZONE[d.z], Number(d.r));
  };
  A.leaveFight = (d) => {
    K.CombatView.close();
    UI.closeModal();
    App.go(d.to || 'donjons');
  };
})(window.K);
