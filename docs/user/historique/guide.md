> Manuel utilisateur — Brèves IA

# Historique

## Présentation

L'**Historique** liste toutes tes éditions archivées, triées par date. Tu peux y relire une édition passée rendue en HTML, ou copier son texte dans le presse-papier pour le repartager dans Teams.

---

## Avant de commencer

L'**Historique** lit les éditions depuis `{bbDir}/raw/notes/`. Si `bbDir` n'est pas configuré ou pointe au mauvais endroit, la liste sera vide. Vérifie le chemin dans [Réglages](../reglages/guide.md).

---

## Fonctionnalités

### Comment l'utiliser

1. Clique sur **Historique** dans le bandeau de navigation.
2. La liste des éditions s'affiche, de la plus récente à la plus ancienne.
3. Clique sur une édition pour l'ouvrir dans le **Lecteur**.
4. Dans le Lecteur, lis le texte rendu. Clique sur **Copier** pour copier le texte brut dans le presse-papier.
5. Un toast confirme la copie.
6. Utilise le bouton de retour pour revenir à la liste.

### Ce que tu verras

- La **liste des éditions** avec, pour chaque ligne : date, nombre de brèves.
- Dans le **Lecteur** : le texte de l'édition rendu en HTML, avec un bouton **Copier**.
- Si aucune édition n'est archivée : « Aucune édition archivée. »
- Si le fichier d'une édition est introuvable dans le wiki : « Texte introuvable dans le wiki (raw/notes/{fichier}). »

> **Note :** l'Historique est en lecture seule. Tu ne peux pas modifier ni supprimer une édition depuis cette vue.

### Conseil

Si tu as besoin de renvoyer une édition ancienne dans Teams, ouvre-la dans l'**Historique** et copie directement depuis le Lecteur. Le texte copié est identique à celui qui a été archivé, prêt à coller.

---

## Questions fréquentes

**La liste est vide alors que j'ai bien archivé des éditions.**
Vérifie que `bbDir` est correctement configuré et pointe vers le bon dossier BoilingBrain. Les éditions sont lues depuis `{bbDir}/raw/notes/`. Voir [Réglages](../reglages/guide.md).

**Une édition de la liste affiche une erreur dans le Lecteur.**
Le fichier `raw/notes/` correspondant n'est pas accessible ou a été déplacé. L'édition reste dans la liste mais son contenu ne peut pas être affiché.

---

## En cas de problème

**Le Lecteur affiche « Texte introuvable dans le wiki ».**
Le fichier de l'édition n'est plus à son emplacement d'origine dans `{bbDir}/raw/notes/`. Vérifie que le wiki BoilingBrain est bien monté et que `bbDir` est correct.

---

## Voir aussi

- [Accueil](../accueil/guide.md) — voir les 4 éditions les plus récentes
- [Nouvelle édition](../nouvelle-edition/guide.md) — produire une nouvelle édition
- [SOUL](../soul/guide.md) — ajouter un échantillon depuis une édition archivée
- [Réglages](../reglages/guide.md) — configurer le chemin `bbDir`
