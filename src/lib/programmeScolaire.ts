/**
 * Référentiel du programme scolaire officiel français (collège).
 * Thèmes principaux et compétences du socle commun par classe.
 *
 * Source officielle : Ministère de l'Éducation nationale via data.gouv.fr
 * Dataset : Programmes d'enseignement de l'école élémentaire et du collège (cycles 2, 3 et 4)
 * Arrêté du 17-7-2020 - J.O. du 28-7-2020 (rentrée 2020)
 */
import type { Classe, Subject } from '../types';

/** URL des programmes officiels PDF — Éducation nationale (data.gouv.fr) */
export const PROGRAMMES_OFFICIELS_PDF = {
  /** Cycle 3 : CM1, CM2, 6ème */
  cycle3: 'https://static.data.gouv.fr/resources/programmes-denseignement-de-lecole-elementaire-et-du-college-cycles-2-3-et-4/20210126-145814/ensel714-annexe2-1312887.pdf',
  /** Cycle 4 : 5ème, 4ème, 3ème */
  cycle4: 'https://static.data.gouv.fr/resources/programmes-denseignement-de-lecole-elementaire-et-du-college-cycles-2-3-et-4/20210126-145848/ensel714-annexe3-1312891.pdf',
  /** Lien vers le jeu de données data.gouv.fr */
  datasetUrl: 'https://www.data.gouv.fr/fr/datasets/programmes-denseignement-de-lecole-elementaire-et-du-college-cycles-2-3-et-4/',
} as const;

/** Retourne l'URL du PDF officiel selon la classe (6ème = Cycle 3, 5ème/4ème/3ème = Cycle 4) */
export function getProgrammeOfficielPdfUrl(classe: Classe | string | null): string | null {
  if (!classe) return null;
  if (classe === '6ème') return PROGRAMMES_OFFICIELS_PDF.cycle3;
  if (['5ème', '4ème', '3ème'].includes(classe)) return PROGRAMMES_OFFICIELS_PDF.cycle4;
  return null;
}

/** API Éducation nationale - data.education.gouv.fr */
export const API_PROGRAMMES_EDUCATION =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-programmes-enseignement-2nd-degre/records';

export interface ProgrammeOfficielRecord {
  descriptif: string;
  niveau_d_enseignement: string;
  discipline: string;
  contenu_sur_le_site?: string | null;
  texte_officiel?: string | null;
  entre_en_vigueur_a_la_rentree?: string | null;
}

/** Récupère les cycles à importer selon la classe (6ème = Cycle 3, 5ème-3ème = Cycle 4) */
export function getCyclesForClasse(classe: Classe | string | null): ('Cycle 3' | 'Cycle 4')[] {
  if (!classe) return ['Cycle 3', 'Cycle 4'];
  if (classe === '6ème') return ['Cycle 3'];
  return ['Cycle 4'];
}

export interface ThemeProgramme {
  sujet: string;
  description?: string;
}

export interface CompetenceDomaine {
  domaine: string;
  competences: string[];
}

