> Framework : reverse (constat) · cartographié à `4ce7095`

# UI/UX Guidelines — Brèves IA

Application de bureau Electron, macOS, fenêtre fixe **400 × 760 px** (`src/config/constants.ts:1-3`).  
Design mono-colonne, layout 1 colonne, pas de responsive web.

---

## 1. Design Tokens

Source principale : `src/renderer/styles/tokens.css`.

### 1.1 Surfaces & couleurs primitives

| Token CSS | Thème clair | Thème sombre | Rôle |
|---|---|---|---|
| `--bg` | `#e7e1d4` | `#2a2620` | Fond général (derrière la fenêtre) |
| `--win` | `#f8f4ec` | `#332e27` | Surface fenêtre principale (`body`) |
| `--panel` | `#f2ece1` | `#39342c` | Cartes, blocs, enq, editor |
| `--panel2` | `#ece5d8` | `#423c33` | Bouton icon, pill, surcharges |
| `--line` | `rgba(64,52,34,0.12)` | `rgba(243,236,222,0.10)` | Séparateurs, bordures |
| `--text` | `#2e2a22` | `#ece4d6` | Texte courant |
| `--muted` | `#6f6557` | `#b0a594` | Texte secondaire, eyebrow, étiquettes |
| `--faint` | `#a89d8b` | `#827868` | Texte tertiaire, sous-titre header, stepper todo |

Trace : `tokens.css:3-4` (clair) · `tokens.css:21-22` (sombre).

### 1.2 Couleurs sémantiques

Toutes les valeurs sémantiques sont en `oklch` — le navigateur Chromium/Electron les résout nativement.

| Token | Thème clair | Thème sombre | Usage |
|---|---|---|---|
| `--accent` | `oklch(0.52 0.072 46)` | `oklch(0.66 0.066 48)` | Brun-doré chaud — CTA, liens, dates, diamant header |
| `--accentSoft` | `oklch(0.91 0.030 62)` | `oklch(0.40 0.040 50)` | Fond doux accent (sélection, cta bg, badge) |
| `--onAccent` | `#faf6ee` | `#241f18` | Texte sur fond `--accent` |
| `--good` | `oklch(0.50 0.085 150)` | `oklch(0.74 0.085 150)` | Vert — fiabilité, StatusDot done |
| `--goodSoft` | `oklch(0.91 0.045 150)` | `oklch(0.36 0.045 150)` | Fond doux good |
| `--warn` | `oklch(0.53 0.135 34)` | `oklch(0.70 0.12 36)` | Orange-rouge — erreur, StatusDot error, alerte |
| `--warnSoft` | `oklch(0.92 0.05 44)` | `oklch(0.37 0.07 34)` | Fond doux warn |
| `--nuance` | `oklch(0.58 0.10 74)` | `oklch(0.76 0.10 78)` | Ambre — nuance/incertitude |
| `--nuanceSoft` | `oklch(0.91 0.06 82)` | `oklch(0.38 0.06 78)` | Fond doux nuance |

Trace : `tokens.css:7-10` (clair) · `tokens.css:23-26` (sombre).

### 1.3 Échelle d'espacement

| Token | Valeur | Usage typique |
|---|---|---|
| `--space-1` | `4px` | Micro-gap (corr-dot, glyph) |
| `--space-2` | `8px` | Gap row, padding badge, gap enq-step |
| `--space-3` | `11px` | Padding cards légères, gap édition, sep bsep |
| `--space-4` | `14px` | Padding card principale, padding enq, gap header |
| `--space-5` | `18px` | Padding content (.pad), padding editable |
| `--space-6` | `22px` | Padding bottom content (.pad = 22px bas) |

Trace : `tokens.css:13`.  
Note : les primitives existantes (Button, header, etc.) utilisent leurs valeurs `px` d'origine — l'échelle `--space-*` est réservée aux nouveaux agencements.

### 1.4 Formes & ombres

| Token | Valeur | Usage |
|---|---|---|
| `--radius` | `14px` | Cards principales, CTA button, Modal, Textarea, Input |
| `--radiusSm` | `10px` | Button primary/ghost, alerts, edition row, enq |
| `--shadow` | `0 14px 36px rgba(60,48,28,0.10)` (clair) / `0 16px 40px rgba(0,0,0,0.30)` (sombre) | Toast, Modal sheet, Modal modal |

