# 🎯 Spécifications : Onboarding & Système de Défis

## 📚 ONBOARDING ÉLÈVE - Première Connexion

### Objectif
Permettre à l'élève de **marquer les chapitres déjà vus en classe** pour que l'IA adapte son niveau de questionnement et ses exercices.

---

## 🚀 FLUX D'ONBOARDING

### Étape 1 : Écran de Bienvenue
```
┌─────────────────────────────────────────┐
│  🏛️ Bienvenue, Exploratrice !          │
│                                         │
│  Avant de partir à l'aventure,         │
│  aide-moi à comprendre où tu en es     │
│  dans ton exploration du savoir...     │
│                                         │
│  [Commencer] ──────────────────────────│
└─────────────────────────────────────────┘
```

### Étape 2 : Sélection de la Classe
```
┌─────────────────────────────────────────┐
│  📖 Dans quelle classe es-tu ?         │
│                                         │
│  ○ 6ème                                │
│  ○ 5ème                                │
│  ○ 4ème                                │
│  ● 3ème (sélectionné)                  │
│                                         │
│  [Suivant] ────────────────────────────│
└─────────────────────────────────────────┘
```

### Étape 3 : Sélection de la Zone Scolaire
```
┌─────────────────────────────────────────┐
│  🗺️ Dans quelle zone es-tu ?           │
│                                         │
│  ○ Zone A (Lyon, Bordeaux...)          │
│  ● Zone B (Lille, Rennes...)           │
│  ○ Zone C (Paris, Toulouse...)         │
│                                         │
│  [Suivant] ────────────────────────────│
└─────────────────────────────────────────┘
```

### Étape 4 : Validation des Chapitres par Matière

**Interface : Liste déroulante par matière**

```
┌─────────────────────────────────────────────────────┐
│  ✅ Coche les chapitres que tu as DÉJÀ VUS en classe│
│                                                     │
│  📐 MATHÉMATIQUES                                   │
│  ├─ ☑️ Théorème de Pythagore                       │
│  ├─ ☑️ Équations du premier degré                  │
│  ├─ ☐ Fonctions linéaires                          │
│  └─ ☐ Statistiques et probabilités                 │
│                                                     │
│  📖 FRANÇAIS                                        │
│  ├─ ☑️ L'argumentation                             │
│  ├─ ☐ Le récit au XIXe siècle                      │
│  └─ ☐ La poésie lyrique                            │
│                                                     │
│  🌍 HISTOIRE-GÉO                                    │
│  ├─ ☑️ La Première Guerre mondiale                 │
│  ├─ ☑️ La France et l'Europe dans le monde         │
│  └─ ☐ Les espaces productifs français              │
│                                                     │
│  [Matière suivante ▼]                               │
│                                                     │
│  [Précédent]  [Valider et commencer] ──────────────│
└─────────────────────────────────────────────────────┘
```

**Comportement :**
- Afficher **toutes les matières** du programme de la classe
- Pour chaque matière, lister **tous les chapitres** du programme officiel
- L'élève **coche** les chapitres déjà vus
- Les chapitres non cochés = "pas encore vu"
- Sauvegarde dans `curriculum` avec statut :
  - ✅ Coché → `status: 'vu_en_classe'`
  - ☐ Non coché → `status: 'pas_vu'`

### Étape 5 : Confirmation
```
┌─────────────────────────────────────────┐
│  🎉 Parfait, Exploratrice !            │
│                                         │
│  Tu as validé 12 chapitres sur 45.     │
│  Je vais adapter mes questions à       │
│  ton niveau et à ce que tu as déjà vu. │
│                                         │
│  Prête pour l'aventure ? 🗺️            │
│                                         │
│  [Découvrir la Carte] ─────────────────│
└─────────────────────────────────────────┘
```

---

## 🎮 SYSTÈME DE DÉFIS XP

### Concept
Transformer les **points XP** en **défis concrets** pour gamifier l'apprentissage.

### Types de Défis

#### 1. Défis Quotidiens (Renouvellement : chaque jour)
```
🌅 DÉFIS DU JOUR
├─ 📚 Révise 3 chapitres différents (+50 XP)
├─ 🔥 Maintiens une série de 5 jours (+100 XP)
├─ ⏱️ Passe 30 minutes à réviser (+30 XP)
└─ 🎯 Réponds correctement à 10 questions (+80 XP)
```

#### 2. Défis Hebdomadaires (Renouvellement : chaque lundi)
```
📅 DÉFIS DE LA SEMAINE
├─ 🏆 Maîtrise 2 nouveaux chapitres (+200 XP)
├─ 📖 Révise toutes les matières au moins 1 fois (+150 XP)
├─ 💬 Pose 20 questions au mentor (+100 XP)
└─ 🖼️ Annote 5 schémas dans le Grimoire (+120 XP)
```

#### 3. Défis de Matière (Permanent)
```
📐 DÉFIS MATHÉMATIQUES
├─ 🎓 Maîtrise tous les chapitres de géométrie (+500 XP)
├─ 🧮 Résous 50 équations (+300 XP)
└─ 📊 Complète le module Statistiques (+250 XP)
```

