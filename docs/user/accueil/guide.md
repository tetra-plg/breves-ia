> Manuel utilisateur — Brèves IA

# Accueil

## Présentation

L'**Accueil** est la vue de démarrage de l'app. Avant de lancer une édition, tu y vois en un coup d'oeil où tu en es : un récap de ta **dernière édition** et les **quatre dernières éditions** archivées, avec le bouton pour en démarrer une nouvelle.

---

## Avant de commencer

Pour que l'**Accueil** soit utile dès le lancement, les chemins doivent être configurés dans **Réglages** (`bbDir` et `repoDir`). Si ce n'est pas fait, la liste des éditions récentes reste vide. Voir [Réglages](../reglages/guide.md).

---

## Fonctionnalités

### Comment l'utiliser

1. Lance l'app. L'**Accueil** s'affiche directement, avec le salut « Bonjour Pierre. »
2. Jette un oeil à la carte **Dernière édition** : sa date, son nombre de brèves et de sources.
3. Parcours les quatre dernières éditions sous **Éditions récentes**.
4. Clique sur **Nouvelle édition** pour démarrer un nouveau run.
5. Clique sur une édition dans la liste pour l'ouvrir dans le lecteur.

Pour accéder à l'**Accueil** depuis une autre vue, clique sur **Accueil** dans le bandeau de navigation.

### Ce que tu verras

- Un bouton **Nouvelle édition** bien visible pour démarrer un pipeline.
- Une carte **Dernière édition** : sa date, son nombre de brèves, un compteur « corrigé » et un compteur de sources.
- Une **liste des quatre dernières éditions** (lien **voir l'historique →** pour les autres).
- Si aucune édition n'est encore archivée : « Aucune édition archivée pour l'instant. »

> **Note :** la version de ta SOUL n'est pas affichée sur l'Accueil. Pour la consulter, ouvre [SOUL](../soul/guide.md).

### Conseil

Garde l'**Accueil** comme point de départ de chaque session : la carte **Dernière édition** te rappelle où tu en étais avant de relancer un run.

---

## Questions fréquentes

**La liste des éditions récentes est vide alors que j'en ai archivé.**
Vérifie que `bbDir` pointe bien vers ton dossier BoilingBrain dans [Réglages](../reglages/guide.md). Sans ce chemin, l'app ne peut pas lire les éditions archivées.

**Le compteur « corrigé » affiche toujours 0.**
C'est un comportement connu : ce compteur n'est pas encore calculé. L'information n'est pas perdue, elle est dans le détail de chaque édition via le [Lecteur](../historique/guide.md).

---

## En cas de problème

**La liste reste vide ou affiche « — » pour la dernière édition.**
Aucune édition n'a encore été archivée, ou `bbDir` est mal configuré. Vérifie dans [Réglages](../reglages/guide.md), puis produis une première édition depuis [Nouvelle édition](../nouvelle-edition/guide.md).

**Le bouton Nouvelle édition ne réagit pas.**
Un run est peut-être déjà actif. Attends qu'il se termine ou redémarre l'app.

---

## Voir aussi

- [Nouvelle édition](../nouvelle-edition/guide.md) — produire une édition de bout en bout
- [Historique](../historique/guide.md) — retrouver et relire une édition passée
- [SOUL](../soul/guide.md) — consulter et éditer ta plume
- [Réglages](../reglages/guide.md) — configurer les chemins de l'app
