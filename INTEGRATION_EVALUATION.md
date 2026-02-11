# 🔧 Modifications à Appliquer - Système d'Évaluation

## ✅ Fichiers Déjà Créés
- ✅ `supabase/migrations/20260210_evaluation_system.sql` (migration appliquée)
- ✅ `src/lib/evaluationUtils.ts` (fonctions utilitaires)
- ✅ `src/lib/evaluationPrompt.ts` (instructions pour l'IA)

## 📝 Modifications à Faire dans `src/stores/chatStore.ts`

### 1. Imports (DÉJÀ FAIT ✅)
Les imports ont été ajoutés avec succès.

### 2. Modifier BASE_PROMPT (Ligne ~105)

**Trouver cette ligne :**
```typescript
  🔦 Sais-tu quel mécanisme l'empêche de se mélanger ? ✏️"`;
```

**Remplacer par :**
```typescript
  🔦 Sais-tu quel mécanisme l'empêche de se mélanger ? ✏️"` + EVALUATION_INSTRUCTIONS;
```

### 3. Enrichir buildSystemPrompt (Après ligne ~114)

**Ajouter après `let prompt = BASE_PROMPT;` :**

```typescript
async function buildSystemPrompt(context?: MentorContext, studentId?: string): Promise<string> {
  let prompt = BASE_PROMPT;
  
  // Récupérer les erreurs récentes et points forts
  if (studentId) {
    const { data: recentErrors } = await getRecentErrors(studentId, 5);
    const { data: strengths } = await getStrengths(studentId);
    
    if (recentErrors && recentErrors.length > 0) {
      prompt += `\n\n⚠️ POINTS FAIBLES DÉTECTÉS (repose ces questions) :\n`;
      recentErrors.forEach(error => {
        prompt += `- ${error.question_topic} : L'élève a fait ${error.retry_count + 1} erreur(s). `;
        prompt += `Dernière erreur : "${error.student_answer}". `;
        if (error.evaluation_details?.reasoning) {
          prompt += `Raison : ${error.evaluation_details.reasoning}\n`;
        }
      });
      prompt += `\nREPOSE ces questions de manière différente pour vérifier si l'élève a compris.\n`;
    }
    
    if (strengths && strengths.length > 0) {
      prompt += `\n\n✅ POINTS FORTS (l'élève maîtrise) :\n`;
      strengths.forEach(s => {
        prompt += `- ${s.topic} : ${s.success_rate}% de réussite (${s.correct_attempts}/${s.total_attempts})\n`;
      });
      prompt += `\nTu peux augmenter la difficulté sur ces sujets.\n`;
    }
  }
  
  // ... reste du code existant
```

**Note :** Il faut aussi changer la signature de la fonction de `function` à `async function` et retourner `Promise<string>`.

### 4. Modifier l'appel à buildSystemPrompt (Ligne ~284)

**Trouver :**
```typescript
const systemPrompt = buildSystemPrompt(mentorContext);
```

**Remplacer par :**
```typescript
const systemPrompt = await buildSystemPrompt(mentorContext, studentId);
```

### 5. Traiter l'évaluation dans la réponse IA (Après ligne ~360)

**Ajouter après le traitement de `displaySchemaUrl` :**

```typescript
// Traiter l'évaluation de la réponse
if (resp.evaluation) {
  console.log('[ChatStore] Évaluation reçue:', resp.evaluation);
  
  // Calculer les XP selon l'évaluation
  const difficulty = resp.evaluation.question_difficulty || 'medium';
  const retryCount = await getErrorCount(studentId, resp.evaluation.question_topic || '');
  const xpAwarded = calculateXP(resp.evaluation.evaluation, difficulty, retryCount);
  
  // Sauvegarder l'évaluation
  const questionMessage = messages[messages.length - 1]; // Le message de l'élève
  await saveStudentAnswer({
    student_id: studentId,
    session_id: sessionId,
    message_id: savedMessage?.id,
    question: messages[messages.length - 2]?.content || '', // Question de l'IA
    question_topic: resp.evaluation.question_topic,
    question_difficulty: difficulty,
    student_answer: content,
    evaluation: resp.evaluation.evaluation,
    evaluation_details: {
      reasoning: resp.evaluation.reasoning,
      mistakes: resp.evaluation.mistakes || [],
    },
    xp_awarded: xpAwarded,
    retry_count: retryCount,
    mastered: resp.evaluation.evaluation === 'correct' && retryCount > 0,
  });
  
  // Ajouter les XP au profil
  if (xpAwarded > 0) {
    const { useGamificationStore } = await import('./gamificationStore');
    await useGamificationStore.getState().addXP(studentId, xpAwarded);
  }
  
  // Si erreur, programmer une révision
  if (resp.evaluation.evaluation === 'incorrect') {
    await scheduleRetry(
      studentId,
      resp.evaluation.question_topic || 'Unknown',
      messages[messages.length - 2]?.content || '',
      savedMessage?.id || '',
      retryCount + 1
    );
  }
  
  // Vérifier les bonus de série
  const { data: streak } = await getStreak(studentId);
  if (streak && resp.evaluation.evaluation === 'correct') {
    const streakBonus = getStreakBonus(streak.current_streak);
    if (streakBonus > 0) {
      const { useGamificationStore } = await import('./gamificationStore');
      await useGamificationStore.getState().addXP(studentId, streakBonus);
      // Afficher notification de série
      console.log(`[ChatStore] Série de ${streak.current_streak}! Bonus: +${streakBonus} XP`);
    }
  }
}
```

### 6. Mettre à jour le type de réponse IA (Ligne ~354)

**Trouver :**
```typescript
const resp = aiResponse as {
  content?: string;
  drawing?: unknown;
  updateSandbox?: { elements: unknown[] };
  displaySchemaUrl?: string;
  missionCompleted?: boolean;
  missionReward?: { xp: number; artifactName: string };
  redirectToGuardian?: { subject: string; guardianName: string };
} | null;
```

**Ajouter le champ `evaluation` :**
```typescript
const resp = aiResponse as {
  content?: string;
  drawing?: unknown;
  updateSandbox?: { elements: unknown[] };
  displaySchemaUrl?: string;
  missionCompleted?: boolean;
  missionReward?: { xp: number; artifactName: string };
  redirectToGuardian?: { subject: string; guardianName: string };
  evaluation?: {
    evaluation: 'correct' | 'partial' | 'incorrect';
    reasoning: string;
    mistakes?: string[];
    question_topic?: string;
    question_difficulty?: 'easy' | 'medium' | 'hard';
  };
} | null;
```

---

## 🧪 Test Après Modifications

1. **Envoyer un message** dans le chat
2. **Vérifier dans la console** :
   - `[ChatStore] Évaluation reçue: ...`
   - XP calculés et ajoutés
3. **Vérifier dans Supabase** :
   - Table `student_answers` : nouvelle ligne
   - Table `student_streaks` : mise à jour
   - Table `topic_mastery` : mise à jour

---

## ⚠️ Notes Importantes

- La fonction `buildSystemPrompt` devient **async**
- Tous les appels à `buildSystemPrompt` doivent être **await**
- L'Edge Function `/chat` doit retourner le champ `evaluation` dans sa réponse

---

**Date :** 2026-02-10
**Statut :** 📝 En attente d'application manuelle
