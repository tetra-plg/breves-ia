> Manuel utilisateur — Brèves IA

# Réglages

## Présentation

La vue **Réglages** est l'endroit où tu configures les trois chemins que l'app doit connaître pour fonctionner. Sans ces chemins valides, l'historique ne charge pas, l'archivage échoue et le pipeline ne peut pas démarrer.

| Champ | Ce qu'il désigne |
|-------|-----------------|
| `bbDir` | Ton dossier BoilingBrain (le wiki local) |
| `repoDir` | Le dossier du repo Brèves IA (là où vivent la SOUL, les agents et les commandes) |
| `claudeBin` | Le chemin vers le binaire `claude` sur ta machine |

---

## Avant de commencer

> **Attention :** ces trois chemins conditionnent l'ensemble du fonctionnement de l'app. Configure-les en priorité lors d'une première installation ou si tu changes de machine.

- `bbDir` est requis pour lire et écrire les éditions archivées (`raw/notes/`, `raw/clippings/`) et pour l'ingestion wiki.
- `repoDir` est requis pour lire la SOUL, les agents et les commandes.
- `claudeBin` est requis pour que le pipeline puisse invoquer les phases de vérification, rédaction et archivage.

Si un chemin est défini via une variable d'environnement (priorité env), son champ apparaît **en lecture seule** dans l'interface. Tu ne peux pas le modifier depuis **Réglages** dans ce cas.

---

## Fonctionnalités

### Comment l'utiliser

1. Clique sur **Réglages** dans le bandeau de navigation.
2. Les trois champs s'affichent avec leur valeur courante et un indicateur de validité (vert = chemin existant, rouge = chemin invalide ou absent).
3. Pour modifier un chemin, clique sur **Parcourir** à côté du champ. Le sélecteur natif macOS s'ouvre.
4. Sélectionne le dossier ou le fichier.
5. L'indicateur se met à jour en temps réel.
6. Quand tous les chemins sont valides, clique sur **Enregistrer**.

Les chemins sont appliqués immédiatement, sans redémarrage. Le tableau de bord se rafraîchit automatiquement.

> **Note :** si tu saisis un chemin invalide (dossier inexistant, fichier absent), l'enregistrement est bloqué et rien n'est persisté.

### Ce que tu verras

- Trois **champs de chemin** avec indicateur de validité en temps réel.
- Un **bouton Parcourir** par champ pour utiliser le sélecteur natif.
- Un toast « Réglages enregistrés » en cas de succès.
- Un toast « Échec : ... » si l'enregistrement a échoué.
- Les champs verrouillés (variable d'environnement) en lecture seule, sans bouton Parcourir.

### Conseil

Utilise le bouton **Parcourir** plutôt que de saisir le chemin à la main. L'indicateur te confirme immédiatement que le chemin est valide avant d'enregistrer.

---

## Questions fréquentes

**Le champ `bbDir` est en lecture seule.**
Ce chemin est défini par une variable d'environnement sur ta machine. Il a la priorité sur la configuration de l'app et ne peut pas être modifié depuis **Réglages**.

**J'ai enregistré les réglages mais l'Historique reste vide.**
Vérifie que `bbDir` pointe bien vers la racine de ton dossier BoilingBrain, pas vers un sous-dossier. Les éditions sont lues depuis `{bbDir}/raw/notes/`.

**L'indicateur reste rouge après avoir sélectionné un dossier.**
Le dossier sélectionné n'existe pas ou est inaccessible. Vérifie les permissions macOS ou sélectionne un autre chemin.

---

## En cas de problème

**Toast « Échec : ... » à l'enregistrement.**
Au moins un chemin n'est pas valide. Vérifie les trois indicateurs : tous doivent être verts avant d'enregistrer.

**Le pipeline échoue avec une erreur liée au binaire `claude`.**
Le champ `claudeBin` pointe vers un fichier qui n'existe pas ou qui n'est pas exécutable. Sélectionne à nouveau le bon binaire via **Parcourir**.

**L'ingestion wiki échoue après archivage.**
L'archivage a réussi (les fichiers sont dans `raw/`), mais l'ingestion requiert le MCP `boiling-brain-wiki` et un script Python dans `bbDir`. Vérifie que `bbDir` est correct et que l'environnement wiki est opérationnel, puis lance `/ingest` manuellement côté BoilingBrain.

---

## Voir aussi

- [Accueil](../accueil/guide.md) — vérifier que la SOUL et les éditions chargent correctement
- [Historique](../historique/guide.md) — lit ses éditions depuis `{bbDir}/raw/notes/`
- [Nouvelle édition](../nouvelle-edition/guide.md) — requiert `claudeBin` et `bbDir` pour tourner
- [SOUL](../soul/guide.md) — lit et écrit dans `{repoDir}/.claude/breves-ia/SOUL.md`
- [Agents](../agents/guide.md) — lit depuis `{repoDir}/.claude/agents/`
- [Commandes](../commands/guide.md) — lit depuis `{repoDir}/.claude/commands/`