Trace : `tokens.css:16-17` · `tokens.css:27` (sombre).

---

## 2. Typographie

Source : `src/renderer/index.html:9-11` (chargement Google Fonts) · `tokens.css:17-18`.

### 2.1 Familles

| Variable | Famille | Graisses chargées | Rôle |
|---|---|---|---|
| `--display` | Hanken Grotesk, system-ui, sans-serif | 400 · 500 · 600 · 700 | Titres, corps principal, labels |
| `--body` | Hanken Grotesk, system-ui, sans-serif | 400 · 500 · 600 · 700 | Identique à `--display` — alias sémantique |
| `--mono` | JetBrains Mono, ui-monospace, monospace | 400 · 500 | Dates, fiabilité, sous-titre header, stepper label, eyebrow, sous-source, input |

Trace : `index.html:9-11` (graisses disponibles) · `tokens.css:17-18`.

### 2.2 Tailles et usages constatés

| Taille | Graisse | Famille | Classe / composant | Fichier:ligne |
|---|---|---|---|---|
| `10px` | 500 | `--mono` | `.h-sub` (sous-titre header) | `app.css:8` |
| `10px` | 500 | `--body` | `.ed-src` (lien source), Badge | `app.css:24` · `Badge.module.css:1` |
| `10.5px` | 600 | `--mono` | `.ed-date` (date section édition) | `app.css:22` |
| `11px` | 600 | `--mono` | `.ed-h2` (label section édition) | `app.css:26` |
| `11px` | 600 | `--body` | Stepper step (numéro/✓) | `Stepper.module.css:3` |
| `11px` | 500 | `--mono` | Stepper label (ligne), Eyebrow | `Stepper.module.css:7` · `Eyebrow.module.css:1` |
| `11px` | 500 | `--body` | Pill | `Pill.module.css:1` |
| `12px` | 500 | `--mono` | `.edition .r` (fiabilité colonne droite) | `app.css:37` |
| `12px` | 600 | `--body` | `.ed-srcsubj` (sujet source) | `app.css:30` |
| `12.5px` | 400 | `--body` | Corps texte courant (`enq-step`, `ed-body`, `ed-intro`) | `app.css:19,23,43` |
| `12.5px` | 500 | `--body` | Toast | `app.css:49` |
| `12.5px` | 400 | `--mono` | Input | `Input.module.css:1` |
| `13px` | 600 | `--body` | Button ghost | `Button.module.css:2` |
| `13.5px` | 400 | `--body` | `.editable` (zone rédaction, line-height 1.68) | `app.css:45` |
| `13.5px` | 400 | `--mono` | Textarea (line-height 1.65) | `Textarea.module.css:1` |
| `14px` | 600 | `--display` | `.h-title` (titre header) | `app.css:7` |
| `14px` | 600 | `--body` | Button primary | `Button.module.css:1` |
| `18px` | 700 | `--display` | `.ed-title` (titre édition) | `app.css:18` |
| `23px` | 600 | `--display` | `h1.hello` (titre dashboard) | `app.css:34` |

Eyebrow : majuscules + `letter-spacing: 0.06em` (`Eyebrow.module.css:1`).  
Date section édition : majuscules + `letter-spacing: 0.05em` (`app.css:22`).

---

## 3. Iconographie

Source : `src/renderer/components/foundations/Icones.mdx`.

Pas de composant `Icon` dédié. Tous les glyphes sont des caractères Unicode affichés inline via `Button variant="icon"` (30 × 30 px, `border-radius: 9px`, `background: var(--panel2)`, `border: 1px solid var(--line)`).

| Glyphe | Sens | Emplacement |
|---|---|---|
| `←` | Retour (vues hors dashboard) | Header |
| `✦` | SOUL — le style | Header |
| `⚙` | Agents | Header |
| `⌘` | Commandes | Header |
| `⛭` | Réglages | Header |
| `◑` | Basculer thème clair/sombre | Header |
| `✕` | Quitter / état erreur | Header · StatusDot(error) |
| `✓` | Validé / étape done | StatusDot(done) · Stepper |
| `→` | Action / lien / CTA | Liens, CTA, lignes |
| `+` | Nouvelle édition | CTA dashboard (`.plus`, cercle 36 px, fond `--accent`) |

