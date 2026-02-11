# 💬 Exemples de Conversations avec le Système d'Évaluation

## 📚 Scénario 1 : Réponse Correcte du Premier Coup

### Conversation

**🤖 IA (Gardien SVT)** :
```
🏛️ Exploratrice, nous voici devant une stèle anatomique mystérieuse !

Le cœur humain est divisé en plusieurs chambres. Peux-tu me dire combien de cavités 
il possède au total ?

🔦 Observe bien cette structure vitale... ✏️
```

**👤 Élève** :
```
4 cavités
```

**🤖 IA** :
```
✅ Parfait, exploratrice ! Le cœur possède bien **4 cavités** : 2 ventricules et 
2 oreillettes. Un mécanisme parfait pour séparer le sang oxygéné du sang désoxygéné ! 
+20 XP 🌟

🔦 Maintenant, sais-tu quel côté du cœur pompe le sang vers les poumons ? ✏️

[EVAL_START]
{"evaluation":"correct","reasoning":"Réponse complète et exacte","question_topic":"Anatomie du cœur","question_difficulty":"easy"}
[EVAL_END]
```

### Ce qui se passe en coulisses :

```javascript
// Console Frontend
[ChatStore] Évaluation reçue: {
  evaluation: 'correct',
  reasoning: 'Réponse complète et exacte',
  question_topic: 'Anatomie du cœur',
  question_difficulty: 'easy'
}
[ChatStore] XP ajoutés: +20
[ChatStore] 🔥 Série de 1! Continue comme ça!

// Base de données
INSERT INTO student_answers (
  student_id: 'abc-123',
  question: 'Combien de cavités possède le cœur ?',
  question_topic: 'Anatomie du cœur',
  question_difficulty: 'easy',
  student_answer: '4 cavités',
  evaluation: 'correct',
  xp_awarded: 20,
  retry_count: 0,
  mastered: false
)

UPDATE student_streaks SET current_streak = 1 WHERE student_id = 'abc-123'
```

---

## ❌ Scénario 2 : Réponse Incorrecte → Révision Programmée

### Conversation

**🤖 IA (Gardien Maths)** :
```
🏛️ Exploratrice, voici une énigme des Runes Numériques !

Dans un triangle rectangle, si les côtés de l'angle droit mesurent 3 et 4, 
quelle est la longueur de l'hypoténuse ?

🔦 Souviens-toi du théorème de Pythagore... ✏️
```

**👤 Élève** :
```
7
```

**🤖 IA** :
```
🔍 Attention, piège détecté ! Tu as **additionné** les deux côtés (3+4=7), mais 
le théorème de Pythagore demande de calculer **a² + b²** puis de prendre la racine carrée.

💡 Indice : Calcule d'abord 3² et 4² séparément, puis additionne-les. Que trouves-tu ? 🔦

[EVAL_START]
{"evaluation":"incorrect","reasoning":"L'élève a additionné au lieu d'utiliser le théorème de Pythagore","mistakes":["A additionné 3+4 au lieu de calculer √(3²+4²)"],"question_topic":"Théorème de Pythagore","question_difficulty":"medium"}
[EVAL_END]
```

**👤 Élève** :
```
3² = 9 et 4² = 16, donc 9 + 16 = 25
```

**🤖 IA** :
```
⚡ Excellent calcul ! Tu as bien trouvé 25. Maintenant, quelle est la racine carrée de 25 ?

🔦 C'est la dernière étape pour trouver l'hypoténuse... ✏️
```

**👤 Élève** :
```
5
```

**🤖 IA** :
```
✅ Parfait ! L'hypoténuse mesure bien **5**. Tu as déverrouillé le mystère du triangle 3-4-5, 
un triangle rectangle célèbre ! +10 XP 🌟

(Tu as eu +10 XP au lieu de +20 car c'était ton 2ème essai, mais bravo d'avoir persévéré !)

🔦 Essayons avec un autre triangle : côtés 5 et 12, hypoténuse = ? ✏️

[EVAL_START]
{"evaluation":"correct","reasoning":"Réponse correcte après guidage","question_topic":"Théorème de Pythagore","question_difficulty":"medium"}
[EVAL_END]
```

### Ce qui se passe en coulisses :

```javascript
// Après la 1ère réponse incorrecte
[ChatStore] Évaluation reçue: { evaluation: 'incorrect', ... }
[ChatStore] XP ajoutés: +0
[ChatStore] Révision programmée pour: Théorème de Pythagore

// Base de données
INSERT INTO student_answers (
  evaluation: 'incorrect',
  xp_awarded: 0,
  retry_count: 0
)

INSERT INTO retry_queue (
  student_id: 'abc-123',
  topic: 'Théorème de Pythagore',
  original_question: 'Triangle 3-4, hypoténuse ?',
  retry_at: NOW() + INTERVAL '1 day',
  retry_count: 1,
  status: 'pending'
)

UPDATE student_streaks SET current_streak = 0 WHERE student_id = 'abc-123'

// Après la 2ème réponse correcte
INSERT INTO student_answers (
  evaluation: 'correct',
  xp_awarded: 10,  // Réduit car retry_count = 1
  retry_count: 1,
  mastered: true   // TRUE car correct après erreur
)

UPDATE retry_queue SET status = 'completed' WHERE topic = 'Théorème de Pythagore'
```

