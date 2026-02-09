/**
 * Programme de la semaine — affichage identique au Dashboard.
 * Utilisé dans Dashboard (lecture seule) et Configuration (édition des créneaux).
 */
import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { isVacation } from '../../lib/schoolCalendars';
import type { SchoolZone } from '../../types';

const DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

export interface PlanningSlot {
  day: number;
  startTime: string;
  endTime: string;
  subject?: string;
}

export interface BulletinSubject {
  name: string;
  status?: string;
}

interface WeeklyProgramTableProps {
  weeklySlots: { slots?: PlanningSlot[]; vacation_slots?: PlanningSlot[] };
  bulletinSubjects: BulletinSubject[];
  city_zone: SchoolZone | null;
  weekOffset?: number;
  editable?: boolean;
  onSave?: (slots: PlanningSlot[], isVacation: boolean) => Promise<void>;
  onNavigateToConfig?: () => void;
}

function getStatusLabel(status?: string) {
  switch (status) {
    case 'danger': return 'Danger';
    case 'surveiller': return 'À surveiller';
    case 'reviser': return 'À réviser';
    default: return 'OK';
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case 'danger': return 'text-rose-400 bg-rose-500/20';
    case 'surveiller': return 'text-orange-400 bg-orange-500/20';
    case 'reviser': return 'text-amber-400 bg-amber-500/20';
    default: return 'text-emerald-400 bg-emerald-500/20';
  }
}

function capTo2hPerDay(list: PlanningSlot[]): PlanningSlot[] {
  const toMins = (h: number, m: number) => h * 60 + m;
  const mins = (s: PlanningSlot) => {
    const [sh, sm] = (s.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (s.endTime || '00:00').split(':').map(Number);
    return toMins(eh, em) - toMins(sh, sm);
  };
  const overlaps = (a: PlanningSlot, b: PlanningSlot) => {
    const [aSh, aSm] = (a.startTime || '00:00').split(':').map(Number);
    const [aEh, aEm] = (a.endTime || '00:00').split(':').map(Number);
    const [bSh, bSm] = (b.startTime || '00:00').split(':').map(Number);
    const [bEh, bEm] = (b.endTime || '00:00').split(':').map(Number);
    const aS = toMins(aSh, aSm), aE = toMins(aEh, aEm);
    const bS = toMins(bSh, bSm), bE = toMins(bEh, bEm);
    return aS < bE && aE > bS;
  };
  const byDay = new Map<number, PlanningSlot[]>();
  for (const s of list) {
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day)!.push(s);
  }
  const out: PlanningSlot[] = [];
  for (const [, daySlots] of byDay) {
    const sorted = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    let total = 0;
    let count = 0;
    for (const s of sorted) {
      if (count >= 2) break;
      const m = Math.max(0, mins(s));
      const hasOverlap = out.some((o) => o.day === s.day && overlaps(o, s));
      if (!hasOverlap && total + m <= 120) { out.push(s); total += m; count++; }
    }
  }
  return out.sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)));
}