Diamant header (`.diamond`) : `11 × 11 px`, `border-radius: 3px`, `background: var(--accent)`, `transform: rotate(45deg)` — affiché uniquement sur le dashboard à la place du bouton retour. Trace : `app.css:9`.

---

## 4. Navigation & Layout

### 4.1 Structure de la fenêtre

```
┌─────────────────────── 400 px ────────────────────────┐
│  .head (header — 13px 14px padding, border-bottom)    │
│  [← | ◆ diamant] [titre · sous-titre]  [✦⚙⌘⛭◑✕]      │
├───────────────────────────────────────────────────────┤
│  Stepper (affiché seulement dans le FLOW 4 étapes)    │
│  [1] — [2] — [3] — [4]          1 / 4 · Sujets       │
├───────────────────────────────────────────────────────┤
│  .content (flex:1, overflow:auto)                     │
│    .pad (18px 18px 22px)                              │
│    contenu de la page courante                        │
└───────────────────────────────────────────────────────┘
│  Toast (absolu, bottom:26px, centré)                  │
└───────────────────────────────────────────────────────┘
```

Source : `Shell.tsx` · `app.css:1-11`.

### 4.2 Sections / vues

Registre complet (`src/domain/navigation.ts:1-4`) :

| Vue | Titre header | Dans le FLOW ? |
|---|---|---|
| `dashboard` | « Brèves IA » | non |
| `compose` | « Nouvelle édition » | étape 1 — Sujets |
| `checking` | « Nouvelle édition » | étape 2 — Vérification |
| `editor` | « Nouvelle édition » | étape 3 — Rédaction |
| `archived` | « Nouvelle édition » | étape 4 — Archivé |
| `soul` | « SOUL — le style » | non |
| `history` | « Historique » | non |
| `agents` | « Agents » | non |
| `ech-editions` | « Choisir une édition » | non |
| `ech-breves` | « Choisir une brève » | non |
| `settings` | « Réglages » | non |
| `commands` | « Commandes » | non |

### 4.3 Navigation — règles de retour (Shell.tsx:25-36)

- `detail` / `reader` → vue d'origine stockée dans `returnTo`
- `ech-breves` → `ech-editions`
- `ech-editions` → `soul` (avec `setEchKeepLocal(true)`)
- toutes les autres vues hors-FLOW → `dashboard`

Le FLOW (`compose → checking → editor → archived`) est **linéaire, sans retour arrière** depuis le header ; la progression est pilotée par les actions métier (`launch`, `toEditor`, `validate`).

### 4.4 Stepper (FLOW uniquement)

- Affiché pour les vues `compose`, `checking`, `editor`, `archived`.
- 4 étapes numérotées : **1 Sujets · 2 Vérification · 3 Rédaction · 4 Archivé**.
- États visuels : `todo` (cercle vide, `--faint`), `active` (fond `--accent`, texte `--onAccent`), `done` (fond `--accentSoft`, texte `--accent`, glyphe `✓`).
- Barre de connexion : `13px × 1.5px`, `var(--line)`.
- Label droit : `«N / 4 · NomÉtape»`, `11px` mono, `--muted`.
- Fond stepper : `--panel`, `border-bottom: 1px solid var(--line)`.

Source : `Stepper.tsx` · `Stepper.module.css` · `navigation.ts:30-38`.

---

## 5. Composants & patterns d'état

### 5.1 Button — 4 variantes

| Variante | Fond | Bordure | Texte | Padding | Rayon |
|---|---|---|---|---|---|
| `primary` | `--accent` | aucune | `--onAccent`, 600 14px | `12px` | `--radiusSm` (10px) |
| `ghost` | transparent | `1px solid var(--line)` | `--text`, 600 13px | `11px 16px` | `--radiusSm` (10px) |
| `icon` | `--panel2` | `1px solid var(--line)` | `--text` | — (30×30px) | `9px` |
| `cta` | `--accentSoft` | `1px solid var(--accent)` | — (enfants libres) | `15px 16px` | `--radius` (14px) |

