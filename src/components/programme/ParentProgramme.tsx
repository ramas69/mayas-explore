/**
 * Page Programme scolaire côté parent — programme de l'enfant sélectionné.
 * Téléchargement et visibilité partagée parent/enfant.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { getProgrammePourClasse, SOCLE_COMMUN, generateProgrammeHtml, SUBJECT_ORDER, getProgrammeOfficielPdfUrl, PROGRAMMES_OFFICIELS_PDF } from '../../lib/programmeScolaire';
import { recordProgrammeDownload, getLastProgrammeDownload, getProgrammeCollegeGlobalForClasse, addManualCurriculumEntry } from '../../lib/supabase';
import { StoneSelect } from '../ui/StoneSelect';
import { Download, FileText, Target, BookOpen, Eye, ExternalLink, Plus } from 'lucide-react';
import { PageLoading } from '../ui/PageLoading';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { Profile, Curriculum, Classe, Subject } from '../../types';

interface ChildProfile extends Profile {
  curriculum?: Curriculum[];
}

export function ParentProgramme() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum[]>([]);
  const [lastDownload, setLastDownload] = useState<{ downloaded_by_role: string; downloaded_at: string } | null>(null);
  const [programmeGlobal, setProgrammeGlobal] = useState<{ subject: string; chapter_name: string; description: string | null }[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ subject: '' as Subject | '', chapterName: '' });
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'enfant')
        .eq('is_approved', true)
        .then(({ data }) => {
          setChildren((data as ChildProfile[]) || []);
          if (data?.length && !selectedChild) setSelectedChild(data[0].id);
          setIsLoading(false);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedChild) {
      supabase
        .from('curriculum')
        .select('*')
        .eq('student_id', selectedChild)
        .order('order_index')
        .then(({ data }) => setCurriculum((data as Curriculum[]) || []));
    } else {
      setCurriculum([]);
    }
  }, [selectedChild]);

  useEffect(() => {
    if (selectedChild) {
      getLastProgrammeDownload(selectedChild).then(({ data }) => setLastDownload(data ?? null));
    } else {
      setLastDownload(null);
    }
  }, [selectedChild]);

  const selectedChildProfile = children.find((c) => c.id === selectedChild);
  const classe = (selectedChildProfile?.classe as Classe) || null;

  useEffect(() => {
    if (classe) {
      getProgrammeCollegeGlobalForClasse(classe).then(({ data }) => setProgrammeGlobal(data ?? []));
    } else {
      setProgrammeGlobal([]);
    }
  }, [classe]);

  const handleAddSource = async () => {
    if (!selectedChild || !newSource.subject || !newSource.chapterName.trim()) return;
    setIsAddingSource(true);
    const { error } = await addManualCurriculumEntry(selectedChild, newSource.subject, newSource.chapterName.trim());
    setIsAddingSource(false);
    if (!error) {
      setNewSource({ subject: '', chapterName: '' });
      setShowAddSource(false);
      supabase
        .from('curriculum')
        .select('*')
        .eq('student_id', selectedChild)
        .order('order_index')
        .then(({ data }) => setCurriculum((data as Curriculum[]) || []));
    }
  };

  const programme = getProgrammePourClasse(classe);

  const progress = {
    total: curriculum.length,
    completed: curriculum.filter((c) => c.status === 'maitrise').length,
    percentage: curriculum.length ? Math.round((curriculum.filter((c) => c.status === 'maitrise').length / curriculum.length) * 100) : 0,
    bySubject: SUBJECT_ORDER.reduce(
      (acc, s) => {
        const list = curriculum.filter((c) => c.subject === s);
        acc[s] = { total: list.length, completed: list.filter((c) => c.status === 'maitrise').length };
        return acc;
      },
      {} as Record<Subject, { total: number; completed: number }>
    ),
  };

  const programmeFromGlobal = programmeGlobal.length > 0
    ? programmeGlobal.reduce((acc, p) => {
        const subj = p.subject as Subject;
        if (!acc[subj]) acc[subj] = [];
        acc[subj].push({ sujet: p.chapter_name, description: p.description || undefined });
        return acc;
      }, {} as Record<Subject, { sujet: string; description?: string }[]>)
    : null;
  const programmeToShow = programmeFromGlobal ?? programme;

  const handleDownload = async () => {
    if (!selectedChild || !selectedChildProfile || !user?.id) return;
    const html = generateProgrammeHtml({
      studentName: selectedChildProfile.full_name || 'Élève',
      classe,
      programme: programmeToShow,
      curriculum,
      progress,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `programme-scolaire-${selectedChildProfile.full_name?.replace(/\s+/g, '-') || 'eleve'}-${classe || 'classe'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    await recordProgrammeDownload(selectedChild, 'parent', user.id);
    const { data } = await getLastProgrammeDownload(selectedChild);
    setLastDownload(data ?? null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[300px]">
        <PageLoading message="Chargement du programme..." />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-amber-100/60">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-amber-500/30" />
        <p>Ajoute un enfant dans la Configuration pour accéder à son programme scolaire.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-['Cinzel_Decorative'] text-2xl font-bold text-amber-100 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-amber-400" />
            Programme scolaire
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-amber-100/60 text-sm">Enfant :</span>
            <StoneSelect
              value={selectedChild || ''}
              onValueChange={(v) => setSelectedChild(v || null)}
              options={children.map((c) => ({ value: c.id, label: c.full_name || c.email }))}
              placeholder="Choisir un enfant"
              size="sm"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {lastDownload && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-100/80 text-sm">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                Dernier téléchargement : par {lastDownload.downloaded_by_role === 'parent' ? 'moi' : "l'enfant"} le{' '}
                {new Date(lastDownload.downloaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all shrink-0"
          >
            <Download className="w-5 h-5" />
            Télécharger le programme
          </button>
        </div>
      </div>

      {selectedChildProfile && (
        <>
          <section className="stone-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Programme officiel {classe ? `(${classe})` : ''}
              </h3>
              <div className="flex flex-wrap gap-2">
                {getProgrammeOfficielPdfUrl(classe) ? (
                  <a
                    href={getProgrammeOfficielPdfUrl(classe)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir le PDF officiel
                  </a>
                ) : (
                  <>
                    <a
                      href={PROGRAMMES_OFFICIELS_PDF.cycle3}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Cycle 3 (6ème)
                    </a>
                    <a
                      href={PROGRAMMES_OFFICIELS_PDF.cycle4}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Cycle 4 (5ème-3ème)
                    </a>
                  </>
                )}
                <a
                  href={PROGRAMMES_OFFICIELS_PDF.datasetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-amber-100/60 hover:text-amber-400 text-sm"
                >
                  Source : Éducation nationale (data.gouv.fr)
                </a>
              </div>
            </div>
            <p className="text-amber-100/50 text-sm mb-4">
              Le programme officiel est mis à disposition par le Super Admin. Tu peux ajouter des sources supplémentaires pour l'enfant.
            </p>
            {programmeFromGlobal ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm mb-4 inline-flex">
                  Programme scrapé par l'admin (matières et chapitres officiels)
                </div>
                {(() => {
                  const subjects = [...new Set(programmeGlobal.map((p) => p.subject))];
                  const ordered = [...SUBJECT_ORDER.filter((s) => subjects.includes(s)), ...subjects.filter((s: string) => !SUBJECT_ORDER.includes(s as Subject))];
                  return ordered.map((subject) => {
                    const items = programmeGlobal.filter((p) => p.subject === subject);
                    if (!items.length) return null;
                    return (
                      <div key={subject}>
                        <h4 className="font-semibold text-amber-200 mb-2">{subject}</h4>
                        <ul className="space-y-2">
                          {items.map((p, i) => (
                            <li key={i} className="flex flex-col text-amber-100/90 text-sm pl-4 border-l-2 border-amber-500/30">
                              <span>{p.chapter_name}</span>
                              {p.description && <span className="text-amber-100/50 text-xs mt-0.5">{p.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : programme ? (
              <div className="space-y-6">
                {SUBJECT_ORDER.map((subject) => {
                  const themes = programme[subject];
                  if (!themes?.length) return null;
                  return (
                    <div key={subject}>
                      <h4 className="font-semibold text-amber-200 mb-2">{subject}</h4>
                      <ul className="space-y-2">
                        {themes.map((t, i) => (
                          <li key={i} className="flex flex-col text-amber-100/90 text-sm pl-4 border-l-2 border-amber-500/30">
                            <span>{t.sujet}</span>
                            {t.description && <span className="text-amber-100/50 text-xs mt-0.5">{t.description}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-amber-100/60">
                  Le programme sera mis à disposition par l'administrateur. Indique la classe dans la Configuration pour afficher le résumé par défaut.
                </p>
              </div>
            )}
          </section>

          {/* Ajouter une source supplémentaire */}
          <section className="stone-card rounded-2xl p-6">
            <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Ajouter une source
            </h3>
            <p className="text-amber-100/60 text-sm mb-4">
              Tu peux ajouter des chapitres ou ressources supplémentaires au parcours de l'enfant.
            </p>
            {showAddSource ? (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select
                  value={newSource.subject}
                  onChange={(e) => setNewSource((s) => ({ ...s, subject: e.target.value as Subject }))}
                  className="px-4 py-2 bg-slate-800 border border-amber-500/20 rounded-xl text-amber-100"
                >
                  <option value="">Matière</option>
                  {SUBJECT_ORDER.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nom du chapitre ou ressource"
                  value={newSource.chapterName}
                  onChange={(e) => setNewSource((s) => ({ ...s, chapterName: e.target.value }))}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-amber-500/20 rounded-xl text-amber-100"
                />
                <button
                  onClick={handleAddSource}
                  disabled={isAddingSource || !newSource.subject || !newSource.chapterName.trim()}
                  className="px-4 py-2 bg-amber-500 text-slate-900 font-semibold rounded-xl disabled:opacity-50"
                >
                  {isAddingSource ? <LoadingSpinner size="sm" className="inline" /> : 'Ajouter'}
                </button>
                <button onClick={() => setShowAddSource(false)} className="px-4 py-2 text-amber-100/60 hover:text-amber-400">
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSource(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
              >
                <Plus className="w-4 h-4" />
                Ajouter un chapitre ou une ressource
              </button>
            )}
          </section>

          <section className="stone-card rounded-2xl p-6">
            <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Compétences du socle commun
            </h3>
            <div className="space-y-6">
              {SOCLE_COMMUN.map((dom, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-amber-200 mb-2">{dom.domaine}</h4>
                  <ul className="space-y-1.5">
                    {dom.competences.map((c, j) => (
                      <li key={j} className="text-amber-100/80 text-sm pl-4 border-l-2 border-amber-500/20">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="stone-card rounded-2xl p-6">
            <h3 className="font-['Cinzel_Decorative'] text-xl font-bold text-amber-100 mb-4">
              Parcours actuel de {selectedChildProfile.full_name || "l'enfant"}
            </h3>
            <p className="text-amber-100/60 text-sm mb-4">
              {progress.total} chapitres — {progress.completed} maîtrisés ({progress.percentage}%)
            </p>
            {curriculum.length > 0 ? (
              <div className="space-y-4">
                {SUBJECT_ORDER.map((subject) => {
                  const chapters = curriculum.filter((c) => c.subject === subject).sort((a, b) => a.order_index - b.order_index);
                  if (!chapters.length) return null;
                  const subjProgress = progress.bySubject[subject];
                  return (
                    <div key={subject}>
                      <h4 className="font-semibold text-amber-200 mb-2 flex items-center gap-2">
                        {subject}
                        {subjProgress && (
                          <span className="text-xs font-normal text-amber-100/50">
                            ({subjProgress.completed}/{subjProgress.total} maîtrisés)
                          </span>
                        )}
                      </h4>
                      <ul className="space-y-1.5">
                        {chapters.map((ch) => (
                          <li
                            key={ch.id}
                            className={`text-sm pl-4 border-l-2 ${
                              ch.status === 'maitrise'
                                ? 'border-emerald-500/50 text-emerald-300/90'
                                : ch.status === 'vu_en_classe'
                                ? 'border-amber-500/50 text-amber-200/90'
                                : 'border-slate-600 text-amber-100/60'
                            }`}
                          >
                            {ch.chapter_name}
                            <span className="text-xs ml-2 opacity-70">
                              {ch.status === 'maitrise' ? '✓' : ch.status === 'vu_en_classe' ? '…' : '○'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-amber-100/60">
                Le programme personnel sera rempli à partir des bulletins analysés (Configuration → Scolarité).
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
