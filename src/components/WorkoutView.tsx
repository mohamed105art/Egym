import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Image as ImageIcon,
  Info,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { tr, trText } from '../engine/i18n';
import {
  computeSessionStreakAndDelay,
  getNextSequenceDay,
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
  onStartDay: (day: WorkoutDayKey) => void;
  onExitWorkout: () => void;
  onSetProgramMode: (mode: ProgramMode) => void;
  onSetSchedulePreset: (preset: DaySchedulePreset) => void;
  onUpdateDayLabel: (day: WorkoutDayKey, label: string) => void;
  onUpdateProfile: (patch: Partial<AppState['profile']>) => void;
  onToggleOptionalDayD: (enabled: boolean) => void;
  onUpdateSetLog: (key: string, log: SetLog) => void;
  onStartRestTimer: (seconds: number) => void;
  onFinishSession: (payload: {
    day: WorkoutDayKey;
    preJointDiscomfort: number;
    postJointDiscomfort: number;
    sessionNotes: string;
    totalWorkingSets: number;
    totalVolumeKg: number;
    e1rmUpdates: Record<string, number>;
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

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  state,
  exercises,
  onStartDay,
  onExitWorkout,
  onSetProgramMode,
  onSetSchedulePreset,
  onUpdateDayLabel,
  onUpdateProfile,
  onToggleOptionalDayD,
  onUpdateSetLog,
  onStartRestTimer,
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
  const [showReadinessSliders, setShowReadinessSliders] = useState(false);
  const [isoSec, setIsoSec] = useState(45);
  const [isoRunning, setIsoRunning] = useState(false);
  const [preDiscomfort, setPreDiscomfort] = useState(state.profile.kneeSensitivity);
  const [postDiscomfort, setPostDiscomfort] = useState(state.profile.kneeSensitivity);
  const [sessionNotes, setSessionNotes] = useState('');

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

  const getSetLog = (ex: Exercise, setNum: number): SetLog => {
    const k = `${ex.id}_S${setNum}`;
    const existing = state.workoutLogs[k];
    if (existing) return existing;
    return {
      weight: ex.defaultWeightKg,
      reps: ex.repMin,
      rir: ex.targetRir,
      isWarmup: false,
      done: false,
    };
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
    const e1rmUpdates: Record<string, number> = {};

    dayExercises.forEach((ex) => {
      let bestExE1rm = 0;
      for (let s = 1; s <= ex.sets; s++) {
        const log = getSetLog(ex, s);
        if (!log.isWarmup) {
          totalPlannedWorkingSets += 1;
          if (log.done) {
            completedWorkingSets += 1;
            totalVolumeKg += log.weight * log.reps;
            const e1 = estimateE1RM(log.weight, log.reps);
            if (e1 > bestExE1rm) bestExE1rm = e1;
          }
        }
      }
      if (bestExE1rm > 0) e1rmUpdates[ex.id] = bestExE1rm;
    });

    const progressPct =
      totalPlannedWorkingSets > 0
        ? Math.round((completedWorkingSets / totalPlannedWorkingSets) * 100)
        : 0;

    return (
      <div className="space-y-4">
        {/* Session Header & Sequence Switcher */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
            {/* Left/Start Controls */}
            <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExitWorkout}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-extrabold whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(lang, 'لوحة الحصص', 'Toutes les séances', 'All Sessions')}</span>
              </button>

              {/* Sequence Switcher Grid (A -> B -> C -> D) */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {SEQUENCE_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onStartDay(d)}
                    className={`h-8 px-3 rounded-lg text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                      activeWorkoutDay === d
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tr(lang, `حصة ${d}`, `Séance ${d}`, `Day ${d}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Right/End Finish CTA */}
            <div className="lg:col-span-5 flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
              <div className="text-xs font-extrabold mono-num text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {completedWorkingSets}/{totalPlannedWorkingSets} {tr(lang, 'مجموعات', 'séries', 'sets')} ({progressPct}%)
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
                  })
                }
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white text-xs font-extrabold whitespace-nowrap transition shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {tr(
                    lang,
                    `إنهاء وحفظ الحصة (التالي: ${followingDay})`,
                    `Terminer & Sauver (Suivant: ${followingDay})`,
                    `Finish & Save (Next: ${followingDay})`
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {tr(lang, meta.titleAr, meta.titleFr, meta.titleEn)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(lang, meta.focusAr, meta.focusFr, meta.focusEn)} ·{' '}
                <span className="text-orange-500 font-bold">
                  {tr(
                    lang,
                    `التسلسل المرن: بعد حفظ الحصة ${activeWorkoutDay} تنتقل النوبة تلقائياً إلى الحصة ${followingDay}`,
                    `Rotation : après ${activeWorkoutDay}, la prochaine séance sera ${followingDay}`,
                    `Sequence rotation: saving ${activeWorkoutDay} automatically queues Session ${followingDay} next`
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Clean Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Helper Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRirGuide((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>{tr(lang, 'دليل مقياس الجهد RIR', 'Guide RIR (3/2/1/0)', 'RIR Effort Guide')}</span>
              {showRirGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarmupGuide((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>{tr(lang, 'إحماء مفصلي اختياري (45 ثانية)', 'Échauffement articulaire 45s', 'Optional 45s Joint Warm-Up')}</span>
              {showWarmupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showRirGuide && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div><strong className="text-orange-500">3 RIR:</strong> {tr(lang, 'مريح — تبقّت 3 تكرارات في الاحتياط', 'Modéré — 3 reps en réserve', 'Moderate — 3 reps left')}</div>
              <div><strong className="text-orange-500">2 RIR:</strong> {tr(lang, 'مثالي للتمارين المركبة (تبقّى تكراران)', 'Idéal polyarticulaire', 'Sweet spot — 2 reps left')}</div>
              <div><strong className="text-orange-500">1 RIR:</strong> {tr(lang, 'قوي — تبقّى تكرار واحد فقط', 'Très proche de l’échec', '1 hard rep remaining')}</div>
              <div><strong className="text-orange-500">0 RIR:</strong> {tr(lang, 'أقصى جهد نظيف (للتمارين المعزولة)', 'Échec technique propre', 'Clean technical limit')}</div>
            </div>
          )}

          {showWarmupGuide && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="text-slate-900 dark:text-white block">
                  {tr(lang, 'ثبات تحمية المفاصل الاختياري (Spanish Squat / Wall Sit)', 'Maintien isométrique optionnel', 'Optional Isometric Warm-Up Hold')}
                </strong>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {tr(
                    lang,
                    'تحمية خفيفة لمدة 45 ثانية قبل تمارين الأرجل لتنشيط العضلات وتدفئة المفصل.',
                    'Option d’échauffement avant les jambes si bien tolérée.',
                    'Optional warm-up hold before lower-body exercises.'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold mono-num text-orange-500">{isoSec}s</span>
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
                  className="h-9 px-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold whitespace-nowrap transition cursor-pointer"
                >
                  {isoRunning ? tr(lang, 'إيقاف', 'Pause', 'Pause') : tr(lang, 'بدء 45ث', 'Démarrer 45s', 'Start 45s')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pre / Post Joint Check */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
              <span>{tr(lang, 'انزعاج المفصل قبل الحصة (0–10):', 'Inconfort avant séance (0–10) :', 'Pre-Session Discomfort (0–10):')}</span>
              <span className="mono-num text-orange-500 font-extrabold">{preDiscomfort}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={preDiscomfort}
              onChange={(e) => setPreDiscomfort(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
              <span>{tr(lang, 'انزعاج المفصل بعد الحصة (0–10):', 'Inconfort après séance (0–10) :', 'Post-Session Discomfort (0–10):')}</span>
              <span className="mono-num text-orange-500 font-extrabold">{postDiscomfort}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={postDiscomfort}
              onChange={(e) => setPostDiscomfort(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'ملاحظة الحصة (اختياري):', 'Note de séance :', 'Session Note (optional):')}
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={tr(lang, 'مثال: أداء قوي وتحكم ممتاز', 'Ex: Très bonne séance', 'e.g. Smooth reps & great control')}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Minimalist Exercise Logging Cards with Strict CSS Grid Alignment */}
        <div className="space-y-4">
          {dayExercises.map((ex, index) => {
            const prog = evaluateDoubleProgression(ex, state.workoutLogs);
            return (
              <div
                key={ex.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs"
              >
                {/* Exercise Card Header Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="md:col-span-8 flex items-center gap-3 min-w-0">
                    {/* Dual Reference Photo Preview (Start + Peak) */}
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="grid grid-cols-2 gap-1.5 shrink-0 cursor-pointer"
                      aria-label={trText(lang, ex.name)}
                    >
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                        <ExerciseImage exercise={ex} frameIdx={0} alt={`${trText(lang, ex.name)} 1`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-slate-900/85 text-[9px] font-bold text-white mono-num">
                          1
                        </span>
                      </div>
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                        <ExerciseImage exercise={ex} frameIdx={1} alt={`${trText(lang, ex.name)} 2`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-orange-500/90 text-[9px] font-bold text-white mono-num">
                          2
                        </span>
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-orange-500 mono-num truncate">
                        #{index + 1} · {ex.equipment} · {ex.sets}×{ex.repsLabel} · {ex.rirLabel}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                        {trText(lang, ex.name)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {trText(lang, ex.muscleLabel)}
                      </p>
                    </div>
                  </div>

                  {/* Unified Action Buttons Grid */}
                  <div className="md:col-span-4 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{tr(lang, 'الصور', 'Photos', 'Photos')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSwap(ex.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tr(lang, 'بديل', 'Swap', 'Swap')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartRestTimer(ex.restSec)}
                      className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-extrabold mono-num whitespace-nowrap hover:border-orange-500 transition cursor-pointer"
                    >
                      <Timer className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{ex.restSec}s</span>
                    </button>
                  </div>
                </div>

                {/* Double Progression Cue */}
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                    prog.readyToIncrease
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-300'
                      : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {trText(lang, prog.reason)}
                </div>

                {/* Desktop Column Header Row (Strict 12-Col CSS Grid) */}
                <div className="hidden lg:grid lg:grid-cols-12 items-center gap-2.5 px-3 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div className="lg:col-span-2">{tr(lang, 'المجموعة / النوع', 'Série / Type', 'Set / Type')}</div>
                  <div className="lg:col-span-3 text-center">{tr(lang, 'الوزن (كغ)', 'Charge (kg)', 'Weight (kg)')}</div>
                  <div className="lg:col-span-3 text-center">{tr(lang, 'التكرارات (Reps)', 'Répétitions', 'Reps')}</div>
                  <div className="lg:col-span-2 text-center">
                    {tr(lang, `RIR الفعلي (هدف ${ex.targetRir})`, `RIR Réel (cible ${ex.targetRir})`, `Actual RIR (tgt ${ex.targetRir})`)}
                  </div>
                  <div className="lg:col-span-2 text-end">{tr(lang, 'القوة / الإتمام', 'e1RM / Valider', 'e1RM / Complete')}</div>
                </div>

                {/* Sets List — Strictly Aligned CSS Grid with Left/Start Border Accents */}
                <div className="space-y-2">
                  {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNum) => {
                    const key = `${ex.id}_S${setNum}`;
                    const log = getSetLog(ex, setNum);
                    const e1 = estimateE1RM(log.weight, log.reps);

                    const rowAccentClass = log.done
                      ? 'border-s-4 border-s-orange-500 bg-orange-500/[0.05] dark:bg-orange-500/[0.07] border-slate-200 dark:border-slate-800'
                      : log.isWarmup
                      ? 'border-s-4 border-s-amber-500/80 bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      : 'border-s-4 border-s-slate-400 dark:border-s-slate-600 bg-slate-50/90 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800/90';

                    return (
                      <div
                        key={key}
                        className={`grid grid-cols-1 lg:grid-cols-12 items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-xs transition ${rowAccentClass}`}
                      >
                        {/* 1. Set Badge (S1, S2, S3) + Warmup Toggle */}
                        <div className="lg:col-span-2 grid grid-cols-[2.25rem_1fr_auto] lg:grid-cols-[2.25rem_1fr] items-center gap-2">
                          <span
                            className={`w-9 h-9 rounded-xl font-extrabold mono-num flex items-center justify-center text-xs shrink-0 ${
                              log.done
                                ? 'bg-orange-500 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            S{setNum}
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap select-none">
                            <input
                              type="checkbox"
                              checked={log.isWarmup}
                              onChange={(e) => onUpdateSetLog(key, { ...log, isWarmup: e.target.checked })}
                              className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                            />
                            <span>{tr(lang, 'إحماء', 'Échauf.', 'Warmup')}</span>
                          </label>
                          <span className="lg:hidden text-[11px] font-bold mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            e1RM: {e1}kg
                          </span>
                        </div>

                        {/* Mobile 3-Stepper Grid Wrapper / Desktop Direct Columns */}
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-8 items-center gap-2.5">
                          {/* 2. Weight Stepper (Strict 3-col Grid) */}
                          <div className="sm:col-span-1 lg:col-span-3 space-y-1 lg:space-y-0">
                            <div className="lg:hidden text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">
                              {tr(lang, 'الوزن (كغ)', 'Charge (kg)', 'Weight (kg)')}
                            </div>
                            <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    weight: Math.max(0, Number((log.weight - 1.25).toFixed(2))),
                                  })
                                }
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                                aria-label="Decrease weight"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                value={log.weight}
                                onChange={(e) =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    weight: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-9 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold mono-num text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    weight: Number((log.weight + 1.25).toFixed(2)),
                                  })
                                }
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                                aria-label="Increase weight"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 3. Reps Stepper (Strict 3-col Grid) */}
                          <div className="sm:col-span-1 lg:col-span-3 space-y-1 lg:space-y-0">
                            <div className="lg:hidden text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">
                              {tr(lang, 'التكرارات (Reps)', 'Répétitions', 'Reps')}
                            </div>
                            <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    reps: Math.max(1, log.reps - 1),
                                  })
                                }
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                                aria-label="Decrease reps"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={40}
                                value={log.reps}
                                onChange={(e) =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    reps: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                                className="h-9 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold mono-num text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateSetLog(key, {
                                    ...log,
                                    reps: log.reps + 1,
                                  })
                                }
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                                aria-label="Increase reps"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 4. Actual RIR Stepper (Strict 3-col Grid) */}
                          <div className="sm:col-span-1 lg:col-span-2 space-y-1 lg:space-y-0">
                            <label
                              htmlFor={`${key}_actual_rir`}
                              className="lg:hidden block text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap"
                            >
                              {tr(lang, 'RIR الفعلي', 'RIR réel', 'Actual RIR')} ({ex.targetRir})
                            </label>
                            <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = log.actualRir ?? ex.targetRir;
                                  const next = Math.max(0, Number((current - 0.5).toFixed(1)));
                                  onUpdateSetLog(key, { ...log, actualRir: next, rir: next });
                                }}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
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
                                    onUpdateSetLog(key, { ...log, actualRir: undefined, rir: ex.targetRir });
                                    return;
                                  }
                                  const parsed = Math.max(0, Math.min(10, Number(raw)));
                                  if (!Number.isNaN(parsed)) {
                                    onUpdateSetLog(key, { ...log, actualRir: parsed, rir: parsed });
                                  }
                                }}
                                aria-label={tr(
                                  lang,
                                  `RIR الفعلي للمجموعة ${setNum}`,
                                  `RIR réel série ${setNum}`,
                                  `Actual RIR achieved set ${setNum}`
                                )}
                                className="h-9 w-full min-w-0 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold mono-num text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const current = log.actualRir ?? ex.targetRir;
                                  const next = Math.min(10, Number((current + 0.5).toFixed(1)));
                                  onUpdateSetLog(key, { ...log, actualRir: next, rir: next });
                                }}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                                aria-label={`Increase actual RIR for set ${setNum}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 5. e1RM & Primary Complete Set Button */}
                        <div className="lg:col-span-2 grid grid-cols-[1fr_auto] items-center gap-2">
                          <div className="hidden lg:block text-end text-[11px] mono-num text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {typeof log.actualRir === 'number' && !log.isWarmup ? (
                              <span className="font-bold text-orange-500">
                                {log.actualRir >= ex.targetRir + 2
                                  ? tr(lang, '+وزن', '+Charge', '+Load')
                                  : `${e1}kg`}
                              </span>
                            ) : (
                              <span>{e1}kg</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextDone = !log.done;
                              onUpdateSetLog(key, {
                                ...log,
                                done: nextDone,
                                timestamp: nextDone ? new Date().toISOString() : undefined,
                              });
                              if (nextDone && !log.isWarmup) {
                                onStartRestTimer(ex.restSec);
                              }
                            }}
                            aria-label={log.done ? 'Mark set incomplete' : 'Complete set'}
                            className={`w-full lg:w-auto min-w-[5.75rem] h-9 px-3.5 rounded-xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition active:scale-95 cursor-pointer ${
                              log.done
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-200/90 dark:bg-slate-800 hover:bg-orange-500 hover:text-white text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>{log.done ? tr(lang, 'تم ✓', 'Fait ✓', 'Done ✓') : tr(lang, 'إتمام', 'Valider', 'Complete')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= PROGRAM OVERVIEW MODE =================
  return (
    <div className="space-y-4">
      {/* 1. WORKOUT DELAY & STREAK WARNING BANNER (> 3 DAYS INACTIVITY) */}
      {streakInfo.isDelayed && streakInfo.daysSinceLastWorkout !== null && (
        <div
          role="alert"
          className="rounded-2xl border border-orange-500/40 bg-orange-500/10 dark:bg-orange-500/[0.12] p-4 grid grid-cols-1 md:grid-cols-12 items-center gap-3 shadow-xs"
        >
          <div className="md:col-span-8 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-extrabold uppercase whitespace-nowrap">
                  {tr(lang, 'تنبيه انقطاع التدريب', 'Alerte d’inactivité', 'Training Delay Alert')}
                </span>
                <span className="text-xs font-extrabold mono-num text-orange-600 dark:text-orange-400">
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
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold whitespace-nowrap transition shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>
                {tr(
                  lang,
                  `استأنف الآن: ابدأ الحصة ${nextUpDay}`,
                  `Reprendre : Séance ${nextUpDay}`,
                  `Resume Now: Start Session ${nextUpDay}`
                )}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DASHBOARD PROGRESS & SESSION COUNTERS (4-Col Strict CSS Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Counter 1: Total Completed Sessions */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              {tr(lang, 'إجمالي الحصص المكتملة', 'Total Séances Complétées', 'Completed Sessions')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold mono-num text-slate-900 dark:text-white mt-0.5">
              {streakInfo.totalSessions}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block truncate">
              {streakInfo.totalWorkingSetsAllTime} {tr(lang, 'مجموعة عمل مسجلة', 'séries effectives', 'working sets logged')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Counter 2: Next Session in Dynamic Sequence */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-orange-500 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              {tr(lang, 'الحصة التالية في الدور', 'Prochaine Séance (Séquence)', 'Next in Sequence')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-orange-500 mt-0.5 truncate">
              {tr(lang, `الحصة ${nextUpDay}`, `Séance ${nextUpDay}`, `Session ${nextUpDay}`)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num block truncate">
              A → B → C → D → A
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
        </div>

        {/* Counter 3: Last Workout & Streak Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-slate-500 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              {tr(lang, 'آخر حصة والانتظام', 'Dernière Séance & Série', 'Last Session & Streak')}
            </span>
            <div className="text-base sm:text-lg font-extrabold mono-num text-slate-900 dark:text-white mt-0.5 truncate">
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
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
              {streakInfo.isDelayed
                ? tr(lang, 'تأخر > 3 أيام (بانتظار العودة)', 'Pause > 3 jours', 'Paused > 3 days')
                : tr(lang, `سلسلة منتظمة (${streakInfo.activeStreakCount} حصص)`, `Série active (${streakInfo.activeStreakCount})`, `Active streak (${streakInfo.activeStreakCount})`)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        {/* Counter 4: Daily Readiness Score */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 border-s-4 border-s-slate-500 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              {tr(lang, 'مؤشر الجاهزية اليومي', 'Indice de Forme', 'Readiness Score')}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold mono-num text-slate-900 dark:text-white mt-0.5">
              {readiness.score}/100
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
              {readiness.band === 'high'
                ? tr(lang, 'جاهزية مثالية للتدرج', 'Prêt à progresser', 'Optimal for overload')
                : readiness.band === 'moderate'
                ? tr(lang, 'جاهزية متوازنة', 'Forme équilibrée', 'Balanced readiness')
                : tr(lang, 'ينصح بتخفيف الحمل 10%', 'Alléger de 10%', 'Consider lighter load')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowReadinessSliders((v) => !v)}
            className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:border-orange-500 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap transition cursor-pointer"
          >
            {tr(lang, 'ضبط', 'Ajuster', 'Adjust')}
          </button>
        </div>
      </div>

      {/* Collapsible Readiness & Mode Controls */}
      {showReadinessSliders && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'ساعات النوم', 'Sommeil', 'Sleep')}</span>
              <span className="mono-num text-orange-500">{state.profile.sleepHrs}h</span>
            </label>
            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={state.profile.sleepHrs}
              onChange={(e) => onUpdateProfile({ sleepHrs: Number(e.target.value) })}
              className="w-full accent-orange-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'الإجهاد العام', 'Fatigue', 'Fatigue')}</span>
              <span className="mono-num text-orange-500">{state.profile.fatigueLevel}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={state.profile.fatigueLevel}
              onChange={(e) => onUpdateProfile({ fatigueLevel: Number(e.target.value) })}
              className="w-full accent-orange-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'حساسية الركبة', 'Sensibilité genou', 'Knee Sensitivity')}</span>
              <span className="mono-num text-orange-500">{state.profile.kneeSensitivity}/10</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={state.profile.kneeSensitivity}
              onChange={(e) => onUpdateProfile({ kneeSensitivity: Number(e.target.value) })}
              className="w-full accent-orange-500 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'الكتف / المعصم', 'Épaule / Poignet', 'Shoulder/Wrist')}</span>
              <span className="mono-num text-orange-500">{Math.max(state.profile.shoulderSensitivity, state.profile.wristSensitivity)}/10</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={state.profile.shoulderSensitivity}
              onChange={(e) => onUpdateProfile({ shoulderSensitivity: Number(e.target.value) })}
              className="w-full accent-orange-500 mt-1"
            />
          </div>
        </div>
      )}

      {/* 3. FLEXIBLE SEQUENCE ROTATION CONTROL BAR (A -> B -> C -> D -> A) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {tr(
                  lang,
                  'نظام تدوير الحصص المرن (A → B → C → D → A)',
                  'Rotation Flexible des Séances (A → B → C → D → A)',
                  'Flexible Sequence Rotation (A → B → C → D → A)'
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  lang,
                  'لا حاجة للارتباط بأيام أسبوع ثابتة — يتقدم دور الحصة تلقائياً بعد كل حصة تنهيها مهما كان اليوم.',
                  'Aucun jour fixe obligatoire — la séance suivante avance automatiquement après chaque séance enregistrée.',
                  'No fixed weekday lock — your active session advances automatically in sequence whenever you finish a workout.'
                )}
              </p>
            </div>
          </div>

          {/* Program Mode Switch (Joint-Safe vs Classic) */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => onSetProgramMode('joint_safe')}
              className={`h-8 px-3 rounded-lg font-extrabold whitespace-nowrap transition cursor-pointer ${
                programMode === 'joint_safe'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tr(lang, 'مريح للمفاصل', 'Joint-Safe', 'Joint-Friendly')}
            </button>
            <button
              type="button"
              onClick={() => onSetProgramMode('benchmark')}
              className={`h-8 px-3 rounded-lg font-extrabold whitespace-nowrap transition cursor-pointer ${
                programMode === 'benchmark'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tr(lang, 'كلاسيكي', 'Classique', 'Classic')}
            </button>
          </div>
        </div>

        {/* 4-Session Sequence Launch Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SEQUENCE_ORDER.map((d) => {
            const isNextUp = d === nextUpDay;
            const count = (state.customDayExercises[programMode][d] || []).length;
            return (
              <button
                key={`SEQ_${d}`}
                type="button"
                onClick={() => onStartDay(d)}
                className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-start transition active:scale-[0.99] cursor-pointer ${
                  isNextUp
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-orange-500/60'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                      {tr(lang, `الحصة ${d}`, `Séance ${d}`, `Session ${d}`)}
                    </span>
                    {isNextUp && (
                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px] font-extrabold whitespace-nowrap">
                        {tr(lang, 'الدور الحالي', 'À suivre', 'Next Up')}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isNextUp ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tr(lang, `التسلسل #${SESSION_META[d].seqIndex}`, `Ordre #${SESSION_META[d].seqIndex}`, `Step #${SESSION_META[d].seqIndex}`)} · {count} {tr(lang, 'تمارين', 'exercices', 'exercises')}
                  </div>
                </div>
                <Play className={`w-4 h-4 shrink-0 fill-current ${isNextUp ? 'text-white' : 'text-orange-500'}`} />
              </button>
            );
          })}
        </div>

        {/* Optional Custom Label Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'sequence', label: tr(lang, 'تدوير مرن (A → B → C → D)', 'Séquence Flexible', 'Flexible Sequence') },
                { id: 'mwf', label: tr(lang, 'تسمية إثنين/أربعاء/جمعة', 'Lun / Mer / Ven', 'Mon / Wed / Fri Labels') },
                { id: 'tts', label: tr(lang, 'تسمية ثلاثاء/خميس/سبت', 'Mar / Jeu / Sam', 'Tue / Thu / Sat Labels') },
                { id: 'custom', label: tr(lang, 'تخصيص التسميات', 'Personnaliser', 'Custom Labels') },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSetSchedulePreset(p.id)}
                className={`h-8 px-3 rounded-lg font-bold border whitespace-nowrap transition cursor-pointer ${
                  state.schedulePreset === p.id
                    ? 'bg-slate-900 dark:bg-slate-800 text-white border-orange-500/80'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={state.volumeSettings.includeOptionalDayD}
              onChange={(e) => onToggleOptionalDayD(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
            />
            <span>{tr(lang, 'احتساب الحصة D في الحجم الأسبوعي', 'Inclure Séance D dans le volume', 'Include Session D in Weekly Volume')}</span>
          </label>
        </div>
      </div>

      {/* 4. ALL 4 SESSION CARDS (A, B, C, D) IN UNIFIED GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SEQUENCE_ORDER.map((day) => {
          const dayIds = state.customDayExercises[programMode][day] || [];
          const dayExs = dayIds.map((id) => byId.get(id)).filter((e): e is Exercise => Boolean(e));
          const totalSets = dayExs.reduce((acc, e) => acc + e.sets, 0);
          const meta = SESSION_META[day];
          const isNextUp = day === nextUpDay;

          return (
            <div
              key={day}
              className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3.5 transition ${
                isNextUp
                  ? 'border-orange-500/80 border-s-4 border-s-orange-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 border-s-4 border-s-slate-400 dark:border-s-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold whitespace-nowrap ${
                          isNextUp
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isNextUp
                          ? tr(lang, `الحصة القادمة في الدور · ${day}`, `Prochaine Séance · ${day}`, `Next Up in Sequence · ${day}`)
                          : tr(lang, `التسلسل #${meta.seqIndex} · الحصة ${day}`, `Séquence #${meta.seqIndex} · ${day}`, `Sequence #${meta.seqIndex} · ${day}`)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {state.trainingDaysLabels[day]}
                      </span>
                    </div>

                    {state.schedulePreset === 'custom' ? (
                      <input
                        type="text"
                        value={state.trainingDaysLabels[day]}
                        onChange={(e) => onUpdateDayLabel(day, e.target.value)}
                        className="mt-1.5 block w-full h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      />
                    ) : (
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                        {tr(lang, meta.titleAr, meta.titleFr, meta.titleEn)}
                      </h3>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {tr(lang, meta.focusAr, meta.focusFr, meta.focusEn)}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold mono-num text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
                    {totalSets} {tr(lang, 'مجموعة', 'séries', 'sets')}
                  </span>
                </div>

                {/* Exercise Rows with Reference Photo Thumbnails in Strict Grid */}
                <div className="space-y-1.5">
                  {dayExs.map((ex, idx) => (
                    <div
                      key={`${day}_${ex.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/90 border-s-2 border-s-slate-400 dark:border-s-slate-700 text-xs hover:border-orange-500/50 transition"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="flex items-center gap-2.5 min-w-0 text-start group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                          <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-orange-500 transition">
                            {idx + 1}. {trText(lang, ex.name)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num truncate">
                            {ex.sets}×{ex.repsLabel} · {ex.equipment} · {ex.rirLabel}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSwap(ex.id)}
                        aria-label={`Swap ${trText(lang, ex.name)}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-500 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
                        title={tr(lang, 'استبدال التمرين', 'Remplacer', 'Swap exercise')}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStartDay(day)}
                className={`w-full h-10 px-4 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-2 whitespace-nowrap transition cursor-pointer ${
                  isNextUp
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-900 dark:bg-slate-800 hover:bg-orange-500 text-white border border-slate-800 dark:border-slate-700'
                }`}
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>
                  {isNextUp
                    ? tr(lang, `ابدأ الحصة ${day} (دورك الحالي)`, `Lancer Séance ${day} (À suivre)`, `Start Session ${day} (Next Up)`)
                    : tr(lang, `ابدأ الحصة ${day}`, `Lancer Séance ${day}`, `Start Session ${day}`)}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Non-medical Disclaimer Strip */}
      <div className="rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
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
