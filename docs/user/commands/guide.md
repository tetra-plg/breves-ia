> Manuel utilisateur — Brèves IA

# Commandes

## Présentation

La vue **Commandes** te permet d'éditer les instructions des trois phases du pipeline de production d'une édition :

- **breves-verify** : pilote la vérification des sujets (phase 1).
- **breves-draft** : pilote la rédaction des brèves (phase 2).
- **breves-archive** : pilote l'archivage dans le wiki (phase 3).

Ces commandes sont les partitions que lit le pipeline à chaque run. Tu peux les ajuster ici sans ouvrir les fichiers directement.

---

## Avant de commencer

Les commandes sont lues depuis `.claude/commands/*.md` dans ton `repoDir`. Si ce chemin n'est pas configuré, la liste sera vide. Voir [Réglages](../reglages/guide.md).

---

## Fonctionnalités

### Comment l'utiliser

1. Clique sur **Commandes** dans le bandeau de navigation.
2. La liste des commandes s'affiche (breves-verify, breves-draft, breves-archive).
3. Clique sur une commande pour développer sa carte d'édition.
4. Modifie la **description** ou le **corps** de la commande.
5. Clique sur **Enregistrer** sur la carte.

Un toast confirme la sauvegarde ou signale l'échec.

### Ce que tu verras

- Une **carte par commande** avec sa description courte et son corps complet éditable.
- Un bouton **Enregistrer** par carte.
- Si aucune commande n'est trouvée : « Aucune commande dans .claude/commands/. »

### Conseil

Les commandes définissent le comportement précis de chaque phase. Modifie-les uniquement si tu veux changer une règle structurelle du pipeline (ex. : le format de sortie, les garde-fous, le regroupement par date). Pour ajuster la voix ou le style des brèves, préfère éditer la [SOUL](../soul/guide.md) ou les [Agents](../agents/guide.md).

---

## Questions fréquentes

**Je ne vois aucune commande dans la liste.**
Vérifie que `repoDir` est correctement configuré dans [Réglages](../reglages/guide.md). Les commandes doivent être présentes dans `.claude/commands/`.

**J'ai modifié breves-draft mais la rédaction se comporte pareil.**
Les modifications sont appliquées au run suivant. Vérifie que la sauvegarde a bien été confirmée par un toast.

---

## En cas de problème

**Toast « Échec : ... » à l'enregistrement.**
Un problème d'écriture fichier s'est produit. Vérifie que `repoDir` est valide et accessible.

---

## Voir aussi

- [Agents](../agents/guide.md) — régler l'enquêteur, le rédacteur et le sceptique
- [Nouvelle édition](../nouvelle-edition/guide.md) — voir les commandes en action
- [Réglages](../reglages/guide.md) — configurer `repoDir`
