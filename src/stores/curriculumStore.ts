import { create } from 'zustand';
import { getCurriculum, updateChapterStatus } from '../lib/supabase';
import type { Curriculum, Subject, ChapterStatus } from '../types';

interface CurriculumState {
  curriculum: Curriculum[];
  isLoading: boolean;
  selectedSubject: Subject | null;
  selectedChapter: Curriculum | null;
  progress: {
    total: number;
    completed: number;
    percentage: number;
    bySubject: Record<Subject, { total: number; completed: number }>;
  };
  
  // Actions
  loadCurriculum: (studentId: string) => Promise<void>;
  updateChapter: (chapterId: string, status: ChapterStatus) => Promise<void>;
  selectSubject: (subject: Subject | null) => void;
  selectChapter: (chapter: Curriculum | null) => void;
  getChaptersBySubject: (subject: Subject) => Curriculum[];
  calculateProgress: () => void;
}

export const useCurriculumStore = create<CurriculumState>((set, get) => ({
  curriculum: [],
  isLoading: false,
  selectedSubject: null,
  selectedChapter: null,
  progress: {
    total: 0,
    completed: 0,
    percentage: 0,
    bySubject: {} as Record<Subject, { total: number; completed: number }>,
  },

  loadCurriculum: async (studentId: string) => {
    const { curriculum } = get();
    // Ne pas bloquer l'UI si on a déjà des données (refresh en arrière-plan)
    const isInitialLoad = curriculum.length === 0;
    if (isInitialLoad) set({ isLoading: true });

    try {
      const { data } = await getCurriculum(studentId);
      if (data) {
        set({ curriculum: data });
        get().calculateProgress();
      }
    } catch (e) {
      console.error('Erreur chargement curriculum:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateChapter: async (chapterId: string, status: ChapterStatus) => {
    const { curriculum } = get();
    const chapter = curriculum.find(c => c.id === chapterId);
    
    if (!chapter) return;

    const { error } = await updateChapterStatus(chapterId, status);
    
    if (!error) {
      const updatedCurriculum = curriculum.map(c =>
        c.id === chapterId ? { ...c, status } : c
      );
      set({ curriculum: updatedCurriculum });
      get().calculateProgress();
    }
  },

  selectSubject: (subject: Subject | null) => {
    set({ selectedSubject: subject });
  },

  selectChapter: (chapter: Curriculum | null) => {
    set({ selectedChapter: chapter });
  },

  getChaptersBySubject: (subject: Subject) => {
    const { curriculum } = get();
    return curriculum.filter(c => c.subject === subject).sort((a, b) => a.order_index - b.order_index);
  },

  calculateProgress: () => {
    const { curriculum } = get();
    
    const total = curriculum.length;
    const completed = curriculum.filter(c => c.status === 'maitrise').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate by subject
    const bySubject: Record<Subject, { total: number; completed: number }> = {} as any;
    
    curriculum.forEach(chapter => {
      if (!bySubject[chapter.subject]) {
        bySubject[chapter.subject] = { total: 0, completed: 0 };
      }
      bySubject[chapter.subject].total++;
      if (chapter.status === 'maitrise') {
        bySubject[chapter.subject].completed++;
      }
    });

    set({
      progress: {
        total,
        completed,
        percentage,
        bySubject,
      },
    });
  },
}));