#### 4. Défis de Progression (Permanent)
```
🚀 DÉFIS DE PROGRESSION
├─ 🌟 Atteins le niveau 10 (+1000 XP)
├─ 🏅 Obtiens 10 artefacts (+500 XP)
├─ 📈 Passe de "Danger" à "OK" dans une matière (+300 XP)
└─ 🎯 Complète 100% d'une matière (+800 XP)
```

---

## 🗄️ STRUCTURE DE DONNÉES

### Table : `challenges` (Nouvelle)
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'subject', 'progression'
  challenge_id TEXT NOT NULL, -- Identifiant unique du défi
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL,
  target_value INTEGER, -- Ex: 3 chapitres, 10 questions
  current_value INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
  expires_at TIMESTAMP, -- Pour défis quotidiens/hebdomadaires
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_challenges_student ON challenges(student_id);
CREATE INDEX idx_challenges_status ON challenges(status);
```

### Table : `onboarding_progress` (Nouvelle)
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  step TEXT NOT NULL, -- 'welcome', 'class', 'zone', 'chapters', 'completed'
  completed BOOLEAN DEFAULT FALSE,
  data JSONB, -- Stocke les choix temporaires
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modification : `curriculum`
Ajouter une colonne pour tracker l'origine du statut :
```sql
ALTER TABLE curriculum 
ADD COLUMN marked_by_student BOOLEAN DEFAULT FALSE;
-- TRUE si l'élève a coché "vu en classe" pendant l'onboarding
```

---

## 🎨 COMPOSANTS À CRÉER

### 1. `OnboardingFlow.tsx`
**Responsabilité :** Gérer le flux complet d'onboarding
- Écrans de bienvenue
- Sélection classe/zone
- Validation des chapitres
- Sauvegarde dans la DB

### 2. `ChapterChecklistBySubject.tsx`
**Responsabilité :** Afficher la liste des chapitres par matière avec checkboxes
- Grouper par matière
- Permettre de cocher/décocher
- Sauvegarder les statuts

### 3. `ChallengesPanel.tsx`
**Responsabilité :** Afficher les défis actifs et leur progression
- Défis du jour
- Défis de la semaine
- Progression en temps réel
- Notification de complétion

### 4. `ChallengeCard.tsx`
**Responsabilité :** Carte individuelle d'un défi
- Titre, description
- Barre de progression
- Récompense XP
- Bouton "Réclamer" si complété

---

## 🔄 LOGIQUE MÉTIER

### Adaptation du Chat selon les Chapitres Vus

**Prompt système enrichi :**
```typescript
const buildSystemPrompt = (context: MentorContext) => {
  let prompt = BASE_PROMPT;
  
  // Chapitres vus par l'élève
  const seenChapters = context.curriculumChapters?.filter(c => c.status === 'vu_en_classe');
  const unseenChapters = context.curriculumChapters?.filter(c => c.status === 'pas_vu');
  
  if (seenChapters?.length) {
    prompt += `\n\nCHAPITRES VUS EN CLASSE (l'élève a déjà étudié ces notions) :\n`;
    seenChapters.forEach(ch => {
      prompt += `- ${ch.chapter_name}\n`;
    });
    prompt += `\nPour ces chapitres, tu peux poser des questions de RÉVISION et d'APPROFONDISSEMENT.\n`;
  }
  
  if (unseenChapters?.length) {
    prompt += `\n\nCHAPITRES NON VUS (l'élève n'a pas encore étudié ces notions) :\n`;
    unseenChapters.forEach(ch => {
      prompt += `- ${ch.chapter_name}\n`;
    });
    prompt += `\nPour ces chapitres, tu dois faire de la DÉCOUVERTE : introduis les concepts, explique les bases, ne suppose RIEN.\n`;
  }
  
  return prompt;
};
```

### Détection Automatique des Défis Complétés

**Fonction : `checkChallengeCompletion(studentId, action)`**

```typescript
// Appelée après chaque action de l'élève
async function checkChallengeCompletion(studentId: string, action: {
  type: 'message_sent' | 'chapter_mastered' | 'session_time' | 'drawing_annotated',
  value?: number,
  metadata?: any
}) {
  // Récupérer les défis actifs
  const activeChallenges = await supabase
    .from('challenges')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active');
  
  for (const challenge of activeChallenges.data || []) {
    // Incrémenter la progression selon l'action
    let increment = 0;
    
    switch (action.type) {
      case 'message_sent':
        if (challenge.challenge_id === 'daily_10_questions') increment = 1;
        break;
      case 'chapter_mastered':
        if (challenge.challenge_id === 'weekly_master_2_chapters') increment = 1;
        break;
      case 'session_time':
        if (challenge.challenge_id === 'daily_30_minutes') increment = action.value || 0;
        break;
      // ... autres cas
    }
    
    if (increment > 0) {
      const newValue = challenge.current_value + increment;
      
      // Mettre à jour
      await supabase
        .from('challenges')
        .update({ 
          current_value: newValue,
          status: newValue >= challenge.target_value ? 'completed' : 'active',
          completed_at: newValue >= challenge.target_value ? new Date().toISOString() : null
        })
        .eq('id', challenge.id);
      
      // Si complété, ajouter les XP
      if (newValue >= challenge.target_value) {
        await addXP(studentId, challenge.xp_reward, `Défi complété : ${challenge.title}`);
        // Afficher notification
        showChallengeCompletedNotification(challenge);
      }
    }
  }
}
```

### Génération Automatique des Défis Quotidiens/Hebdomadaires

**Fonction : `generateDailyChallenges(studentId)`**

```typescript
// Appelée chaque jour à minuit (via cron job ou au premier login)
async function generateDailyChallenges(studentId: string) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Expire à la fin de la journée
  
  const dailyChallenges = [
    {
      challenge_id: 'daily_3_subjects',
      title: 'Révise 3 matières différentes',
      description: 'Explore au moins 3 domaines du savoir aujourd\'hui',
      xp_reward: 50,
      target_value: 3,
      expires_at: today.toISOString()
    },
    {
      challenge_id: 'daily_10_questions',
      title: 'Pose 10 questions au mentor',
      description: 'La curiosité est la clé de l\'apprentissage',
      xp_reward: 80,
      target_value: 10,
      expires_at: today.toISOString()
    },
    {
      challenge_id: 'daily_30_minutes',
      title: 'Passe 30 minutes à réviser',
      description: 'La régularité est essentielle',
      xp_reward: 30,
      target_value: 30, // minutes
      expires_at: today.toISOString()
    }
  ];
  
  // Insérer dans la DB
  for (const challenge of dailyChallenges) {
    await supabase.from('challenges').insert({
      student_id: studentId,
      challenge_type: 'daily',
      ...challenge,
      current_value: 0,
      status: 'active'
    });
  }
}
```

---

## 🎯 INTÉGRATION DANS L'APP

### 1. Au Premier Login (Onboarding)
```typescript
// Dans StudentApp.tsx ou App.tsx
useEffect(() => {
  if (user && !user.onboarding_completed) {
    navigate('/onboarding');
  }
}, [user]);
```

### 2. Affichage des Défis
**Emplacement :** Nouvel onglet "Défis" dans la navigation

```
┌─────────────────────────────────────────┐
│  🏆 MES DÉFIS                          │
│                                         │
│  🌅 DÉFIS DU JOUR (2/3 complétés)      │
│  ├─ ✅ Révise 3 matières (50 XP)       │
│  ├─ ⏳ Pose 10 questions (6/10)        │
│  └─ ⏳ 30 minutes de révision (18/30)  │
│                                         │
│  📅 DÉFIS DE LA SEMAINE (0/4)          │
│  ├─ ⏳ Maîtrise 2 chapitres (0/2)      │
│  └─ ⏳ Révise toutes les matières      │
│                                         │
│  🎯 DÉFIS PERMANENTS                   │
│  └─ ⏳ Atteins le niveau 10 (Niv. 3)   │
└─────────────────────────────────────────┘
```

### 3. Notifications de Complétion
**Modale qui s'affiche automatiquement :**

```
┌─────────────────────────────────────────┐
│           🎉 DÉFI COMPLÉTÉ !           │
│                                         │
│  Tu as révisé 3 matières différentes ! │
│                                         │
│         +50 XP 🌟                      │
│                                         │
│  [Réclamer la récompense] ─────────────│
└─────────────────────────────────────────┘
```

---

## 📊 MÉTRIQUES & ANALYTICS

### Données à Tracker
- Taux de complétion de l'onboarding
- Nombre de chapitres validés par élève
- Défis les plus complétés
- Défis les moins complétés (à ajuster)
- Temps moyen pour compléter un défi
- Corrélation défis complétés ↔ progression

---

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Onboarding (Priorité Haute)
1. ✅ Créer la table `onboarding_progress`
2. ✅ Créer le composant `OnboardingFlow.tsx`
3. ✅ Créer le composant `ChapterChecklistBySubject.tsx`
4. ✅ Intégrer dans le flux de première connexion
5. ✅ Sauvegarder les statuts dans `curriculum`
6. ✅ Adapter le prompt système du chat

### Phase 2 : Système de Défis (Priorité Moyenne)
1. ✅ Créer la table `challenges`
2. ✅ Créer le composant `ChallengesPanel.tsx`
3. ✅ Créer le composant `ChallengeCard.tsx`
4. ✅ Implémenter `generateDailyChallenges()`
5. ✅ Implémenter `checkChallengeCompletion()`
6. ✅ Ajouter l'onglet "Défis" dans la navigation
7. ✅ Créer la modale de complétion

### Phase 3 : Raffinement (Priorité Basse)
1. ✅ Ajouter des animations de progression
2. ✅ Créer des défis personnalisés selon le bulletin
3. ✅ Système de séries (streaks)
4. ✅ Leaderboard (optionnel)

---

**Date de création :** 2026-02-10
**Statut :** 📝 Spécifications validées - Prêt pour implémentation
