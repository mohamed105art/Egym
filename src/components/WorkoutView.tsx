import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Flame,
  Image as ImageIcon,
  Info,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Settings,
  ShieldCheck,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react';
import { tr, trText } from '../engine/i18n';
import {
  applySmartSetCarryOver,
  computeHistoricalExerciseAverage,
  computeSessionStreakAndDelay,
  evaluateSetPR,
  getNextSequenceDay,
  resolveEffectiveSetLog,
  SEQUENCE_ORDER,
} from '../engine/storage';
import {
  computeTrainingReadiness,
  estimateE1RM,
  evaluateDoubleProgression,
} from '../engine/volume';
import {
  AppState,
  DaySchedulePreset,
  Exercise,
  ProgramMode,
  SetLog,
  WorkoutDayKey,
} from '../types/app';
import { ExerciseImage } from './ExerciseImage';

interface WorkoutViewProps {
  state: AppState;
  exercises: Exercise[];
  highlightedExId?: string | null;
  onStartDay: (day: WorkoutDayKey) => void;
  onExitWorkout: () => void;
  onSetProgramMode: (mode: ProgramMode) => void;
  onSetSchedulePreset: (preset: DaySchedulePreset) => void;
  onUpdateDayLabel: (day: WorkoutDayKey, label: string) => void;
  onUpdateProfile: (patch: Partial<AppState['profile']>) => void;
  onToggleOptionalDayD: (enabled: boolean) => void;
  onUpdateSetLog: (key: string, log: SetLog) => void;
  onSmartUpdateSet?: (ex: Exercise, setNum: number, log: SetLog) => void;
  onStartRestTimer: (seconds: number, contextKey?: string) => void;
  onAdjustRestTimer?: (deltaSec: number) => void;
  onSkipRestTimer?: () => void;
  onOpenSettings?: () => void;
  onFinishSession: (payload: {
    day: WorkoutDayKey;
    preJointDiscomfort: number;
    postJointDiscomfort: number;
    sessionNotes: string;
    totalWorkingSets: number;
    totalVolumeKg: number;
    e1rmUpdates: Record<string, number>;
    completedExerciseIds: string[];
    newPrCount: number;
  }) => void;
  onOpenExercise: (exId: string) => void;
  onOpenSwap: (exId: string) => void;
}

const SESSION_META: Record<
  WorkoutDayKey,
  {
    seqIndex: number;
    titleAr: string;
    titleFr: string;
    titleEn: string;
    focusAr: string;
    focusFr: string;
    focusEn: string;
  }
> = {
  A: {
    seqIndex: 1,
    titleAr: 'الحصة A · شامل ومتوازن 1',
    titleFr: 'Séance A · Full-Body 1',
    titleEn: 'Session A · Full-Body 1',
    focusAr: 'صدر علوي · سحب أفقي · أفخاذ أمامية · ذراعين',
    focusFr: 'Haut pecs · Tirage horizontal · Quadriceps · Bras',
    focusEn: 'Upper Chest · Horizontal Row · Quads · Arms',
  },
  B: {
    seqIndex: 2,
    titleAr: 'الحصة B · شامل ومتوازن 2',
    titleFr: 'Séance B · Full-Body 2',
    titleEn: 'Session B · Full-Body 2',
    focusAr: 'ظهر عريض · أكتاف · سلسلة خلفية وأرداف · ذراعين',
    focusFr: 'Grand dorsal · Épaules · Chaîne postérieure · Bras',
    focusEn: 'Lats · Shoulders · Posterior Chain · Arms',
  },
  C: {
    seqIndex: 3,
    titleAr: 'الحصة C · شامل ومتوازن 3',
    titleFr: 'Séance C · Full-Body 3',
    titleEn: 'Session C · Full-Body 3',
    focusAr: 'صدر · ظهر علوي · أرجل متكامل · أكتاف جانبية',
    focusFr: 'Pectoraux · Haut du dos · Jambes complet · Deltoïdes',
    focusEn: 'Chest · Upper Back · Full Legs · Lateral Delts',
  },
  D: {
    seqIndex: 4,
    titleAr: 'الحصة D · ذراعين، سمانة، وجذع',
    titleFr: 'Séance D · Bras, Mollets & Gainage',
    titleEn: 'Session D · Arms, Calves & Core',
    focusAr: 'تركيز إضافي للذراعين والسمانة وعضلات الجذع',
    focusFr: 'Focus bras, mollets, trapèzes et sangle abdominale',
    focusEn: 'Dedicated Arms, Calves, Traps & Core Isolation',
  },
};

/**
 * 6-Color Rotating Palette for Exercise Card Framing (Section ثالثاً - 1):
 * 1. Emerald (#10b981)
 * 2. Electric Blue (#3b82f6)
 * 3. Golden Amber (#f59e0b)
 * 4. Vivid Violet (#8b5cf6)
 * 5. Cyan (#06b6d4)
 * 6. Coral Rose (#f43f5e)
 */
