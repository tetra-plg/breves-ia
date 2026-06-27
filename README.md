# Compagnon Brèves IA

App de bureau locale (Electron) qui pilote la commande `/breves-ia` du BoilingBrain :
on jette des sujets IA en vrac, l'app lance la vérification (fan-out d'enquêteurs via
le Claude Agent SDK), rédige dans la plume de Pierre (SOUL), tu valides ou corriges,
puis elle archive (clip + note + SOUL + ingest) dans le wiki personnel.

## Prérequis

- **Node ≥ 20**
- **Auth Claude locale** : l'app utilise le Claude Agent SDK avec les identifiants de
  Claude Code déjà présents sur la machine.
- **Repo BoilingBrain** accessible. Par défaut `/Users/pleguern/Workspace/BoilingBrain` ;
  surchargeable via `BREVES_BB_DIR` (fichier `.env`, voir `.env.example`).
  Les sous-commandes `/breves-verify`, `/breves-draft`, `/breves-archive` et la `SOUL`
  vivent dans ce repo (`.claude/`).

## Installation

```bash
npm install
```

## Lancer l'app

```bash
npm start
```

Une fenêtre compagnon (400×760) s'ouvre. Parcours : Dashboard → Nouvelle édition
(sujets en vrac) → Vérification → Rédaction (éditable) → Valider / Corriger → Archivé.

## Moteur en ligne de commande (sans UI)

```bash
npm run breves verify "GLM 5.2, modèle chinois open source 753B"
npm run breves draft  < verify-output.json
npm run breves archive < draft-output.json   # écrit dans le wiki
```

## Tests

```bash
npm test
```

Couvre la logique pure (moteur + UI) : validation des entrées, contrats de sortie,
parsing du flux, runner (SDK mocké), lecteurs SOUL/éditions, machine d'états des vues,
modèle des cartes de vérification, helpers de formatage, dispatch moteur.

## Notes

- **`breves-archive` écrit dans le wiki** (`raw/` via le MCP `boiling-brain-wiki` +
  `/ingest`). Ne valide une édition que lorsqu'elle est prête.
- **Garde-fou central** : l'app n'invente jamais. Un fait non confirmé est signalé
  (`non_verifie`), jamais affirmé.
- **Progression « checking »** : les 5 étapes se cochent sur des événements réels. Si le
  moteur n'émet pas de jalons intermédiaires, la carte se termine quand même via le
  résultat final (pas de fausse animation).
- L'app est **locale, mono-utilisateur** : pas d'auth applicative, pas de serveur.
