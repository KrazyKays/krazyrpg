'use strict';
/* KRAZY RPG — données du jeu (classes, techniques, talents, ennemis, zones, objets).
   Tout le contenu est ici : ajouter une technique ou un ennemi ne demande aucun code. */
globalThis.KR = globalThis.KR || {};
(function (KR) {

  KR.STATS = { for: 'Force', esp: 'Esprit', vig: 'Vigueur', agi: 'Agilité' };

  /* ---------- Techniques ----------
     del  : variation du Délire quand on l'utilise
     cd   : tours d'indisponibilité après usage
     fx   : liste d'effets (voir engine.js > applyFx)
     krazy: variante utilisée automatiquement en état Krazy */
  KR.SKILLS = {
    frappe: { name: 'Frappe', ic: '👊', cd: 0, del: 8, fx: [{ t: 'dmg', m: 1 }] },
    recentrer: { name: 'Se recentrer', ic: '🧘', cd: 0, del: -25, fx: [{ t: 'buff', k: 'garde', turns: 1 }] },

    // --- Brise-Miroir ---
    eclat: { name: 'Éclat tranchant', ic: '🔪', cd: 2, del: 12,
      fx: [{ t: 'dmg', m: 1.5 }, { t: 'dot', k: 'saignement', m: 0.3, turns: 3 }],
      krazy: { name: "Pluie d'éclats", fx: [{ t: 'dmg', m: 1.1, aoe: true }, { t: 'dot', k: 'saignement', m: 0.4, turns: 3, aoe: true }] } },
    fracas: { name: 'Fracas', ic: '🔨', cd: 3, del: 18,
      fx: [{ t: 'dmg', m: 2 }, { t: 'stun', chance: 0.3 }],
      krazy: { name: 'Fracas dément', fx: [{ t: 'dmg', m: 2.8 }, { t: 'stun', chance: 0.6 }, { t: 'selfDmg', pct: 0.05 }] } },
    mille: { name: 'Mille morceaux', ic: '✨', cd: 4, del: 20,
      fx: [{ t: 'dmg', m: 0.7, hits: 3, rnd: true }],
      krazy: { name: 'Dix mille morceaux', fx: [{ t: 'dmg', m: 0.7, hits: 5, rnd: true }] } },
    malheur: { name: 'Sept ans de malheur', ic: '🐈‍⬛', cd: 6, del: 30,
      fx: [{ t: 'dmg', m: 3.2 }, { t: 'debuff', k: 'fragile', turns: 3 }],
      krazy: { name: 'Sept siècles de malheur', fx: [{ t: 'dmg', m: 4.5 }, { t: 'debuff', k: 'fragile', turns: 3 }, { t: 'stun', chance: 1 }] } },
    hurlement: { name: 'Hurlement', ic: '😱', cd: 4, del: 35,
      fx: [{ t: 'buff', k: 'rage', turns: 3 }, { t: 'debuff', k: 'affaibli', turns: 2, aoe: true }],
      krazy: { name: 'Hurlement fêlé', fx: [{ t: 'buff', k: 'rage', turns: 3 }, { t: 'dmg', m: 1, aoe: true }] } },
    toutcasser: { name: 'Tout casser', ic: '💢', cd: 6, del: 25,
      fx: [{ t: 'dmg', m: 1.8, aoe: true }],
      krazy: { name: 'Apocalypse de verre', fx: [{ t: 'dmg', m: 3, aoe: true }, { t: 'selfDmg', pct: 0.1 }] } },
    bouclier: { name: 'Bouclier-miroir', ic: '🛡️', cd: 4, del: -10,
      fx: [{ t: 'shield', pct: 0.25 }],
      krazy: { name: 'Miroir aux alouettes', fx: [{ t: 'shield', pct: 0.25 }, { t: 'dmg', m: 1.2, aoe: true }] } },
    recoller: { name: 'Recoller les morceaux', ic: '🩹', cd: 6, del: -30,
      fx: [{ t: 'heal', pct: 0.3 }],
      krazy: { name: 'Recoller de travers', del: 0, fx: [{ t: 'heal', pct: 0.2 }, { t: 'buff', k: 'rage', turns: 2 }] } },

    // --- Tisse-Songe ---
    trait: { name: 'Trait onirique', ic: '💫', cd: 1, del: 10,
      fx: [{ t: 'dmg', m: 1.6 }],
      krazy: { name: 'Trait cauchemardesque', fx: [{ t: 'dmg', m: 1.6 }, { t: 'dot', k: 'cauchemar', m: 0.5, turns: 3 }] } },
    cauchemar: { name: 'Cauchemar', ic: '🕸️', cd: 3, del: 15,
      fx: [{ t: 'dot', k: 'cauchemar', m: 0.7, turns: 4 }, { t: 'debuff', k: 'affaibli', turns: 2 }],
      krazy: { name: 'Cauchemar collectif', fx: [{ t: 'dot', k: 'cauchemar', m: 0.7, turns: 4, aoe: true }] } },
    terreur: { name: 'Terreur nocturne', ic: '🌘', cd: 4, del: 20,
      fx: [{ t: 'dmg', m: 1, aoe: true }, { t: 'dot', k: 'cauchemar', m: 0.4, turns: 3, aoe: true }],
      krazy: { name: 'Terreur sans réveil', fx: [{ t: 'dmg', m: 1, aoe: true }, { t: 'dot', k: 'cauchemar', m: 0.4, turns: 3, aoe: true }, { t: 'stun', chance: 0.35, aoe: true }] } },
    devoreur: { name: 'Dévoreur de songes', ic: '🦷', cd: 6, del: 25,
      fx: [{ t: 'dmg', m: 2 }, { t: 'burst', m: 1.5 }],
      krazy: { name: 'Festin de songes', fx: [{ t: 'dmg', m: 1.5, aoe: true }, { t: 'burst', m: 1.5, aoe: true }] } },
    deversement: { name: 'Déversement', ic: '🌊', cd: 3, del: 0,
      fx: [{ t: 'dmg', m: 1.2, scaleDelire: true }, { t: 'delSet', v: 0 }],
      krazy: { name: 'Raz-de-folie', fx: [{ t: 'dmg', m: 0.9, scaleDelire: true, aoe: true }, { t: 'delSet', v: 0 }] } },
    partage: { name: 'Folie partagée', ic: '🫂', cd: 5, del: -20,
      fx: [{ t: 'debuff', k: 'fragile', turns: 3, aoe: true }, { t: 'debuff', k: 'affaibli', turns: 3, aoe: true }],
      krazy: { name: 'Folie contagieuse', fx: [{ t: 'debuff', k: 'fragile', turns: 3, aoe: true }, { t: 'debuff', k: 'affaibli', turns: 3, aoe: true }, { t: 'stun', chance: 0.5, aoe: true }] } },
    cocon: { name: 'Cocon de rêve', ic: '🫧', cd: 4, del: -15,
      fx: [{ t: 'shield', m: 2 }],
      krazy: { name: 'Cocon fiévreux', fx: [{ t: 'shield', m: 2 }, { t: 'heal', pct: 0.1 }] } },
    sursaut: { name: 'Réveil en sursaut', ic: '⏰', cd: 6, del: 40,
      fx: [{ t: 'heal', pct: 0.35 }, { t: 'buff', k: 'rage', turns: 2 }],
      krazy: { name: 'Réveil en hurlant', fx: [{ t: 'heal', pct: 0.35 }, { t: 'dmg', m: 2, aoe: true }] } },

    // --- Funambule ---
    chasse: { name: 'Pas chassé', ic: '🩰', cd: 1, del: 0,
      fx: [{ t: 'dmg', m: 1.3 }, { t: 'delToward', v: 50, by: 15 }],
      krazy: { name: 'Pas de trop', fx: [{ t: 'dmg', m: 1.3, hits: 2 }, { t: 'delToward', v: 50, by: 15 }] } },
    croc: { name: 'Croc-en-jambe', ic: '🦵', cd: 3, del: 10,
      fx: [{ t: 'dmg', m: 1.2 }, { t: 'stun', chance: 0.5 }],
      krazy: { name: 'Croc-en-tout', fx: [{ t: 'dmg', m: 1.6 }, { t: 'stun', chance: 0.8 }] } },
    equilibre: { name: "Point d'équilibre", ic: '⚖️', cd: 4, del: 0,
      fx: [{ t: 'delSet', v: 50 }, { t: 'buff', k: 'esquive', turns: 2 }],
      krazy: { name: 'Équilibre précaire', fx: [{ t: 'delSet', v: 50 }, { t: 'buff', k: 'esquive', turns: 2 }, { t: 'buff', k: 'rage', turns: 2 }] } },
    ecart: { name: 'Grand écart', ic: '🤸', cd: 6, del: 15,
      fx: [{ t: 'dmg', m: 2.2, critIfFele: true }],
      krazy: { name: 'Écart de conduite', fx: [{ t: 'dmg', m: 3, aoe: true }] } },
    saltimbanque: { name: 'Saltimbanque', ic: '🤹', cd: 3, del: 15,
      fx: [{ t: 'dmg', m: 0.8, hits: 3 }],
      krazy: { name: 'Saltimbanque enragé', fx: [{ t: 'dmg', m: 0.8, hits: 4 }, { t: 'dot', k: 'saignement', m: 0.4, turns: 3 }] } },
    final: { name: 'Numéro final', ic: '🎪', cd: 6, del: 30,
      fx: [{ t: 'dmg', m: 1.4, aoe: true, hits: 2 }],
      krazy: { name: 'Rappel du public', fx: [{ t: 'dmg', m: 1.4, aoe: true, hits: 3 }] } },
    reverence: { name: 'Révérence', ic: '🎩', cd: 4, del: -20,
      fx: [{ t: 'buff', k: 'esquive', turns: 2 }, { t: 'heal', pct: 0.12 }],
      krazy: { name: 'Révérence moqueuse', fx: [{ t: 'buff', k: 'esquive', turns: 2 }, { t: 'shield', pct: 0.15 }] } },
    chute: { name: 'Chute contrôlée', ic: '🪂', cd: 5, del: -30,
      fx: [{ t: 'dmg', m: 1.5 }, { t: 'buff', k: 'garde', turns: 2 }],
      krazy: { name: 'Chute libre', fx: [{ t: 'dmg', m: 2.2 }, { t: 'buff', k: 'garde', turns: 2 }] } }
  };

  /* ---------- Classes & arbres de talents ----------
     Chaque branche : 4 nœuds à débloquer dans l'ordre.
     { p: nom, mods, max } = passif à rangs ; { s: id } = technique active. */
  KR.CLASSES = {
    brise: {
      name: 'Brise-Miroir', ic: '🪞', main: 'for', tag: 'Idéal pour débuter',
      pitch: "Guerrier qui se bat avec les tessons du Grand Miroir. Solide, direct, et d'autant plus dangereux qu'il perd la tête.",
      base: { for: 9, esp: 3, vig: 8, agi: 4 }, grow: { for: 2.2, esp: 0.5, vig: 1.8, agi: 0.8 },
      start: ['eclat', 'fracas'],
      tree: [
        { name: 'Tessons', ic: '🔪', desc: 'Saignements et gros coups', nodes: [
          { p: 'Bords coupants', mods: { dotPlus: 8 }, max: 5 }, { s: 'mille' },
          { p: 'Soif de reflets', mods: { vol: 2 }, max: 5 }, { s: 'malheur' }] },
        { name: 'Démence', ic: '🌀', desc: "Vivre dans l'état Krazy", nodes: [
          { p: 'Rire nerveux', mods: { dmgKrazy: 5 }, max: 5 }, { s: 'hurlement' },
          { p: 'Fissure contrôlée', mods: { ruptureBlast: 0.5 }, max: 5 }, { s: 'toutcasser' }] },
        { name: 'Reflet', ic: '🛡️', desc: 'Encaisser et se réparer', nodes: [
          { p: "Peau d'argent", mods: { pVig: 4 }, max: 5 }, { s: 'bouclier' },
          { p: 'Dur à cuire', mods: { regen: 1 }, max: 5 }, { s: 'recoller' }] }
      ]
    },
    tisse: {
      name: 'Tisse-Songe', ic: '🧶', main: 'esp', tag: 'Stratégique',
      pitch: "Mage qui tricote les rêves en cauchemars. Empoisonne l'esprit de ses ennemis et dépense son propre Délire comme une arme.",
      base: { for: 3, esp: 10, vig: 7, agi: 4 }, grow: { for: 0.4, esp: 2.4, vig: 1.7, agi: 0.8 },
      start: ['trait', 'cauchemar'],
      tree: [
        { name: 'Cauchemars', ic: '🕸️', desc: 'Maux persistants', nodes: [
          { p: 'Insomnie', mods: { dotPlus: 8 }, max: 5 }, { s: 'terreur' },
          { p: 'Esprit vaste', mods: { pEsp: 3 }, max: 5 }, { s: 'devoreur' }] },
        { name: 'Déversement', ic: '🌊', desc: 'Accumuler le Délire puis le vider', nodes: [
          { p: 'Tête pleine', mods: { dmgKrazy: 4 }, max: 5 }, { s: 'deversement' },
          { p: "Fuite d'idées", mods: { crit: 2 }, max: 5 }, { s: 'partage' }] },
        { name: 'Songes doux', ic: '🫧', desc: 'Boucliers, soins et lucidité', nodes: [
          { p: 'Rêve lucide', mods: { redLucide: 3 }, max: 5 }, { s: 'cocon' },
          { p: 'Sommeil réparateur', mods: { healPlus: 8 }, max: 5 }, { s: 'sursaut' }] }
      ]
    },
    funambule: {
      name: 'Funambule', ic: '🎪', main: 'agi', tag: 'Technique',
      pitch: "Acrobate qui danse sur la fissure. Esquive, coups critiques, et un bonus unique pour qui sait rester pile au milieu : l'état Fêlé.",
      base: { for: 5, esp: 3, vig: 6, agi: 9 }, grow: { for: 0.8, esp: 0.4, vig: 1.5, agi: 2.2 },
      start: ['chasse', 'croc'],
      tree: [
        { name: 'Équilibre', ic: '⚖️', desc: "Maîtriser l'état Fêlé", nodes: [
          { p: 'Sur le fil', mods: { dmgFele: 6 }, max: 5 }, { s: 'equilibre' },
          { p: 'Centre de gravité', mods: { critFele: 4 }, max: 5 }, { s: 'ecart' }] },
        { name: 'Voltige', ic: '🤹', desc: 'Coups multiples et critiques', nodes: [
          { p: 'Réflexes', mods: { crit: 2 }, max: 5 }, { s: 'saltimbanque' },
          { p: 'Coup de grâce', mods: { critDmg: 6 }, max: 5 }, { s: 'final' }] },
        { name: 'Esquive', ic: '🎩', desc: 'Ne jamais être là', nodes: [
          { p: 'Insaisissable', mods: { esquive: 2 }, max: 5 }, { s: 'reverence' },
          { p: 'Filet de sécurité', mods: { pVig: 4 }, max: 5 }, { s: 'chute' }] }
      ]
    }
  };

  /* ---------- Ennemis ----------
     hp / atk / arm : multiplicateurs appliqués aux valeurs du niveau.
     moves : [action, poids]. L'action choisie est annoncée un tour à l'avance. */
  KR.MOVES = {
    atk: { ic: '⚔️', n: 'Attaque' },
    lourd: { ic: '💥', n: 'Coup lourd' },
    multi: { ic: '🌪️', n: 'Rafale' },
    murmure: { ic: '🌀', n: 'Murmure (+Délire)' },
    apaise: { ic: '🧊', n: 'Apaisement (−Délire)' },
    poison: { ic: '☠️', n: 'Venin' },
    affaiblir: { ic: '📉', n: 'Affaiblissement' },
    garde: { ic: '🛡️', n: 'Se protège' },
    soin: { ic: '💚', n: 'Soigne un allié' }
  };
  const E = (n, ic, hp, atk, arm, moves) => ({ n, ic, hp, atk, arm, moves });
  KR.ENEMIES = {
    pave: E('Pavé Mordeur', '🧱', 1.1, 0.9, 1.5, [['atk', 3], ['garde', 1]]),
    lampadaire: E('Lampadaire Triste', '🏮', 0.9, 1, 0.5, [['atk', 3], ['murmure', 1]]),
    pigeon: E('Pigeon à Deux Ombres', '🐦', 0.7, 1.1, 0.3, [['atk', 2], ['multi', 2]]),
    parapluie: E('Parapluie Carnivore', '☂️', 1, 1.1, 0.8, [['atk', 3], ['lourd', 1]]),
    concierge: E('Le Concierge des Clés Perdues', '🗝️', 1, 1, 1, [['atk', 3], ['lourd', 2], ['garde', 1], ['affaiblir', 1]]),

    champi: E('Champi-Chuchoteur', '🍄', 0.8, 0.8, 0.5, [['murmure', 3], ['atk', 1], ['poison', 1]]),
    racine: E('Racine Baladeuse', '🌿', 1.2, 0.9, 1.2, [['atk', 3], ['poison', 2]]),
    hibou: E('Hibou Horloger', '🦉', 0.9, 1.1, 0.6, [['atk', 2], ['affaiblir', 1], ['lourd', 1]]),
    loup: E('Loup de Papier', '🐺', 0.7, 1.3, 0.3, [['multi', 2], ['atk', 2]]),
    ecorce: E('La Mère Écorce', '🌳', 0.9, 0.85, 1.2, [['atk', 2], ['poison', 2], ['soin', 1], ['lourd', 2], ['garde', 1]]),

    echo: E('Écho Affamé', '👻', 0.8, 1.1, 0.4, [['atk', 2], ['apaise', 2]]),
    grenouille: E('Grenouille Prophète', '🐸', 1, 0.9, 0.7, [['soin', 2], ['atk', 2], ['murmure', 1]]),
    follet: E('Feu Follet Menteur', '🔥', 0.6, 1.4, 0, [['lourd', 1], ['atk', 2], ['murmure', 1]]),
    noye: E('Noyé Poli', '🫧', 1.3, 1, 1, [['atk', 3], ['garde', 1], ['affaiblir', 1]]),
    choeur: E('Le Chœur Sans Bouche', '🎭', 1, 1, 1, [['murmure', 3], ['lourd', 2], ['multi', 2], ['apaise', 1]]),

    automate: E('Automate Dépressif', '🤖', 1.3, 1, 2, [['atk', 2], ['garde', 2], ['lourd', 1]]),
    minute: E('Minute Perdue', '⏳', 0.6, 1.2, 0.4, [['multi', 3], ['apaise', 1]]),
    aiguille: E('Aiguille Errante', '🧭', 0.8, 1.4, 0.5, [['lourd', 2], ['atk', 2]]),
    bureaucrate: E('Bureaucrate du Temps', '📎', 1, 0.9, 0.8, [['affaiblir', 2], ['soin', 1], ['atk', 2]]),
    retardataire: E('Le Grand Retardataire', '🕰️', 1, 1, 1.2, [['lourd', 3], ['multi', 2], ['garde', 1], ['affaiblir', 1], ['soin', 1]]),

    reflet: E('Reflet Jaloux', '🪞', 1, 1.2, 0.8, [['atk', 2], ['murmure', 2], ['lourd', 1]]),
    vitrail: E('Chevalier-Vitrail', '💠', 1.4, 1.1, 2.5, [['atk', 2], ['garde', 1], ['lourd', 2]]),
    sourire: E('Sourire Sans Visage', '😶', 0.8, 1.1, 0.5, [['murmure', 2], ['apaise', 2], ['poison', 1]]),
    double: E('Double Imparfait', '👥', 1, 1.3, 0.8, [['multi', 2], ['lourd', 1], ['atk', 1]]),
    autre: E("L'Autre Toi", '🌑', 0.95, 1, 1, [['lourd', 2], ['multi', 2], ['murmure', 2], ['apaise', 1], ['garde', 1], ['soin', 1]])
  };

  KR.ZONES = [
    { name: 'Le Faubourg Fêlé', ic: '🏚️', lvl: 1, pool: ['pave', 'lampadaire', 'pigeon', 'parapluie'], boss: 'concierge',
      desc: 'Les pavés ricanent et les lampadaires pleurent. Le Délire a commencé ici.' },
    { name: "La Forêt à l'Envers", ic: '🌲', lvl: 6, pool: ['champi', 'racine', 'hibou', 'loup'], boss: 'ecorce',
      desc: 'Les racines poussent vers le ciel et les champignons chuchotent des secrets.' },
    { name: "Les Marais de l'Écho", ic: '🐸', lvl: 11, pool: ['echo', 'grenouille', 'follet', 'noye'], boss: 'choeur',
      desc: "Ici, chaque mot revient… mais jamais tout à fait le même." },
    { name: 'La Cité des Horloges Molles', ic: '🕰️', lvl: 17, pool: ['automate', 'minute', 'aiguille', 'bureaucrate'], boss: 'retardataire',
      desc: "Le temps y a fondu. Tout le monde est en retard, depuis toujours." },
    { name: 'Le Palais des Reflets', ic: '🏰', lvl: 24, pool: ['reflet', 'vitrail', 'sourire', 'double'], boss: 'autre',
      desc: 'Au cœur du Miroir brisé, quelqu’un qui te ressemble t’attend.' }
  ];

  /* Distorsions de la Faille (end game) : une par étage */
  KR.DISTORSIONS = [
    { id: 'depart', n: 'Réveil difficile', d: 'Tu commences à 50 de Délire.', opts: { startDelire: 50 } },
    { id: 'chair', n: 'Chair épaisse', d: 'Les ennemis ont +30% de PV.', opts: { hpM: 1.3 } },
    { id: 'crocs', n: 'Crocs limés', d: 'Les ennemis infligent +20% de dégâts.', opts: { atkM: 1.2 } },
    { id: 'murmures', n: 'Murmures', d: '+6 de Délire à la fin de chaque tour.', opts: { murmures: 6 } },
    { id: 'silence', n: 'Silence pesant', d: 'Tes gains de Délire sont divisés par deux.', opts: { silence: true } },
    { id: 'hemo', n: 'Plaie ouverte', d: 'Tes soins et boucliers sont réduits de 50%.', opts: { hemo: true } }
  ];

  /* ---------- Objets ---------- */
  KR.SLOTS = {
    arme: { n: 'Arme', ic: '🗡️' }, armure: { n: 'Armure', ic: '🥋' },
    talisman: { n: 'Talisman', ic: '📿' }, masque: { n: 'Masque', ic: '🎭' }
  };
  KR.RAR = [
    { n: 'Commun', aff: 0, mul: 1, price: 1 },
    { n: 'Rare', aff: 1, mul: 1.15, price: 2.5 },
    { n: 'Épique', aff: 2, mul: 1.3, price: 6 },
    { n: 'Légendaire', aff: 3, mul: 1.5, price: 15 },
    { n: 'Mythique', aff: 4, mul: 1.75, price: 30 }
  ];
  KR.ITEM_NAMES = {
    arme: { for: ['Tesson affûté', 'Hachoir à reflets', 'Marteau fêlé'], esp: ['Sceptre mou', 'Attrape-cauchemars', 'Grimoire qui bâille'], agi: ['Dague de verre', 'Balancier lesté', 'Éventail-lame'] },
    armure: ['Manteau rapiécé', 'Cuirasse de vitrail', 'Pourpoint à carreaux'],
    talisman: ['Bouton porte-bonheur', 'Clé sans serrure', 'Montre arrêtée'],
    masque: ['Masque souriant', 'Loup de carnaval', 'Visage emprunté']
  };
  /* Pouvoirs uniques des objets légendaires / mythiques : ils changent les règles du Délire */
  KR.UNIQUES = [
    { n: 'Masque du Rire Jaune', slot: 'masque', mods: { krazyThreshold: 50 } },
    { n: 'Monocle de la Raison Pure', slot: 'masque', mods: { dmgLucide: 40 } },
    { n: 'Cœur Recollé', slot: 'talisman', mods: { ruptureHeal: 1 } },
    { n: "Balancier d'Or", slot: 'talisman', mods: { critFele: 25, esqFele: 15 } },
    { n: 'Réveil Brutal', slot: 'talisman', mods: { startDelire: 60 } },
    { n: 'Écho du Miroir', slot: 'arme', mods: { doubleCast: 20 } },
    { n: 'Brise-Tout', slot: 'arme', mods: { ruptureBlast: 3 } },
    { n: "Manteau d'Épines", slot: 'armure', mods: { thorns: 30 } },
    { n: 'Camisole Confortable', slot: 'armure', mods: { noDelireHit: 1 } }
  ];

  /* Libellés des bonus (talents, objets, paragon) */
  const L = {
    for: v => `+${v} Force`, esp: v => `+${v} Esprit`, vig: v => `+${v} Vigueur`, agi: v => `+${v} Agilité`,
    armure: v => `+${v} Armure`,
    pFor: v => `+${v}% Force`, pEsp: v => `+${v}% Esprit`, pVig: v => `+${v}% Vigueur`, pAgi: v => `+${v}% Agilité`,
    pHp: v => `+${v}% PV`, pDmg: v => `+${v}% dégâts`,
    crit: v => `+${v}% chance de critique`, critDmg: v => `+${v}% dégâts critiques`, esquive: v => `+${v}% esquive`,
    vol: v => `${v}% de vol de vie`, regen: v => `Régénère ${v}% des PV par tour`,
    dmgKrazy: v => `+${v}% dégâts en état Krazy`, dmgFele: v => `+${v}% dégâts en état Fêlé`, dmgLucide: v => `+${v}% dégâts en état Lucide`,
    redLucide: v => `−${v}% dégâts subis en état Lucide`,
    dotPlus: v => `+${v}% dégâts des maux (saignement, cauchemar)`, healPlus: v => `+${v}% soins et boucliers`,
    critFele: v => `+${v}% critique en état Fêlé`, esqFele: v => `+${v}% esquive en état Fêlé`,
    ruptureBlast: v => `La Rupture inflige ${Math.round(v * 100)}% de ta stat principale à tous les ennemis`,
    pGold: v => `+${v}% boutons trouvés`,
    krazyThreshold: v => `L'état Krazy commence dès ${v} de Délire`,
    ruptureHeal: () => 'La Rupture te soigne de 20% PV au lieu de te blesser',
    startDelire: v => `Tu commences les combats à ${v} de Délire`,
    doubleCast: v => `${v}% de chance de lancer une technique deux fois`,
    thorns: v => `Renvoie ${v}% des dégâts subis`,
    noDelireHit: () => 'Les coups reçus ne font plus monter ton Délire'
  };
  KR.modLabel = (k, v) => (L[k] ? L[k](v) : `${k} ${v}`);

  KR.PARAGON = {
    puissance: { n: 'Puissance', ic: '💪', mods: { pDmg: 2 } },
    vitalite: { n: 'Vitalité', ic: '❤️', mods: { pHp: 2 } },
    precision: { n: 'Précision', ic: '🎯', mods: { crit: 1 } },
    fortune: { n: 'Fortune', ic: '🔘', mods: { pGold: 3 } }
  };

})(globalThis.KR);
