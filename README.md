# KRAZY RPG

RPG tactique au tour par tour, jouable dans le navigateur et hébergé sur GitHub Pages.
Aucune dépendance, aucune étape de build : du HTML, du CSS et du JavaScript.

## Le principe

Le plaisir de **monter un build**, puis de le **mettre à l'épreuve** sur une grille de combat.

1. **Recrute** jusqu'à 6 personnages parmi 5 classes, et compose une équipe de 3.
2. **Monte leur build** :
   - 5 points de caractéristiques par niveau (Vitalité, Sagesse, Force, Intelligence, Chance, Agilité) ;
   - 10 emplacements d'équipement, dont 2 reliques ;
   - 12 **panoplies** dont les bonus grandissent avec le nombre de pièces portées, certaines modifiant les sorts de classe (−1 PA, +1 PO, relance réduite…) ;
   - 6 sorts équipés parmi les 8 de la classe, plus l'attaque de l'arme.
3. **Combine les synergies d'équipe** : l'élément dominant de chaque personnage (Terre, Feu, Eau, Air) débloque des résonances ; les compositions variées ou identiques ont aussi leurs bonus.
4. **Combats** sur une grille 12 × 9 : placement, PA/PM, portée, ligne de vue, zones, poussées, poisons, boucliers. Les monstres ont des résistances différentes : adapte tes éléments.
5. **Farme** : chaque donjon lâche ses propres panoplies, avec des jets aléatoires. Les boss lâchent leur relique. La prospection augmente le butin.
6. **Forge** : recycle tes objets en éclats pour retenter les jets, ou tenter un exotique (+1 PA, PM ou PO).

Le mode **Auto** laisse l'IA jouer tes personnages (pratique pour farmer), et la **salle d'entraînement** mesure les dommages de ton build sur des mannequins.

## Contenu

- **5 classes** : Ferrailleur (mêlée Terre/Feu), Arcaniste (distance Feu/Air), Oracle des Marées (soutien Eau), Rôdeur (distance Air/Eau), Chronomancien (manipulation des PA, Eau/Air)
- **6 donjons** du niveau 1 au niveau 50, 4 salles chacun dont un boss
- **12 panoplies**, 6 reliques, 4 armes de départ
- **7 synergies d'équipe**

## Jouer en local

Ouvrir `index.html` dans un navigateur. La partie est sauvegardée dans le navigateur (export / import possibles depuis l'écran Équipe).

## Publier sur GitHub Pages

1. Pousser la branche `main` sur GitHub.
2. Dans le dépôt : **Settings → Pages → Build and deployment**, choisir la source **GitHub Actions** (une seule fois).
3. Le workflow `.github/workflows/pages.yml` déploie le site à chaque push sur `main`. Le jeu est en ligne à l'adresse `https://<utilisateur>.github.io/krazyrpg/`.

## Organisation du code

Scripts classiques partageant l'espace de noms global `K` (le jeu fonctionne donc aussi en `file://`).

| Fichier | Rôle |
|---|---|
| `js/core/util.js` | Outils (aléatoire, échappement HTML…) |
| `js/data/stats.js` | Caractéristiques, éléments, emplacements |
| `js/data/classes.js` | Classes et sorts |
| `js/data/items.js` | Panoplies, objets, reliques |
| `js/data/monsters.js` | Monstres, donjons, tables de butin |
| `js/core/character.js` | Calcul des stats, panoplies, synergies, sorts modifiés |
| `js/core/state.js` | Sauvegarde, inventaire, équipement, butin, forge |
| `js/combat/grid.js` | Géométrie de la grille et des zones |
| `js/combat/engine.js` | Moteur de combat (tours, sorts, effets, formules) |
| `js/combat/ai.js` | IA des monstres et du mode Auto |
| `js/ui/common.js` | Infobulles, fenêtres, fiches d'objets et de sorts |
| `js/ui/screens.js` | Écrans Équipe, Build, Donjons, Forge, Codex |
| `js/ui/combat-view.js` | Affichage et contrôle du combat |
| `js/main.js` | Démarrage |

Pour ajouter du contenu, il suffit en général de compléter les fichiers de `js/data/` : une panoplie se déclare en quelques lignes avec ses fourchettes de jets et ses paliers de bonus, et les tables de butin sont générées automatiquement à partir des donjons.
