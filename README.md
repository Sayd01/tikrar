# تكرار · Tikrar PWA

Suivi personnel de mémorisation du Coran selon la méthode **Tikrar** (programme de Médine — 1206 jours + 6 mois de clôture, 1 demi-page/jour sur Mushaf Madinah 604 pages).

## Vue d'ensemble

**« Le Carnet »** — vue tableau scrollable de tous les jours du programme. À chaque jour : page · sourate · liaison · révision, avec 3 cases à cocher (mémorisation, liaison, révision). Le jour courant est déplié avec le détail complet et la technique de mémorisation.

## Fonctionnalités

- **3 tâches/jour** : Mémorisation · Liaison (Rabt) · Révision (Murajaa)
- **1386 jours** générés selon le PDF officiel (1206 mémo + 180 clôture)
- **Sourate Mecque/Médine** colorée
- **Liaison glissante par tour** (saute tous les 6 jours dès J33)
- **Révision = pages exactes** à réciter ce jour (selon le tour)
- **Mode strict (R17)** : bloque l'avance si jour non validé
- **Stats détaillées** : par tâche, bilan jours complets/partiels/vides, tâches manquées
- **Notes par jour**
- **Export / Import** JSON
- **100% hors-ligne** après 1er chargement (Service Worker)

## Stack

- HTML5 + Tailwind CSS (CDN)
- JavaScript vanilla, pas de framework
- `localStorage` pour la persistance
- Service Worker (network-first, fallback cache)
- Manifest PWA

## Démarrer localement

```bash
python3 -m http.server 8000
# ouvre http://localhost:8000
```

## Déploiement GitHub Pages

Settings → Pages → Source : `main` · `/(root)` → Save.

## Sur Android

Ouvre l'URL HTTPS dans Chrome → menu ⋮ → **Installer l'application**.

## Structure

```
tikrar-pwa/
├── index.html              # App complète (~60 KB, self-contained)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (network-first)
├── data/program.json       # 1386 jours générés
├── icons/icon-192.png      # Icônes PWA
├── icons/icon-512.png
├── generate-program.js     # Générateur du programme (Node)
└── generate-icons.js       # Générateur des icônes (Node + sharp)
```

## Régénération

```bash
node generate-program.js   # régénère data/program.json
node generate-icons.js     # régénère les PNG (npm i sharp)
```
