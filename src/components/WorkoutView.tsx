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
  Eye,
  Flame,
  Info,
  Minus,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
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

    const progressPct = totalPlannedWorkingSets > 0 ? Math.round((completedWorkingSets / totalPlannedWorkingSets) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Session Top Control Bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExitWorkout}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(lang, 'البرنامج', 'Programme', 'Overview')}</span>
              </button>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {tr(lang, `الحصة ${activeWorkoutDay}`, `Séance ${activeWorkoutDay}`, `Workout Day ${activeWorkoutDay}`)} · {state.trainingDaysLabels[activeWorkoutDay]}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold mono-num text-emerald-700 dark:text-emerald-400">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-500 transition shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{tr(lang, 'إنهاء وحفظ الحصة', 'Terminer & Enregistrer', 'Finish & Save')}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Helper Toggles: RIR Guide + Optional Warmup */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRirGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>{tr(lang, 'دليل الجهد RIR (3/2/1/0)', 'Guide RIR (3/2/1/0)', 'RIR Effort Guide')}</span>
              {showRirGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowWarmupGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tr(lang, 'إحماء مفصلي اختياري + مؤقت 45ث', 'Échauffement articulaire optionnel', 'Optional Joint Warm-Up & 45s Hold')}</span>
              {showWarmupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showRirGuide && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div><strong className="text-emerald-600 dark:text-emerald-400">3 RIR:</strong> {tr(lang, 'متوسط — بداية التدرج', 'Modéré — début de cycle', 'Moderate — 3 reps left')}</div>
              <div><strong className="text-sky-600 dark:text-sky-400">2 RIR:</strong> {tr(lang, 'مثالي للمركبات (Refalo 2023)', 'Idéal polyarticulaire', 'Sweet spot for compounds')}</div>
              <div><strong className="text-amber-600 dark:text-amber-400">1 RIR:</strong> {tr(lang, 'قريب جداً من الفشل', 'Très proche de l’échec', '1 hard rep remaining')}</div>
              <div><strong className="text-rose-600 dark:text-rose-400">0 RIR:</strong> {tr(lang, 'فشل تقني نظيف (للعزل الآمن)', 'Échec technique propre', 'Clean technical failure')}</div>
            </div>
          )}

          {showWarmupGuide && (
            <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 p-3 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong className="text-sky-900 dark:text-sky-200 block">
                    {tr(lang, 'ثبات متساوي الطول اختياري (Spanish Squat / تحمية)', 'Maintien isométrique optionnel (Spanish Squat)', 'Optional Isometric Warm-Up (Spanish Squat)')}
                  </strong>
                  <span className="text-sky-800 dark:text-sky-300 text-[11px]">
                    {tr(
                      lang,
                      'خيار إحمائي رياضي مريح قبل تمارين الأرجل إذا ناسب مفصلك (تثقيف رياضي غير طبي؛ توقف عند أي ألم حاد).',
                      'Option d’échauffement avant les jambes si bien tolérée (éducation sportive, non médicale).',
                      'Optional athletic warm-up hold before lower-body lifts if comfortable (non-medical guidance).'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold mono-num text-sky-900 dark:text-sky-100">{isoSec}s</span>
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
                    className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition"
                  >
                    {isoRunning ? tr(lang, 'إيقاف', 'Pause', 'Pause') : tr(lang, 'بدء 45ث', 'Démarrer 45s', 'Start 45s')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pre / Post Joint Check */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'انزعاج المفصل قبل الحصة (0–10):', 'Inconfort avant séance (0–10) :', 'Pre-Session Joint Discomfort (0–10):')} <span className="mono-num text-emerald-600 dark:text-emerald-400">{preDiscomfort}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={preDiscomfort}
              onChange={(e) => setPreDiscomfort(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'انزعاج المفصل بعد الحصة (0–10):', 'Inconfort après séance (0–10) :', 'Post-Session Joint Discomfort (0–10):')} <span className="mono-num text-amber-600 dark:text-amber-400">{postDiscomfort}</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={postDiscomfort}
              onChange={(e) => setPostDiscomfort(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {tr(lang, 'ملاحظة الجلسة (اختياري):', 'Note de séance :', 'Session Note (optional):')}
            </label>
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={tr(lang, 'مثال: أداء مستقر ومريح', 'Ex: Technique fluide', 'e.g. Smooth knee tracking')}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Exercise Logging Cards */}
        <div className="space-y-4">
          {dayExercises.map((ex, index) => {
            const prog = evaluateDoubleProgression(ex, state.workoutLogs);
            return (
              <div
                key={ex.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-950"
                      aria-label={trText(lang, ex.name)}
                    >
                      <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} />
                    </button>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mono-num">
                        #{index + 1} · {ex.equipment} · {ex.sets}×{ex.repsLabel} · {ex.rirLabel} · {ex.restSec}s
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-emerald-500 border border-transparent"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'الشرح والحركة', 'Guide / 5F', 'Form & Rig')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSwap(ex.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-emerald-500 border border-transparent"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'بديل', 'Swap', 'Swap')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartRestTimer(ex.restSec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-bold mono-num"
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
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
                        className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition ${
                          log.done
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold mono-num flex items-center justify-center">
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
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr(lang, 'كغ', 'kg', 'kg')}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, weight: Math.max(0, Number((log.weight - 1.25).toFixed(2))) })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            aria-label="Increase weight"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Reps Control */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr(lang, 'تكرار', 'Reps', 'Reps')}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateSetLog(key, { ...log, reps: Math.max(1, log.reps - 1) })}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
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
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold transition ${
                              log.done
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{log.done ? tr(lang, 'تم', 'Fait', 'Done') : tr(lang, 'إتمام', 'Valider', 'Log')}</span>
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
    <div className="space-y-4">
      {/* Training Readiness & Daily Check-in */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg mono-num ${
                readiness.band === 'high'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : readiness.band === 'moderate'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              {readiness.score}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                {tr(lang, 'جاهزية التدريب اليومية', 'Préparation à l’entraînement', 'Daily Training Readiness')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {readiness.band === 'high'
                  ? tr(lang, 'جاهزية مرتفعة — يمكنك التدرج بثقة ضمن 1–2 RIR.', 'Bonne fraîcheur — progressez sereinement à 1–2 RIR.', 'High readiness — progress steadily at 1–2 RIR.')
                  : readiness.band === 'moderate'
                  ? tr(lang, 'جاهزية متوسطة — حافظ على جودة الأداء واضبط الأحمال حسب الإحساس.', 'Fraîcheur modérée — privilégiez la propreté technique.', 'Moderate readiness — prioritize clean technique and controlled tempo.')
                  : tr(lang, 'مؤشر إجهاد أو حساسية مرتفعة — فكّر في تخفيف 10–15% مؤقتاً.', 'Fatigue élevée — envisagez d’alléger de 10–15%.', 'Caution — consider a temporary 10–15% load reduction today.')}
              </p>
            </div>
          </div>

          {/* Program Mode Switch */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => onSetProgramMode('joint_safe')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                programMode === 'joint_safe'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tr(lang, 'حماية المفاصل', 'Joint-Safe', 'Joint-Safe')}
            </button>
            <button
              type="button"
              onClick={() => onSetProgramMode('benchmark')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                programMode === 'benchmark'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tr(lang, 'كلاسيكي', 'Classique', 'Standard')}
            </button>
          </div>
        </div>

        {/* Interactive Readiness Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'ساعات النوم', 'Sommeil', 'Sleep')}</span>
              <span className="mono-num text-emerald-600 dark:text-emerald-400">{state.profile.sleepHrs}h</span>
            </label>
            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={state.profile.sleepHrs}
              onChange={(e) => onUpdateProfile({ sleepHrs: Number(e.target.value) })}
              className="w-full accent-emerald-600 mt-1"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 flex justify-between">
              <span>{tr(lang, 'التعب العام', 'Fatigue', 'Fatigue')}</span>
              <span className="mono-num text-amber-600 dark:text-amber-400">{state.profile.fatigueLevel}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={state.profile.fatigueLevel}
              onChange={(e) => onUpdateProfile({ fatigueLevel: Number(e.target.value) })}
              className="w-full accent-amber-500 mt-1"
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
              <span>{tr(lang, 'حساسية الكتف/المعصم', 'Épaule / Poignet', 'Shoulder/Wrist')}</span>
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
      </div>

      {/* Schedule Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-slate-100">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>{tr(lang, 'توزيع الأيام الأسبوعي (3 حصص أساسية)', 'Répartition Hebdomadaire (3 séances)', 'Weekly Schedule (Core 3-Day)')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'mwf', label: tr(lang, 'إثنين / أربعاء / جمعة', 'Lun / Mer / Ven', 'Mon / Wed / Fri') },
              { id: 'tts', label: tr(lang, 'ثلاثاء / خميس / سبت', 'Mar / Jeu / Sam', 'Tue / Thu / Sat') },
              { id: 'custom', label: tr(lang, 'تخصيص حر', 'Personnalisé', 'Custom Days') },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSetSchedulePreset(p.id)}
              className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                state.schedulePreset === p.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Core 3-Day Cards (A, B, C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coreDays.map((day) => {
          const dayIds = state.customDayExercises[programMode][day] || [];
          const dayExs = dayIds.map((id) => byId.get(id)).filter((e): e is Exercise => Boolean(e));
          const totalSets = dayExs.reduce((acc, e) => acc + e.sets, 0);
          return (
            <div
              key={day}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {tr(lang, 'اليوم الأساسي', 'Séance Clé', 'Core Session')} {day}
                    </span>
                    {state.schedulePreset === 'custom' ? (
                      <input
                        type="text"
                        value={state.trainingDaysLabels[day]}
                        onChange={(e) => onUpdateDayLabel(day, e.target.value)}
                        className="mt-1 block w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      />
                    ) : (
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {state.trainingDaysLabels[day]}
                      </h3>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold mono-num text-slate-700 dark:text-slate-300">
                    {totalSets} {tr(lang, 'مجموعة', 'séries', 'sets')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {dayExs.map((ex) => (
                    <div
                      key={`${day}_${ex.id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="min-w-0 text-start flex-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {trText(lang, ex.name)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mono-num">
                          {ex.sets}×{ex.repsLabel} · {ex.equipment}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSwap(ex.id)}
                        aria-label={`Swap ${trText(lang, ex.name)}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-900 transition"
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
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-500 transition shadow-sm"
              >
                <Play className="w-4 h-4" />
                <span>{tr(lang, `ابدأ الحصة ${day}`, `Lancer Séance ${day}`, `Start Workout ${day}`)}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Optional Bonus Day D (Strictly separated from core 3-day split!) */}
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Flame className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'اليوم الإضافي الاختياري D: أذرع، سمانة، وجذع', 'Jour Optionnel D : Bras, Mollets & Gainage', 'Optional Bonus Day D: Arms, Calves & Posterior Core')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  lang,
                  'إضافة اختيارية للراغبين بـ 4 أيام؛ البرنامج الأساسي A/B/C مكتمل بذاته ولا يعتمد على هذا اليوم.',
                  'Séance optionnelle si vous souhaitez un 4e jour ; le socle A/B/C reste complet sans elle.',
                  'Strictly optional 4th session for specialization; your core 3-day A/B/C split stands completely on its own.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={state.volumeSettings.includeOptionalDayD}
                onChange={(e) => onToggleOptionalDayD(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>{tr(lang, 'تضمين في حساب الحجم', 'Compter dans le volume', 'Count in Weekly Volume')}</span>
            </label>
            <button
              type="button"
              onClick={() => onStartDay('D')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>{tr(lang, 'بدء اليوم الاختياري D', 'Lancer Jour D', 'Start Bonus D')}</span>
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
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-start text-xs transition"
              >
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{trText(lang, ex.name)}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mono-num shrink-0">{ex.sets}×{ex.repsLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Non-medical Disclaimer Strip */}
      <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          {tr(
            lang,
            'تنويه رياضي: مؤشرات الجاهزية وتعديلات المفاصل مخصصة لإدارة الأحمال الرياضية ولا تُعد بديلاً عن الاستشارة الطبية أو التشخيص العلاجي.',
            'Information sportive : Les ajustements articulaires guident la gestion de charge et ne constituent pas un diagnostic médical.',
            'Athletic guidance only: readiness scores and joint-friendly substitutions support load management and are not medical diagnosis or treatment.'
          )}
        </span>
      </div>
    </div>
  );
};
