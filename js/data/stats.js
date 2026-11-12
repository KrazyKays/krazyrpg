// Caractéristiques, éléments et emplacements d'équipement.
(function (K) {
  K.ELEMENTS = {
    terre: { n: 'Terre', stat: 'for', res: 'reTerre', i: '⛰️' },
    feu: { n: 'Feu', stat: 'int', res: 'reFeu', i: '🔥' },
    eau: { n: 'Eau', stat: 'cha', res: 'reEau', i: '💧' },
    air: { n: 'Air', stat: 'agi', res: 'reAir', i: '🌪️' },
  };
  K.EL_ORDER = ['terre', 'feu', 'eau', 'air'];

  // n : libellé, s : libellé court, p : valeur en pourcentage
  K.STATS = {
    vit: { n: 'Vitalité', s: 'Vita', i: '❤️' },
    sag: { n: 'Sagesse', s: 'Sag', i: '🦉' },
    for: { n: 'Force', s: 'For', i: '⛰️' },
    int: { n: 'Intelligence', s: 'Int', i: '🔥' },
    cha: { n: 'Chance', s: 'Cha', i: '💧' },
    agi: { n: 'Agilité', s: 'Agi', i: '🌪️' },
    pui: { n: 'Puissance', s: 'Pui', i: '💪' },
    pa: { n: 'PA', s: 'PA', i: '⭐' },
    pm: { n: 'PM', s: 'PM', i: '👟' },
    po: { n: 'Portée', s: 'PO', i: '🎯' },
    ini: { n: 'Initiative', s: 'Ini', i: '⚡' },
    crit: { n: 'Critique', s: 'Crit', i: '💥', p: true },
    do: { n: 'Dommages', s: 'Do', i: '🗡️' },
    doCrit: { n: 'Dommages critiques', s: 'DoCri', i: '💢' },
    soin: { n: 'Soins', s: 'Soins', i: '✚' },
    dpou: { n: 'Dommages de poussée', s: 'DoPou', i: '🧱' },
    pp: { n: 'Prospection', s: 'PP', i: '🔍' },
    reTerre: { n: 'Résistance Terre', s: 'Ré Terre', i: '⛰️', p: true },
    reFeu: { n: 'Résistance Feu', s: 'Ré Feu', i: '🔥', p: true },
    reEau: { n: 'Résistance Eau', s: 'Ré Eau', i: '💧', p: true },
    reAir: { n: 'Résistance Air', s: 'Ré Air', i: '🌪️', p: true },
    pctMelee: { n: 'Dommages mêlée', s: 'Mêlée', i: '🤜', p: true },
    pctDist: { n: 'Dommages distance', s: 'Distance', i: '🏹', p: true },
    pctDmg: { n: 'Dommages finaux', s: 'Finaux', i: '☄️', p: true },
    pctPoison: { n: 'Dommages des poisons', s: 'Poisons', i: '☠️', p: true },
    volVie: { n: 'Vol de vie', s: 'Vol', i: '🩸', p: true },
    renvoi: { n: 'Renvoi de dommages', s: 'Renvoi', i: '🪞' },
    pvPct: { n: 'PV max', s: 'PV', i: '❤️', p: true },
    killPa: { n: 'PA par élimination', s: 'PA/kill', i: '⭐' },
    regen: { n: 'PV régénérés par tour', s: 'Régén', i: '🌿', p: true },
    shieldStart: { n: 'Bouclier au début du combat', s: 'Bouclier', i: '🛡️', p: true },
  };
  K.STAT_KEYS = Object.keys(K.STATS);
  K.CARAC = ['vit', 'sag', 'for', 'int', 'cha', 'agi'];

  K.zeroStats = () => {
    const o = {};
    for (const k of K.STAT_KEYS) o[k] = 0;
    return o;
  };
  K.addStats = (t, src, mult = 1) => {
    for (const k in src) if (k in K.STATS) t[k] = (t[k] || 0) + src[k] * mult;
    return t;
  };
  K.fmtStat = (k, v) => {
    const d = K.STATS[k];
    if (!d) return '';
    return `${v > 0 ? '+' : ''}${v}${d.p ? ' %' : ''} ${d.n}`;
  };
  K.statLines = (obj) =>
    K.STAT_KEYS.filter((k) => obj[k]).map((k) => ({ k, v: obj[k], txt: K.fmtStat(k, obj[k]) }));

  K.SLOTS = [
    { id: 'arme', type: 'arme', n: 'Arme', i: '⚔️' },
    { id: 'coiffe', type: 'coiffe', n: 'Coiffe', i: '🎩' },
    { id: 'cape', type: 'cape', n: 'Cape', i: '🧥' },
    { id: 'amulette', type: 'amulette', n: 'Amulette', i: '📿' },
    { id: 'anneau1', type: 'anneau', n: 'Anneau', i: '💍' },
    { id: 'anneau2', type: 'anneau', n: 'Anneau', i: '💍' },
    { id: 'ceinture', type: 'ceinture', n: 'Ceinture', i: '🎗️' },
    { id: 'bottes', type: 'bottes', n: 'Bottes', i: '👢' },
    { id: 'relique1', type: 'relique', n: 'Relique', i: '🥚' },
    { id: 'relique2', type: 'relique', n: 'Relique', i: '🥚' },
  ];
  K.TYPES = {
    arme: { n: 'Arme', i: '⚔️' },
    coiffe: { n: 'Coiffe', i: '🎩' },
    cape: { n: 'Cape', i: '🧥' },
    amulette: { n: 'Amulette', i: '📿' },
    anneau: { n: 'Anneau', i: '💍' },
    ceinture: { n: 'Ceinture', i: '🎗️' },
    bottes: { n: 'Bottes', i: '👢' },
    relique: { n: 'Relique', i: '🥚' },
  };
  K.slotsForType = (type) => K.SLOTS.filter((s) => s.type === type).map((s) => s.id);

  K.MAX_LVL = 50;
  K.MAX_SPELLS = 6;
  K.MAX_ROSTER = 6;
  K.TEAM_SIZE = 3;
})(window.K);
