> Manuel utilisateur — Brèves IA

# SOUL

## Présentation

La **SOUL** est ta plume éditoriale codifiée. Elle définit qui tu es, pour qui tu écris, ton style et tes lignes rouges. Le rédacteur la lit intégralement avant chaque édition pour produire des brèves dans ta voix. Affine-la au fil du temps : plus elle est précise, plus les brèves sonnent comme toi.

La vue **SOUL** se divise en quatre zones :
- **§1 à §4** : les textes que tu édites directement (Qui parle, Audience, Voix & tics, Lignes rouges).
- **§5** : les échantillons de style, curés à la main (jusqu'à 3 brèves validées).
- **§6** : le journal d'évolution, en lecture seule, alimenté par les leçons confirmées à l'archivage.

---

## Avant de commencer

La SOUL vit dans le fichier `.claude/breves-ia/SOUL.md` de ton repo. Si ce fichier est absent, un toast « SOUL introuvable. » s'affiche. Vérifie que `repoDir` est bien configuré dans [Réglages](../reglages/guide.md).

---

## Fonctionnalités

### Comment l'utiliser

#### Éditer les sections §1 à §4

1. Clique sur **SOUL** dans le bandeau de navigation.
2. Quatre textareas s'affichent : **Qui parle**, **Audience**, **Voix & tics**, **Lignes rouges**.
3. Modifie le contenu de chaque section.
4. Clique sur **Enregistrer**.

> **Note :** les quatre sections doivent être remplies. Si l'une d'elles est vide, tu verras le toast « Les 4 sections doivent être remplies. » et rien n'est enregistré.

Un toast « SOUL enregistrée » confirme la sauvegarde. La version SOUL (affichée en haut) s'incrémente après chaque leçon ajoutée au §6.

---

#### Gérer les échantillons de style §5

Les échantillons §5 sont des brèves validées que tu choisis à la main. Le rédacteur les lit comme exemples de ta plume : densité, rythme, structure. Tu peux en avoir jusqu'à 3.

**Ajouter un échantillon depuis une édition archivée :**

1. Dans la vue **SOUL**, clique sur **+ Ajouter depuis une édition**.
   Ce bouton est désactivé si tu as déjà 3 échantillons.
2. La liste de tes éditions archivées s'affiche. Sélectionne une édition.
3. Les brèves de l'édition sont listées. Clique sur **Ajouter** à côté de celle qui t'intéresse.
4. Tu reviens automatiquement à la vue **SOUL** avec un toast « Échantillon ajouté — pense à "Enregistrer §5". »
5. Clique sur **Enregistrer §5** pour écrire les échantillons dans la SOUL.

> **Attention :** l'échantillon est en mémoire tant que tu n'as pas cliqué sur **Enregistrer §5**. Si tu navigues vers une autre vue sans enregistrer, l'ajout est perdu.

> **Note :** si tu tentes d'ajouter un quatrième échantillon, le toast « 3 échantillons maximum. » s'affiche et rien n'est ajouté.

**L'archivage ne touche jamais §5.** Produire une nouvelle édition ne modifie pas tes échantillons. C'est toi seul qui les cures, depuis cette vue.

---

#### Consulter le journal d'évolution §6

Le §6 est en lecture seule dans la vue **SOUL**. Il liste les leçons de style apprises au fil des éditions, avec leur date.

Chaque entrée ressemble à :
```
[2026-06-24] La brève s'adresse aux PM, jamais à Pierre en direct.
```

Si aucune leçon n'est encore enregistrée : « Aucune leçon enregistrée. »

**Comment une leçon entre dans le §6 :** lors de la phase de rédaction d'une édition, tu peux ouvrir la modale **Corriger**, cocher « Proposer une leçon SOUL » et saisir un feedback. Si le rédacteur en déduit une règle généralisable, cette leçon est proposée à l'archivage. C'est toi qui confirmes — le §6 n'est jamais modifié automatiquement. Voir [Nouvelle édition](../nouvelle-edition/guide.md).

---

### Ce que tu verras

- La **version SOUL** courante (ex. : « v3 ») affichée en haut.
- Quatre **textareas** éditables pour §1 à §4, avec un bouton **Enregistrer**.
- La liste des **échantillons §5** (0 à 3), avec un bouton **+ Ajouter depuis une édition** et un bouton **Enregistrer §5**.
- Le **journal §6** en lecture seule.

### Conseil

Commence par renseigner §1 et §3 avec soin avant ta première édition. Quelques brèves plus tard, tu auras des candidats naturels pour §5 : prends celles qui sonnent le mieux et ajoute-les comme échantillons. C'est ce qui ancre la plume sur le long terme.

---

## Questions fréquentes

**Le bouton + Ajouter est grisé.**
Tu as déjà 3 échantillons. Supprime-en un (via **Enregistrer §5** avec la liste mise à jour) avant d'en ajouter un nouveau.

**J'ai cliqué sur Ajouter mais l'échantillon n'apparaît pas dans le fichier.**
L'ajout est en mémoire locale jusqu'au clic sur **Enregistrer §5**. Clique sur ce bouton pour persister.

**La liste des éditions dans le sous-flux est vide.**
Aucune édition n'est encore archivée, ou `bbDir` n'est pas configuré. Voir [Réglages](../reglages/guide.md).

**Le §6 n'a pas été mis à jour après archivage.**
La leçon n'est ajoutée au §6 que si la case « Proposer une leçon SOUL » a été cochée dans la modale **Corriger** ET qu'une leçon a effectivement été générée. Sans ces deux conditions, le §6 reste intact.

---

## En cas de problème

**Toast « SOUL introuvable. »**
Le fichier `.claude/breves-ia/SOUL.md` est absent ou `repoDir` pointe au mauvais endroit. Vérifie dans [Réglages](../reglages/guide.md).

**Toast « Les 4 sections doivent être remplies. »**
L'une des sections §1 à §4 est vide ou ne contient que des espaces. Remplis toutes les sections avant d'enregistrer.

**Toast « 3 échantillons maximum. »**
Tu as tenté d'ajouter un quatrième échantillon. Retire d'abord un existant.

---

## Voir aussi

- [Nouvelle édition](../nouvelle-edition/guide.md) — utiliser la SOUL dans un run, proposer une leçon
- [Historique](../historique/guide.md) — retrouver des éditions pour alimenter §5
- [Agents](../agents/guide.md) — régler le rédacteur qui lit la SOUL