/** Programme par matière et par classe (thèmes principaux) */
export const PROGRAMME_PAR_CLASSE: Record<Classe, Record<Subject, ThemeProgramme[]>> = {
  '6ème': {
    Maths: [
      { sujet: 'Nombres décimaux et fractions', description: 'Comparaison, calcul, proportionnalité' },
      { sujet: 'Géométrie plane', description: 'Triangles, cercles, symétrie axiale' },
      { sujet: 'Grandeurs et mesures', description: 'Périmètres, aires, volumes' },
      { sujet: 'Initiation au raisonnement', description: 'Propriétés, démonstrations simples' },
    ],
    Français: [
      { sujet: 'Lecture et compréhension', description: 'Textes littéraires et documentaires' },
      { sujet: 'Écriture', description: 'Récits, descriptions, lettres' },
      { sujet: 'Étude de la langue', description: 'Grammaire, orthographe, vocabulaire' },
      { sujet: 'Oral', description: 'Récitation, exposé, débat' },
    ],
    'Histoire-Géo': [
      { sujet: 'Histoire : De l\'Antiquité au Moyen Âge', description: 'Civilisations, mondes méditerranéens' },
      { sujet: 'Géographie : Habiter une métropole', description: 'Villes, aménagements, mobilités' },
      { sujet: 'EMC', description: 'Valeurs de la République, laïcité' },
    ],
    SVT: [
      { sujet: 'Le vivant et son évolution', description: 'Diversité, classification, évolution' },
      { sujet: 'La planète Terre', description: 'Ressources, risques naturels' },
      { sujet: 'Le corps humain', description: 'Alimentation, digestion, circulation' },
    ],
    'Physique-Chimie': [
      { sujet: 'Matière et énergie', description: 'États de la matière, mélanges' },
      { sujet: 'Mouvement et interactions', description: 'Forces, vitesses' },
      { sujet: 'Signaux et communications', description: 'Lumière, sons' },
    ],
    Anglais: [
      { sujet: 'Compréhension orale et écrite', description: 'Niveau A1 vers A2' },
      { sujet: 'Expression orale et écrite', description: 'Se présenter, décrire, raconter' },
      { sujet: 'Civilisation', description: 'Pays anglophones, vie quotidienne' },
    ],
    Espagnol: [
      { sujet: 'Découverte de la langue', description: 'Alphabet, phonétique, premiers échanges' },
      { sujet: 'Vie quotidienne', description: 'Se présenter, famille, école' },
    ],
    Théologie: [
      { sujet: 'Introduction aux grandes traditions', description: 'Textes fondateurs, rites' },
    ],
    Arts: [
      { sujet: 'Arts plastiques', description: 'Représentation, création, pratiques' },
    ],
    Musique: [
      { sujet: 'Éducation musicale', description: 'Écoute, pratique, création' },
    ],
    Technologie: [],
    EPS: [
      { sujet: 'Activités athlétiques', description: 'Course, saut, lancer' },
      { sujet: 'Sports collectifs', description: 'Coopération, règles du jeu' },
      { sujet: 'Activités artistiques', description: 'Expression corporelle' },
    ],
  },
  '5ème': {
    Maths: [
      { sujet: 'Nombres relatifs et fractions', description: 'Calculs, priorités opératoires' },
      { sujet: 'Géométrie dans l\'espace', description: 'Volumes, perspectives' },
      { sujet: 'Proportionnalité et statistiques', description: 'Tableaux, graphiques' },
    ],
    Français: [
      { sujet: 'Roman d\'aventures', description: 'Le récit, le héros' },
      { sujet: 'Poésie lyrique', description: 'Émotions, figures de style' },
      { sujet: 'Étude de la langue', description: 'Phrase complexe, temps verbaux' },
    ],
    'Histoire-Géo': [
      { sujet: 'Histoire : Chrétienté et Islam (VIe-XIIIe)', description: 'Mondes en contact' },
      { sujet: 'Géographie : Développement durable', description: 'Ressources, inégalités' },
    ],
    SVT: [
      { sujet: 'Respiration et occupation des milieux', description: 'Échanges gazeux' },
      { sujet: 'Risques infectieux', description: 'Micro-organismes, défense immunitaire' },
      { sujet: 'Géologie externe', description: 'Érosion, sédimentation' },
    ],
    'Physique-Chimie': [
      { sujet: 'Organisation de la matière', description: 'Atomes, molécules' },
      { sujet: 'Électricité', description: 'Circuits, intensité, tension' },
      { sujet: 'Ondes et signaux', description: 'Propagation, fréquence' },
    ],
    Anglais: [
      { sujet: 'Niveau A2', description: 'Compréhension et expression' },
      { sujet: 'Projets et tâches finales', description: 'Tâches communicatives' },
    ],
    Espagnol: [
      { sujet: 'Vie quotidienne et loisirs', description: 'Routine, préférences' },
      { sujet: 'Civilisation hispanophone', description: 'Pays, cultures' },
    ],
    Théologie: [
      { sujet: 'Approche comparative', description: 'Religions du monde' },
    ],
    Arts: [
      { sujet: 'Création et exposition', description: 'Projets collectifs' },
    ],
    Musique: [],
    Technologie: [],
    EPS: [
      { sujet: 'Perfectionnement des APSA', description: 'Progression des compétences' },
    ],
  },
  '4ème': {
    Maths: [
      { sujet: 'Calcul littéral', description: 'Équations, inéquations' },
      { sujet: 'Théorème de Pythagore', description: 'Triangle rectangle' },
      { sujet: 'Probabilités', description: 'Expériences aléatoires' },
    ],
    Français: [
      { sujet: 'La fiction pour interroger le réel', description: 'Roman réaliste, fantastique' },
      { sujet: 'Informer, s\'informer', description: 'Médias, argumentation' },
      { sujet: 'Étude de la langue', description: 'Subordination, voix passive' },
    ],
    'Histoire-Géo': [
      { sujet: 'Histoire : XVIIIe-XIXe siècles', description: 'Révolutions, industrialisation' },
      { sujet: 'Géographie : Mondialisation', description: 'Échanges, flux, acteurs' },
    ],
    SVT: [
      { sujet: 'Génétique', description: 'ADN, hérédité, diversité' },
      { sujet: 'Risques géologiques', description: 'Séismes, volcanisme' },
      { sujet: 'Énergie et métabolisme', description: 'Photosynthèse, respiration' },
    ],
    'Physique-Chimie': [
      { sujet: 'Optique', description: 'Lumière, lentilles' },
      { sujet: 'Chimie organique (intro)', description: 'Combustion, atomes' },
      { sujet: 'Électricité avancée', description: 'Puissance, énergie' },
    ],
    Anglais: [
      { sujet: 'Niveau A2-B1', description: 'Expression et interaction' },
    ],
    Espagnol: [
      { sujet: 'Expression écrite et orale', description: 'Niveau A2' },
    ],
    Théologie: [
      { sujet: 'Éthique et société', description: 'Valeurs, débats' },
    ],
    Arts: [
      { sujet: 'Histoire des arts', description: 'Œuvres, contextes' },
    ],
    Musique: [],
    Technologie: [],
    EPS: [
      { sujet: 'Choix d\'APSA', description: 'Engagement, responsabilité' },
    ],
  },
  '3ème': {
    Maths: [
      { sujet: 'Fonctions', description: 'Représentation, lecture' },
      { sujet: 'Théorème de Thalès', description: 'Configurations de Thalès' },
      { sujet: 'Trigonométrie', description: 'Cos, sin, tan' },
      { sujet: 'Probabilités et statistiques', description: 'Préparation Brevet' },
    ],
    Français: [
      { sujet: 'Se raconter, se représenter', description: 'Autobiographie' },
      { sujet: 'Dénoncer les travers de la société', description: 'Argumentation, satire' },
      { sujet: 'Vers un monde nouveau', description: 'Science-fiction, utopie' },
      { sujet: 'Étude de la langue', description: 'Révisions Brevet' },
    ],
    'Histoire-Géo': [
      { sujet: 'Histoire : XXe siècle', description: 'Guerres, décolonisation, Europe' },
      { sujet: 'Géographie : France et UE', description: 'Territoires, aménagement' },
    ],
    SVT: [
      { sujet: 'Évolution et biodiversité', description: 'Sélection naturelle' },
      { sujet: 'Corps humain et santé', description: 'Système nerveux, reproduction' },
      { sujet: 'Écosystèmes', description: 'Ressources, développement durable' },
    ],
    'Physique-Chimie': [
      { sujet: 'Mouvement et interactions', description: 'Forces, lois de Newton' },
      { sujet: 'Chimie : Transformations', description: 'Réactions, équations' },
      { sujet: 'Signaux', description: 'Ondes, communications' },
    ],
    Anglais: [
      { sujet: 'Niveau B1', description: 'Préparation cycle 4' },
    ],
    Espagnol: [
      { sujet: 'Niveau A2-B1', description: 'Préparation cycle 4' },
    ],
    Théologie: [
      { sujet: 'Synthèse et ouverture', description: 'Culture religieuse' },
    ],
    Arts: [
      { sujet: 'Parcours artistique', description: 'Oral Histoire des arts' },
    ],
    Musique: [],
    Technologie: [],
    EPS: [
      { sujet: 'Préparation ASSR, certification', description: 'Compiétences attendues' },
    ],
  },
};

