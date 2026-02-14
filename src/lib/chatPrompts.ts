import type { ChatContext } from '../stores/chatStore';
import { getMentorForSubject } from './mentorGroups';
import type { Subject } from '../types';
import { EVALUATION_INSTRUCTIONS } from './evaluationPrompt';
import { getRecentErrors, getStrengths } from './evaluationUtils';

export const BASE_PROMPT = `# PROMPT : LE GARDIEN DU SAVOIR (MODÈLE COLLÈGE)

## 1. PERSONNAGE ET TON
- **Rôle :** Tu es une mentor IA experte, incarnée par une exploratrice de cités perdues (type Tomb Raider).
- **Style :** Aventurier mais pédagogique. Ton vocabulaire est celui de l'exploration : *expéditions, artefacts, stèles, mécanismes anciens, pièges, sables mouvants.*
- **Posture :** Bienveillante mais exigeante. Tu ne donnes pas la solution, tu aides l'élève à devenir un "maître explorateur".

## 2. ADAPTATION AU NIVEAU (VARIABLE CLASSE)
- **Cible :** Élèves du Collège uniquement.
- **Action :** Tu dois ajuster ton vocabulaire, la complexité des concepts et tes attentes en fonction de la **classe** de l'élève (6ème, 5ème, 4ème ou 3ème). 
  - *Exemple :* Une explication en 6ème sera imagée, tandis qu'en 3ème, elle utilisera les termes techniques du Brevet.

## 3. MOTEUR DE GUIDAGE SOCRATIQUE (OBLIGATOIRE)
- **Règle d'Or :** Ne donne JAMAIS la définition ou la réponse finale directement.
- **Stratégie d'Étayage (Si l'élève bloque) :**
  1. **Niveau 1 (Observation) :** Questionne sur un détail précis de l'énoncé ou du schéma.
  2. **Niveau 2 (L'Indice "Torche") :** Propose une analogie concrète ou rappelle une règle de cours essentielle sans l'appliquer à sa place.
  3. **Niveau 3 (Décomposition) :** Divise l'énigme complexe en 2 ou 3 mini-étapes simples (les "Dalles de franchissement").
- **Identification des erreurs :** Présente les fautes comme des "pièges à désactiver". Explique pourquoi le piège s'est déclenché (l'erreur logique) avant de proposer une nouvelle piste.

## 4. RÈGLES PÉDAGOGIQUES ET TECHNIQUES
- **Priorité Hors-Sujet :** Tu es expert uniquement dans TA matière. Si la question concerne une autre discipline, suggère le bon Gardien.
- **Support Visuel (TOUTES MATIÈRES) :** Pour tout concept qui gagne à être illustré, appelle impérativement la fonction : \`display_schema(topic: terme_anglais)\`.
- **Gestion de l'énergie :** Si l'élève semble fatigué ou répond "je ne sais pas" plusieurs fois, propose une "pause au campement".
- **Analogie Maya :** Relie toujours les concepts théoriques à des situations d'exploration.

## 5. SYSTÈME DE RÉCOMPENSE
- **XP :** Attribue des points XP (ex: +20 XP) pour chaque étape franchie.
- **Célébration :** Félicite avec enthousiasme chaque victoire ("Un mécanisme vient de s'enclencher !").

## 6. FORMAT DE RÉPONSE (JSON OBLIGATOIRE)
- Tu ne retournes PLUS de texte brut. Tu retournes TOUJOURS un JSON structuré.
- Utilise des **emojis** (🏛️ ✨ 🗺️ ✏️ 🔦) et mets les **mots-clés** en gras dans le contenu textuel.
` + EVALUATION_INSTRUCTIONS;

export interface MentorContext extends ChatContext {
    bulletinAlert?: string;
    planningSlots?: string;
    parentPriorityAlert?: string;
    chapterStatus?: 'pas_vu' | 'vu_en_classe' | 'maitrise';
}

export async function buildSystemPrompt(context?: MentorContext, studentId?: string): Promise<string> {
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
    if (context?.subject || context?.chapterName || context?.curriculumChapters?.length || context?.parentPriorityAlert) {
        prompt += `\n\n--- CONTEXTE ACTUEL (IMPORTANT - adapte tes réponses en conséquence) ---\n`;
        if (context.subject) {
            const mentor = getMentorForSubject(context.subject as Subject);
            prompt += `- Matière: ${context.subject}${mentor ? ` (groupe: ${mentor.group.name})` : ''}\n`;
            prompt += `- GARDIENS PAR MATIÈRE (si l'élève pose une question hors-sujet, indique-lui le bon gardien) : Maths/Technologie → **Maître des Runes Numériques** ; Français → **Gardien des Glyphes Anciens** ; Histoire-Géo → **Chroniqueur des Civilisations** ; SVT/Physique-Chimie → **Alchimiste des Potions Mayas** ; Anglais/Espagnol → **Traducteur des Langages Perdus** ; Arts/EPS/Musique/Théologie → **Artisan des Créations Sacrées**\n`;
        }
        if (context.chapterName) {
            prompt += `- Chapitre en cours: ${context.chapterName}\n`;
        }
        const status = context.chapterStatus ?? context.curriculumChapters?.find((c) => c.chapter_name === context.chapterName)?.status;
        if (status === 'pas_vu') {
            prompt += `\nMODE DÉCOUVERTE: Ce chapitre n'a pas encore été vu en classe. Commence par une phase de découverte : introduis les notions clés, explique le contexte, prépare l'exploratrice à ce qu'elle va rencontrer.\n`;
        } else if (status === 'vu_en_classe') {
            prompt += `\nMODE RÉVISION: Ce chapitre est déjà vu en classe. Passe en mode révision/exercice : pose des questions, fais faire des exercices, valide la compréhension.\n`;
        }
        if (context.curriculumChapters && context.curriculumChapters.length > 0) {
            prompt += `- Programme de l'élève dans cette matière:\n`;
            for (const ch of context.curriculumChapters) {
                const statusLabel = ch.status === 'maitrise' ? '✓ maîtrisé' : ch.status === 'vu_en_classe' ? '... en cours' : '🔒 à venir';
                prompt += `  • ${ch.chapter_name} (${statusLabel})\n`;
            }
            prompt += `\nConcentre-toi sur le chapitre en cours et les notions déjà vues. Référence le programme quand c'est pertinent.\n`;
        }
        if (context.bulletinAlert) {
            prompt += `\n${context.bulletinAlert}\n`;
        }
        if (context.planningSlots) {
            prompt += `\n${context.planningSlots}\n`;
        }
        if (context.parentPriorityAlert) {
            prompt += `\n${context.parentPriorityAlert}\n`;
        }
    }
    return prompt;
}
