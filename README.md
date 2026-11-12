# KRAZY RPG — Le Miroir Brisé

RPG solo au tour par tour, jouable dans le navigateur et hébergé sur GitHub Pages.
Aucune dépendance, aucune étape de build : du HTML, du CSS et du JavaScript.

## Le principe

Le Grand Miroir qui reflétait la raison du monde s'est brisé. Le **Délire** gagne tout, y compris le héros.

La jauge de Délire est la mécanique centrale :

| État | Délire | Effet |
|---|---|---|
| 🧊 Lucide | 0–33 | −15 % de dégâts subis |
| ⚡ Fêlé | 34–66 | +20 % de dégâts infligés |
| 🌀 Krazy | 67–99 | +50 % de dégâts, techniques **transformées**, mais +25 % de dégâts subis |
| 💔 Rupture | 100 | −20 % PV, un tour perdu, retour à 40 |

Un débutant peut rester prudent (Lucide / Fêlé) ; un joueur avancé construit son personnage autour du Krazy,
de la Rupture ou de l'équilibre parfait.

## Contenu

- **3 classes** : Brise-Miroir (guerrier), Tisse-Songe (mage), Funambule (acrobate)
- **Arbres de talents** : 3 branches par classe, 6 techniques à débloquer, réinitialisation gratuite
- **Équipement** : 4 emplacements, 5 raretés, forge (+10), objets légendaires qui changent les règles du Délire
- **Aventure** : 5 zones, 30 étapes, 5 boss ; les ennemis annoncent leur prochaine action
- **End game** : la Faille Sans Fond (étages infinis, distorsions, objets mythiques) et les Éclats de lucidité (progression sans limite après le niveau 30)

## Jouer en local

Ouvrir `index.html` dans un navigateur. C'est tout.

## Publier sur GitHub Pages

1. Pousser la branche `main` sur GitHub.
2. Dans le dépôt : **Settings → Pages → Build and deployment**, choisir la source **GitHub Actions** (une seule fois).
3. Le workflow `.github/workflows/pages.yml` déploie le site à chaque push sur `main`. Le jeu est en ligne à l'adresse `https://<utilisateur>.github.io/krazyrpg/`.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/data.js` | Tout le contenu : classes, techniques, talents, ennemis, zones, objets |
| `js/engine.js` | Règles : calcul du héros, génération d'objets, combat (sans DOM, testable sous Node) |
| `js/ui.js` | Écrans, actions du joueur, sauvegarde (`localStorage`) |
| `css/style.css` | Thème « estampe » (affiche imprimée) qui se dérègle avec le Délire : net en Lucide, jauni et décalé en Fêlé, tirage en négatif en Krazy |

Ajouter une technique, un ennemi ou une zone se fait dans `js/data.js`, sans toucher au moteur.