/** Compétences du socle commun (domaines) — applicables à toutes les classes */
export const SOCLE_COMMUN: CompetenceDomaine[] = [
  {
    domaine: 'Les langages pour penser et communiquer',
    competences: [
      'Comprendre, s\'exprimer en utilisant la langue française',
      'Comprendre, s\'exprimer en utilisant une langue étrangère',
      'Comprendre, s\'exprimer en utilisant les langages mathématiques et scientifiques',
      'Comprendre, s\'exprimer en utilisant les langages des arts et du corps',
    ],
  },
  {
    domaine: 'Les méthodes et outils pour apprendre',
    competences: [
      'Organiser son travail',
      'Rechercher et traiter l\'information',
      'Utiliser des outils numériques',
      'Coopérer et réaliser des projets',
    ],
  },
  {
    domaine: 'La formation de la personne et du citoyen',
    competences: [
      'Exprimer sa pensée, respecter autrui',
      'Réfléchir sur le sens de l\'engagement',
      'Connaître et appliquer les valeurs de la République',
    ],
  },
  {
    domaine: 'Les systèmes naturels et les systèmes techniques',
    competences: [
      'Adopter un comportement responsable',
      'Connaître les enjeux du développement durable',
      'Comprendre le fonctionnement des systèmes techniques',
    ],
  },
  {
    domaine: 'Les représentations du monde et l\'activité humaine',
    competences: [
      'Se repérer dans l\'espace et dans le temps',
      'Comprendre les représentations du monde',
      'Appréhender la diversité des sociétés et des cultures',
    ],
  },
];

