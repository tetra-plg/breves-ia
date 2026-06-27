> Manuel utilisateur — Brèves IA · v1.0.0 · 2026-06-27

# Bienvenue dans Brèves IA

Brèves IA est ton compagnon de bureau pour produire une newsletter d'actualité IA fiable, dans ta plume, sans y passer des heures. L'app pilote trois agents Claude (enquêteur, rédacteur, sceptique) et archive tout dans ton wiki BoilingBrain.

**Commence par [Réglages](reglages/guide.md)** : sans les trois chemins valides (`bbDir`, `repoDir`, `claudeBin`), le reste de l'app tourne à vide.

---

## Les sept sections de l'app

| Section | Ce qu'elle fait |
|---------|----------------|
| [Accueil](accueil/guide.md) | Tableau de bord : version SOUL active et quatre dernières éditions archivées. Point de départ avant chaque session. |
| [Nouvelle édition](nouvelle-edition/guide.md) | Le coeur de l'app. Saisis tes sujets, lance la vérification, relis la rédaction dans ta plume, archive en un clic. |
| [Historique](historique/guide.md) | Liste de toutes tes éditions archivées. Relis, copie, repartage dans Teams. |
| [SOUL](soul/guide.md) | Ta plume éditoriale codifiée en six sections. Édite §1-4, cure tes échantillons §5, consulte le journal §6. |
| [Agents](agents/guide.md) | Les trois agents qui animent le pipeline : enquêteur, rédacteur, sceptique. Ajuste leurs instructions et modèles. |
| [Commandes](commands/guide.md) | Les partitions des trois phases (verify, draft, archive). Modifie-les pour changer une règle structurelle du pipeline. |
| [Réglages](reglages/guide.md) | Configure les trois chemins d'intégration. **A faire en premier.** |

---

## Le pipeline en un coup d'oeil

```
Sujets (texte libre)
  → Phase 1 : vérification   [enquêteur × N sujets en parallèle + sceptique]
  → Phase 2 : rédaction      [rédacteur, lit la SOUL §1-5]
  → Phase 3 : archivage      [note + clippings → wiki BoilingBrain + MAJ SOUL §6]
```

L'app n'invente jamais : tout fait non confirmé est marqué `non_verifie` et rendu explicitement dans le texte.

---

## Prérequis

- macOS, app locale (DMG ou terminal)
- Binaire `claude` installé et accessible
- Repo BoilingBrain monté (`bbDir`)
- Repo Brèves IA cloné (`repoDir`)
- Node ≥ 22 (pour le CLI `npm run breves` uniquement)

Pour la doc technique : [Vision](../project/vision.md) · [Architecture](../project/architecture.md) · [Gaps ouverts](../REVERSE_GAPS.md)
