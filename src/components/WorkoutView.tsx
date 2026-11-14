import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Image as ImageIcon,
  Info,
  Minus,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import { tr, trText } from '../engine/i18n';
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

const DAY_THEME: Record<
  WorkoutDayKey,
  {
    badge: string;
    cardBorder: string;
    headerBg: string;
    btnGradient: string;
    titleAr: string;
    titleFr: string;
    titleEn: string;
  }
> = {
  A: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    cardBorder: 'border-orange-200/90 dark:border-orange-900/50',
    headerBg: 'from-orange-500/10 via-rose-500/5 to-transparent',
    btnGradient: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-orange-500/20',
    titleAr: 'الحصة A · شامل ومتوازن 1',
    titleFr: 'Séance A · Full-Body 1',
    titleEn: 'Session A · Full-Body 1',
  },
  B: {
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    cardBorder: 'border-indigo-200/90 dark:border-indigo-900/50',
    headerBg: 'from-indigo-500/10 via-violet-500/5 to-transparent',
    btnGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/20',
    titleAr: 'الحصة B · شامل ومتوازن 2',
    titleFr: 'Séance B · Full-Body 2',
    titleEn: 'Session B · Full-Body 2',
  },
  C: {
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    cardBorder: 'border-sky-200/90 dark:border-sky-900/50',
    headerBg: 'from-sky-500/10 via-cyan-500/5 to-transparent',
    btnGradient: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-sky-500/20',
    titleAr: 'الحصة C · شامل ومتوازن 3',
    titleFr: 'Séance C · Full-Body 3',
    titleEn: 'Session C · Full-Body 3',
  },
  D: {
    badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
    cardBorder: 'border-fuchsia-200/90 dark:border-fuchsia-900/50',
    headerBg: 'from-fuchsia-500/10 via-purple-500/5 to-transparent',
    btnGradient: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 shadow-fuchsia-500/20',
    titleAr: 'الحصة D · إضافية للذراعين والسمانة',
    titleFr: 'Séance D · Bonus Bras & Mollets',
    titleEn: 'Session D · Bonus Arms & Calves',
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
    const theme = DAY_THEME[activeWorkoutDay];

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
        {/* Session Top Control & Instant Day Switcher Bar */}
        <div className={`rounded-3xl border ${theme.cardBorder} bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExitWorkout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(lang, 'كل الحصص', 'Toutes les séances', 'All Sessions')}</span>
              </button>

              {/* Direct Day Switcher Pills */}
              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(['A', 'B', 'C', 'D'] as WorkoutDayKey[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onStartDay(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
                      activeWorkoutDay === d
                        ? `${DAY_THEME[d].btnGradient} text-white shadow-sm`
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tr(lang, `حصة ${d}`, `Jour ${d}`, `Day ${d}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold mono-num text-indigo-600 dark:text-indigo-400">
                {completedWorkingSets}/{totalPlannedWorkingSets} {tr(lang, 'مجموعات', 'séries', 'sets')} ({progressPct}%)
              </span>
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
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-extrabold transition shadow-md ${theme.btnGradient}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{tr(lang, 'إنهاء وحفظ الحصة', 'Terminer & Enregistrer', 'Finish & Save')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {tr(lang, theme.titleAr, theme.titleFr, theme.titleEn)} · {state.trainingDaysLabels[activeWorkoutDay]}
              </h2>
            </div>
          </div>

          {/* Vibrant Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Helper Toggles: RIR Guide + Optional Warmup */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRirGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-900/50 text-xs font-bold"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{tr(lang, 'ما هو مقياس الجهد RIR؟', 'Guide RIR (3/2/1/0)', 'What is RIR?')}</span>
              {showRirGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarmupGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 text-xs font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{tr(lang, 'إحماء مفصلي اختياري (45 ثانية)', 'Échauffement articulaire 45s', 'Optional 45s Joint Warm-Up')}</span>
              {showWarmupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showRirGuide && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div><strong className="text-sky-600 dark:text-sky-400">3 RIR:</strong> {tr(lang, 'مريح — تبقّت 3 تكرارات في الاحتياط', 'Modéré — 3 reps en réserve', 'Moderate — 3 reps left')}</div>
              <div><strong className="text-indigo-600 dark:text-indigo-400">2 RIR:</strong> {tr(lang, 'مثالي للتمارين المركبة (تبقّى تكراران)', 'Idéal polyarticulaire', 'Sweet spot — 2 reps left')}</div>
              <div><strong className="text-orange-600 dark:text-orange-400">1 RIR:</strong> {tr(lang, 'قوي — تبقّى تكرار واحد فقط', 'Très proche de l’échec', '1 hard rep remaining')}</div>
              <div><strong className="text-rose-600 dark:text-rose-400">0 RIR:</strong> {tr(lang, 'أقصى جهد نظيف (للتمارين المعزولة)', 'Échec technique propre', 'Clean technical limit')}</div>
            </div>
          )}

          {showWarmupGuide && (
            <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-3 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-amber-900 dark:text-amber-200 block">
                    {tr(lang, 'ثبات تحمية المفاصل الاختياري (Spanish Squat / Wall Sit)', 'Maintien isométrique optionnel', 'Optional Isometric Warm-Up Hold')}
                  </strong>
                  <span className="text-amber-800 dark:text-amber-300 text-[11px]">
                    {tr(
                      lang,
                      'تحمية خفيفة قبل تمارين الأرجل لتنشيط العضلات وتدفئة المفصل براحة.',
                      'Option d’échauffement avant les jambes si bien tolérée.',
                      'Optional warm-up hold before lower-body exercises.'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold mono-num text-amber-900 dark:text-amber-100">{isoSec}s</span>
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
                    className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-extrabold hover:bg-orange-600 transition shadow-sm"
                  >
                    {isoRunning ? tr(lang, 'إيقاف', 'Pause', 'Pause') : tr(lang, 'بدء 45ث', 'Démarrer 45s', 'Start 45s')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pre / Post Joint Check */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs shadow-sm">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'راحة المفصل قبل الحصة (0–10):', 'Inconfort avant séance (0–10) :', 'Pre-Session Joint Discomfort (0–10):')}{' '}
              <span className="mono-num text-indigo-600 dark:text-indigo-400 font-extrabold">{preDiscomfort}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={preDiscomfort}
              onChange={(e) => setPreDiscomfort(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'بعد الحصة (0–10):', 'Inconfort après séance (0–10) :', 'Post-Session Discomfort (0–10):')}{' '}
              <span className="mono-num text-orange-600 dark:text-orange-400 font-extrabold">{postDiscomfort}</span>
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
              {tr(lang, 'ملاحظة سريعة (اختياري):', 'Note de séance :', 'Session Note (optional):')}
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={tr(lang, 'مثال: أداء سلس وطاقة ممتازة', 'Ex: Très bonne séance', 'e.g. Great energy & form')}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Exercise Logging Cards with Dual Start & Peak Reference Photos */}
        <div className="space-y-4">
          {dayExercises.map((ex, index) => {
            const prog = evaluateDoubleProgression(ex, state.workoutLogs);
            return (
              <div
                key={ex.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Dual Reference Photo Preview (Start + Peak) */}
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="flex items-center gap-1.5 shrink-0 group"
                      aria-label={trText(lang, ex.name)}
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-indigo-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                        <ExerciseImage exercise={ex} frameIdx={0} alt={`${trText(lang, ex.name)} 1`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-indigo-600/90 text-[9px] font-bold text-white">
                          1
                        </span>
                      </div>
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-orange-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                        <ExerciseImage exercise={ex} frameIdx={1} alt={`${trText(lang, ex.name)} 2`} />
                        <span className="absolute bottom-0.5 start-0.5 px-1 rounded bg-orange-500/90 text-[9px] font-bold text-white">
                          2
                        </span>
                      </div>
                    </button>

                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mono-num">
                        #{index + 1} · {ex.equipment} · {ex.sets}×{ex.repsLabel} · {ex.rirLabel}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                        {trText(lang, ex.name)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {trText(lang, ex.muscleLabel)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold hover:bg-indigo-600 hover:text-white transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'الصور والنصائح', 'Photos & Conseils', 'Photos & Tips')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSwap(ex.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-orange-500 hover:text-white transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'بديل', 'Swap', 'Swap')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartRestTimer(ex.restSec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-extrabold mono-num hover:bg-sky-500 hover:text-white transition"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>{ex.restSec}s</span>
                    </button>
                  </div>
                </div>

                {/* Double Progression Cue */}
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-semibold border ${
                    prog.readyToIncrease
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/60 text-orange-800 dark:text-orange-300'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {trText(lang, prog.reason)}
                </div>

                {/* Sets Table */}
                <div className="space-y-2">
                  {Array.from({ length: ex.sets }, (_, i) => i + 1).map((setNum) => {
                    const key = `${ex.id}_S${setNum}`;
                    const log = getSetLog(ex, setNum);
                    const e1 = estimateE1RM(log.weight, log.reps);
                    return (
                      <div
                        key={key}
                        className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl border text-xs transition ${
                          log.done
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-xl font-extrabold mono-num flex items-center justify-center ${
                              log.done
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            S{setNum}
                          </span>
                          <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={log.isWarmup}
                              onChange={(e) => onUpdateSetLog(key, { ...log, isWarmup: e.target.checked })}
                              className="w-3.5 h-3.5 accent-amber-500"
                            />
                            <span>{tr(lang, 'إحماء', 'Échauf.', 'Warmup')}</span>
                          </label>
                        </div>

                        {/* Weight Control */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{tr(lang, 'كغ', 'kg', 'kg')}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, weight: Math.max(0, Number((log.weight - 1.25).toFixed(2))) })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label="Decrease weight"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            value={log.weight}
                            onChange={(e) => onUpdateSetLog(key, { ...log, weight: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-16 text-center py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold mono-num text-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, weight: Number((log.weight + 1.25).toFixed(2)) })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label="Increase weight"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Reps Control */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{tr(lang, 'تكرار', 'Reps', 'Reps')}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, reps: Math.max(1, log.reps - 1) })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label="Decrease reps"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={40}
                            value={log.reps}
                            onChange={(e) => onUpdateSetLog(key, { ...log, reps: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-12 text-center py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold mono-num text-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, reps: log.reps + 1 })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label="Increase reps"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Actual RIR Achieved Control */}
                        <div className="flex items-center gap-1">
                          <label
                            htmlFor={`${key}_actual_rir`}
                            className="text-[11px] font-bold text-slate-600 dark:text-slate-300"
                            title={tr(
                              lang,
                              `الهدف الموصى به: ${ex.targetRir} RIR`,
                              `Cible : ${ex.targetRir} RIR`,
                              `Target: ${ex.targetRir} RIR`
                            )}
                          >
                            {tr(lang, 'RIR الفعلي', 'RIR réel', 'Actual RIR')}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const current = log.actualRir ?? ex.targetRir;
                              const next = Math.max(0, Number((current - 0.5).toFixed(1)));
                              onUpdateSetLog(key, { ...log, actualRir: next, rir: next });
                            }}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label={`Decrease actual RIR for set ${setNum}`}
                          >
                            <Minus className="w-3 h-3" />
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
                            className="w-12 text-center py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold mono-num text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = log.actualRir ?? ex.targetRir;
                              const next = Math.min(10, Number((current + 0.5).toFixed(1)));
                              onUpdateSetLog(key, { ...log, actualRir: next, rir: next });
                            }}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            aria-label={`Increase actual RIR for set ${setNum}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          {typeof log.actualRir === 'number' && !log.isWarmup ? (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold mono-num ${
                                log.actualRir >= ex.targetRir + 2
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : log.actualRir < ex.targetRir - 1
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              }`}
                            >
                              {log.actualRir >= ex.targetRir + 2
                                ? tr(lang, `+وزن؟`, `+Charge?`, `Light (+${(log.actualRir - ex.targetRir).toFixed(1).replace(/\.0$/, '')})`)
                                : log.actualRir < ex.targetRir - 1
                                ? tr(lang, `مجهد`, `Très dur`, `Heavy`)
                                : tr(lang, `مضبوط`, `Calibré`, `On Target`)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mono-num">
                              ({tr(lang, 'هدف', 'Cible', 'Tgt')} {ex.targetRir})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] mono-num text-slate-500 dark:text-slate-400">
                            e1RM: {e1}kg
                          </span>
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
                            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl font-extrabold transition ${
                              log.done
                                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-orange-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{log.done ? tr(lang, 'تم ✓', 'Fait ✓', 'Done ✓') : tr(lang, 'إتمام', 'Valider', 'Log')}</span>
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
  const coreDays: WorkoutDayKey[] = ['A', 'B', 'C'];

  return (
    <div className="space-y-5">
      {/* Quick-Start Session Bar + Readiness & Program Mode */}
      <div className="rounded-3xl border border-orange-200/80 dark:border-slate-800 bg-gradient-to-br from-orange-50/70 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg mono-num shadow-sm ${
                readiness.band === 'high'
                  ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white'
                  : readiness.band === 'moderate'
                  ? 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white'
                  : 'bg-gradient-to-br from-amber-500 to-rose-500 text-white'
              }`}
            >
              {readiness.score}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" />
                {tr(lang, 'اختر حصتك وابدأ التمرين بضغطة واحدة', 'Choisissez votre séance et démarrez', 'Pick Your Session & Start Training')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {readiness.band === 'high'
                  ? tr(lang, 'جاهزيتك اليوم ممتازة — استمتع بتمرينك وتدرّج بالأوزان بثقة!', 'Excellente forme aujourd’hui — bonne séance !', 'Great readiness today — enjoy your workout and progress steadily!')
                  : readiness.band === 'moderate'
                  ? tr(lang, 'جاهزية متوازنة — ركّز على الأداء النظيف والصور المرجعية.', 'Forme équilibrée — concentrez-vous sur la technique.', 'Balanced readiness — focus on smooth, controlled reps.')
                  : tr(lang, 'يبدو أنك مرهق قليلاً — يمكنك تخفيف الأوزان 10–15% اليوم لراحة المفاصل.', 'Fatigue détectée — allégez de 10–15% si besoin.', 'Higher fatigue — consider a lighter session today.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Program Mode Switch */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => onSetProgramMode('joint_safe')}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                  programMode === 'joint_safe'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tr(lang, 'مريح للمفاصل', 'Joint-Safe', 'Joint-Friendly')}
              </button>
              <button
                type="button"
                onClick={() => onSetProgramMode('benchmark')}
                className={`px-3 py-1.5 rounded-lg font-extrabold transition ${
                  programMode === 'benchmark'
                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {tr(lang, 'كلاسيكي', 'Classique', 'Classic')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowReadinessSliders((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>{tr(lang, 'ضبط النوم والمفاصل', 'Ajuster forme', 'Adjust Readiness')}</span>
              {showReadinessSliders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Instant 1-Tap Session Launch Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(['A', 'B', 'C', 'D'] as WorkoutDayKey[]).map((d) => {
            const t = DAY_THEME[d];
            const count = (state.customDayExercises[programMode][d] || []).length;
            return (
              <button
                key={`QUICK_${d}`}
                type="button"
                onClick={() => onStartDay(d)}
                className={`flex items-center justify-between gap-2 p-3 rounded-2xl text-white font-extrabold text-xs shadow-md transition active:scale-[0.99] ${t.btnGradient}`}
              >
                <div className="text-start">
                  <div className="text-sm font-extrabold">
                    {tr(lang, `ابدأ الحصة ${d}`, `Séance ${d}`, `Start Day ${d}`)}
                  </div>
                  <div className="text-[11px] opacity-90">
                    {state.trainingDaysLabels[d]} · {count} {tr(lang, 'تمارين', 'exercices', 'exercises')}
                  </div>
                </div>
                <Play className="w-4 h-4 shrink-0 fill-current" />
              </button>
            );
          })}
        </div>

        {/* Collapsible Readiness Sliders (keeps interface clean and uncluttered!) */}
        {showReadinessSliders && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>{tr(lang, 'ساعات النوم', 'Sommeil', 'Sleep')}</span>
                <span className="mono-num text-indigo-600 dark:text-indigo-400">{state.profile.sleepHrs}h</span>
              </label>
              <input
                type="range"
                min={4}
                max={10}
                step={0.5}
                value={state.profile.sleepHrs}
                onChange={(e) => onUpdateProfile({ sleepHrs: Number(e.target.value) })}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>{tr(lang, 'الإجهاد العام', 'Fatigue', 'Fatigue')}</span>
                <span className="mono-num text-orange-600 dark:text-orange-400">{state.profile.fatigueLevel}/10</span>
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
                <span className="mono-num text-sky-600 dark:text-sky-400">{state.profile.kneeSensitivity}/10</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={state.profile.kneeSensitivity}
                onChange={(e) => onUpdateProfile({ kneeSensitivity: Number(e.target.value) })}
                className="w-full accent-sky-500 mt-1"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>{tr(lang, 'الكتف / المعصم', 'Épaule / Poignet', 'Shoulder/Wrist')}</span>
                <span className="mono-num text-sky-600 dark:text-sky-400">{Math.max(state.profile.shoulderSensitivity, state.profile.wristSensitivity)}/10</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={state.profile.shoulderSensitivity}
                onChange={(e) => onUpdateProfile({ shoulderSensitivity: Number(e.target.value) })}
                className="w-full accent-sky-500 mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedule Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-slate-100">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span>{tr(lang, 'جدول أيام التدريب الأسبوعي (3 حصص أساسية)', 'Planning Hebdomadaire (3 séances)', 'Weekly Training Schedule (3 Core Days)')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'mwf', label: tr(lang, 'إثنين / أربعاء / جمعة', 'Lun / Mer / Ven', 'Mon / Wed / Fri') },
              { id: 'tts', label: tr(lang, 'ثلاثاء / خميس / سبت', 'Mar / Jeu / Sam', 'Tue / Thu / Sat') },
              { id: 'custom', label: tr(lang, 'تخصيص الأيام', 'Personnalisé', 'Custom Days') },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSetSchedulePreset(p.id)}
              className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                state.schedulePreset === p.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Core 3-Day Cards (A, B, C) with Exercise Photo Thumbnails */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coreDays.map((day) => {
          const dayIds = state.customDayExercises[programMode][day] || [];
          const dayExs = dayIds.map((id) => byId.get(id)).filter((e): e is Exercise => Boolean(e));
          const totalSets = dayExs.reduce((acc, e) => acc + e.sets, 0);
          const theme = DAY_THEME[day];

          return (
            <div
              key={day}
              className={`rounded-3xl border ${theme.cardBorder} bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3.5 shadow-sm hover:shadow-md transition`}
            >
              <div className="space-y-3">
                <div className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-gradient-to-r ${theme.headerBg}`}>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold ${theme.badge}`}>
                      {tr(lang, `الحصة الأساسية ${day}`, `Séance Clé ${day}`, `Core Session ${day}`)}
                    </span>
                    {state.schedulePreset === 'custom' ? (
                      <input
                        type="text"
                        value={state.trainingDaysLabels[day]}
                        onChange={(e) => onUpdateDayLabel(day, e.target.value)}
                        className="mt-1 block w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    ) : (
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                        {state.trainingDaysLabels[day]}
                      </h3>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold mono-num text-slate-700 dark:text-slate-200">
                    {totalSets} {tr(lang, 'مجموعة', 'séries', 'sets')}
                  </span>
                </div>

                {/* Exercise Rows with Reference Photo Thumbnails */}
                <div className="space-y-2">
                  {dayExs.map((ex) => (
                    <div
                      key={`${day}_${ex.id}`}
                      className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="flex items-center gap-2.5 min-w-0 text-start flex-1 group"
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                          <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {trText(lang, ex.name)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num">
                            {ex.sets}×{ex.repsLabel} · {ex.equipment}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSwap(ex.id)}
                        aria-label={`Swap ${trText(lang, ex.name)}`}
                        className="p-2 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-white dark:hover:bg-slate-900 transition"
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
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white text-xs font-extrabold transition shadow-md ${theme.btnGradient}`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{tr(lang, `ابدأ الحصة ${day} الآن`, `Lancer Séance ${day}`, `Start Workout ${day}`)}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Optional Bonus Day D */}
      <div className="rounded-3xl border border-fuchsia-200 dark:border-fuchsia-900/50 bg-gradient-to-r from-fuchsia-50/60 via-white to-purple-50/60 dark:from-slate-900 dark:to-slate-900 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Flame className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'الحصة الإضافية الاختيارية D: ذراعين، سمانة، وجذع', 'Séance Optionnelle D : Bras, Mollets & Gainage', 'Optional Bonus Day D: Arms, Calves & Core')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {tr(
                  lang,
                  'حصة رابعة خفيفة وممتعة لمن يرغب بتركيز إضافي؛ جدولك الأساسي (A/B/C) متكامل تماماً بدونها.',
                  'Séance optionnelle si vous souhaitez un 4e jour ; le socle A/B/C reste complet sans elle.',
                  'Optional 4th session for extra arm and calf focus; your 3-day A/B/C split is complete on its own.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={state.volumeSettings.includeOptionalDayD}
                onChange={(e) => onToggleOptionalDayD(e.target.checked)}
                className="w-4 h-4 accent-fuchsia-600 rounded"
              />
              <span>{tr(lang, 'احتساب ضمن الحجم الأسبوعي', 'Compter dans le volume', 'Count in Weekly Volume')}</span>
            </label>
            <button
              type="button"
              onClick={() => onStartDay('D')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-extrabold hover:from-fuchsia-500 hover:to-purple-500 transition shadow-sm"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>{tr(lang, 'بدء الحصة D', 'Lancer Jour D', 'Start Bonus D')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(state.customDayExercises[programMode].D || []).map((exId) => {
            const ex = byId.get(exId);
            if (!ex) return null;
            return (
              <button
                key={`D_${ex.id}`}
                type="button"
                onClick={() => onOpenExercise(ex.id)}
                className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-fuchsia-100 dark:border-slate-800 hover:border-fuchsia-400 text-start text-xs transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                    <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{trText(lang, ex.name)}</span>
                </div>
                <span className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300 font-bold mono-num shrink-0">{ex.sets}×{ex.repsLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Non-medical Disclaimer Strip */}
      <div className="rounded-2xl bg-amber-50/70 dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 p-3 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
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
