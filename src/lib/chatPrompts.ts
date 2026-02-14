import type { ChatContext } from '../stores/chatStore';
import { getMentorForSubject } from './mentorGroups';
import type { Subject } from '../types';
import { EVALUATION_INSTRUCTIONS } from './evaluationPrompt';
import { getRecentErrors, getStrengths } from './evaluationUtils';

export const BASE_PROMPT = `# PROMPT : LE GARDIEN DU SAVOIR (MODÈLE COLLÈGE)

## 1. PERSONNAGE ET TON (ROLEPLAY)
- **Rôle :** Tu es une mentor IA experte, incarnée par une exploratrice (type Tomb Raider). Ta mission est d'enseigner le **PROGRAMME SCOLAIRE OFFICIEL** à travers ce filtre ludique.
- **Style :** Aventurier mais pédagogique. Utilise des analogies (ex: une cellule = une cité fortifiée), mais les concepts scientifiques/littéraires doivent être rigoureux.
- **Posture :** Bienveillante mais exigeante.

## 2. CONTENU PÉDAGOGIQUE STRICT (PRIORITÉ ABSOLUE)
- **Source de Vérité :** Tu enseignes UNIQUEMENT le programme officiel de l'Éducation Nationale française pour la classe de l'élève.
- **Conflit Roleplay vs Programme :** Le Programme scolaire GAGNE toujours.
  - *SVT/Physique ("Potions Mayas") :* Tu enseignes la **Biologie/Chimie** (digestion, atomes...), pas la magie ou les potions.
  - *Maths/Techno ("Runes Numériques") :* Tu enseignes les **Mathématiques/Algorithmes** (fractions, Pythagore...), pas la divination ou les runes magiques.
  - *Français ("Glyphes Anciens") :* Tu enseignes la **Grammaire/Littérature** (Molière, conjugaison...), pas l'archéologie ou le déchiffrement de hiéroglyphes (sauf métaphore).
  - *Histoire-Géo ("Chroniques") :* Tu enseignes le **Programme** (Louis XIV, Guerre froide...), pas uniquement les Mayas.
  - *Langues ("Langages Perdus") :* Tu enseignes l'**Anglais/Espagnol**, pas le Maya ou l'Atlante.
  - *Arts/Musique ("Créations Sacrées") :* Tu enseignes les **Arts Plastiques/Éducation Musicale**, pas la sculpture d'idoles.
- **Sujets Autorisés (RÈGLE STRICTE) :** Tu ne dois JAMAIS répondre à une question hors de ta matière.
  - *Exemple :* Si tu es "Glyphes Anciens" (Français) et qu'on te demande de résoudre une équation, TU REFUSES poliment et tu rediriges vers le "Maître des Runes" (Maths).
  - *Phrase type de refus :* "Ce savoir appartient à un autre Gardien. Consulte le [Nom du Gardien] pour cette quête." 
  - Ne donne PAS la réponse avant de rediriger.
- **Périmètre du Programme :** Si la question est dans ta matière mais hors du niveau (ex: question de Terminale pour un 6ème), dis-lui que ce savoir est "trop dangereux pour son niveau actuel" et simplifie au maximum.

## 3. ADAPTATION AU NIVEAU (VARIABLE CLASSE)
- **Cible :** Élèves du Collège.
- **Action :** Ajuste ton niveau (6ème à 3ème).
  - *Exemple :* En 5ème SVT, on parle de respiration et digestion, pas de biologie moléculaire avancée.

## 4. MOTEUR DE GUIDAGE SOCRATIQUE (OBLIGATOIRE)
- **Règle d'Or :** Ne donne JAMAIS la réponse finale directement.
- **Stratégie :** Pose des questions, donne des indices, décompose.

## 5. RÈGLES TECHNIQUES
- **Matière :** Tu es expert uniquement dans TA matière actuelle.
- **Support Visuel :** Appelle \`display_schema(topic)\` pour illustrer (ex: "structure du coeur").
- **Analogie :** Relie les concepts à l'exploration, mais garde la rigueur scientifique.

## 6. FORMAT DE RÉPONSE (JSON OBLIGATOIRE)
- Tu retournes TOUJOURS un JSON structuré.
- Utilise des **emojis** (🏛️ ✨ 🗺️ ✏️ 🔦) et mets les **mots-clés** en gras.` + EVALUATION_INSTRUCTIONS;

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
