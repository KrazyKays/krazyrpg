// Moteur de combat tactique au tour par tour sur grille.
(function (K) {
  const W = 12;
  const H = 9;

  // ─── Formules ───
  // Dommages = jet × (100 + caractéristique + puissance) / 100 + dommages fixes,
  // puis bonus % mêlée/distance/finaux, puis résistance de la cible (plafonnée à 50 %).
  K.dmgValue = (src, tgt, fx, roll, crit, melee) => {
    const elStat = src.stat(K.ELEMENTS[fx.el].stat) + src.stat('pui');
    let v = Math.floor((roll * Math.max(0, 100 + elStat)) / 100) + src.stat('do') + (crit ? src.stat('doCrit') : 0);
    v = Math.floor((v * Math.max(0, 100 + (melee ? src.stat('pctMelee') : src.stat('pctDist')) + src.stat('pctDmg'))) / 100);
    if (tgt) v = Math.floor((v * (100 - tgt.res(fx.el))) / 100);
    return Math.max(0, v);
  };
  K.critRoll = (r) => Math.ceil(r * 1.25);
  K.healValue = (src, fx, roll, crit) => {
    const r = crit ? K.critRoll(roll) : roll;
    return Math.floor((r * Math.max(0, 100 + src.stat('int'))) / 100) + src.stat('soin');
  };
  K.dotValues = (src, fx) => {
    const elStat = src.stat(K.ELEMENTS[fx.el].stat) + src.stat('pui');
    const m = (Math.max(0, 100 + elStat) / 100) * ((100 + src.stat('pctPoison') + src.stat('pctDmg')) / 100);
    return { min: Math.floor(fx.min * m), max: Math.floor(fx.max * m) };
  };
  K.pushDamage = (src, cells) => Math.floor(((src.lvl / 2 + 16 + src.stat('dpou')) * cells) / 2);
  K.critChance = (u, sp) => K.clamp(u.stat('crit') + (sp.crit || 0), 0, 100);
  K.defaultAff = (fx) => {
    if (fx.aff) return fx.aff;
    if (fx.t === 'heal' || fx.t === 'shield') return 'allies';
    if (fx.t === 'buff') return fx.val >= 0 ? 'allies' : 'enemies';
    return 'enemies';
  };

  // ─── Unités ───
  class Unit {
    constructor(o) {
      Object.assign(this, o);
      this.buffs = [];
      this.dots = [];
      this.shields = [];
      this.cds = {};
      this.casts = {};
      this.dead = false;
      this.pa = 0;
      this.pm = 0;
      this.dealt = 0;
      this.healed = 0;
    }
    stat(k) {
      let v = this.s[k] || 0;
      for (const b of this.buffs) if (b.stat === k) v += b.val;
      return v;
    }
    res(el) {
      return K.clamp(this.stat(K.ELEMENTS[el].res), -100, 50);
    }
    get shield() {
      return K.sum(this.shields, (s) => s.amt);
    }
  }
  K.Unit = Unit;

  K.makeCharUnit = (c, full) =>
    new Unit({
      uid: K.uid(),
      side: 'ally',
      kind: 'char',
      ref: c.id,
      cls: c.cls,
      name: c.name,
      i: K.CLASSES[c.cls].i,
      lvl: c.lvl,
      s: full.s,
      pvMax: full.pvMax,
      pv: full.pvMax,
      spells: K.charSpells(c, full.mods),
      ai: K.CLASSES[c.cls].ai,
      pref: K.CLASSES[c.cls].pref,
    });

  K.mobStats = (def, L) => {
    const s = K.zeroStats();
    const els = new Set();
    for (const sp of def.spells) for (const f of sp.fx) if (f.el) els.add(f.el);
    for (const el of els) s[K.ELEMENTS[el].stat] = Math.round(6 * L * def.pow);
    if (def.spells.some((sp) => sp.fx.some((f) => f.t === 'heal'))) s.int = Math.max(s.int, 4 * L);
    s.pa = def.pa;
    s.pm = def.pm;
    s.crit = 5;
    s.do = Math.floor(L / 4);
    s.soin = Math.floor(L / 2);
    s.ini = 10 + 4 * L + (def.boss ? 30 : 0);
    s.renvoi = def.renvoi ? Math.round((def.renvoi * L) / 4) : 0;
    Object.assign(s, def.res);
    return s;
  };

  K.makeMobUnit = (id, L) => {
    const def = K.MONSTERS[id];
    const pvMax = def.dummy ? 99999 : Math.round(def.k * (30 + 11 * L));
    return new Unit({
      uid: K.uid(),
      side: 'enemy',
      kind: def.dummy ? 'dummy' : 'mob',
      ref: id,
      name: def.n,
      i: def.i,
      lvl: L,
      boss: !!def.boss,
      s: K.mobStats(def, L),
      pvMax,
      pv: pvMax,
      spells: def.spells.map((s) => K.deepCopy(s)),
      ai: def.ai,
      pref: def.pref,
    });
  };

  // ─── Combat ───
  class Combat {
    constructor(opts) {
      this.W = W;
      this.H = H;
      this.zone = opts.zone;
      this.room = opts.room;
      this.training = !!opts.training;
      this.units = [];
      this.obst = new Set();
      this.listeners = [];
      this.logs = [];
      this.phase = 'placement';
      this.round = 0;
      this.idx = -1;
      this.order = [];
      this.current = null;
      this.auto = false;
      this.fast = false;
      this.over = false;
      this.result = null;
      this._wait = null;

      this.genMap();
      for (const a of opts.allies) this.units.push(a);
      for (const e of opts.enemies) this.units.push(e);
      this.placeStart();
    }

    // ─── Grille ───
    key(x, y) {
      return x + ',' + y;
    }
    inside(x, y) {
      return x >= 0 && y >= 0 && x < W && y < H;
    }
    isObst(x, y) {
      return this.obst.has(this.key(x, y));
    }
    unitAt(x, y) {
      return this.units.find((u) => !u.dead && u.x === x && u.y === y) || null;
    }
    free(x, y) {
      return this.inside(x, y) && !this.isObst(x, y) && !this.unitAt(x, y);
    }
    alive(side) {
      return this.units.filter((u) => !u.dead && (!side || u.side === side));
    }

    genMap() {
      for (let tries = 0; tries < 60; tries++) {
        this.obst.clear();
        const n = K.rand(9, 14);
        while (this.obst.size < n) this.obst.add(this.key(K.rand(2, W - 3), K.rand(0, H - 1)));
        if (this.connected()) break;
      }
      this.allyCells = [];
      this.enemyCells = [];
      for (let y = 0; y < H; y++) {
        this.allyCells.push([0, y], [1, y]);
        this.enemyCells.push([W - 1, y], [W - 2, y]);
      }
    }

    connected() {
      const freeCells = [];
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (!this.isObst(x, y)) freeCells.push([x, y]);
      const seen = new Set([this.key(...freeCells[0])]);
      const q = [freeCells[0]];
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const k = this.key(nx, ny);
          if (this.inside(nx, ny) && !this.isObst(nx, ny) && !seen.has(k)) {
            seen.add(k);
            q.push([nx, ny]);
          }
        }
      }
      return seen.size === freeCells.length;
    }

    placeStart() {
      const place = (units, cells, col) => {
        const rows = K.shuffle([1, 3, 5, 7, 2, 4, 6, 0, 8]);
        units.forEach((u, i) => {
          u.x = col;
          u.y = rows[i % rows.length];
        });
      };
      place(this.units.filter((u) => u.side === 'ally'), this.allyCells, 1);
      place(this.units.filter((u) => u.side === 'enemy'), this.enemyCells, W - 2);
    }

    isAllyCell(x, y) {
      return x <= 1;
    }

    placeAlly(u, x, y) {
      if (this.phase !== 'placement' || u.side !== 'ally' || !this.isAllyCell(x, y) || this.isObst(x, y)) return;
      const other = this.unitAt(x, y);
      if (other && other.side !== 'ally') return;
      if (other) {
        other.x = u.x;
        other.y = u.y;
      }
      u.x = x;
      u.y = y;
      this.emit({ type: 'update' });
    }

    // ─── Ligne de vue ───
    blocksLos(x, y) {
      return this.isObst(x, y) || !!this.unitAt(x, y);
    }
    los(x0, y0, x1, y1) {
      let dx = Math.abs(x1 - x0);
      let dy = Math.abs(y1 - y0);
      let x = x0;
      let y = y0;
      let n = 1 + dx + dy;
      const xi = x1 > x0 ? 1 : -1;
      const yi = y1 > y0 ? 1 : -1;
      let err = dx - dy;
      dx *= 2;
      dy *= 2;
      for (; n > 0; n--) {
        if (!(x === x0 && y === y0) && !(x === x1 && y === y1) && this.blocksLos(x, y)) return false;
        if (err > 0) {
          x += xi;
          err -= dy;
        } else if (err < 0) {
          y += yi;
          err += dx;
        } else {
          x += xi;
          y += yi;
          err += dx - dy;
          n--;
        }
      }
      return true;
    }

    // ─── Déplacements ───
    reachable(u) {
      const map = new Map();
      const start = { x: u.x, y: u.y, d: 0, prev: null };
      const q = [start];
      const seen = new Set([this.key(u.x, u.y)]);
      while (q.length) {
        const c = q.shift();
        if (c.d >= u.pm) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          const k = this.key(nx, ny);
          if (seen.has(k) || !this.free(nx, ny)) continue;
          seen.add(k);
          const n = { x: nx, y: ny, d: c.d + 1, prev: c };
          map.set(k, n);
          q.push(n);
        }
      }
      return map;
    }
    pathTo(reach, x, y) {
      const path = [];
      let c = reach.get(this.key(x, y));
      while (c && c.prev) {
        path.unshift({ x: c.x, y: c.y });
        c = c.prev;
      }
      return path;
    }
    // Distances de marche depuis un ensemble de sources (pour l'IA de mêlée).
    walkMap(sources, self) {
      const dist = new Map();
      const q = [];
      for (const s of sources) {
        dist.set(this.key(s.x, s.y), 0);
        q.push(s);
      }
      while (q.length) {
        const c = q.shift();
        const d = dist.get(this.key(c.x, c.y));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          const k = this.key(nx, ny);
          if (dist.has(k) || !this.inside(nx, ny) || this.isObst(nx, ny)) continue;
          const occ = this.unitAt(nx, ny);
          if (occ && occ !== self) continue;
          dist.set(k, d + 1);
          q.push({ x: nx, y: ny });
        }
      }
      return dist;
    }

    async move(u, path) {
      for (const step of path) {
        if (u.pm <= 0 || !this.free(step.x, step.y)) break;
        u.x = step.x;
        u.y = step.y;
        u.pm--;
        this.emit({ type: 'update' });
        await K.sleep(this.speed(110));
      }
    }

    speed(ms) {
      return this.fast ? Math.round(ms / 3) : ms;
    }

    // ─── Sorts ───
    rangeOf(u, sp) {
      const max = sp.po[1] + (sp.mod ? u.stat('po') : 0);
      return { min: sp.po[0], max: Math.max(sp.po[0], max) };
    }

    spellReady(u, sp) {
      if (u.pa < sp.pa) return { ok: false, why: 'PA insuffisants' };
      if ((u.cds[sp.id] || 0) > 0) return { ok: false, why: `Relance dans ${u.cds[sp.id]} tour(s)` };
      if ((u.casts[sp.id] || 0) >= sp.per) return { ok: false, why: 'Limite de lancers atteinte' };
      return { ok: true };
    }

    inRange(u, sp, tx, ty) {
      if (!this.inside(tx, ty) || this.isObst(tx, ty)) return false;
      const r = this.rangeOf(u, sp);
      const d = Math.abs(tx - u.x) + Math.abs(ty - u.y);
      if (d < r.min || d > r.max) return false;
      if (sp.line && tx !== u.x && ty !== u.y) return false;
      if (sp.ldv !== false && d > 1 && !this.los(u.x, u.y, tx, ty)) return false;
      return true;
    }

    targetOk(u, sp, tx, ty) {
      const t = this.unitAt(tx, ty);
      switch (sp.tgt) {
        case 'enemy':
          return !!t && t.side !== u.side;
        case 'ally':
          return !!t && t.side === u.side;
        case 'unit':
          return !!t && t !== u;
        case 'empty':
          return !t;
        case 'self':
          return tx === u.x && ty === u.y;
        default:
          return true;
      }
    }

    canCast(u, sp, tx, ty) {
      const r = this.spellReady(u, sp);
      if (!r.ok) return r;
      if (!this.inRange(u, sp, tx, ty)) return { ok: false, why: 'Hors de portée' };
      if (!this.targetOk(u, sp, tx, ty)) return { ok: false, why: 'Cible invalide' };
      return { ok: true };
    }

    zoneCells(zone, u, tx, ty) {
      return K.rawZone(zone, u, tx, ty).filter(([x, y]) => this.inside(x, y) && !this.isObst(x, y));
    }

    affects(fx, u, t) {
      const aff = K.defaultAff(fx);
      if (aff === 'all') return true;
      return aff === 'allies' ? t.side === u.side : t.side !== u.side;
    }

    async cast(u, sp, tx, ty) {
      const chk = this.canCast(u, sp, tx, ty);
      if (!chk.ok) return false;
      u.pa -= sp.pa;
      u.casts[sp.id] = (u.casts[sp.id] || 0) + 1;
      if (sp.cd > 0) u.cds[sp.id] = sp.cd;
      const rolls = sp.fx.some((f) => f.t === 'dmg' || f.t === 'heal');
      const crit = rolls && K.chance(K.critChance(u, sp));
      const melee = Math.abs(tx - u.x) + Math.abs(ty - u.y) <= 1;
      const cells = this.zoneCells(sp.zone, u, tx, ty);
      const inZone = cells.map(([x, y]) => this.unitAt(x, y)).filter(Boolean);
      this.log(`${this.tag(u)} lance <b>${K.esc(sp.n)}</b>${crit ? ' — <span class="crit">coup critique !</span>' : ''}`);
      this.emit({ type: 'cast', unit: u, spell: sp, x: tx, y: ty, cells, crit });
      await K.sleep(this.speed(260));

      for (const fx of sp.fx) {
        if (this.over && !this.training) break;
        if (fx.t === 'tp') {
          if (this.free(tx, ty)) {
            u.x = tx;
            u.y = ty;
          }
          continue;
        }
        if (fx.t === 'swap') {
          const t = this.unitAt(tx, ty);
          if (t && t !== u) {
            [u.x, t.x] = [t.x, u.x];
            [u.y, t.y] = [t.y, u.y];
          }
          continue;
        }
        if (fx.t === 'dash') {
          await this.dash(u, tx, ty, fx.n);
          continue;
        }
        let targets = fx.on === 'self' ? [u] : inZone.filter((t) => !t.dead && this.affects(fx, u, t));
        if (fx.t === 'push') targets.sort((a, b) => K.dist(b, u) - K.dist(a, u));
        if (fx.t === 'pull') targets.sort((a, b) => K.dist(a, u) - K.dist(b, u));
        for (const t of targets) await this.applyFx(u, t, fx, sp, crit, melee, tx, ty);
      }
      this.emit({ type: 'update' });
      this.checkEnd();
      return true;
    }

    async applyFx(u, t, fx, sp, crit, melee, tx, ty) {
      if (t.dead) return;
      switch (fx.t) {
        case 'dmg': {
          const r = K.rand(fx.min, fx.max);
          const v = K.dmgValue(u, t, fx, crit ? K.critRoll(r) : r, crit, melee);
          const done = this.damage(u, t, v, { el: fx.el, crit });
          const vol = (fx.vol || 0) + u.stat('volVie') / 100;
          if (vol > 0 && done > 0 && !u.dead) this.heal(u, u, Math.floor(done * vol));
          const rv = t.stat('renvoi');
          if (rv > 0 && done > 0 && t !== u && !u.dead) this.damage(t, u, Math.min(rv, done), { el: fx.el, reflect: true });
          break;
        }
        case 'heal':
          this.heal(u, t, K.healValue(u, fx, K.rand(fx.min, fx.max), crit));
          break;
        case 'dot': {
          const v = K.dotValues(u, fx);
          t.dots.push({ el: fx.el, min: v.min, max: v.max, dur: fx.dur, src: u, n: sp.n });
          this.fx(t, '☠️ ' + sp.n, 'status');
          break;
        }
        case 'shield': {
          const amt = Math.round((t.pvMax * fx.pct) / 100);
          t.shields.push({ amt, dur: fx.dur });
          this.fx(t, '🛡️ ' + amt, 'shield');
          break;
        }
        case 'buff': {
          t.buffs.push({ stat: fx.stat, val: fx.val, dur: fx.dur, n: sp.n, id: sp.id });
          if (t === this.current && (fx.stat === 'pa' || fx.stat === 'pm')) t[fx.stat] = Math.max(0, t[fx.stat] + fx.val);
          this.fx(t, `${fx.val > 0 ? '+' : ''}${fx.val} ${K.STATS[fx.stat].s}`, fx.val > 0 ? 'buff' : 'debuff');
          break;
        }
        case 'push': {
          const from = fx.from === 'center' ? { x: tx, y: ty } : u;
          const d = K.dirFrom(from, t);
          if (d) await this.push(u, t, d, fx.n);
          break;
        }
        case 'pull': {
          const to = fx.to === 'center' ? { x: tx, y: ty } : u;
          const d = K.dirFrom(t, to);
          if (d) await this.pull(t, d, fx.n, to);
          break;
        }
      }
    }

    async push(src, t, d, n) {
      for (let i = 0; i < n; i++) {
        const nx = t.x + d.x;
        const ny = t.y + d.y;
        if (!this.free(nx, ny)) {
          const v = K.pushDamage(src, n - i);
          this.damage(src, t, v, { push: true });
          const other = this.unitAt(nx, ny);
          if (other) this.damage(src, other, Math.floor(v / 2), { push: true });
          return;
        }
        t.x = nx;
        t.y = ny;
        this.emit({ type: 'update' });
        await K.sleep(this.speed(70));
      }
    }

    async pull(t, d, n, to) {
      for (let i = 0; i < n; i++) {
        if (t.x === to.x && t.y === to.y) return;
        const nx = t.x + d.x;
        const ny = t.y + d.y;
        if (!this.free(nx, ny)) return;
        t.x = nx;
        t.y = ny;
        this.emit({ type: 'update' });
        await K.sleep(this.speed(70));
      }
    }

    async dash(u, tx, ty, n) {
      const d = K.dirAxis(u, { x: tx, y: ty });
      if (!d) return;
      for (let i = 0; i < n; i++) {
        const nx = u.x + d.x;
        const ny = u.y + d.y;
        if ((nx === tx && ny === ty) || !this.free(nx, ny)) return;
        u.x = nx;
        u.y = ny;
        this.emit({ type: 'update' });
        await K.sleep(this.speed(60));
      }
    }

    // ─── Points de vie ───
    damage(src, t, amount, opts = {}) {
      if (t.dead) return 0;
      amount = Math.max(0, Math.floor(amount));
      let rest = amount;
      let absorbed = 0;
      for (const sh of t.shields) {
        const a = Math.min(sh.amt, rest);
        sh.amt -= a;
        rest -= a;
        absorbed += a;
        if (!rest) break;
      }
      t.shields = t.shields.filter((s) => s.amt > 0);
      t.pv = Math.max(0, t.pv - rest);
      if (src && src.side !== t.side) src.dealt += amount;
      const cls = opts.push ? 'dmg push' : opts.reflect ? 'dmg reflect' : `dmg el-${opts.el || 'none'}${opts.crit ? ' crit' : ''}`;
      if (rest || !absorbed) this.fx(t, `-${rest}${opts.crit ? '!' : ''}`, cls);
      if (absorbed) this.fx(t, `🛡️-${absorbed}`, 'shield');
      const how = opts.push ? ' (poussée)' : opts.reflect ? ' (renvoi)' : opts.dot ? ' (poison)' : '';
      this.log(`${this.tag(t)} perd <b>${rest}</b> PV${absorbed ? ` (+${absorbed} absorbés)` : ''}${how}`);
      if (t.kind === 'dummy') t.pv = t.pvMax;
      if (t.pv <= 0) this.kill(t, src);
      return amount;
    }

    heal(src, t, amount) {
      if (t.dead) return 0;
      const v = Math.max(0, Math.min(Math.floor(amount), t.pvMax - t.pv));
      t.pv += v;
      if (src) src.healed += v;
      this.fx(t, `+${v}`, 'heal');
      if (v) this.log(`${this.tag(t)} récupère <b>${v}</b> PV`);
      return v;
    }

    kill(t, src) {
      t.dead = true;
      t.dots = [];
      t.buffs = [];
      t.shields = [];
      this.log(`💀 ${this.tag(t)} est vaincu${t.boss ? ' !' : '.'}`);
      this.emit({ type: 'death', unit: t });
      if (t === this.current && this._wait) setTimeout(() => this.passTurn(), 0);
      if (src && src !== t && !src.dead && src === this.current) {
        const kp = src.stat('killPa');
        if (kp > 0) {
          src.pa += kp;
          this.fx(src, `+${kp} PA`, 'buff');
        }
      }
    }

    // ─── Déroulement ───
    async start() {
      if (this.phase !== 'placement') return;
      this.phase = 'fight';
      this.order = K.shuffle(this.units).sort((a, b) => b.s.ini - a.s.ini);
      this.round = 1;
      for (const u of this.units) {
        const sh = u.stat('shieldStart');
        if (sh > 0) u.shields.push({ amt: Math.round((u.pvMax * sh) / 100), dur: 99 });
      }
      this.log('<span class="round">— Tour 1 —</span>');
      this.emit({ type: 'update' });
      await this.run();
    }

    async run() {
      while (!this.over) {
        this.idx++;
        if (this.idx >= this.order.length) {
          this.idx = 0;
          this.round++;
          this.log(`<span class="round">— Tour ${this.round} —</span>`);
        }
        const u = this.order[this.idx];
        if (u.dead) continue;
        this.current = u;
        this.beginTurn(u);
        this.emit({ type: 'turn', unit: u });
        if (this.checkEnd()) break;
        if (u.dead) continue;
        if (u.side === 'enemy' || this.auto) {
          await K.sleep(this.speed(250));
          await K.AI.play(this, u);
        } else {
          await new Promise((res) => (this._wait = res));
          this._wait = null;
        }
        if (this.over) break;
        this.endTurn(u);
        if (this.round > 60 && !this.training) this.end('lose');
      }
    }

    beginTurn(u) {
      u.casts = {};
      for (const id in u.cds) if (u.cds[id] > 0) u.cds[id]--;
      for (const d of u.dots.slice()) {
        if (u.dead) break;
        const raw = K.rand(d.min, d.max);
        const v = Math.floor((raw * (100 - u.res(d.el))) / 100);
        this.damage(d.src, u, v, { el: d.el, dot: true });
        d.dur--;
      }
      u.dots = u.dots.filter((d) => d.dur > 0);
      if (u.dead) return;
      const rg = u.stat('regen');
      if (rg > 0 && u.pv < u.pvMax) this.heal(u, u, Math.round((u.pvMax * rg) / 100));
      u.pa = Math.max(0, u.stat('pa'));
      u.pm = Math.max(0, u.stat('pm'));
    }

    endTurn(u) {
      for (const b of u.buffs) b.dur--;
      u.buffs = u.buffs.filter((b) => b.dur > 0);
      for (const s of u.shields) s.dur--;
      u.shields = u.shields.filter((s) => s.dur > 0);
    }

    // Appelé par l'interface quand le joueur termine son tour.
    passTurn() {
      if (this._wait) this._wait();
    }

    isPlayerTurn() {
      return this.phase === 'fight' && !this.over && this.current && this.current.side === 'ally' && !!this._wait;
    }

    async setAuto(v) {
      this.auto = v;
      this.emit({ type: 'update' });
      if (v && this.isPlayerTurn()) {
        const w = this._wait;
        this._autoRunning = true;
        await K.AI.play(this, this.current);
        this._autoRunning = false;
        if (this._wait === w) w();
      }
    }

    checkEnd() {
      if (this.over) return true;
      if (!this.alive('ally').length) return this.end('lose'), true;
      if (!this.alive('enemy').length) return this.end('win'), true;
      return false;
    }

    end(result) {
      if (this.over) return;
      this.over = true;
      this.result = result;
      this.phase = 'end';
      if (this._wait) this._wait();
      this.emit({ type: 'end', result });
    }

    // ─── Événements ───
    emit(ev) {
      for (const l of this.listeners) l(ev);
    }
    fx(u, text, cls) {
      this.emit({ type: 'fx', x: u.x, y: u.y, text, cls });
    }
    tag(u) {
      return `<span class="tag ${u.side}">${K.esc(u.name)}</span>`;
    }
    log(html) {
      this.logs.push(html);
      if (this.logs.length > 120) this.logs.shift();
      this.emit({ type: 'log' });
    }
  }
  K.Combat = Combat;

  // Prépare un combat pour une salle de donjon (ou l'entraînement).
  K.createCombat = (zone, room, opts = {}) => {
    const team = K.teamChars();
    const syn = K.computeSynergies(team).bonus;
    const allies = team.map((c) => K.makeCharUnit(c, K.computeStats(c, syn)));
    let enemies;
    if (opts.training) {
      const L = Math.max(1, Math.round(K.sum(team, (c) => c.lvl) / Math.max(1, team.length)));
      enemies = [0, 1, 2].map(() => K.makeMobUnit('mannequin', L));
      enemies.forEach((e) => {
        Object.assign(e.s, opts.dummyRes || {});
      });
    } else {
      const L = K.roomLevel(zone, room);
      enemies = zone.rooms[room].mobs.map((id) => K.makeMobUnit(id, K.MONSTERS[id].boss ? L + 1 : L));
    }
    return new Combat({ zone, room, allies, enemies, training: !!opts.training });
  };
})(window.K);