État `disabled` / `loading` : `opacity: 0.45`, `cursor: not-allowed`. Le loading affiche un `Spinner` inline.

Source : `Button.module.css` · `app.css:50`.

### 5.2 Alert — 4 tons

Bloc `flex-direction: column`, `gap: 3px`, `padding: 8px 10px`, `border-radius: --radiusSm`.

| Ton | Couleur texte | Fond |
|---|---|---|
| `accent` | `--accent` | `--accentSoft` |
| `good` | `--good` | `--goodSoft` |
| `warn` | `--warn` | `--warnSoft` |
| `nuance` | `--nuance` | `--nuanceSoft` |

Source : `Alert.module.css`.

### 5.3 Badge — 4 tons

Inline, `font: 500 10px var(--body)`, `padding: 3px 7px`, `border-radius: 20px` (pill).

| Ton | Couleur texte | Fond |
|---|---|---|
| `good` (défaut) | `--good` | `--goodSoft` |
| `warn` | `--warn` | `--warnSoft` |
| `nuance` | `--nuance` | `--nuanceSoft` |
| `accent` | `--accent` | `--accentSoft` |

Source : `Badge.module.css`.

### 5.4 Pill

Neutre, `font: 500 11px var(--body)`, `color: --muted`, `background: --panel2`, `border: 1px solid var(--line)`, `border-radius: 20px`, `padding: 4px 9px`.

Source : `Pill.module.css`.

### 5.5 StatusDot

Cercle `15 × 15 px`, `border-radius: 50%`.

| État | Visuel |
|---|---|
| `done` | Fond `--good`, texte `#fff`, glyphe `✓` (9px) |
| `error` | Fond `--warn`, texte `#fff`, glyphe `✕` (9px) |
| `active` | Bord `2px solid --accent`, bord-top transparent, animation `spin 0.7s linear infinite` |
| `todo` | Bord `1.5px solid --line`, fond transparent |

Source : `StatusDot.module.css`.

### 5.6 Spinner

Cercle `15 × 15 px`, `border: 2px solid --accent`, `border-top-color: transparent`, animation `spin 0.7s linear infinite`. Affiché inline dans `Button` quand `loading=true`.

Source : `Spinner.module.css`.

### 5.7 Card

`background: --panel`, `border: 1px solid var(--line)`, `border-radius: --radius (14px)`, `padding: 14px 15px`.

Source : `Card.module.css`.

### 5.8 Eyebrow

