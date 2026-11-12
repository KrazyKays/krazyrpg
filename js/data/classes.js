// Classes jouables et leurs sorts.
//
// Format d'un sort :
//  pa, po:[min,max], mod (portée modifiable par la stat PO), line (lancer en ligne), ldv (ligne de vue),
//  cd (tours de relance), per (lancers par tour), tgt (cible : enemy|ally|unit|empty|any|self),
//  zone : ['single'] | ['circle', r] | ['cross', r] | ['line', longueur] | ['perp', r]
//  fx : liste d'effets
//    dmg {el,min,max,vol?}   heal {min,max}   dot {el,min,max,dur}   shield {pct,dur}
//    buff {stat,val,dur,on?}  push {n,from?:'center'}  pull {n,to?:'center'}  dash {n}  tp  swap
//    aff : enemies|allies|all (par défaut : dégâts → ennemis, soins/boucliers/bonus → alliés, malus → ennemis)
(function (K) {
  K.sp = (o) => {
    const s = Object.assign(
      { mod: true, ldv: true, line: false, cd: 0, tgt: 'enemy', zone: ['single'], crit: 5, lvl: 1, desc: '' },
      o
    );
    if (s.per == null) s.per = s.cd > 0 ? 1 : 2;
    return s;
  };
  const sp = K.sp;
  const dmg = (el, min, max, extra) => Object.assign({ t: 'dmg', el, min, max }, extra);

  K.CLASSES = {
    ferrailleur: {
      id: 'ferrailleur',
      n: 'Ferrailleur',
      i: '🪓',
      role: 'Mêlée · encaisse et frappe fort',
      els: ['terre', 'feu'],
      ai: 'melee',
      pref: 1,
      desc: "Colosse de première ligne. Il charge, repousse et cogne. Ses meilleurs sorts sont au corps à corps : la Force et l'Intelligence se partagent ses dégâts.",
      passive: { n: 'Peau de fer', d: '+5 % de résistance à tous les éléments', stats: { reTerre: 5, reFeu: 5, reEau: 5, reAir: 5 } },
      spells: [
        sp({ id: 'fer_taille', n: 'Coup de Taille', i: '🪓', pa: 3, po: [1, 1], mod: false, per: 3, fx: [dmg('terre', 13, 17)], desc: 'Frappe de base, lançable trois fois.' }),
        sp({ id: 'fer_charge', n: 'Charge', i: '🐗', pa: 3, po: [2, 4], mod: false, line: true, cd: 1, fx: [{ t: 'dash', n: 3 }, dmg('terre', 9, 11)], desc: "Fonce vers la cible puis la frappe." }),
        sp({ id: 'fer_braise', n: 'Lame Braise', i: '🗡️', pa: 4, po: [1, 1], mod: false, per: 2, fx: [dmg('feu', 17, 21)], desc: 'Une lame chauffée à blanc.' }),
        sp({ id: 'fer_rempart', n: 'Rempart', i: '🛡️', pa: 2, po: [0, 0], tgt: 'self', cd: 3, lvl: 4, fx: [{ t: 'shield', pct: 20, dur: 2 }], desc: 'Bouclier de 20 % des PV max pendant 2 tours.' }),
        sp({ id: 'fer_seisme', n: 'Onde Sismique', i: '💥', pa: 4, po: [0, 0], tgt: 'self', zone: ['circle', 1], cd: 1, lvl: 8, fx: [dmg('terre', 11, 14), { t: 'push', n: 1 }], desc: 'Frappe le sol : touche et repousse les ennemis au contact.' }),
        sp({ id: 'fer_fureur', n: 'Fureur', i: '😤', pa: 2, po: [0, 0], tgt: 'self', cd: 4, lvl: 13, fx: [{ t: 'buff', stat: 'pui', val: 80, dur: 2 }], desc: '+80 Puissance pendant 2 tours.' }),
        sp({ id: 'fer_fendoir', n: 'Fendoir Ardent', i: '🌋', pa: 5, po: [1, 1], mod: false, zone: ['line', 3], cd: 1, lvl: 20, fx: [dmg('feu', 20, 25)], desc: 'Fend la ligne sur 3 cases.' }),
        sp({ id: 'fer_titan', n: 'Colère du Titan', i: '⛰️', pa: 6, po: [1, 1], mod: false, cd: 3, crit: 10, lvl: 28, fx: [dmg('terre', 36, 44)], desc: 'Le coup le plus lourd du jeu.' }),
      ],
    },
    arcaniste: {
      id: 'arcaniste',
      n: 'Arcaniste',
      i: '🔮',
      role: 'Distance · zones et placement',
      els: ['feu', 'air'],
      ai: 'ranged',
      pref: 5,
      desc: "Mage de feu et de vent. Il frappe de loin, en zone, et contrôle le terrain en repoussant et attirant. Intelligence ou Agilité, voire les deux.",
      passive: { n: 'Œil arcanique', d: '+1 Portée', stats: { po: 1 } },
      spells: [
        sp({ id: 'arc_etincelle', n: 'Étincelle', i: '✨', pa: 3, po: [1, 6], per: 3, fx: [dmg('feu', 9, 12)], desc: 'Projectile de feu rapide.' }),
        sp({ id: 'arc_bourrasque', n: 'Bourrasque', i: '🍃', pa: 3, po: [1, 5], per: 2, fx: [dmg('air', 8, 10), { t: 'push', n: 2 }], desc: 'Repousse la cible de 2 cases. Contre un obstacle, la poussée blesse.' }),
        sp({ id: 'arc_clignement', n: 'Clignement', i: '🌀', pa: 2, po: [1, 4], mod: false, tgt: 'empty', cd: 2, fx: [{ t: 'tp' }], desc: 'Se téléporte sur une case libre.' }),
        sp({ id: 'arc_bouleFeu', n: 'Boule de Feu', i: '☄️', pa: 4, po: [2, 7], tgt: 'any', zone: ['circle', 1], cd: 1, lvl: 4, fx: [dmg('feu', 12, 15)], desc: 'Explose en zone (rayon 1).' }),
        sp({ id: 'arc_combustion', n: 'Combustion', i: '🔥', pa: 3, po: [1, 6], cd: 1, lvl: 8, fx: [{ t: 'dot', el: 'feu', min: 7, max: 9, dur: 3 }], desc: 'Brûle la cible au début de ses 3 prochains tours.' }),
        sp({ id: 'arc_rafale', n: 'Rafale', i: '💨', pa: 4, po: [2, 6], line: true, per: 2, lvl: 13, fx: [dmg('air', 15, 18)], desc: 'Puissant, mais en ligne uniquement.' }),
        sp({ id: 'arc_cyclone', n: 'Cyclone', i: '🌪️', pa: 5, po: [2, 5], tgt: 'any', zone: ['circle', 2], cd: 2, lvl: 20, fx: [dmg('air', 13, 17), { t: 'pull', n: 1, to: 'center' }], desc: 'Zone de rayon 2 qui aspire vers le centre.' }),
        sp({ id: 'arc_meteore', n: 'Météore', i: '🌠', pa: 6, po: [3, 8], tgt: 'any', zone: ['cross', 1], cd: 3, lvl: 28, fx: [dmg('feu', 32, 40)], desc: "Pluie de feu en croix." }),
      ],
    },
    oracle: {
      id: 'oracle',
      n: 'Oracle des Marées',
      i: '🌊',
      role: 'Soutien · soins et boucliers',
      els: ['eau'],
      ai: 'support',
      pref: 5,
      desc: "Garde l'équipe en vie : soins, bulles protectrices et échanges de place. Ses attaques d'Eau volent de la vie. Les soins profitent de l'Intelligence.",
      passive: { n: 'Flux vital', d: '+10 Soins et +20 Prospection', stats: { soin: 10, pp: 20 } },
      spells: [
        sp({ id: 'ora_goutte', n: 'Gouttelette', i: '💧', pa: 3, po: [1, 6], per: 3, fx: [dmg('eau', 8, 11, { vol: 0.5 })], desc: 'Vole 50 % des dommages infligés.' }),
        sp({ id: 'ora_source', n: 'Source', i: '⛲', pa: 3, po: [0, 5], tgt: 'ally', per: 2, fx: [{ t: 'heal', min: 12, max: 16 }], desc: 'Soigne un allié.' }),
        sp({ id: 'ora_bulle', n: 'Bulle', i: '🫧', pa: 3, po: [0, 5], tgt: 'ally', cd: 2, fx: [{ t: 'shield', pct: 18, dur: 2 }], desc: 'Bouclier de 18 % des PV max de la cible.' }),
        sp({ id: 'ora_vague', n: 'Vague', i: '🌊', pa: 4, po: [1, 4], tgt: 'any', zone: ['line', 3], per: 2, lvl: 4, fx: [dmg('eau', 11, 14), { t: 'push', n: 1 }], desc: 'Déferle sur 3 cases et repousse.' }),
        sp({ id: 'ora_torpeur', n: 'Torpeur', i: '😴', pa: 3, po: [1, 6], cd: 2, lvl: 8, fx: [dmg('eau', 6, 8), { t: 'buff', stat: 'pm', val: -2, dur: 1 }], desc: '−2 PM au prochain tour de la cible.' }),
        sp({ id: 'ora_maree', n: 'Marée Montante', i: '🌅', pa: 4, po: [0, 0], tgt: 'self', zone: ['circle', 2], cd: 2, lvl: 13, fx: [{ t: 'heal', min: 10, max: 13 }], desc: 'Soigne tous les alliés à 2 cases ou moins.' }),
        sp({ id: 'ora_inversion', n: 'Inversion', i: '🔄', pa: 2, po: [1, 6], tgt: 'unit', cd: 2, lvl: 20, fx: [{ t: 'swap' }], desc: "Échange sa place avec n'importe quelle créature." }),
        sp({ id: 'ora_deluge', n: 'Déluge', i: '⛈️', pa: 6, po: [2, 6], tgt: 'any', zone: ['circle', 2], cd: 3, lvl: 28, fx: [dmg('eau', 22, 28, { vol: 0.3 })], desc: 'Grande zone qui vole de la vie.' }),
      ],
    },
    rodeur: {
      id: 'rodeur',
      n: 'Rôdeur',
      i: '🏹',
      role: 'Distance · critiques et poisons',
      els: ['air', 'eau'],
      ai: 'ranged',
      pref: 6,
      desc: "Archer mobile qui joue avec les PM : il ralentit, empoisonne et frappe de très loin. Adore les coups critiques.",
      passive: { n: 'Instinct', d: '+5 % Critique', stats: { crit: 5 } },
      spells: [
        sp({ id: 'rod_fleche', n: 'Flèche Vive', i: '🏹', pa: 3, po: [2, 8], per: 3, fx: [dmg('air', 9, 12)], desc: 'Tir rapide à longue portée.' }),
        sp({ id: 'rod_glace', n: 'Flèche Glacée', i: '❄️', pa: 4, po: [2, 7], per: 2, fx: [dmg('eau', 11, 14), { t: 'buff', stat: 'pm', val: -1, dur: 1 }], desc: '−1 PM au prochain tour de la cible.' }),
        sp({ id: 'rod_pas', n: 'Pas de Côté', i: '👣', pa: 1, po: [0, 0], tgt: 'self', cd: 2, fx: [{ t: 'buff', stat: 'pm', val: 2, dur: 1 }], desc: '+2 PM ce tour-ci.' }),
        sp({ id: 'rod_recul', n: 'Flèche de Recul', i: '🎯', pa: 3, po: [1, 5], per: 2, lvl: 4, fx: [dmg('air', 7, 9), { t: 'push', n: 3 }], desc: 'Repousse de 3 cases.' }),
        sp({ id: 'rod_venin', n: 'Venin', i: '🐍', pa: 3, po: [1, 7], cd: 1, lvl: 8, fx: [{ t: 'dot', el: 'eau', min: 8, max: 10, dur: 3 }], desc: 'Poison sur 3 tours.' }),
        sp({ id: 'rod_lynx', n: 'Œil de Lynx', i: '👁️', pa: 2, po: [0, 0], tgt: 'self', cd: 3, lvl: 13, fx: [{ t: 'buff', stat: 'po', val: 3, dur: 1 }, { t: 'buff', stat: 'crit', val: 20, dur: 1 }], desc: '+3 PO et +20 % Critique ce tour-ci.' }),
        sp({ id: 'rod_pluie', n: 'Pluie de Flèches', i: '🌧️', pa: 5, po: [3, 8], tgt: 'any', zone: ['circle', 1], cd: 1, lvl: 20, fx: [dmg('air', 15, 18)], desc: 'Zone de rayon 1.' }),
        sp({ id: 'rod_harpon', n: 'Harpon', i: '🪝', pa: 4, po: [2, 6], line: true, cd: 2, lvl: 28, fx: [dmg('eau', 16, 19), { t: 'pull', n: 3 }], desc: 'Attire la cible de 3 cases.' }),
      ],
    },
    chronomancien: {
      id: 'chronomancien',
      n: 'Chronomancien',
      i: '⏳',
      role: 'Soutien · vole et donne des PA',
      els: ['eau', 'air'],
      ai: 'ranged',
      pref: 4,
      desc: "Manipule le temps : donne des PA à ses alliés, en retire aux ennemis et protège l'équipe. Deux éléments, Eau et Air, pour des builds multi.",
      passive: { n: 'Avance sur le temps', d: '+40 Initiative', stats: { ini: 40 } },
      spells: [
        sp({ id: 'chr_tic', n: 'Tic', i: '⏱️', pa: 3, po: [1, 5], per: 3, fx: [dmg('eau', 9, 12)], desc: "Tic…" }),
        sp({ id: 'chr_tac', n: 'Tac', i: '⏲️', pa: 3, po: [1, 5], per: 3, fx: [dmg('air', 9, 12)], desc: '…Tac.' }),
        sp({ id: 'chr_accel', n: 'Accélération', i: '⏩', pa: 2, po: [1, 5], tgt: 'ally', cd: 3, fx: [{ t: 'buff', stat: 'pa', val: 2, dur: 1 }], desc: "+2 PA pour le prochain tour d'un allié." }),
        sp({ id: 'chr_ralenti', n: 'Ralentissement', i: '⏪', pa: 3, po: [1, 6], cd: 2, lvl: 4, fx: [dmg('eau', 5, 7), { t: 'buff', stat: 'pa', val: -2, dur: 1 }], desc: '−2 PA au prochain tour de la cible.' }),
        sp({ id: 'chr_sablier', n: 'Sablier', i: '⌛', pa: 3, po: [0, 0], tgt: 'self', zone: ['circle', 2], cd: 3, lvl: 8, fx: [{ t: 'shield', pct: 12, dur: 2 }], desc: 'Bouclier de 12 % à tous les alliés proches.' }),
        sp({ id: 'chr_paradoxe', n: 'Paradoxe', i: '♾️', pa: 4, po: [1, 6], tgt: 'any', zone: ['circle', 1], per: 2, lvl: 13, fx: [dmg('air', 13, 16)], desc: 'Zone de rayon 1.' }),
        sp({ id: 'chr_retour', n: 'Retour Temporel', i: '↩️', pa: 3, po: [0, 5], tgt: 'ally', cd: 2, lvl: 20, fx: [{ t: 'heal', min: 14, max: 18 }], desc: 'Rembobine les blessures.' }),
        sp({ id: 'chr_fin', n: 'Fin des Temps', i: '🕳️', pa: 6, po: [1, 5], cd: 3, lvl: 28, fx: [dmg('eau', 30, 38), { t: 'buff', stat: 'pa', val: -2, dur: 1 }], desc: 'Dégâts massifs et −2 PA.' }),
      ],
    },
  };

  K.SPELLS = {};
  for (const c of Object.values(K.CLASSES)) for (const s of c.spells) K.SPELLS[s.id] = Object.assign(s, { cls: c.id });

  K.FIST = sp({ id: 'arme', n: 'Coup de poing', i: '👊', pa: 3, po: [1, 1], mod: false, per: 2, isWeapon: true, fx: [dmg('terre', 3, 5)], desc: 'Sans arme…' });

  K.NAMES = ['Brakk', 'Ysolde', 'Pim', 'Torvald', 'Nessa', 'Orin', 'Lysia', 'Garm', 'Mirelle', 'Thadée', 'Sôn', 'Ivo', 'Kaelia', 'Bertrand', 'Zélie', 'Ombre', 'Fennec', 'Ludo'];
})(window.K);
