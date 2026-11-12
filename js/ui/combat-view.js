// Affichage et contrôle d'un combat.
(function (K) {
  const esc = K.esc;
  const UI = K.UI;

  const V = (K.CombatView = {
    open(cb, ctx) {
      this.cb = cb;
      this.ctx = ctx;
      this.sel = null;
      this.placeSel = null;
      this.hover = null;
      this.inspect = null;
      this.busy = false;
      this._tlOrder = null;
      this.barUnit = cb.units.find((u) => u.side === 'ally');
      const z = cb.zone;
      document.getElementById('app').innerHTML = `
        <div class="combat theme-${cb.training ? 'training' : z.theme}">
          <div class="cb-top">
            <div class="cb-title"><b>${cb.training ? "🎯 Salle d'entraînement" : `${z.i} ${esc(z.rooms[cb.room].n)}`}</b><span id="cbRound" class="muted small"></span></div>
            <div class="timeline" id="cbTimeline"></div>
            <div class="cb-ctrl">
              <button class="btn sm ghost" data-act="cbAuto" id="cbAuto" title="L'IA joue vos personnages">🤖 Auto</button>
              <button class="btn sm ghost" data-act="cbFast" id="cbFast" title="Accélérer les animations">⏩ Rapide</button>
              <button class="btn sm ghost danger" data-act="cbFlee">${cb.training ? '✔ Terminer' : '🏳️ Fuir'}</button>
            </div>
          </div>
          <div class="cb-main">
            <div class="board-wrap">
              <div class="board" id="board" style="--w:${cb.W};--h:${cb.H}">
                <div class="cells" id="cbCells"></div>
                <div class="tokens" id="cbTokens"></div>
                <div class="fxl" id="cbFx"></div>
              </div>
              <div class="banner" id="cbBanner"></div>
            </div>
            <aside class="cb-side">
              <div id="cbActive" class="cb-card"></div>
              <div id="cbInspect" class="cb-card"></div>
              <div id="cbLog" class="cb-log"></div>
            </aside>
          </div>
          <div class="cb-bottom">
            <div id="cbPreview" class="cb-preview"></div>
            <div class="cb-bar"><div id="cbSpells" class="cb-spells"></div>
              <button class="btn big" id="cbEnd" data-act="cbEnd">Fin du tour</button></div>
          </div>
        </div>`;
      const cells = document.getElementById('cbCells');
      this.cells = [];
      const obstIcon = cb.training ? '🪵' : z.obst;
      for (let y = 0; y < cb.H; y++)
        for (let x = 0; x < cb.W; x++) {
          const d = document.createElement('div');
          d.className = 'cell' + ((x + y) % 2 ? ' alt' : '') + (cb.isObst(x, y) ? ' obst' : '');
          d.dataset.x = x;
          d.dataset.y = y;
          if (cb.isObst(x, y)) d.textContent = obstIcon;
          cells.appendChild(d);
          this.cells.push(d);
        }
      this.tokens = {};
      const board = document.getElementById('board');
      board.addEventListener('mousemove', (e) => this.onHover(e));
      board.addEventListener('mouseleave', () => {
        this.hover = null;
        this.update();
      });
      board.addEventListener('pointerdown', (e) => (this.touch = e.pointerType === 'touch'));
      board.addEventListener('click', (e) => this.onClick(e));
      board.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.cancel();
      });
      this.keyFn = (e) => this.onKey(e);
      document.addEventListener('keydown', this.keyFn);
      this.listener = (ev) => this.onEvent(ev);
      cb.listeners.push(this.listener);
      this.update();
      this.banner(cb.training ? 'Place ton équipe puis lance l’entraînement' : 'Phase de placement');
    },

    close() {
      if (!this.cb) return;
      document.removeEventListener('keydown', this.keyFn);
      this.cb.listeners = [];
      if (!this.cb.over) {
        this.cb.over = true;
        if (this.cb._wait) this.cb._wait();
      }
      this.cb = null;
    },

    // ─── Événements du moteur ───
    onEvent(ev) {
      switch (ev.type) {
        case 'fx':
          return this.spawnFx(ev.x, ev.y, ev.text, ev.cls);
        case 'cast':
          this.flash(ev.cells);
          this.spawnFx(ev.unit.x, ev.unit.y, ev.spell.i + ' ' + ev.spell.n, 'castname' + (ev.crit ? ' crit' : ''));
          return this.schedule();
        case 'turn':
          this.sel = null;
          if (ev.unit.side === 'ally') this.barUnit = ev.unit;
          this.banner(`${ev.unit.i} Tour de ${ev.unit.name}`, ev.unit.side);
          return this.schedule();
        case 'end':
          this.schedule();
          setTimeout(() => this.ctx.onEnd(ev.result), 700);
          return;
        default:
          this.schedule();
      }
    },

    schedule() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        if (this.cb) this.update();
      });
    },

    // ─── Entrées du joueur ───
    cellFromEvent(e) {
      const c = e.target.closest('.cell');
      return c ? { x: +c.dataset.x, y: +c.dataset.y } : null;
    },
    canAct() {
      return this.cb && this.cb.isPlayerTurn() && !this.busy && !this.cb.auto && !this.cb._autoRunning;
    },
    onHover(e) {
      const c = this.cellFromEvent(e);
      const k = c ? c.x + ',' + c.y : null;
      if (k === (this.hover && this.hover.k)) return;
      this.hover = c ? { ...c, k } : null;
      this.update();
    },
    async onClick(e) {
      const cb = this.cb;
      const c = this.cellFromEvent(e);
      if (!cb || !c) return;
      const t = cb.unitAt(c.x, c.y);
      if (cb.phase === 'placement') {
        if (t && t.side === 'ally') this.placeSel = t === this.placeSel ? null : t;
        else if (this.placeSel && cb.isAllyCell(c.x, c.y)) {
          cb.placeAlly(this.placeSel, c.x, c.y);
          this.placeSel = null;
        }
        return this.update();
      }
      if (!this.canAct()) {
        this.inspect = t;
        return this.update();
      }
      const u = cb.current;
      // Au doigt : un premier appui montre l'aperçu, le second confirme.
      if (this.touch && (!this.hover || this.hover.k !== c.x + ',' + c.y)) {
        this.hover = { ...c, k: c.x + ',' + c.y };
        return this.update();
      }
      if (this.sel != null) {
        const sp = u.spells[this.sel];
        const chk = cb.canCast(u, sp, c.x, c.y);
        if (!chk.ok) {
          if (!cb.inRange(u, sp, c.x, c.y)) this.sel = null;
          else UI.toast(chk.why, 'bad');
          return this.update();
        }
        this.sel = null;
        this.busy = true;
        this.update();
        await cb.cast(u, sp, c.x, c.y);
        this.busy = false;
        return this.update();
      }
      const reach = cb.reachable(u);
      if (reach.has(cb.key(c.x, c.y))) {
        this.busy = true;
        this.update();
        await cb.move(u, cb.pathTo(reach, c.x, c.y));
        this.busy = false;
        return this.update();
      }
      this.inspect = t;
      this.update();
    },
    onKey(e) {
      if (!this.cb || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') return this.cancel();
      if (e.key === 'Enter') {
        e.preventDefault();
        return K.Actions.cbEnd();
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) this.pickSpell(n - 1);
    },
    cancel() {
      this.sel = null;
      this.placeSel = null;
      this.update();
    },
    pickSpell(i) {
      if (!this.canAct()) return;
      const u = this.cb.current;
      const sp = u.spells[i];
      if (!sp) return;
      const r = this.cb.spellReady(u, sp);
      if (!r.ok) return UI.toast(r.why, 'bad');
      this.sel = this.sel === i ? null : i;
      this.update();
    },

    // ─── Rendu ───
    update() {
      const cb = this.cb;
      if (!cb) return;
      this.renderCells();
      this.renderTokens();
      this.renderTimeline();
      this.renderPanels();
      this.renderSpells();
      this.renderLog();
      document.getElementById('cbRound').textContent = cb.phase === 'placement' ? ' · placement' : ` · tour ${cb.round}`;
      const end = document.getElementById('cbEnd');
      if (cb.phase === 'placement') {
        end.textContent = '⚔️ Prêt !';
        end.disabled = false;
      } else {
        end.textContent = 'Fin du tour';
        end.disabled = !this.canAct();
      }
      document.getElementById('cbAuto').classList.toggle('on', cb.auto);
      document.getElementById('cbFast').classList.toggle('on', cb.fast);
    },

    renderCells() {
      const cb = this.cb;
      const W = cb.W;
      const marks = new Map();
      const add = (x, y, c) => {
        const k = y * W + x;
        marks.set(k, (marks.get(k) || '') + ' ' + c);
      };
      let preview = '';
      const h = this.hover;
      if (cb.phase === 'placement') {
        for (let y = 0; y < cb.H; y++) for (let x = 0; x < 2; x++) if (!cb.isObst(x, y)) add(x, y, 'place');
        if (this.placeSel) add(this.placeSel.x, this.placeSel.y, 'selcell');
        preview = this.placeSel ? `Choisis une case bleue pour ${esc(this.placeSel.name)}.` : 'Clique un de tes personnages puis une case bleue pour le déplacer. Appuie sur « Prêt ! » pour commencer.';
      } else if (this.canAct()) {
        const u = cb.current;
        if (this.sel != null) {
          const sp = u.spells[this.sel];
          for (let y = 0; y < cb.H; y++)
            for (let x = 0; x < W; x++) if (cb.inRange(u, sp, x, y)) add(x, y, cb.targetOk(u, sp, x, y) ? 'rng' : 'rng dim');
          if (h) {
            const chk = cb.canCast(u, sp, h.x, h.y);
            if (chk.ok) {
              for (const [x, y] of cb.zoneCells(sp.zone, u, h.x, h.y)) add(x, y, 'zone');
              preview = this.spellPreview(u, sp, h.x, h.y);
            } else preview = `<span class="neg">${chk.why}</span>`;
          } else preview = `${sp.i} <b>${esc(sp.n)}</b> — choisis une cible. Clic droit pour annuler.`;
        } else {
          const reach = cb.reachable(u);
          for (const c of reach.values()) add(c.x, c.y, 'reach');
          if (h && reach.has(cb.key(h.x, h.y))) {
            const path = cb.pathTo(reach, h.x, h.y);
            for (const p of path) add(p.x, p.y, 'path');
            preview = `👟 Déplacement : ${path.length} PM`;
          } else preview = `À toi de jouer avec <b>${esc(u.name)}</b> : déplace-toi (cases vertes) ou choisis un sort.`;
        }
      } else if (cb.phase === 'fight' && !cb.over) {
        preview = cb.current ? `${cb.current.i} ${esc(cb.current.name)} joue…` : '';
      }
      if (h) add(h.x, h.y, 'hover');
      this.cells.forEach((el, i) => {
        const x = i % W;
        const y = Math.floor(i / W);
        el.className = 'cell' + ((x + y) % 2 ? ' alt' : '') + (cb.isObst(x, y) ? ' obst' : '') + (marks.get(i) || '') + (el.classList.contains('flash') ? ' flash' : '');
      });
      document.getElementById('cbPreview').innerHTML = preview;
    },

    spellPreview(u, sp, tx, ty) {
      const cb = this.cb;
      const melee = Math.abs(tx - u.x) + Math.abs(ty - u.y) <= 1;
      const inZone = cb.zoneCells(sp.zone, u, tx, ty).map(([x, y]) => cb.unitAt(x, y)).filter(Boolean);
      const crit = K.critChance(u, sp);
      const lines = [];
      for (const t of inZone) {
        const parts = [];
        let maxDmg = 0;
        for (const fx of sp.fx) {
          if (fx.on === 'self' || !cb.affects(fx, u, t)) continue;
          if (fx.t === 'dmg') {
            const lo = K.dmgValue(u, t, fx, fx.min, false, melee);
            const hi = K.dmgValue(u, t, fx, fx.max, false, melee);
            const chi = K.dmgValue(u, t, fx, K.critRoll(fx.max), true, melee);
            maxDmg += chi;
            parts.push(`<span class="el-${fx.el}">${K.ELEMENTS[fx.el].i} ${lo}–${hi}</span> <span class="muted">(crit ${K.dmgValue(u, t, fx, K.critRoll(fx.min), true, melee)}–${chi})</span>`);
          } else if (fx.t === 'heal') parts.push(`<span class="heal">✚ ${K.healValue(u, fx, fx.min, false)}–${K.healValue(u, fx, fx.max, false)}</span>`);
          else if (fx.t === 'dot') {
            const v = K.dotValues(u, fx);
            parts.push(`☠️ ${v.min}–${v.max} × ${fx.dur}`);
          } else parts.push(UI.fxText(fx, null));
        }
        if (parts.length) {
          const kill = maxDmg && maxDmg >= t.pv + t.shield && t.kind !== 'dummy';
          lines.push(`<span class="pv-t ${t.side}">${t.i} ${esc(t.name)}</span> ${parts.join(' · ')}${kill ? ' <span class="kill">☠ létal</span>' : ''}`);
        }
      }
      const self = sp.fx.filter((f) => f.t === 'dash' || f.t === 'tp' || f.t === 'swap' || f.on === 'self').map((f) => UI.fxText(f, null));
      return `${sp.i} <b>${esc(sp.n)}</b> <span class="muted">· ${crit} % crit</span>${self.length ? ' · ' + self.join(' · ') : ''}<br>${lines.join('<br>') || '<span class="muted">Aucune cible touchée</span>'}`;
    },

    renderTokens() {
      const cb = this.cb;
      const layer = document.getElementById('cbTokens');
      for (const u of cb.units) {
        let el = this.tokens[u.uid];
        if (!el) {
          el = document.createElement('div');
          el.className = `token ${u.side}${u.boss ? ' boss' : ''}`;
          el.innerHTML = `<span class="t-i">${u.i}</span><span class="t-hp"><i></i></span><span class="t-sh"></span>`;
          layer.appendChild(el);
          this.tokens[u.uid] = el;
        }
        el.style.setProperty('--x', u.x);
        el.style.setProperty('--y', u.y);
        el.classList.toggle('dead', u.dead);
        el.classList.toggle('cur', cb.current === u && cb.phase === 'fight');
        el.classList.toggle('selp', this.placeSel === u);
        el.classList.toggle('debuffed', u.buffs.some((b) => b.val < 0) || u.dots.length > 0);
        el.querySelector('.t-hp i').style.width = `${Math.round((100 * u.pv) / u.pvMax)}%`;
        el.querySelector('.t-sh').style.display = u.shield ? '' : 'none';
      }
    },

    renderTimeline() {
      const cb = this.cb;
      const order = cb.phase === 'placement' ? K.shuffle(cb.units).sort((a, b) => b.s.ini - a.s.ini) : cb.order;
      if (cb.phase === 'placement' && this._tlOrder) return;
      if (cb.phase === 'placement') this._tlOrder = order;
      document.getElementById('cbTimeline').innerHTML = (cb.phase === 'placement' ? this._tlOrder : order)
        .map((u) => `<div class="tl ${u.side} ${cb.current === u ? 'cur' : ''} ${u.dead ? 'dead' : ''}" data-tip="unit|${u.uid}"><span>${u.i}</span><i style="width:${Math.round((100 * u.pv) / u.pvMax)}%"></i></div>`)
        .join('');
    },

    unitCard(u, active) {
      if (!u) return '';
      const pct = Math.round((100 * u.pv) / u.pvMax);
      const buffs = u.buffs.map((b) => `<span class="chip ${b.val < 0 ? 'bad' : 'good'}">${b.val > 0 ? '+' : ''}${b.val} ${K.STATS[b.stat].s} <span class="muted">${esc(b.n)} · ${b.dur}</span></span>`);
      const dots = u.dots.map((d) => `<span class="chip bad">☠️ ${d.min}–${d.max} <span class="muted">${esc(d.n)} · ${d.dur}</span></span>`);
      const sh = u.shield;
      return `<div class="ucard ${u.side}">
        <div class="uc-h"><span class="uc-i">${u.i}</span><div><b>${esc(u.name)}</b> <span class="muted small">niv. ${u.lvl}</span>${u.dead ? ' <span class="neg small">vaincu</span>' : ''}</div></div>
        <div class="hpbar"><i style="width:${pct}%"></i><span>${u.kind === 'dummy' ? '∞' : `${u.pv} / ${u.pvMax}`}${sh ? ` <b class="shv">🛡️${sh}</b>` : ''}</span></div>
        <div class="uc-s">${active ? `<span>⭐ <b>${u.pa}</b>/${u.stat('pa')}</span><span>👟 <b>${u.pm}</b>/${u.stat('pm')}</span>` : `<span>⭐ ${u.stat('pa')}</span><span>👟 ${u.stat('pm')}</span>`}<span>🎯 +${u.stat('po')}</span><span>💥 ${u.stat('crit')}%</span></div>
        <div class="small">${UI.resLine(Object.fromEntries(K.EL_ORDER.map((el) => [K.ELEMENTS[el].res, u.res(el)])))}</div>
        ${buffs.length || dots.length ? `<div class="uc-b">${buffs.join('')}${dots.join('')}</div>` : ''}
      </div>`;
    },

    renderPanels() {
      const cb = this.cb;
      const cur = cb.phase === 'fight' ? cb.current : this.placeSel;
      document.getElementById('cbActive').innerHTML = cur ? `<div class="cb-lbl">${cb.phase === 'fight' ? 'Tour actuel' : 'Sélection'}</div>` + this.unitCard(cur, cb.phase === 'fight') : '';
      const h = this.hover && cb.unitAt(this.hover.x, this.hover.y);
      const ins = h || (this.inspect && !this.inspect.dead ? this.inspect : null);
      document.getElementById('cbInspect').innerHTML = ins && ins !== cur ? `<div class="cb-lbl">Cible</div>` + this.unitCard(ins, false) : cb.training ? this.trainingStats() : '';
    },

    trainingStats() {
      const cb = this.cb;
      const r = Math.max(1, cb.round);
      return `<div class="cb-lbl">Dommages infligés</div>` + cb.units.filter((u) => u.side === 'ally').map((u) => `<div class="srow"><span>${u.i} ${esc(u.name)}</span><b>${u.dealt}</b> <span class="muted small">${Math.round(u.dealt / r)}/tour</span></div>`).join('');
    },

    renderSpells() {
      const cb = this.cb;
      const u = cb.current && cb.current.side === 'ally' ? cb.current : this.barUnit;
      const box = document.getElementById('cbSpells');
      if (!u) return (box.innerHTML = '');
      const act = this.canAct() && u === cb.current;
      box.innerHTML = u.spells
        .map((sp, i) => {
          const r = cb.spellReady(u, sp);
          const cd = u.cds[sp.id] || 0;
          return `<button class="spellbtn ${this.sel === i ? 'on' : ''} ${r.ok ? '' : 'off'}" data-act="cbSpell" data-i="${i}" ${act ? '' : 'disabled'} data-tip="cspell|${i}">
            <span class="sb-i">${sp.i}</span><span class="sb-pa">${sp.pa}</span><span class="sb-k">${i + 1}</span>${cd ? `<span class="sb-cd">${cd}</span>` : ''}</button>`;
        })
        .join('');
    },

    renderLog() {
      const el = document.getElementById('cbLog');
      const n = this.cb.logs.length;
      if (el.dataset.n == n) return;
      el.dataset.n = n;
      el.innerHTML = this.cb.logs.slice(-40).map((l) => `<div>${l}</div>`).join('');
      el.scrollTop = el.scrollHeight;
    },

    // ─── Effets visuels ───
    spawnFx(x, y, text, cls) {
      const layer = document.getElementById('cbFx');
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'fxt ' + (cls || '');
      el.style.setProperty('--x', x);
      el.style.setProperty('--y', y);
      el.style.setProperty('--dx', `${K.rand(-12, 12)}px`);
      el.textContent = text;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    },
    flash(cells) {
      for (const [x, y] of cells) {
        const el = this.cells[y * this.cb.W + x];
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 450);
      }
    },
    banner(text, side = '') {
      const el = document.getElementById('cbBanner');
      if (!el) return;
      el.className = 'banner show ' + side;
      el.textContent = text;
      clearTimeout(this._bt);
      this._bt = setTimeout(() => (el.className = 'banner'), 1100);
    },
  });

  UI.tips.unit = (uid) => {
    const u = V.cb && V.cb.units.find((x) => x.uid === uid);
    return u ? V.unitCard(u, false) : '';
  };
  UI.tips.cspell = (i) => {
    const cb = V.cb;
    if (!cb) return '';
    const u = cb.current && cb.current.side === 'ally' ? cb.current : V.barUnit;
    const sp = u && u.spells[+i];
    if (!sp) return '';
    const r = cb.spellReady(u, sp);
    return UI.spellCard(sp, u) + (r.ok ? '' : `<div class="neg small">${r.why}</div>`);
  };

  const A = K.Actions;
  A.cbSpell = (d) => V.pickSpell(+d.i);
  A.cbEnd = () => {
    const cb = V.cb;
    if (!cb) return;
    if (cb.phase === 'placement') {
      V.placeSel = null;
      cb.start();
      return;
    }
    if (V.canAct()) {
      V.sel = null;
      cb.passTurn();
    }
  };
  A.cbAuto = () => V.cb && V.cb.setAuto(!V.cb.auto);
  A.cbFast = () => {
    if (!V.cb) return;
    V.cb.fast = !V.cb.fast;
    V.update();
  };
  A.cbFlee = () => {
    const cb = V.cb;
    if (!cb || cb.over) return;
    if (!cb.training && !confirm('Fuir le combat ? Aucune récompense ne sera gagnée.')) return;
    cb.end('flee');
  };
})(window.K);
