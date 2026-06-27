> Manuel utilisateur — Brèves IA

# Nouvelle édition

## Présentation

La vue **Nouvelle édition** est le coeur de l'app. C'est là que tu produis une édition de brèves complète : saisie des sujets, vérification automatique, rédaction dans ta plume (SOUL), puis archivage dans le wiki. Tout tient en quatre étapes linéaires indiquées par le stepper en haut de l'écran.

---

## Avant de commencer

- Ta SOUL doit être renseignée (au minimum les sections §1 à §4). Voir [SOUL](../soul/guide.md).
- Les chemins `bbDir`, `repoDir` et `claudeBin` doivent être valides. Voir [Réglages](../reglages/guide.md).
- Une connexion réseau est nécessaire pour la phase de vérification (les enquêteurs cherchent sur le web).

---

## Fonctionnalités

### Démo de bout en bout

Voici le parcours complet, du sujet brut à la copie dans Teams.

---

#### Étape 1 — Saisir les sujets (vue Compose)

1. Clique sur **Nouvelle édition** depuis l'**Accueil** ou le bandeau de navigation.
2. Dans le champ texte, saisis tes sujets d'actualité IA, **un par ligne**. Exemple :

   ```
   Google DeepMind annonce Gemini 3.0 avec de nouvelles capacités vidéo
   OpenAI lève 10 Md$ en série D
   Mistral sort un modèle open source 70B
   ```

