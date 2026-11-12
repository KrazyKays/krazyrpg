// IA : évalue chaque couple (case de déplacement, sort, cible) et joue le meilleur, puis se replace.
// Sert aux monstres et au mode « combat auto » des personnages.
(function (K) {
  const BUFF_W = { pa: 14, pm: 7, po: 3, pui: 0.25, crit: 0.6 };

  K.AI = {
    async play(cb, u) {
      for (let iter = 0; iter < 8 && !cb.over && !u.dead; iter++) {
        const best = this.bestAction(cb, u);
        if (!best || best.score <= 0.5) break;
        if (best.path.length) await cb.move(u, best.path);
        if (cb.over || u.dead) break;
        if (!cb.canCast(u, best.sp, best.tx, best.ty).ok) break;
        await cb.cast(u, best.sp, best.tx, best.ty);
        await K.sleep(cb.speed(180));
      }
      if (!cb.over && !u.dead && u.pm > 0) await this.reposition(cb, u);
    },

    candidates(cb, u, sp, alive) {
      if (sp.tgt === 'self') return null; // case du lanceur, calculée à la volée
      if (sp.tgt === 'empty') return [];
      const r = K.zoneRadius(sp.zone);
      const set = new Map();
      for (const t of alive)
        for (let dx = -r; dx <= r; dx++)
          for (let dy = -r; dy <= r; dy++)
            if (Math.abs(dx) + Math.abs(dy) <= r) {
              const x = t.x + dx;
              const y = t.y + dy;
              if (cb.inside(x, y)) set.set(cb.key(x, y), [x, y]);
            }
      return [...set.values()];
    },

    bestAction(cb, u) {
      const spells = u.spells.filter((sp) => cb.spellReady(u, sp).ok);
      if (!spells.length) return null;
      const reach = cb.reachable(u);
      const origin = { x: u.x, y: u.y, d: 0 };
      const cells = [origin, ...reach.values()];
      const alive = cb.alive();
      const foes = alive.filter((t) => t.side !== u.side);
      let best = null;
      const cand = spells.map((sp) => ({ sp, list: this.candidates(cb, u, sp, alive) }));
      for (const c of cells) {
        u.x = c.x;
        u.y = c.y;
        let pen = c.d * 0.3;
        if (u.ai !== 'melee' && foes.some((f) => K.dist(f, c) <= 1)) pen += 6;
        for (const { sp, list } of cand) {
          for (const [tx, ty] of list || [[c.x, c.y]]) {
            if (!cb.inRange(u, sp, tx, ty) || !cb.targetOk(u, sp, tx, ty)) continue;
            const sc = this.evaluate(cb, u, sp, tx, ty) - pen;
            if (sc > 0 && (!best || sc > best.score)) best = { score: sc, sp, tx, ty, cell: c };
          }
        }
      }
      u.x = origin.x;
      u.y = origin.y;
      if (best) best.path = best.cell.d ? cb.pathTo(reach, best.cell.x, best.cell.y) : [];
      return best;
    },

    evaluate(cb, u, sp, tx, ty) {
      const inZone = cb
        .zoneCells(sp.zone, u, tx, ty)
        .map(([x, y]) => cb.unitAt(x, y))
        .filter((t) => t && !t.dead);
      const melee = Math.abs(tx - u.x) + Math.abs(ty - u.y) <= 1;
      let sc = 0;
      for (const fx of sp.fx) {
        if (fx.t === 'dash' || fx.t === 'tp' || fx.t === 'swap') continue;
        const targets = fx.on === 'self' ? [u] : inZone.filter((t) => cb.affects(fx, u, t));
        for (const t of targets) {
          switch (fx.t) {
            case 'dmg': {
              const avg = K.dmgValue(u, t, fx, (fx.min + fx.max) / 2, false, melee);
              const hp = t.pv + t.shield;
              sc += Math.min(avg, hp) * (t.kind === 'dummy' ? 0.2 : 1);
              if (avg >= hp && t.kind !== 'dummy') sc += 25;
              break;
            }
            case 'dot': {
              const v = K.dotValues(u, fx);
              sc += ((v.min + v.max) / 2) * fx.dur * 0.6;
              break;
            }
            case 'heal': {
              const miss = t.pvMax - t.pv;
              sc += Math.min(miss, K.healValue(u, fx, (fx.min + fx.max) / 2, false)) * 1.1;
              break;
            }
            case 'shield': {
              if (t.shield > 0) break;
              const v = Math.round((t.pvMax * fx.pct) / 100);
              sc += v * (t.pv < t.pvMax * 0.8 ? 0.7 : 0.25);
              break;
            }
            case 'buff': {
              if (t.buffs.some((b) => b.id === sp.id)) break;
              sc += Math.abs(fx.val) * (BUFF_W[fx.stat] || 0.2);
              break;
            }
            case 'push':
              sc += 3;
              break;
            case 'pull':
              sc += 2;
              break;
          }
        }
      }
      return sc;
    },

    async reposition(cb, u) {
      const foes = cb.alive().filter((t) => t.side !== u.side);
      if (!foes.length) return;
      const reach = cb.reachable(u);
      if (!reach.size) return;
      const cells = [{ x: u.x, y: u.y, d: 0 }, ...reach.values()];
      let best = null;
      if (u.ai === 'melee') {
        const adj = [];
        for (const f of foes) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) adj.push({ x: f.x + dx, y: f.y + dy });
        const wm = cb.walkMap(adj.filter((c) => cb.inside(c.x, c.y) && !cb.isObst(c.x, c.y)), u);
        for (const c of cells) {
          const d = wm.has(cb.key(c.x, c.y)) ? wm.get(cb.key(c.x, c.y)) : 99;
          const sc = -d * 10 - c.d * 0.1;
          if (!best || sc > best.sc) best = { c, sc };
        }
      } else {
        const pref = u.pref || 4;
        for (const c of cells) {
          const near = Math.min(...foes.map((f) => K.dist(f, c)));
          const sc = -Math.abs(near - pref) * 10 - c.d * 0.1 - (near <= 1 ? 15 : 0);
          if (!best || sc > best.sc) best = { c, sc };
        }
      }
      if (best && best.c.d) await cb.move(u, cb.pathTo(reach, best.c.x, best.c.y));
    },
  };
})(window.K);
