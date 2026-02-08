# Analyse du Design Maya Explorer — ADN Visuel

Référence du style, des animations et du design comme identité du produit.

---

## 1. Palette de Couleurs

### Couleurs Principales

| Nom | Usage | Valeurs |
|-----|--------|---------|
| **Maya Gold** | Accent principal, CTAs, highlights | `#FFD700`, `#FFA500` |
| **Jungle Night** | Background principal | `#0a1628`, `#0d3b2e` |
| **Amber / Slate** | Textes, bordures | `amber-100/90`, `amber-400`, `slate-900` |
| **Terracotta** | Accent secondaire | HSL `25 50% 50%` |
| **Maya Cyan** | Accents secondaires | `#00D4FF` |

### Dégradés

- **Background body** : `linear-gradient(180deg, #0a1628 0%, #0d3b2e 50%, #0a1628 100%)`
- **Texte doré** (`.text-golden`) : `#FFD700 → #FFA500 → #FFD700` (135deg)
- **Boutons** : `from-amber-500 to-amber-600` ou `via-amber-400`
- **Particules** : `#FFD700`, `#FFA500`, `#C9A87C`, `#00D4FF`

---

## 2. Typographie

### Polices

- **Cinzel Decorative** : titres (H1–H6), marque, labels d'étapes
- **Inter** : texte courant, body, formulaires

### Usages Typographiques

- Titres : `font-['Cinzel_Decorative']` avec `text-golden` pour les mots-clés
- Labels : `tracking-widest` / `tracking-wider` sur CTAs et badges
- Tailles : `text-3xl` à `text-7xl` pour titres, `text-lg` pour sous-titres

---

## 3. Animations GSAP

### Principes

- Plugin : **ScrollTrigger**
- Easings : `power3.out`, `power2.out`, `back.out(1.7)`
- Durées : 0.5s à 1.5s pour entrées, 2s pour parcours

### Motifs Récurrents

- **Hero** : `clipPath: inset(100% 0 0 0)` → `inset(0% 0 0 0)`
- **Titres** : `opacity 0 → 1`, `y: 50–100 → 0`
- **CTAs** : `opacity 0, scale 0.8` → `scale 1` avec `back.out(1.7)`
- **Features** : entrées alternées gauche/droite (`x: ±100 → 0`)
- **Method** : dessin de chemin SVG, cartes avec `rotateY`
- **Parallax** : `gsap.set(image, { y: progress * -200 })`

---

## 4. Composants CSS (index.css)

### Classes Utilitaires

| Classe | Usage |
|--------|--------|
| `.temple-reveal` | Entrée avec translateY, scale, blur |
| `.jungle-sway` | Balancement subtil (rotate ±1deg) |
| `.treasure-glow` | Pulsation lumineuse dorée |
| `.text-golden` | Dégradé doré sur texte |
| `.stone-card` | Carte type pierre avec bordure dorée |
| `.btn-maya` | Bouton bordure dorée + hover lumineux |
| `.nav-glass` | Navigation glassmorphism |
| `.section-divider` | Séparateur gradient doré |

### Easings Personnalisés

- `ease-temple` : `cubic-bezier(0.16, 1, 0.3, 1)`
- `ease-jungle` : `cubic-bezier(0.45, 0, 0.55, 1)`
- `ease-treasure` : `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (rebond)

### Effets

- `.text-shadow-gold` : halo doré sur texte
- `.glow-gold` / `.glow-cyan` : box-shadow lumineux

---

## 5. Particules

- Canvas 2D fixe, `pointer-events: none`
- Couleurs : doré, orange, cuivre, cyan
- Mouvement lent + légère interaction souris (répulsion)
- `shadowBlur` pour effet glow
- 30fps sur desktop, moins de particules sur mobile

---

## 6. Système de Cartes et Conteneurs

- Fond : gradient sombre + `backdrop-filter: blur`
- Bordure : `1px solid rgba(255, 215, 0, 0.2)` → `0.5` au hover
- Décors : petits cadres en coin (`border-t-2 border-l-2`)
- Hover : légère translation Y, bordure plus dorée, box-shadow

---

## 7. Éléments Graphiques Récurrents

- **Compass** : losange (carré avec `rotate-45`) en logo/icône
- **Bordures d'angle** : type glyphe maya sur images et cartes
- **God rays** : bandes de gradient ambre en `blur-3xl`
- **Light spots** : cercles ambre en `blur-[60px]` ou `blur-[100px]`

---

## 8. UX et Accessibilité

- `scroll-behavior: smooth`
- Focus visible : `outline: 2px solid #FFD700`
- `prefers-reduced-motion` : animations quasi désactivées, particules masquées
- `prefers-contrast: high` : bordures renforcées
- Styles print : particules et nav masqués

---

## 9. Responsive & Mobile

- Particules réduites (30 vs 60), opacité 50%
- `will-change` retiré sur mobile
- Menu mobile : menu déroulant avec même palette

---

## 10. Résumé ADN

| Dimension | Identité |
|-----------|----------|
| **Univers** | Jungle / temple maya, exploration, trésor |
| **Ambiance** | Sombre, atmosphérique, mystérieux |
| **Accent** | Doré = succès, conquête, récompense |
| **Motion** | Entrées fluides, parallax, parcours SVG, révélation |
| **Matériaux** | Pierre, verre (glassmorphism), lueurs dorées |
| **Ton** | Épique, aventure, gamification éducative |

---

*Document de référence pour maintenir la cohérence visuelle sur toutes les nouvelles fonctionnalités.*