const EXERCISE_CARD_FRAMES = [
  {
    name: 'emerald',
    cardBorder: 'border-s-4 border-s-emerald-500 border-emerald-500/30 dark:border-emerald-500/35',
    badgeBg: 'bg-emerald-600 text-white',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    pillBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  },
  {
    name: 'blue',
    cardBorder: 'border-s-4 border-s-blue-500 border-blue-500/30 dark:border-blue-500/35',
    badgeBg: 'bg-blue-600 text-white',
    accentText: 'text-blue-600 dark:text-blue-400',
    pillBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  },
  {
    name: 'amber',
    cardBorder: 'border-s-4 border-s-amber-500 border-amber-500/30 dark:border-amber-500/35',
    badgeBg: 'bg-amber-500 text-slate-950',
    accentText: 'text-amber-600 dark:text-amber-400',
    pillBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  },
  {
    name: 'violet',
    cardBorder: 'border-s-4 border-s-violet-500 border-violet-500/30 dark:border-violet-500/35',
    badgeBg: 'bg-violet-600 text-white',
    accentText: 'text-violet-600 dark:text-violet-400',
    pillBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30',
  },
  {
    name: 'cyan',
    cardBorder: 'border-s-4 border-s-cyan-500 border-cyan-500/30 dark:border-cyan-500/35',
    badgeBg: 'bg-cyan-600 text-white',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    pillBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
  },
  {
    name: 'rose',
    cardBorder: 'border-s-4 border-s-rose-500 border-rose-500/30 dark:border-rose-500/35',
    badgeBg: 'bg-rose-600 text-white',
    accentText: 'text-rose-600 dark:text-rose-400',
    pillBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  },
] as const;

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  state,
  exercises,
  highlightedExId,
  onStartDay,
  onExitWorkout,
  onUpdateProfile,
  onUpdateSetLog,
  onSmartUpdateSet,
  onStartRestTimer,
  onAdjustRestTimer,
  onSkipRestTimer,
  onOpenSettings,
  onFinishSession,
  onOpenExercise,
  onOpenSwap,
}) => {
  const { lang, programMode, activeWorkoutDay } = state;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const readiness = computeTrainingReadiness(state);
  const streakInfo = computeSessionStreakAndDelay(state.sessionHistory, state.nextSequenceDay);
  const nextUpDay = streakInfo.nextDayInSequence;

  const [showRirGuide, setShowRirGuide] = useState(false);
  const [showWarmupGuide, setShowWarmupGuide] = useState(false);
  const [showPreJointCheck, setShowPreJointCheck] = useState(false);
  const [showReadinessSliders, setShowReadinessSliders] = useState(false);
  const [isoSec, setIsoSec] = useState(45);
  const [isoRunning, setIsoRunning] = useState(false);
  const [preDiscomfort, setPreDiscomfort] = useState(state.profile.kneeSensitivity);
  const [postDiscomfort, setPostDiscomfort] = useState(state.profile.kneeSensitivity);
  const [sessionNotes, setSessionNotes] = useState('');

  // Accordion state per exercise: which set number (1..ex.sets) is currently expanded
  const [expandedSetByEx, setExpandedSetByEx] = useState<Record<string, number>>({});
  // Collapsible "+ خيارات" drawer state per set key (`${ex.id}_S${setNum}`)
  const [openOptionsBySetKey, setOpenOptionsBySetKey] = useState<Record<string, boolean>>({});
  // Overview drawer for previewing non-current sessions (A, B, C, D)
  const [previewOtherDay, setPreviewOtherDay] = useState<WorkoutDayKey | null>(null);

  useEffect(() => {
    if (!isoRunning) return;
    const id = setInterval(() => {
      setIsoSec((prev) => {
        if (prev <= 1) {
          setIsoRunning(false);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isoRunning]);

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  /**
   * Smart Set Lookup with Cascading Set Inheritance (Sn <- Sn-1) & Historical Session Average:
   * - S1 defaults to the user's average weight & average reps from the last session.
   * - S2 inherits from S1; S3 inherits from S2; S4 inherits from S3.
   */
  const getSetLog = (ex: Exercise, setNum: number): SetLog => {
    const histAvg = computeHistoricalExerciseAverage(ex, state);
    return resolveEffectiveSetLog(ex, setNum, state.workoutLogs, histAvg);
  };

  const updateSetWithCarryOver = (ex: Exercise, setNum: number, nextLog: SetLog) => {
    const cleanLog: SetLog = {
      ...nextLog,
      weight: Math.max(0, Math.round(nextLog.weight || 0)),
      reps: Math.max(1, Math.round(nextLog.reps || ex.repMin)),
    };

    if (onSmartUpdateSet) {
      onSmartUpdateSet(ex, setNum, cleanLog);
      return;
    }

    const nextLogs = applySmartSetCarryOver(state.workoutLogs, ex, setNum, cleanLog);
    for (const [k, v] of Object.entries(nextLogs)) {
      if (state.workoutLogs[k] !== v) {
        onUpdateSetLog(k, v);
      }
    }
  };

  /**
   * Determines which set should be expanded in the accordion for an exercise:
   * - If the user explicitly clicked a set, show that set (or `0` if all sets are done and collapsed).
   * - Otherwise, automatically expand the first incomplete set (e.g., S1 initially, then S2 after S1 is done).
   */
  const getActiveSetNum = (ex: Exercise): number => {
    const explicit = expandedSetByEx[ex.id];
    if (typeof explicit === 'number') {
      return explicit;
    }
    for (let s = 1; s <= ex.sets; s++) {
      const log = getSetLog(ex, s);
      if (!log.done) return s;
    }
    return 0; // All sets completed -> all collapsed into emerald summary bars
  };

  // ================= ACTIVE WORKOUT MODE =================
  if (activeWorkoutDay) {
    const dayIds = state.customDayExercises[programMode][activeWorkoutDay] || [];
    const dayExercises = dayIds.map((id) => byId.get(id)).filter((e): e is Exercise => Boolean(e));
    const meta = SESSION_META[activeWorkoutDay];
    const followingDay = getNextSequenceDay(activeWorkoutDay);

    let totalPlannedWorkingSets = 0;
    let completedWorkingSets = 0;
    let totalVolumeKg = 0;
    let sessionPrCount = 0;
    const e1rmUpdates: Record<string, number> = {};
    const completedExerciseIds: string[] = [];

    dayExercises.forEach((ex) => {
      let bestExE1rm = 0;
      let exCompletedSets = 0;
      let exHitPr = false;
      for (let s = 1; s <= ex.sets; s++) {
        const log = getSetLog(ex, s);
        if (!log.isWarmup) {
          totalPlannedWorkingSets += 1;
          const prEval = evaluateSetPR(ex, log, state.e1rmHistory, state.prRecords);
          if (log.done) {
            completedWorkingSets += 1;
            exCompletedSets += 1;
            totalVolumeKg += Math.round(log.weight) * log.reps;
            const e1 = estimateE1RM(Math.round(log.weight), log.reps);
            if (e1 > bestExE1rm) bestExE1rm = e1;
            if (prEval.isPR) exHitPr = true;
          }
        }
      }
      if (bestExE1rm > 0) e1rmUpdates[ex.id] = bestExE1rm;
      if (exCompletedSets > 0) completedExerciseIds.push(ex.id);
      if (exHitPr) sessionPrCount += 1;
    });

    const progressPct =
      totalPlannedWorkingSets > 0
        ? Math.round((completedWorkingSets / totalPlannedWorkingSets) * 100)
        : 0;

    return (
      <div key={`active-workout-${activeWorkoutDay}`} className="space-y-4 animate-view-in">
        {/* 1. TOP OF PAGE: Session Progress Bar, Sequence Switcher & Optional Pre-Workout Check */}
        <div className="app-card rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExitWorkout}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-800 dark:text-white border border-slate-300 dark:border-[#1e293b] text-xs font-extrabold whitespace-nowrap hover:border-teal-500 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(lang, 'الحصص', 'Séances', 'Sessions')}</span>
              </button>

              {/* Sequence Switcher Grid (A -> B -> C -> D) */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#0b0f19] p-1 rounded-xl border border-slate-200 dark:border-[#1e293b]">
                {SEQUENCE_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onStartDay(d)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                      activeWorkoutDay === d
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Set Counter Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-extrabold mono-num">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {completedWorkingSets}/{totalPlannedWorkingSets}{' '}
                {tr(lang, 'مجموعات', 'séries', 'sets')} ({progressPct}%)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#1e293b]">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {tr(lang, meta.titleAr, meta.titleFr, meta.titleEn)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                {tr(lang, meta.focusAr, meta.focusFr, meta.focusEn)}
              </p>
            </div>
          </div>

          {/* Clean Solid Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#0b0f19] overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Compact Pre-Workout Toggles (Pre-Session Discomfort + RIR Guide + 45s Warm-Up) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreJointCheck((v) => !v)}
              className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                showPreJointCheck
                  ? 'bg-teal-600 text-white border-teal-500'
                  : 'bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1e293b] hover:border-teal-500'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>
                {tr(
                  lang,
                  `انزعاج المفصل قبل الحصة (${preDiscomfort}/10)`,
                  `Inconfort avant (${preDiscomfort}/10)`,
                  `Pre-Session Joint (${preDiscomfort}/10)`
                )}
              </span>
              {showPreJointCheck ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowRirGuide((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] text-xs font-bold whitespace-nowrap hover:border-sky-500 transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{tr(lang, 'دليل RIR', 'Guide RIR', 'RIR Guide')}</span>
              {showRirGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarmupGuide((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] text-xs font-bold whitespace-nowrap hover:border-teal-500 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span>{tr(lang, 'إحماء 45ث', 'Échauffement 45s', '45s Warm-Up')}</span>
              {showWarmupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showPreJointCheck && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3 text-xs space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>
                  {tr(
                    lang,
                    'انزعاج المفصل قبل بدء الحصة (0 = راحة تامة، 10 = ألم مرتفع):',
                    'Inconfort articulaire avant séance (0–10) :',
                    'Pre-Session Joint Discomfort (0–10):'
                  )}
                </span>
                <span className="mono-num text-teal-600 dark:text-teal-300 font-extrabold text-sm">
                  {preDiscomfort}/10
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={preDiscomfort}
                onChange={(e) => setPreDiscomfort(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>
          )}

          {showRirGuide && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-[#0b0f19] p-3 rounded-xl border border-slate-200 dark:border-[#1e293b]">
              <div><strong className="text-sky-500">3 RIR:</strong> {tr(lang, 'مريح — تبقّت 3 تكرارات في الاحتياط', 'Modéré — 3 reps en réserve', 'Moderate — 3 reps left')}</div>
              <div><strong className="text-teal-500">2 RIR:</strong> {tr(lang, 'مثالي للتمارين المركبة (تبقّى تكراران)', 'Idéal polyarticulaire', 'Sweet spot — 2 reps left')}</div>
              <div><strong className="text-amber-500">1 RIR:</strong> {tr(lang, 'قوي — تبقّى تكرار واحد فقط', 'Très proche de l’échec', '1 hard rep remaining')}</div>
              <div><strong className="text-rose-500">0 RIR:</strong> {tr(lang, 'أقصى جهد نظيف (للتمارين المعزولة)', 'Échec technique propre', 'Clean technical limit')}</div>
            </div>
          )}

          {showWarmupGuide && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="text-slate-900 dark:text-white block">
                  {tr(lang, 'ثبات تحمية المفاصل الاختياري (Spanish Squat / Wall Sit)', 'Maintien isométrique optionnel', 'Optional Isometric Warm-Up Hold')}
                </strong>
                <span className="text-slate-500 dark:text-slate-300 text-[11px]">
                  {tr(
                    lang,
                    'تحمية خفيفة لمدة 45 ثانية قبل تمارين الأرجل لتنشيط العضلات وتدفئة المفصل.',
                    'Option d’échauffement avant les jambes si bien tolérée.',
                    'Optional warm-up hold before lower-body exercises.'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold mono-num text-teal-500">{isoSec}s</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isoRunning) {
                      setIsoRunning(false);
                    } else {
                      if (isoSec <= 1) setIsoSec(45);
                      setIsoRunning(true);
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
                >
                  {isoRunning ? tr(lang, 'إيقاف', 'Pause', 'Pause') : tr(lang, 'بدء 45ث', 'Démarrer 45s', 'Start 45s')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. MIDDLE OF PAGE: 6-Color Framed Exercise Cards with Accordion Sets & Inline Rest Timer */}
        <div className="space-y-5">
          {dayExercises.map((ex, index) => {
            const framePalette = EXERCISE_CARD_FRAMES[index % EXERCISE_CARD_FRAMES.length];
            const prog = evaluateDoubleProgression(ex, state.workoutLogs);
            const completionCount = state.exerciseCompletionCounts?.[ex.id] || 0;
            const histAvg = computeHistoricalExerciseAverage(ex, state);
            const activeSetNum = getActiveSetNum(ex);
            const isHighlighted = highlightedExId === ex.id;

            let exDoneSetsCount = 0;
            let exHasPr = false;
            for (let s = 1; s <= ex.sets; s++) {
              const l = getSetLog(ex, s);
              if (l.done) exDoneSetsCount += 1;
              if (evaluateSetPR(ex, l, state.e1rmHistory, state.prRecords).isPR) {
                exHasPr = true;
              }
            }

            return (
              <article
                key={ex.id}
                id={`exercise-card-${ex.id}`}
                className={`rounded-2xl border bg-white dark:bg-[#111827] p-3.5 sm:p-4 space-y-3 transition-all ${
                  framePalette.cardBorder
                } ${isHighlighted ? 'ring-2 ring-teal-400 animate-focus-pulse' : ''}`}
              >
                {/* Exercise Card Header — Full Non-Truncated Title + Dedicated Sub-Line for Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1e293b]">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Dual Reference Photo Preview (Start + Peak) */}
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="grid grid-cols-2 gap-1 shrink-0 cursor-pointer"
                      aria-label={trText(lang, ex.name)}
                    >
                      <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b0f19]">
                        <ExerciseImage exercise={ex} frameIdx={0} alt={`${trText(lang, ex.name)} 1`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-slate-900/85 text-[9px] font-bold text-white mono-num">
                          1
                        </span>
                      </div>
                      <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0b0f19]">
                        <ExerciseImage exercise={ex} frameIdx={1} alt={`${trText(lang, ex.name)} 2`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-teal-600 text-[9px] font-bold text-white mono-num">
                          2
                        </span>
                      </div>
                    </button>

                    {/* Title (Full, No Truncation) + Sub-Row Badges */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-extrabold mono-num shrink-0 ${framePalette.badgeBg}`}
                        >
                          #{index + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white break-words leading-snug">
                          {trText(lang, ex.name)}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-300 break-words">
                        {trText(lang, ex.muscleLabel)}
                      </p>

                      {/* Dedicated Badges Sub-Row (Equipment, Sets×Reps, Completion Count, PR 🏆) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-extrabold mono-num ${framePalette.pillBg}`}
                        >
                          {ex.equipment} · {ex.sets}×{ex.repsLabel} · {ex.rirLabel}
                        </span>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-200 text-[11px] font-extrabold mono-num">
                          {exDoneSetsCount}/{ex.sets} ✓
                        </span>

                        {completionCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-300 text-[10px] font-extrabold mono-num whitespace-nowrap">
                            {tr(lang, `أُنجز ${completionCount}×`, `${completionCount}× fait`, `Done ${completionCount}×`)}
                          </span>
                        )}

                        {exHasPr && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] font-extrabold whitespace-nowrap">
                            <Trophy className="w-3 h-3 shrink-0" />
                            <span>{tr(lang, 'PR 🏆', 'PR 🏆', 'PR 🏆')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact Action Buttons (Photos, Swap, Rest Timer) */}
                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] text-xs font-bold whitespace-nowrap hover:border-sky-500 transition cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>{tr(lang, 'الصور', 'Photos', 'Photos')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSwap(ex.id)}
                      className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] text-xs font-bold whitespace-nowrap hover:border-indigo-500 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{tr(lang, 'بديل', 'Swap', 'Swap')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartRestTimer(ex.restSec, `${ex.id}_S${Math.max(1, activeSetNum)}`)}
                      className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1e293b] text-xs font-extrabold mono-num whitespace-nowrap hover:border-teal-500 transition cursor-pointer"
                    >
                      <Timer className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span>{ex.restSec}s</span>
                    </button>
                  </div>
                </div>

                {/* Historical Session Average Banner + Double Progression Cue */}
                <div className="rounded-xl px-3 py-2 text-xs font-semibold border bg-slate-50 dark:bg-[#0b0f19] border-slate-200 dark:border-[#1e293b] flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 font-extrabold text-teal-600 dark:text-teal-300">
                    <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {tr(
                        lang,
                        `📊 متوسط آخر حصة: ${histAvg.avgWeightKg} كغ × ${histAvg.avgReps}`,
                        `📊 Moyenne dernière séance : ${histAvg.avgWeightKg} kg × ${histAvg.avgReps}`,
                        `📊 Last Session Avg: ${histAvg.avgWeightKg} kg × ${histAvg.avgReps}`
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {prog.readyToIncrease && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-300 font-extrabold">
                        {trText(lang, prog.reason)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-300">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>
                        {tr(
                          lang,
                          'توريث تسلسلي Sn ← Sn-1',
                          'Copie en cascade Sn ← Sn-1',
                          'Cascading Auto-Fill Sn ← Sn-1'
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {/* ACCORDION SETS LIST (S1 .. Sn) */}
                <div className="space-y-2">
                  {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNum) => {
                    const key = `${ex.id}_S${setNum}`;
                    const log = getSetLog(ex, setNum);
                    const intWeight = Math.max(0, Math.round(log.weight));
                    const e1 = estimateE1RM(intWeight, log.reps);
                    const prCheck = evaluateSetPR(ex, log, state.e1rmHistory, state.prRecords);
                    const isOpen = setNum === activeSetNum;
                    const isOptionsOpen = Boolean(openOptionsBySetKey[key]);
                    const hasExtraOptions =
                      log.isWarmup ||
                      typeof log.actualRir === 'number' ||
                      Boolean(log.note && log.note.trim());

                    // Check if the unified inline countdown timer is active right below this completed set
                    const showInlineTimerHere =
                      state.timer.running && state.timer.activeContextKey === key;

                    return (
                      <div key={key} className="space-y-2">
                        {/* CASE A: COMPLETED & COLLAPSED SET — Calm 1-Line Emerald Summary Bar */}
                        {log.done && !isOpen ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSetByEx((prev) => ({
                                ...prev,
                                [ex.id]: setNum,
                              }))
                            }
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-xs transition cursor-pointer text-start"
                          >
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold mono-num text-xs">
                                S{setNum} ✓
                              </span>
                              <span className="font-extrabold mono-num text-slate-900 dark:text-white text-sm">
                                {intWeight} {tr(lang, 'كغ', 'kg', 'kg')} × {log.reps}
                              </span>
                              {log.isWarmup && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 text-[10px] font-extrabold">
                                  {tr(lang, 'إحماء', 'Échauf.', 'Warmup')}
                                </span>
                              )}
                              {typeof log.actualRir === 'number' && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 text-[10px] font-bold mono-num">
                                  RIR {log.actualRir}
                                </span>
                              )}
                              {prCheck.isPR && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-extrabold mono-num">
                                  <Trophy className="w-3 h-3" /> PR
                                </span>
                              )}
                              {log.note && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-300 truncate max-w-[160px]">
                                  · {log.note}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-bold mono-num text-emerald-600 dark:text-emerald-300">
                                e1RM {e1}kg
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 underline">
                                {tr(lang, 'تعديل', 'Modifier', 'Edit')}
                              </span>
                            </div>
                          </button>
                        ) : !isOpen ? (
                          /* CASE B: UPCOMING COLLAPSED SET (S2, S3...) — Calm Muted Dark Row */
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSetByEx((prev) => ({
                                ...prev,
                                [ex.id]: setNum,
                              }))
                            }
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50/80 dark:bg-[#0b0f19]/75 hover:border-teal-500/50 text-xs text-slate-500 dark:text-slate-400 transition cursor-pointer text-start"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 font-extrabold mono-num flex items-center justify-center text-xs">
                                S{setNum}
                              </span>
                              <span className="font-bold mono-num text-slate-700 dark:text-slate-300">
                                {tr(
                                  lang,
                                  `المجموعة القادمة: ${intWeight} كغ × ${log.reps}`,
                                  `Suivante : ${intWeight} kg × ${log.reps}`,
                                  `Upcoming: ${intWeight} kg × ${log.reps}`
                                )}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
                              <span>{tr(lang, 'فتح', 'Ouvrir', 'Open')}</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        ) : (
                          /* CASE C: ACTIVE EXPANDED SET — Illuminated Border + Single Horizontal Row (Weight | Reps) + "+ خيارات" */
                          <div className="rounded-xl border-2 border-teal-500 bg-slate-50 dark:bg-[#0b0f19] p-3 space-y-2.5 shadow-xs">
                            {/* Top Mini-Bar: Set Badge + e1RM/PR + "+ خيارات" Toggle */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-extrabold mono-num text-xs">
                                  {tr(lang, `المجموعة S${setNum}`, `Série S${setNum}`, `Set S${setNum}`)}
                                </span>
                                <span className="text-xs font-extrabold mono-num text-sky-600 dark:text-sky-300">
                                  e1RM: {e1}kg
                                </span>
                                {prCheck.isPR && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-extrabold mono-num">
                                    <Trophy className="w-3 h-3" /> PR
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setOpenOptionsBySetKey((prev) => ({
                                    ...prev,
                                    [key]: !prev[key],
                                  }))
                                }
                                className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[11px] font-extrabold transition cursor-pointer ${
                                  isOptionsOpen || hasExtraOptions
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1e293b] hover:border-indigo-500'
                                }`}
                              >
                                <span>{tr(lang, '+ خيارات', '+ Options', '+ Options')}</span>
                                {isOptionsOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* SINGLE HORIZONTAL ROW (2 COLUMNS): Column 1 = Weight (kg), Column 2 = Reps */}
                            <div className="grid grid-cols-2 gap-2.5">
                              {/* Column 1: Integer Weight Stepper */}
                              <div className="space-y-1">
                                <label
                                  htmlFor={`${key}_weight`}
                                  className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-300 text-center"
                                >
                                  {tr(lang, 'الوزن (كغ)', 'Charge (kg)', 'Weight (kg)')}
                                </label>
                                <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        weight: Math.max(0, intWeight - 1),
                                      })
                                    }
                                    className="w-9 h-10 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    aria-label="Decrease weight by 1 kg"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    id={`${key}_weight`}
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    step="1"
                                    min="0"
                                    value={intWeight}
                                    onChange={(e) =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        weight: Math.max(0, Math.round(Number(e.target.value) || 0)),
                                      })
                                    }
                                    className="h-10 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] font-extrabold mono-num text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        weight: intWeight + 1,
                                      })
                                    }
                                    className="w-9 h-10 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    aria-label="Increase weight by 1 kg"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Column 2: Reps Stepper */}
                              <div className="space-y-1">
                                <label
                                  htmlFor={`${key}_reps`}
                                  className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-300 text-center"
                                >
                                  {tr(lang, 'التكرارات', 'Répétitions', 'Reps')}
                                </label>
                                <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        reps: Math.max(1, log.reps - 1),
                                      })
                                    }
                                    className="w-9 h-10 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    aria-label="Decrease reps"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    id={`${key}_reps`}
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    step="1"
                                    min="1"
                                    max="50"
                                    value={log.reps}
                                    onChange={(e) =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        reps: Math.max(1, Math.round(Number(e.target.value) || 1)),
                                      })
                                    }
                                    className="h-10 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-[#1e293b] bg-white dark:bg-[#111827] font-extrabold mono-num text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        reps: log.reps + 1,
                                      })
                                    }
                                    className="w-9 h-10 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center transition active:scale-95 cursor-pointer"
                                    aria-label="Increase reps"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* COLLAPSIBLE "+ خيارات" DRAWER: Actual RIR, Warm-up Checkbox, and Set Note */}
                            {isOptionsOpen && (
                              <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] p-3 space-y-2.5 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                                  {/* Actual RIR Stepper */}
                                  <div className="space-y-1">
                                    <label
                                      htmlFor={`${key}_actual_rir`}
                                      className="block text-[11px] font-bold text-slate-600 dark:text-slate-300"
                                    >
                                      {tr(lang, 'RIR الفعلي', 'RIR réel', 'Actual RIR')} ({tr(lang, 'الهدف', 'cible', 'target')} {ex.targetRir})
                                    </label>
                                    <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = log.actualRir ?? ex.targetRir;
                                          const next = Math.max(0, Number((current - 0.5).toFixed(1)));
                                          updateSetWithCarryOver(ex, setNum, { ...log, actualRir: next, rir: next });
                                        }}
                                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-700 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center cursor-pointer"
                                        aria-label={`Decrease actual RIR for set ${setNum}`}
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <input
                                        id={`${key}_actual_rir`}
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        placeholder={String(ex.targetRir)}
                                        value={log.actualRir ?? ''}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          if (raw === '') {
                                            updateSetWithCarryOver(ex, setNum, {
                                              ...log,
                                              actualRir: undefined,
                                              rir: ex.targetRir,
                                            });
                                            return;
                                          }
                                          const parsed = Math.max(0, Math.min(10, Number(raw)));
                                          if (!Number.isNaN(parsed)) {
                                            updateSetWithCarryOver(ex, setNum, {
                                              ...log,
                                              actualRir: parsed,
                                              rir: parsed,
                                            });
                                          }
                                        }}
                                        className="h-9 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] font-extrabold mono-num text-slate-900 dark:text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = log.actualRir ?? ex.targetRir;
                                          const next = Math.min(10, Number((current + 0.5).toFixed(1)));
                                          updateSetWithCarryOver(ex, setNum, { ...log, actualRir: next, rir: next });
                                        }}
                                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-700 dark:text-white border border-slate-300 dark:border-[#334155] flex items-center justify-center cursor-pointer"
                                        aria-label={`Increase actual RIR for set ${setNum}`}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Warm-up Toggle Checkbox */}
                                  <div className="flex items-center pt-3 sm:pt-5">
                                    <label className="inline-flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-300 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={log.isWarmup}
                                        onChange={(e) =>
                                          updateSetWithCarryOver(ex, setNum, {
                                            ...log,
                                            isWarmup: e.target.checked,
                                          })
                                        }
                                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                                      />
                                      <span>
                                        {tr(
                                          lang,
                                          'احتساب كمجموعة إحماء (لا تدخل في الحجم)',
                                          'Série d’échauffement',
                                          'Mark as Warm-Up Set'
                                        )}
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                {/* Optional Set Note */}
                                <div>
                                  <input
                                    type="text"
                                    value={log.note || ''}
                                    onChange={(e) =>
                                      updateSetWithCarryOver(ex, setNum, {
                                        ...log,
                                        note: e.target.value,
                                      })
                                    }
                                    placeholder={tr(
                                      lang,
                                      'ملاحظة للمجموعة (مثال: تحكم عالٍ، قبضة ضيقة)...',
                                      'Note pour cette série...',
                                      'Optional note for this set...'
                                    )}
                                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            )}

                            {/* PRIMARY COMPLETE SET ACTION BUTTON ("تم ✓") */}
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  // Always complete and advance when clicking the primary button on an incomplete set;
                                  // if already done and re-opened for editing, clicking "تم ✓" saves & collapses it!
                                  const nextSetToOpen = setNum < ex.sets ? setNum + 1 : 0;
                                  updateSetWithCarryOver(ex, setNum, {
                                    ...log,
                                    done: true,
                                    timestamp: new Date().toISOString(),
                                  });
                                  setExpandedSetByEx((prev) => ({
                                    ...prev,
                                    [ex.id]: nextSetToOpen,
                                  }));
                                  if (!log.isWarmup) {
                                    onStartRestTimer(ex.restSec, key);
                                  }
                                }}
                                className="flex-1 h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                              >
                                <Check className="w-4 h-4 shrink-0" />
                                <span>
                                  {setNum < ex.sets
                                    ? tr(
                                        lang,
                                        `تم ✓ (حفظ S${setNum} وفتح S${setNum + 1} + بدء الراحة ${ex.restSec}ث)`,
                                        `Fait ✓ (Ouvrir S${setNum + 1} + Repos ${ex.restSec}s)`,
                                        `Done ✓ (Open S${setNum + 1} + Start ${ex.restSec}s Rest)`
                                      )
                                    : tr(
                                        lang,
                                        `تم ✓ (إتمام المجموعة الأخيرة S${setNum})`,
                                        `Fait ✓ (Terminer S${setNum})`,
                                        `Done ✓ (Finish Final Set S${setNum})`
                                      )}
                                </span>
                              </button>

                              {log.done && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateSetWithCarryOver(ex, setNum, {
                                      ...log,
                                      done: false,
                                      timestamp: undefined,
                                    });
                                  }}
                                  className="h-10 px-3 rounded-xl bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-200 text-xs font-bold hover:text-rose-500 transition cursor-pointer"
                                >
                                  {tr(lang, 'إلغاء الإتمام', 'Annuler', 'Undo')}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* INLINE COUNTDOWN REST TIMER BAR (Directly Below Completed Set S_n) */}
                        {showInlineTimerHere && (
                          <div
                            role="timer"
                            aria-label="Inline Set Rest Timer"
                            className="rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs animate-view-in"
                          >
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-amber-500 dark:text-amber-300 animate-spin" />
                              <span className="font-extrabold text-amber-800 dark:text-amber-200">
                                {tr(lang, 'راحة بين المجموعات:', 'Repos en cours :', 'Rest Countdown:')}
                              </span>
                              <span className="text-base font-extrabold mono-num text-amber-600 dark:text-amber-300">
                                {formatSec(state.timer.remainingSec)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onAdjustRestTimer
                                    ? onAdjustRestTimer(-15)
                                    : onStartRestTimer(Math.max(15, state.timer.remainingSec - 15), key)
                                }
                                className="h-8 px-2.5 rounded-lg bg-slate-900/80 text-white font-extrabold mono-num text-[11px] hover:bg-slate-800 transition cursor-pointer"
                              >
                                {tr(lang, '-15ث', '-15s', '-15s')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onAdjustRestTimer
                                    ? onAdjustRestTimer(15)
                                    : onStartRestTimer(state.timer.remainingSec + 15, key)
                                }
                                className="h-8 px-2.5 rounded-lg bg-slate-900/80 text-white font-extrabold mono-num text-[11px] hover:bg-slate-800 transition cursor-pointer"
                              >
                                {tr(lang, '+15ث', '+15s', '+15s')}
                              </button>
                              <button
                                type="button"
                                onClick={() => (onSkipRestTimer ? onSkipRestTimer() : undefined)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
                              >
                                <span>{tr(lang, 'تخطي', 'Passer', 'Skip')}</span>
                                <SkipForward className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        {/* 3. BOTTOM OF PAGE (Chronological End-of-Session Checkout: Post-Session Joint + Notes + Save Button) */}
        <div className="app-card rounded-2xl border-2 border-teal-500/50 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#1e293b]">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {tr(
                  lang,
                  `ختام الحصة ${activeWorkoutDay} وحفظ السجل`,
                  `Bilan de fin de Séance ${activeWorkoutDay}`,
                  `Session ${activeWorkoutDay} Checkout & Save`
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {tr(
                  lang,
                  'بعد الانتهاء من التمارين أعلاه، سجّل راحة المفاصل وملاحظتك ثم احفظ الحصة للانتقال للدور التالي.',
                  'Évaluez votre confort articulaire après la séance puis sauvegardez.',
                  'Log your post-workout joint comfort and save to advance your sequence.'
                )}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 text-xs font-extrabold mono-num">
              {completedWorkingSets}/{totalPlannedWorkingSets} {tr(lang, 'مكتمل', 'complété', 'done')} ·{' '}
              {Math.round(totalVolumeKg).toLocaleString()} kg
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between mb-1.5">
                <span>
                  {tr(
                    lang,
                    'انزعاج المفصل بعد الحصة (0–10):',
                    'Inconfort articulaire après séance (0–10) :',
                    'Post-Session Joint Discomfort (0–10):'
                  )}
                </span>
                <span className="mono-num text-sky-600 dark:text-sky-300 font-extrabold text-sm">
                  {postDiscomfort}/10
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={postDiscomfort}
                onChange={(e) => setPostDiscomfort(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                {tr(lang, 'ملاحظة الحصة (اختياري):', 'Note de séance :', 'Session Note (optional):')}
              </label>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder={tr(
                  lang,
                  'مثال: أداء قوي وتحكم ممتاز في الأوزان',
                  'Ex: Très bonne séance',
                  'e.g. Smooth reps & great joint comfort'
                )}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onFinishSession({
                day: activeWorkoutDay,
                preJointDiscomfort: preDiscomfort,
                postJointDiscomfort: postDiscomfort,
                sessionNotes,
                totalWorkingSets: completedWorkingSets,
                totalVolumeKg: Math.round(totalVolumeKg),
                e1rmUpdates,
                completedExerciseIds,
                newPrCount: sessionPrCount,
              })
            }
            className="w-full h-12 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              {tr(
                lang,
                `إنهاء وحفظ الحصة ${activeWorkoutDay} (الحصة التالية: ${followingDay})`,
                `Terminer et Sauver la Séance ${activeWorkoutDay} (Suivante : ${followingDay})`,
                `Finish & Save Session ${activeWorkoutDay} (Next Up: ${followingDay})`
              )}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ================= SIMPLIFIED HOME SCREEN (CURRENT TURN SESSION ONLY + COMPACT OTHER SESSIONS DRAWER) =================
  const currentDayIds = state.customDayExercises[programMode][nextUpDay] || [];
  const currentDayExs = currentDayIds.map((id) => byId.get(id)).filter((e): e is Exercise => Boolean(e));
  const currentTotalSets = currentDayExs.reduce((acc, e) => acc + e.sets, 0);
  const currentMeta = SESSION_META[nextUpDay];
  const otherDays = SEQUENCE_ORDER.filter((d) => d !== nextUpDay);

  return (
    <div key="workout-overview" className="space-y-4 animate-view-in">
      {/* 1. WORKOUT DELAY & STREAK WARNING BANNER (> 3 DAYS INACTIVITY) */}
      {streakInfo.isDelayed && streakInfo.daysSinceLastWorkout !== null && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 grid grid-cols-1 md:grid-cols-12 items-center gap-3"
        >
          <div className="md:col-span-8 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase whitespace-nowrap">
                  {tr(lang, 'تنبيه انقطاع التدريب', 'Alerte d’inactivité', 'Training Delay Alert')}
                </span>
                <span className="text-xs font-extrabold mono-num text-rose-600 dark:text-rose-300">
                  {tr(
                    lang,
                    `مرّت ${streakInfo.daysSinceLastWorkout} أيام منذ آخر حصة (${streakInfo.lastSessionDate})`,
                    `${streakInfo.daysSinceLastWorkout} jours depuis la dernière séance (${streakInfo.lastSessionDate})`,
                    `${streakInfo.daysSinceLastWorkout} days since your last session (${streakInfo.lastSessionDate})`
                  )}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {tr(
                  lang,
                  `لا تدع الزخم يتوقف! دورك الحالي محفوظ عند الحصة ${nextUpDay} — ابدأ الآن واستعد سلسلتك التدريبية.`,
                  `Reprenez le rythme ! Votre prochaine séance dans la séquence est la Séance ${nextUpDay}.`,
                  `Keep your momentum alive! Your sequence rotation is waiting at Session ${nextUpDay}.`
                )}
              </h3>
            </div>
          </div>
          <div className="md:col-span-4 flex md:justify-end">
            <button
              type="button"
              onClick={() => onStartDay(nextUpDay)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>
                {tr(
                  lang,
                  `استأنف الحصة ${nextUpDay}`,
                  `Reprendre Séance ${nextUpDay}`,
                  `Resume Session ${nextUpDay}`
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. COMPACT 4-COUNTER KPI STRIP (No Truncated Labels on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3 sm:p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block leading-tight">
              {tr(lang, 'الحصص المكتملة', 'Séances Complétées', 'Completed Sessions')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold mono-num text-teal-600 dark:text-teal-300 mt-0.5">
              {streakInfo.totalSessions}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block leading-tight">
              {streakInfo.totalWorkingSetsAllTime} {tr(lang, 'مجموعة عمل', 'séries', 'working sets')}
            </span>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3 sm:p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block leading-tight">
              {tr(lang, 'الحصة التالية', 'Prochaine Séance', 'Next in Sequence')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-600 dark:text-sky-300 mt-0.5">
              {tr(lang, `الحصة ${nextUpDay}`, `Séance ${nextUpDay}`, `Session ${nextUpDay}`)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block leading-tight">
              A → B → C → D
            </span>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 items-center justify-center shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3 sm:p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block leading-tight">
              {tr(lang, 'آخر حصة والانتظام', 'Dernière Séance', 'Last Session & Streak')}
            </span>
            <div className="text-sm sm:text-lg font-extrabold mono-num text-amber-600 dark:text-amber-300 mt-0.5 leading-snug">
              {streakInfo.lastSession
                ? `${streakInfo.lastSession.day} · ${
                    streakInfo.daysSinceLastWorkout === 0
                      ? tr(lang, 'اليوم', 'Aujourd’hui', 'Today')
                      : tr(
                          lang,
                          `منذ ${streakInfo.daysSinceLastWorkout} يوم`,
                          `Il y a ${streakInfo.daysSinceLastWorkout}j`,
                          `${streakInfo.daysSinceLastWorkout}d ago`
                        )
                  }`
                : tr(lang, 'لم تبدأ بعد', 'Aucune', 'None yet')}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
              {streakInfo.isDelayed
                ? tr(lang, 'تأخر > 3 أيام', 'Pause > 3 jours', 'Paused > 3 days')
                : tr(lang, `سلسلة منتظمة (${streakInfo.activeStreakCount})`, `Série active (${streakInfo.activeStreakCount})`, `Active streak (${streakInfo.activeStreakCount})`)}
            </span>
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-300 items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-3 sm:p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 block leading-tight">
              {tr(lang, 'مؤشر الجاهزية', 'Indice de Forme', 'Readiness Score')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold mono-num text-indigo-600 dark:text-indigo-300 mt-0.5">
              {readiness.score}/100
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
              {readiness.band === 'high'
                ? tr(lang, 'جاهزية مثالية', 'Prêt à progresser', 'Optimal readiness')
                : readiness.band === 'moderate'
                ? tr(lang, 'جاهزية متوازنة', 'Forme équilibrée', 'Balanced readiness')
                : tr(lang, 'تخفيف 10%', 'Alléger de 10%', 'Lighter load')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowReadinessSliders((v) => !v)}
            className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] hover:border-indigo-500 border border-slate-200 dark:border-[#1e293b] text-xs font-bold text-indigo-600 dark:text-indigo-300 whitespace-nowrap transition cursor-pointer shrink-0"
          >
            {tr(lang, 'ضبط', 'Ajuster', 'Adjust')}
          </button>
        </div>
      </div>

      {/* Collapsible Readiness Sliders */}
      {showReadinessSliders && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'ساعات النوم', 'Sommeil', 'Sleep')}</span>
              <span className="mono-num text-teal-600 dark:text-teal-300 font-extrabold">{state.profile.sleepHrs}h</span>
            </label>
            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={state.profile.sleepHrs}
              onChange={(e) => onUpdateProfile({ sleepHrs: Number(e.target.value) })}
              className="w-full accent-teal-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'الإجهاد العام', 'Fatigue', 'Fatigue')}</span>
              <span className="mono-num text-sky-600 dark:text-sky-300 font-extrabold">{state.profile.fatigueLevel}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={state.profile.fatigueLevel}
              onChange={(e) => onUpdateProfile({ fatigueLevel: Number(e.target.value) })}
              className="w-full accent-sky-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'حساسية الركبة', 'Sensibilité genou', 'Knee Sensitivity')}</span>
              <span className="mono-num text-amber-600 dark:text-amber-300 font-extrabold">{state.profile.kneeSensitivity}/10</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={state.profile.kneeSensitivity}
              onChange={(e) => onUpdateProfile({ kneeSensitivity: Number(e.target.value) })}
              className="w-full accent-amber-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'الكتف / المعصم', 'Épaule / Poignet', 'Shoulder/Wrist')}</span>
              <span className="mono-num text-indigo-600 dark:text-indigo-300 font-extrabold">{Math.max(state.profile.shoulderSensitivity, state.profile.wristSensitivity)}/10</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={state.profile.shoulderSensitivity}
              onChange={(e) => onUpdateProfile({ shoulderSensitivity: Number(e.target.value) })}
              className="w-full accent-indigo-500 mt-1"
            />
          </div>
        </div>
      )}

      {/* 3. PRIMARY FOCUS: CURRENT TURN SESSION CARD ONLY (Zero Clutter) */}
      <section
        aria-label={tr(lang, `الحصة الحالية ${nextUpDay}`, `Séance actuelle ${nextUpDay}`, `Current Session ${nextUpDay}`)}
        className="rounded-2xl border-2 border-teal-500/80 bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-4 shadow-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1e293b]">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-teal-600 text-white text-xs font-extrabold whitespace-nowrap">
                {tr(lang, `الحصة ${nextUpDay} — دورك الحالي`, `Séance ${nextUpDay} — À votre tour`, `Session ${nextUpDay} — Up Next`)}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                {state.trainingDaysLabels[nextUpDay]}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] text-xs font-extrabold mono-num text-teal-600 dark:text-teal-300">
                {currentDayExs.length} {tr(lang, 'تمارين', 'exercices', 'exercises')} · {currentTotalSets} {tr(lang, 'مجموعة', 'séries', 'sets')}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
              {tr(lang, currentMeta.titleAr, currentMeta.titleFr, currentMeta.titleEn)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {tr(lang, currentMeta.focusAr, currentMeta.focusFr, currentMeta.focusEn)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] hover:border-teal-500 text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <Settings className="w-4 h-4 text-teal-500 shrink-0" />
                <span>{tr(lang, 'إعدادات الجدول', 'Réglages', 'Schedule Settings')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartDay(nextUpDay)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white text-sm font-extrabold whitespace-nowrap transition cursor-pointer shadow-xs"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>
                {tr(
                  lang,
                  `ابدأ الحصة ${nextUpDay} الآن`,
                  `Lancer la Séance ${nextUpDay}`,
                  `Start Session ${nextUpDay} Now`
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Current Turn Session Exercise List with 6-Color Framing & Full Non-Truncated Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {currentDayExs.map((ex, idx) => {
            const framePalette = EXERCISE_CARD_FRAMES[idx % EXERCISE_CARD_FRAMES.length];
            const doneCount = state.exerciseCompletionCounts?.[ex.id] || 0;
            const prRec = state.prRecords?.[ex.id];
            const histAvg = computeHistoricalExerciseAverage(ex, state);
            const isHighlighted = highlightedExId === ex.id;

            return (
              <div
                key={`${nextUpDay}_${ex.id}`}
                id={`exercise-card-${ex.id}`}
                className={`flex items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border text-xs transition ${
                  framePalette.cardBorder
                } ${isHighlighted ? 'ring-2 ring-teal-400 animate-focus-pulse' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onOpenExercise(ex.id)}
                  className="flex items-start gap-2.5 min-w-0 flex-1 text-start group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] shrink-0">
                    <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold mono-num shrink-0 ${framePalette.badgeBg}`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white break-words leading-snug group-hover:text-teal-500 transition">
                        {trText(lang, ex.name)}
                      </span>
                    </div>

                    {/* Sub-Line Badges (Equipment, Sets×Reps, Historical Avg, PR, Done Count) */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-300 mono-num">
                      <span>
                        {ex.sets}×{ex.repsLabel} · <strong className={framePalette.accentText}>{ex.equipment}</strong>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-300 text-[10px] font-extrabold">
                        📊 {histAvg.avgWeightKg}kg × {histAvg.avgReps}
                      </span>
                      {doneCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 text-[10px] font-extrabold">
                          {doneCount}×
                        </span>
                      )}
                      {prRec && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[10px] font-extrabold">
                          <Trophy className="w-2.5 h-2.5" /> {prRec.bestWeightKg}kg
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSwap(ex.id)}
                  aria-label={`Swap ${trText(lang, ex.name)}`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-indigo-500 hover:bg-white dark:hover:bg-[#111827] border border-slate-200 dark:border-[#1e293b] transition cursor-pointer shrink-0"
                  title={tr(lang, 'بديل', 'Swap', 'Swap')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. COMPACT DRAWER TO BROWSE OR LAUNCH OTHER SESSIONS (A · C · D) */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              {tr(
                lang,
                'استعراض أو بدء باقي الحصص في الجدول:',
                'Consulter ou lancer une autre séance :',
                'Browse or Launch Other Sessions:'
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {otherDays.map((d) => {
              const isSelected = previewOtherDay === d;
              const exCount = (state.customDayExercises[programMode][d] || []).length;
              return (
                <button
                  key={`OTHER_TAB_${d}`}
                  type="button"
                  onClick={() => setPreviewOtherDay((prev) => (prev === d ? null : d))}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1e293b] hover:border-sky-500'
                  }`}
                >
                  <span>{tr(lang, `الحصة ${d}`, `Séance ${d}`, `Session ${d}`)}</span>
                  <span className="text-[10px] opacity-80 mono-num">({exCount})</span>
                  {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {previewOtherDay && (
          <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3.5 space-y-3 animate-view-in">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-[#1e293b]">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {tr(
                    lang,
                    SESSION_META[previewOtherDay].titleAr,
                    SESSION_META[previewOtherDay].titleFr,
                    SESSION_META[previewOtherDay].titleEn
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {tr(
                    lang,
                    SESSION_META[previewOtherDay].focusAr,
                    SESSION_META[previewOtherDay].focusFr,
                    SESSION_META[previewOtherDay].focusEn
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartDay(previewOtherDay)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {tr(
                    lang,
                    `بدء الحصة ${previewOtherDay}`,
                    `Lancer Séance ${previewOtherDay}`,
                    `Start Session ${previewOtherDay}`
                  )}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(state.customDayExercises[programMode][previewOtherDay] || [])
                .map((id) => byId.get(id))
                .filter((e): e is Exercise => Boolean(e))
                .map((ex, i) => (
                  <button
                    key={`${previewOtherDay}_PREV_${ex.id}`}
                    type="button"
                    onClick={() => onOpenExercise(ex.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] hover:border-sky-500 text-start text-xs transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e293b] shrink-0">
                      <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white break-words leading-snug">
                        {i + 1}. {trText(lang, ex.name)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num">
                        {ex.sets}×{ex.repsLabel} · {ex.equipment}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Non-medical Disclaimer Strip */}
      <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] p-3 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          {tr(
            lang,
            'تنويه رياضي: مؤشرات الجاهزية وتعديلات المفاصل مخصصة لإدارة الأحمال الرياضية ولا تُعد بديلاً عن الاستشارة الطبية.',
            'Information sportive : Les ajustements articulaires guident la gestion de charge et ne constituent pas un diagnostic médical.',
            'Athletic guidance only: readiness scores and joint-friendly substitutions support load management and are not medical diagnosis.'
          )}
        </span>
      </div>
    </div>
  );
};