3. Observe les **chips de prévisualisation** qui apparaissent sous le champ (jusqu'à 8 sujets détectés affichés).
4. Sélectionne le **mode sceptique** si tu veux une vérification adversariale renforcée (voir plus bas).
5. Clique sur **Lancer l'enquête**.

> **Note :** le champ accepte jusqu'à 8 000 caractères. S'il est vide, tu verras le toast « Donne au moins un sujet. » et le run ne démarre pas.

> **Note :** si tu as soumis une édition précédente, son état est réinitialisé automatiquement avant le nouveau run.

---

#### Étape 2 — Suivre la vérification en temps réel (vue Vérification)

Dès le lancement, la vue bascule sur le suivi en temps réel. Une card par sujet apparaît, avec 5 étapes de progression :

| Étape | Ce qui se passe |
|-------|-----------------|
| **recherche** | L'enquêteur part chercher des sources sur le web |
| **faits** | Il extrait et vérifie les faits clés |
| **date** | Il confirme ou corrige la date de l'événement |
| **source** | Il retient la source la plus fiable et accessible |
| **article** | Il récupère le contenu de l'article pour le clipping |

Chaque étape passe de « en attente » à « en cours » puis « fait ». Quand toutes les étapes sont terminées, la card passe à « Terminé ».

**Alertes et corrections du sceptique :** certaines cards peuvent afficher une alerte (niveau « corrigé », « nuance » ou « date ») si la passe sceptique a relevé un écart. Ce n'est pas un échec, c'est le garde-fou qui fonctionne.

**Résumé final :** quand tous les enquêteurs ont terminé, un résumé apparaît (« N vérifiés · N corrigés · N nuancés »). Le bouton **Rédiger les brèves** devient actif.

> **Note :** si tu as soumis plus de 15 sujets, seuls les 15 premiers sont traités. Un avertissement le signale.

**Ouvrir le détail d'un sujet :** clique sur une card pour voir les faits vérifiés, la source retenue, l'URL et les éventuelles corrections en détail. Un bouton de retour ramène à la vue de vérification.

---

#### Le garde-fou « jamais d'invention »

L'app n'invente jamais. Si un fait n'a pas pu être confirmé par une source accessible, la brève le dira explicitement (ex. : « date non confirmée », « information non vérifiée »). Tu ne verras jamais une affirmation `non_verifie` présentée comme certaine.

Si une source est derrière un paywall ou renvoie une erreur, l'enquêteur bascule automatiquement vers une source alternative. L'URL originale est conservée ; un indicateur de repli apparaît dans les sources affichées en phase 2.

---

#### Le mode sceptique

Trois réglages disponibles dans la vue de saisie :

| Mode | Comportement |
|------|--------------|
| **off** | Pas de passe adversariale |
| **ciblé** (défaut) | Le sceptique intervient uniquement sur les affirmations fortes (chiffres, superlatifs, « premier/record ») |
| **toujours** | Le sceptique vérifie chaque brève sans exception |

---

#### Étape 3 — Relire et corriger les brèves (vue Rédaction)

1. Clique sur **Rédiger les brèves**. La rédaction démarre automatiquement dans ta plume (SOUL).
2. Lis le texte affiché en aperçu. Le rendu HTML te montre les brèves telles qu'elles seront copiées.
3. Tu peux basculer en **mode édition directe** pour corriger du texte à la main.

**Corrections du sceptique :** si des alertes ont été levées en phase de vérification, une section « Corrections apportées » liste chaque écart. Ces corrections n'apparaissent pas dans le texte des brèves mais sont tracées ici pour ta relecture.

**Sources et clippings :** une section liste toutes les sources retenues. Un indicateur « repli » signale les cas où l'URL archivée diffère de l'URL citée dans la brève.

**Demander une réécriture (modale Corriger) :**

1. Clique sur **Corriger**.
2. Saisis ton feedback (280 caractères max). Exemple : « La deuxième brève est trop longue, resserrer. »
3. Coche **Proposer une leçon SOUL** si ce feedback formule une règle de style réutilisable.
4. Valide. Le rédacteur repart avec ton feedback et produit un nouveau draft.

> **Note :** la leçon SOUL n'est pas enregistrée immédiatement. Elle est proposée à la phase d'archivage et c'est toi qui confirmes si elle doit entrer dans le journal.

5. Quand le texte te convient, clique sur **Valider & archiver**.

---

#### Étape 4 — Archiver et copier (vue Archivé)

L'archivage démarre automatiquement. Tu vois défiler les étapes :

1. Newsletter enregistrée dans le wiki
2. N clippings archivés
3. SOUL mise à jour (si une leçon a été confirmée)
4. Note et clippings déposés dans `raw/`

Une fois terminé :

- Le texte des brèves s'affiche en aperçu.
- Clique sur **Copier les brèves (prêt à coller)** pour copier le texte dans le presse-papier.
- Colle directement dans Teams.

> **Note :** si tu avais coché « Proposer une leçon SOUL » et qu'une leçon a été générée, elle est ajoutée au §6 du journal à cette étape.

L'**Accueil** se rafraîchit automatiquement après archivage.

---

### Ce que tu verras

- Un **stepper 4 étapes** en haut : Sujets · Vérification · Rédaction · Archivé.
- Des **cards par sujet** avec progression live pendant la vérification.
- Un **texte rendu** dans ta plume après la phase de rédaction.
- Les étapes d'archivage et un bouton de copie en phase finale.

### Conseil

Pour une édition typique, saisis 2 à 5 sujets. Le fan-out de vérification est parallèle : 3 sujets ou 10 sujets, le temps de vérification ne multiplie pas. Laisse tourner et reviens consulter le résumé quand toutes les cards sont passées à « Terminé ».

---

## Questions fréquentes

**Les chips de sujets n'apparaissent pas sous le champ.**
Vérifie que tu utilises bien des sauts de ligne entre les sujets. Les sujets vides ou composés uniquement d'espaces sont ignorés.

**La card d'un sujet est passée à « Erreur ».**
Un enquêteur a rencontré un problème irrécupérable sur ce sujet (source inaccessible, timeout réseau). Les autres sujets continuent. Le sujet en erreur n'est pas inclus dans la rédaction.

**Le bouton Rédiger les brèves ne s'active pas.**
Tous les enquêteurs doivent avoir terminé (terminé ou erreur) pour que le résumé et le bouton apparaissent. Si un enquêteur semble bloqué, attends quelques instants.

**La rédaction ne reflète pas ma plume.**
Vérifie que ta SOUL §3, §4 et §5 sont bien renseignées. Utilise la modale **Corriger** pour donner un feedback, et coche « Proposer une leçon SOUL » pour capitaliser la règle.

**Les brèves contiennent des tirets cadrantins (— ou –).**
C'est une anomalie à signaler via la modale **Corriger**. La règle « zéro tiret cadratin » est codifiée dans la SOUL §3 et dans les instructions du rédacteur. Un feedback ciblé le corrigera.

---

## En cas de problème

**Toast « Échec de la vérification : ... »**
La commande de vérification n'a pas pu démarrer. Vérifie que `claudeBin` est valide dans [Réglages](../reglages/guide.md) et que le réseau est disponible.

**Toast « Échec de la rédaction : ... »**
La commande de rédaction a échoué. Retente via **Corriger** ou reviens à l'**Accueil** et relance une édition.

**Toast « Échec de l'archivage : ... » + retour Rédaction**
L'archivage a planté. L'app te ramène à la vue de rédaction pour que tu puisses réessayer. Vérifie que `bbDir` pointe vers ton wiki BoilingBrain et que le MCP est accessible.

**Toast « Déposé dans raw/, mais l'ingestion a échoué : relance /ingest côté wiki »**
Le texte et les clippings sont bien archivés dans `raw/`. Seule l'ingestion wiki a échoué. Lance `/ingest` manuellement côté BoilingBrain pour finaliser.

---

## Voir aussi

- [Accueil](../accueil/guide.md) — tableau de bord
- [SOUL](../soul/guide.md) — éditer ta plume avant de lancer une édition
- [Agents](../agents/guide.md) — régler l'enquêteur, le rédacteur et le sceptique
- [Commandes](../commands/guide.md) — éditer les instructions des phases
- [Réglages](../reglages/guide.md) — configurer les chemins
