# Charte Rédactionnelle — Documentation Utilisateur

> Projet : Brèves IA · charte reverse (constat)
> Créée le : 2026-06-27
> Framework : v3.0

---

## Persona utilisateur

**Profil principal :** Pierre — VP Engineering, référent IA chez Merim. Opérateur unique de l'app et destinataire exclusif du manuel utilisateur.

**Niveau numérique :** Expert. Utilise Claude Code, le binaire `claude`, des chemins de fichiers, Node, la configuration JSON au quotidien. Aucun besoin de vulgariser les concepts techniques de base (CLI, fichiers de config, terminal).

**Contexte d'usage :** Au bureau, sur macOS, en production régulière d'éditions. L'app est locale, lancée depuis le DMG ou le terminal. Pierre connaît son outil — il l'a co-construit.

**Cas d'usage prioritaires :**
- Produire une édition complète (Sujets → Vérification → Rédaction → Archivage) sans friction
- Affiner la SOUL (§1-4 texte, §5 échantillons, §6 journal)
- Configurer les chemins (`bbDir`, `repoDir`, `claudeBin`) ou corriger un chemin erroné
- Comprendre un message d'erreur ou un comportement inattendu pendant un run

---

## Ton et style

**Registre :** Convivial, proche, décontracté — mais direct et clair. Pas de sur-explication, pas de paternalisme. Pierre sait ce qu'il fait : on lui donne les clés, pas le cours magistral.

**Forme d'adresse :** Tutoiement systématique.

**Directives rédactionnelles :**
- Tutoiement convivial : « Tu peux… », « Clique sur… », « Si tu vois ce toast… »
- Phrases courtes — une instruction = une phrase (15 mots max par instruction)
- Verbe d'action en tête de chaque étape : « Clique », « Lance », « Saisir », « Ouvre », « Copie »
- Aucune intro creuse — on entre dans le sujet dès la première ligne
- Pas de formules de politesse inutiles (« N'hésitez pas à… », « Nous vous recommandons… »)
- Les messages d'erreur reproduits verbatim, dans des blocs `code`
- Les noms de vues et de boutons reproduits exactement comme dans l'UI, en gras : **Accueil**, **Lancer l'enquête**, **Valider & archiver**
- Les chemins de fichiers dans des blocs `code` inline : `~/.claude/breves-ia/SOUL.md`
- Les notes et mises en garde signalées par `> **Note :**` ou `> **Attention :**`, jamais noyées dans le texte

---

## Vocabulaire

### Termes à utiliser

| Terme à utiliser | Plutôt que |
|---|---|
| brève | article, post, item, entrée |
| édition | newsletter, fichier, document, batch |
| SOUL | profil éditorial, modèle, prompt système, persona |
| échantillon | exemple, sample, extrait |
| enquêteur | agent de recherche, sous-agent, worker |
| rédacteur | agent de rédaction, LLM |
| sceptique | agent de vérification, vérificateur |
| vérification | phase 1, check, analyse |
| clipping | archive web, sauvegarde URL |
| plume | style, voix, ton (acceptable aussi) |
| sujet | topic, entrée, item |
| run | exécution, traitement (acceptable au besoin) |
| toast | notification, message d'alerte |
| vue | page, écran, onglet |
| Accueil | Dashboard |
| Réglages | Configuration, Settings |
| Historique | Archive, Journal |

### Termes à éviter absolument dans le manuel

- **IPC** — on ne décrit pas les échanges main/renderer dans la doc utilisateur
- **handler** — aucun sens pour l'opérateur
- **store / Zustand** — détail d'implémentation invisible
- **Zod / schéma** — idem
- **asar** — idem
- **endpoint** — idem
- **composant** — préférer « élément », « bouton », « section »
- **sous-agent** — acceptable uniquement entre guillemets la première fois ; privilégier le nom de l'agent (enquêteur, rédacteur, sceptique)
- **SDK** — acceptable entre parenthèses si vraiment nécessaire, jamais comme pivot de l'explication
- **permissionMode / bypassPermissions** — détail interne, hors scope doc utilisateur

---

## Langue

**Langue principale :** Français.

**Autres langues :** Aucune. Les noms de l'interface (labels de boutons, messages de toast) sont reproduits tels quels même s'ils contiennent un mot anglais intégré (ex. « Lancer l'enquête »).

**Règles typographiques :**
- Guillemets français pour les citations d'interface : « Valider & archiver »
- Blocs `code` pour les chemins, noms de fichiers, commandes terminal
- Gras pour les noms de vues et boutons quand ils sont référencés dans le texte courant
- Zéro tiret cadratin dans les exemples rédigés (règle SOUL §3 — cohérence avec le produit)