/** Récupère le programme pour une classe donnée */
export function getProgrammePourClasse(classe: Classe | string | null): Record<Subject, ThemeProgramme[]> | null {
  if (!classe || !['6ème', '5ème', '4ème', '3ème'].includes(classe)) return null;
  return PROGRAMME_PAR_CLASSE[classe as Classe];
}

/** Ordre des matières pour l'affichage */
export const SUBJECT_ORDER: Subject[] = [
  'Français', 'Maths', 'Histoire-Géo', 'SVT', 'Physique-Chimie',
  'Anglais', 'Espagnol', 'Théologie', 'Arts', 'Musique', 'Technologie', 'EPS',
];

/** Enregistrement importé depuis l'API Éducation nationale */
export interface ProgrammeImportRecord {
  cycle: string;
  discipline: string;
  descriptif: string;
  contenu_url: string | null;
  texte_officiel: string | null;
}

/** Génère le HTML du programme pour téléchargement */
export function generateProgrammeHtml(params: {
  studentName: string;
  classe: string | null;
  programme: Record<Subject, ThemeProgramme[]> | null;
  curriculum: { subject: Subject; chapter_name: string; status: string; order_index: number }[];
  progress: { bySubject: Record<Subject, { completed: number }> };
  programmeImport?: ProgrammeImportRecord[];
}) {
  const { studentName, classe, programme, curriculum, progress, programmeImport } = params;
  const title = `Programme scolaire - ${studentName} - ${classe || 'Classe non renseignée'}`;
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
    h1 { color: #b45309; font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { color: #92400e; font-size: 1.2rem; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #fcd34d; padding-bottom: 0.25rem; }
    h3 { color: #78350f; font-size: 1rem; margin: 1rem 0 0.5rem; }
    p { margin-bottom: 0.5rem; }
    ul { margin-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.25rem; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .section { margin-bottom: 2rem; }
    .theme { padding: 0.5rem 0; border-left: 3px solid #fcd34d; padding-left: 1rem; margin: 0.5rem 0; }
    .theme-desc { font-size: 0.9rem; color: #64748b; margin-top: 0.25rem; }
    .competence { padding: 0.35rem 0; padding-left: 0.5rem; }
    .curriculum-chapter { padding: 0.25rem 0; font-size: 0.95rem; }
    .status { font-size: 0.8rem; color: #64748b; }
    .maitrise { color: #059669; }
    .vu { color: #d97706; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Généré le ${date} — Maya Explorer</p>

  <div class="section">
    <h2>📚 Programme officiel (${classe || '—'})</h2>
`;

  if (programmeImport && programmeImport.length > 0) {
    const cycles = [...new Set(programmeImport.map((p) => p.cycle))].sort();
    cycles.forEach((cycle) => {
      html += `    <h3>${cycle}</h3>\n`;
      programmeImport
        .filter((p) => p.cycle === cycle)
        .forEach((r) => {
          html += `    <div class="theme"><strong>${r.discipline !== '-' ? r.discipline : 'Programme complet'}</strong>`;
          html += `<p class="theme-desc">${r.descriptif}</p>`;
          if (r.texte_officiel) html += `<p class="theme-desc" style="font-size:0.85rem">${r.texte_officiel}</p>`;
          if (r.contenu_url) html += `<p><a href="${r.contenu_url}" target="_blank">Télécharger le PDF</a></p>`;
          html += `</div>\n`;
        });
    });
  } else if (programme) {
    SUBJECT_ORDER.forEach((subject) => {
      const themes = programme[subject];
      if (!themes?.length) return;
      html += `    <h3>${subject}</h3>\n`;
      themes.forEach((t) => {
        html += `    <div class="theme"><strong>${t.sujet}</strong>`;
        if (t.description) html += `<p class="theme-desc">${t.description}</p>`;
        html += `</div>\n`;
      });
    });
  } else {
    html += `<p>Importe le programme officiel ou indique ta classe dans Mon profil.</p>\n`;
  }

  html += `  </div>

  <div class="section">
    <h2>🎯 Compétences du socle commun</h2>
`;

  SOCLE_COMMUN.forEach((dom) => {
    html += `    <h3>${dom.domaine}</h3><ul>\n`;
    dom.competences.forEach((c) => {
      html += `      <li class="competence">${c}</li>\n`;
    });
    html += `    </ul>\n`;
  });

  html += `  </div>

  <div class="section">
    <h2>📋 Programme actuel (chapitres)</h2>
`;

  if (curriculum.length > 0) {
    const bySubject = SUBJECT_ORDER.reduce<Record<Subject, typeof curriculum>>((acc, s) => {
      acc[s] = curriculum.filter((c) => c.subject === s).sort((a, b) => a.order_index - b.order_index);
      return acc;
    }, {} as Record<Subject, typeof curriculum>);

    SUBJECT_ORDER.forEach((subject) => {
      const chapters = bySubject[subject];
      if (!chapters?.length) return;
      html += `    <h3>${subject}</h3>\n`;
      chapters.forEach((ch) => {
        const statusLabel = ch.status === 'maitrise' ? 'Maîtrisé' : ch.status === 'vu_en_classe' ? 'En cours' : 'À voir';
        const statusClass = ch.status === 'maitrise' ? 'maitrise' : ch.status === 'vu_en_classe' ? 'vu' : '';
        html += `    <div class="curriculum-chapter">${ch.chapter_name} <span class="status ${statusClass}">(${statusLabel})</span></div>\n`;
      });
      html += `    <p style="margin-bottom:1rem;font-size:0.9rem;color:#64748b">${progress.bySubject[subject]?.completed || 0} / ${chapters.length} maîtrisés</p>\n`;
    });
  } else {
    html += `<p>Le programme personnel (bulletins analysés) apparaîtra ici.</p>\n`;
  }

  html += `  </div>
</body>
</html>`;

  return html;
}