Label de section : `font: 600 11px var(--mono)`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: --muted`.

Source : `Eyebrow.module.css`.

### 5.9 Input

`border: 1px solid var(--line)`, `padding: 9px 12px`, `font: 400 12.5px var(--mono)`, `background: --panel`, `border-radius: --radius`. Désactivé : `opacity: 0.55`.

Source : `Input.module.css`.

### 5.10 Textarea

`border: 1px solid var(--line)`, `padding: 14px 15px`, `font: 400 13.5px/1.65 var(--mono)`, `background: --panel`, `border-radius: --radius`, `resize: vertical`.

Source : `Textarea.module.css`.

### 5.11 Modal

Deux modes :

- **Sheet** (drawer plein-écran) : `400px × 760px`, `border-radius: 16px`, fond `--win`, `overflow: auto`, `box-shadow: --shadow`. Overlay fond `rgba(0,0,0,0.45)`.
- **Modal** (dialog flottant) : `360px × auto`, `border-radius: --radius`, `padding: 20px`, fond `--win`, `box-shadow: --shadow`.

Source : `Modal.module.css`.

### 5.12 Toast

`position: absolute`, `bottom: 26px`, centré horizontalement. Fond `--text`, texte `--win`, `font: 500 12.5px var(--body)`, `padding: 11px 18px`, `border-radius: --radiusSm`, `box-shadow: --shadow`, `z-index: 60`. Largeur max `90vw`.

Source : `app.css:49`.

---

## 6. Patterns de feedback

| Situation | Composant / pattern |
|---|---|
| Chargement en cours (bouton) | `Button loading={true}` → Spinner inline + bouton `disabled` |
| Process long (phase LLM) | `StatusDot state="active"` (anneau rotatif `--accent`) |
| Succès | Toast centré bas (fond `--text`) · `StatusDot state="done"` (✓ vert) |
| Erreur | `Alert tone="warn"` · `StatusDot state="error"` (✕ orange) |
| État vide / en attente | `StatusDot state="todo"` (cercle vide `--line`) |
| Alerte métier (faits non vérifiés) | `Alert tone="nuance"` ou `tone="warn"` selon fiabilité |
| Sélection de texte | `::selection { background: var(--accentSoft) }` (`tokens.css:36`) |

---

## 7. Thème clair / sombre

Basculement via `body.dark` (`tokens.css:20-28`). Toutes les valeurs de token sont redéfinies dans cette classe. Le basculement est piloté par `toggleTheme()` dans le store Zustand, actionné par le bouton `◑` du header (`Shell.tsx:63-65`).

Pas de détection automatique du thème système — basculement manuel uniquement (constat : aucun `prefers-color-scheme` dans le code).

---

## 8. Scrollbar personnalisée

Largeur `9px`, thumb `background: var(--line)` + `border: 2px solid transparent` + `background-clip: content-box` + `border-radius: 8px`, track transparent. Antialiasing : `-webkit-font-smoothing: antialiased` global.

Source : `tokens.css:33-35`.

---

## 9. Contraintes de la fenêtre étroite (400 px)

- Layout **1 colonne** systématique — pas de grille multi-colonnes.
- Header dense : groupe d'icônes `[✦⚙⌘⛭◑✕]` sur une ligne, boutons `30×30px`.
- `.h-title` tronqué (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`).
- Contenu scrollable verticalement (`.content { overflow: auto }`), pas de scroll horizontal.
- `overflow: hidden` sur `body` — la scrollbar n'apparaît que dans `.content`.
- Modal sheet = dimensions identiques à la fenêtre (`400 × 760`) — usage drawer plein-écran.
- `.row { display: flex; gap: 9px }` pour aligner 2 éléments côte à côte quand nécessaire.

---

## 10. Accessibilité — constat

- `aria-hidden="true"` sur `StatusDot` et `Spinner` (glyphes purement décoratifs).
- Boutons header avec `title=…` (tooltip natif).
- Pas de `role`, `aria-label`, `aria-live` constatés dans les primitives.
- Pas de gestion de focus visible (`:focus-visible`) dans les CSS modules — `[contenteditable]:focus { outline: none }` supprime l'outline natif.
- Les contrastes oklch ne sont pas documentés en interne ; aucune mention de WCAG dans le code.

---

## 11. Do's & Don'ts (constatés depuis le code)

### Do's
- Utiliser les tokens sémantiques (`--accent`, `--good`, `--warn`, `--nuance`) plutôt que des valeurs hex directes.
- Utiliser `--panel` pour les fonds de carte, `--panel2` pour les fonds de contrôle secondaire.
- Employer l'échelle `--space-*` pour tout nouvel espacement.
- Utiliser `--radiusSm` (10px) pour les contrôles inline, `--radius` (14px) pour les cartes et surfaces.
- Conserver les glyphes Unicode du catalogue (pas de SVG ni d'icône externe).
- Tronquer les textes longs avec `text-overflow: ellipsis` dans l'espace contraint du header.

### Don'ts
- Ne pas introduire de layout multi-colonnes (fenêtre 400px, colonne unique).
- Ne pas ajouter de familles de polices : seules Hanken Grotesk et JetBrains Mono sont chargées.
- Ne pas utiliser `--bg` pour les surfaces de contenu (c'est le fond « derrière » la fenêtre).
- Ne pas créer de composant Icon avec SVG : l'iconographie est 100% Unicode inline.
- Ne pas modifier `§5 Échantillons vivants` de la SOUL depuis l'UI d'archivage (règle produit, pas seulement UX).
- Ne pas afficher le stepper hors du FLOW de 4 étapes (`stepper()` retourne `steps: []` pour les vues hors-FLOW).