---

## ⚡ Scénario 3 : Réponse Partielle → Demande de Précision

### Conversation

**🤖 IA (Gardien Français)** :
```
🏛️ Exploratrice, déchiffrons ces glyphes grammaticaux !

Conjugue le verbe "aller" au présent de l'indicatif, 1ère personne du singulier.

🔦 Attention aux verbes irréguliers... ✏️
```

**👤 Élève** :
```
je vais
```

**🤖 IA** :
```
⚡ Bonne forme verbale ! Mais peux-tu me donner la phrase **complète** avec le pronom 
et le verbe correctement orthographié ?

🔦 N'oublie pas la majuscule et le point ! ✏️

[EVAL_START]
{"evaluation":"partial","reasoning":"Forme verbale correcte mais phrase incomplète","question_topic":"Conjugaison du verbe aller","question_difficulty":"easy"}
[EVAL_END]
```

**👤 Élève** :
```
Je vais.
```

**🤖 IA** :
```
✅ Parfait ! "Je vais." est la forme complète et correctement écrite. +15 XP 🌟

🔦 Maintenant, conjugue "aller" à la 3ème personne du pluriel... ✏️

[EVAL_START]
{"evaluation":"correct","reasoning":"Phrase complète et correcte","question_topic":"Conjugaison du verbe aller","question_difficulty":"easy"}
[EVAL_END]
```

---

## 🔥 Scénario 4 : Série de Bonnes Réponses → Bonus !

### Conversation

**🤖 IA** :
```
🏛️ Question 1 : Quelle est la capitale de la France ?
```

**👤 Élève** : `Paris`

**🤖 IA** :
```
✅ Correct ! +10 XP 🌟
🔦 Question 2 : Combien de régions compte la France métropolitaine ?
```

**👤 Élève** : `13`

**🤖 IA** :
```
✅ Exact ! +10 XP 🌟
🔦 Question 3 : Quel fleuve traverse Paris ?
```

**👤 Élève** : `La Seine`

**🤖 IA** :
```
✅ Parfait ! +10 XP 🌟

🔥🔥🔥 SÉRIE DE 3 ! Tu es en feu, exploratrice ! +10 XP BONUS ! 🔥🔥🔥

Total gagné : 40 XP (30 XP + 10 XP bonus de série)

🔦 Continue comme ça ! Question 4 : Quelle est la plus haute montagne de France ?
```

### Ce qui se passe en coulisses :

```javascript
// Après la 3ème bonne réponse
[ChatStore] 🔥 Série de 3! Bonus: +10 XP

UPDATE student_streaks SET 
  current_streak = 3,
  best_streak = 3  // Si c'est un nouveau record
WHERE student_id = 'abc-123'

// XP total ajouté au profil
UPDATE gamification SET xp = xp + 40 WHERE student_id = 'abc-123'
```

---

## 📊 Scénario 5 : Nouvelle Session → L'IA Repose les Points Faibles

### Contexte
L'élève a fait 2 erreurs sur "Théorème de Pythagore" hier.

### Nouvelle Session (Lendemain)

**🤖 IA** :
```
🏛️ Bienvenue, exploratrice ! Prête pour une nouvelle expédition ?

⚠️ J'ai remarqué que le **Théorème de Pythagore** te pose encore quelques difficultés. 
Révisons ensemble !

Voici un triangle rectangle avec des côtés de 6 et 8. Quelle est l'hypoténuse ?

🔦 Souviens-toi : a² + b² = c² ✏️
```

### Ce qui se passe en coulisses :

```javascript
// Dans buildSystemPrompt (chatStore.ts)
const { data: recentErrors } = await getRecentErrors(studentId, 5);

// Prompt enrichi envoyé à l'IA :
`
⚠️ POINTS FAIBLES DÉTECTÉS (repose ces questions) :
- Théorème de Pythagore : L'élève a fait 2 erreur(s). 
  Dernière erreur : "7". 
  Raison : A additionné au lieu d'utiliser le théorème

REPOSE ces questions de manière différente pour vérifier si l'élève a compris.
`
```

---

## 📈 Résumé des Barèmes XP

| Situation | XP Gagnés |
|-----------|-----------|
| ✅ Correct du 1er coup (easy) | +10 XP |
| ✅ Correct du 1er coup (medium) | +20 XP |
| ✅ Correct du 1er coup (hard) | +30 XP |
| ✅ Correct au 2ème essai (medium) | +10 XP |
| ⚡ Réponse partielle | +5 XP |
| ❌ Incorrect | 0 XP |
| 🔥 Série de 3 | +10 XP bonus |
| 🔥 Série de 5 | +20 XP bonus |
| 🔥 Série de 10 | +50 XP bonus |

---

## 🎯 Points Clés du Système

1. **L'IA évalue CHAQUE réponse** et adapte son feedback
2. **Les XP diminuent** si l'élève a besoin de plusieurs essais
3. **Les erreurs sont mémorisées** et reposées plus tard
4. **Les séries sont récompensées** pour encourager la régularité
5. **Le prompt s'enrichit** avec les points faibles de l'élève

**Date :** 2026-02-10 23:40