export function WeeklyProgramTable({
  weeklySlots,
  bulletinSubjects,
  city_zone,
  weekOffset = 0,
  editable = false,
  onSave,
  onNavigateToConfig,
}: WeeklyProgramTableProps) {
  const [innerWeekOffset, setInnerWeekOffset] = useState(weekOffset);
  const [editSlots, setEditSlots] = useState<PlanningSlot[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const zone = city_zone && ['A', 'B', 'C'].includes(city_zone) ? city_zone : null;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset + innerWeekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const daysInVacation = zone
    ? [0, 1, 2, 3, 4, 5, 6].filter((d) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + (d === 0 ? 6 : d - 1));
        return isVacation(date, zone);
      }).length
    : 0;
  const weekHasVacation = daysInVacation >= 4;

  const rawSlots = weekHasVacation && (weeklySlots?.vacation_slots?.length ?? 0) > 0
    ? (weeklySlots.vacation_slots ?? [])
    : (weeklySlots?.slots ?? []);
  const slots = capTo2hPerDay(editSlots ?? [...rawSlots]);

  const priorityOrder = ['danger', 'surveiller', 'reviser', 'ok'] as const;
  const byPriority = [...bulletinSubjects].sort((a, b) => {
    const sa = priorityOrder.indexOf((a.status || 'ok') as (typeof priorityOrder)[number]);
    const sb = priorityOrder.indexOf((b.status || 'ok') as (typeof priorityOrder)[number]);
    return sa - sb;
  });
  const dangerSubjects = [...byPriority].filter((s) => (s.status || 'ok') === 'danger');
  const otherSubjects = [...byPriority].filter((s) => ['surveiller', 'reviser', 'ok'].includes((s.status || 'ok') as string));

  const sortedSlots = [...slots].sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)));
  const byDaySlots = new Map<number, PlanningSlot[]>();
  for (const s of sortedSlots) {
    if (!byDaySlots.has(s.day)) byDaySlots.set(s.day, []);
    byDaySlots.get(s.day)!.push(s);
  }

  const getDateForDay = (d: number) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + (d === 0 ? 6 : d - 1));
    return date;
  };

  let dangerIdx = 0;
  let otherIdx = 0;
  const rows = [...byDaySlots.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, daySlots]) => {
      const sub1 = dangerSubjects.length > 0 ? dangerSubjects[dangerIdx++ % dangerSubjects.length] : null;
      const sub2 = otherSubjects.length > 0 ? otherSubjects[otherIdx++ % otherSubjects.length] : null;
      const matieres = [sub1, sub2].filter(Boolean).map((s) => s!);
      if (matieres.length === 0 && byPriority.length > 0) matieres.push(byPriority[otherIdx % byPriority.length]);
      return { day, daySlots, matieres };
    });

  const handleStartEdit = () => {
    setEditSlots([...slots]);
  };

  const handleCancelEdit = () => {
    setEditSlots(null);
  };

  const handleSlotChange = (day: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
    if (!editSlots) return;
    const daySlots = editSlots.filter((s) => s.day === day);
    const slot = daySlots[slotIndex];
    if (!slot) return;
    const idx = editSlots.findIndex((s) => s === slot);
    if (idx === -1) return;
    const updated = [...editSlots];
    updated[idx] = { ...slot, [field]: value };
    setEditSlots(updated);
  };

  const handleSaveClick = () => {
    if (onSave && editSlots) setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!onSave || !editSlots) return;
    setShowSaveConfirm(false);
    setIsSaving(true);
    try {
      await onSave(editSlots, weekHasVacation);
      setEditSlots(null);
    } finally {
      setIsSaving(false);
    }
  };

  const hasSlots = (weeklySlots?.slots?.length ?? 0) > 0 || (weeklySlots?.vacation_slots?.length ?? 0) > 0;

  return (
    <div className="p-6 stone-card rounded-xl border-amber-500/20 overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="font-bold text-amber-100 flex items-center gap-2 flex-wrap">
          <Calendar className="w-5 h-5 text-amber-400" />
          Programme de la semaine
          <span className="text-sm font-normal text-amber-100/60">
            ({monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – {sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInnerWeekOffset((o) => Math.max(0, o - 1))}
            disabled={innerWeekOffset === 0}
            className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-amber-100/80 min-w-[100px] text-center">
            {innerWeekOffset === 0 ? 'Cette semaine' : innerWeekOffset === 1 ? 'Semaine prochaine' : `Dans ${innerWeekOffset} sem.`}
          </span>
          <button
            onClick={() => setInnerWeekOffset((o) => o + 1)}
            className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-500/20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {editable && hasSlots && !editSlots && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm font-medium"
            >
              Modifier les créneaux
            </button>
          )}
          {editable && editSlots && (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-2 rounded-lg bg-slate-700 text-amber-100 hover:bg-slate-600 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-3 py-2 rounded-lg bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : null}
                Enregistrer
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {weekHasVacation && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">
            <Sun className="w-4 h-4" />
            Vacances : plus de temps pour réviser
          </span>
        )}
      </div>

      {!hasSlots ? (
        <p className="text-amber-100/60 text-sm">
          Aucun créneau configuré. Configure l'emploi du temps en Configuration pour que l'IA propose des créneaux de révision.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-amber-500/20">
              <th className="text-left py-3 px-4 text-amber-400 font-medium">Jour</th>
              <th className="text-left py-3 px-4 text-amber-400 font-medium">Date</th>
              <th className="text-left py-3 px-4 text-amber-400 font-medium">Créneaux</th>
              <th className="text-left py-3 px-4 text-amber-400 font-medium">Matières proposées</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ day, daySlots, matieres }) => {
              const slotDate = getDateForDay(day);
              const isEditing = !!editSlots;
              return (
                <tr key={day} className="border-b border-amber-500/10 hover:bg-slate-900/30">
                  <td className="py-3 px-4 text-amber-100 font-medium">{DAYS[day]}</td>
                  <td className="py-3 px-4 text-amber-100/80">{slotDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                  <td className="py-3 px-4 text-amber-100">
                    {isEditing ? (
                      <div className="space-y-2">
                        {daySlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-2 flex-wrap">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => handleSlotChange(day, slotIndex, 'startTime', e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-amber-500/20 rounded text-amber-100 text-sm w-24"
                            />
                            <span className="text-amber-100/60">–</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => handleSlotChange(day, slotIndex, 'endTime', e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-amber-500/20 rounded text-amber-100 text-sm w-24"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      daySlots.map((s) => `${s.startTime} – ${s.endTime}`).join(' · ')
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-2">
                      {matieres.length > 0 ? (
                        matieres.map((subject, i) => {
                          const status = subject.status || 'ok';
                          return (
                            <span
                              key={`${subject.name}-${i}`}
                              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-sm font-medium ${getStatusClass(status)}`}
                            >
                              {subject.name}
                              <span className="text-xs opacity-80">({getStatusLabel(status)})</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-amber-100/50 text-sm">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {onNavigateToConfig && (
        <button
          onClick={onNavigateToConfig}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm font-medium"
        >
          Configurer le planning
        </button>
      )}

      <ConfirmDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        title="Enregistrer les créneaux ?"
        description="Les horaires de révision seront mis à jour selon tes modifications."
        confirmLabel="Enregistrer"
        cancelLabel="Annuler"
        variant="default"
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}
