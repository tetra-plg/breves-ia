> Manuel utilisateur — Brèves IA

# Agents

## Présentation

La vue **Agents** te donne accès aux trois agents qui pilotent le pipeline d'une édition :

- **enquêteur** : part chercher les faits sur le web pour chaque sujet soumis.
- **rédacteur** : produit le texte des brèves dans ta plume (SOUL).
- **sceptique** : tente de réfuter les affirmations les plus fortes avant la rédaction.

Tu peux ajuster leur prompt, leur modèle, leurs outils et les activer ou désactiver depuis cette vue, sans ouvrir les fichiers directement.

---

## Avant de commencer

Les agents sont lus depuis `.claude/agents/*.md` dans ton `repoDir`. Si ce chemin n'est pas configuré, la liste sera vide. Vérifie dans [Réglages](../reglages/guide.md).

---

## Fonctionnalités

### Comment l'utiliser

1. Clique sur **Agents** dans le bandeau de navigation.
2. La liste des agents s'affiche (enquêteur, rédacteur, sceptique).
3. Clique sur un agent pour développer sa carte d'édition.
4. Modifie les champs souhaités : prompt, modèle, outils, activation.
5. Clique sur **Enregistrer** sur la carte de cet agent.

Un toast « Agent "X" enregistré » confirme la sauvegarde. Un toast « Échec : ... » apparaît si l'enregistrement a échoué.

### Ce que tu verras

- Une **carte par agent** (enquêteur, rédacteur, sceptique) avec ses paramètres courants.
- Des champs éditables : **prompt** (instructions de l'agent), **modèle** (ex. : opus, sonnet), **outils** activés, **activation** (oui/non).
- Un bouton **Enregistrer** par carte.
- Si aucun agent n'est trouvé : « Aucun agent dans .claude/agents/. »

> **Note :** un prompt vide est refusé. Tu verras le toast « Échec : ... » si tu tentes d'enregistrer un agent sans prompt.

### Conseil

Touche aux agents avec précaution. Un prompt mal formulé peut dégrader la qualité de la vérification ou de la rédaction sur toutes tes prochaines éditions. Si tu veux expérimenter, note d'abord le contenu actuel avant de le modifier.

Le mode sceptique (off/ciblé/toujours) se règle dans la vue [Nouvelle édition](../nouvelle-edition/guide.md) au moment du lancement, pas ici. La carte **sceptique** dans **Agents** te permet d'éditer les instructions de l'agent, pas son mode d'activation sur un run donné.

---

## Questions fréquentes

**Je ne vois aucun agent dans la liste.**
Vérifie que `repoDir` pointe vers le bon dossier dans [Réglages](../reglages/guide.md). Les agents doivent être présents dans `.claude/agents/`.

**J'ai enregistré un agent mais le comportement n'a pas changé lors du run suivant.**
Les modifications sont appliquées immédiatement. Si le comportement ne change pas, relis le prompt enregistré : la modification a peut-être été écrasée lors de la sauvegarde.

---

## En cas de problème

**Toast « Échec : ... » à l'enregistrement.**
Le prompt est vide, ou un problème d'écriture fichier s'est produit. Vérifie que `repoDir` est valide et que le prompt n'est pas vide.

---

## Voir aussi

- [Nouvelle édition](../nouvelle-edition/guide.md) — utiliser les agents dans un run
- [Commandes](../commands/guide.md) — éditer les instructions des phases (verify, draft, archive)
- [Réglages](../reglages/guide.md) — configurer `repoDir`
