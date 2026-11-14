import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Dumbbell,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Sun,
  Timer,
  TrendingUp,
  Utensils,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { ExercisesView } from './components/ExercisesView';
import {
  ExerciseDetailModal,
  PhotoLightboxModal,
  SubstitutionModal,
} from './components/Modals';
import { NutritionView } from './components/NutritionView';
import { ProgressView } from './components/ProgressView';
import { WorkoutView } from './components/WorkoutView';
import { EXERCISES_DB } from './data/exercises';
import { tr } from './engine/i18n';
import { loadSavedState, saveAppState } from './engine/storage';
import { computeWeeklyVolume } from './engine/volume';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  AppState,
  CoachRecommendation,
  DaySchedulePreset,
  Lang,
  MainTab,
  WorkoutDayKey,
} from './types/app';

function playTimerChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context block before user gesture
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadSavedState());
  const [detailExId, setDetailExId] = useState<string | null>(null);
  const [lightboxExId, setLightboxExId] = useState<string | null>(null);
  const [swapSourceExId, setSwapSourceExId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Sync <html lang dir class="dark|light"> & save to localStorage
  useEffect(() => {
    saveAppState(state);
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state]);

  // Timestamp-resilient Rest Timer
  useEffect(() => {
    if (!state.timer.running || !state.timer.endMs) return;

    const syncTimer = () => {
      const endMs = state.timer.endMs;
      if (!endMs) return;
      const rem = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      if (rem <= 0) {
        if (state.timer.audioEnabled) playTimerChime();
        if (state.timer.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([180, 90, 180]);
        }
        setState((prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            running: false,
            endMs: null,
            remainingSec: prev.timer.durationSec,
          },
        }));
        showToast(tr(state.lang, 'انتهت فترة الراحة — جاهز للمجموعة التالية!', 'Temps de repos terminé !', 'Rest complete — ready for your next set!'));
      } else if (rem !== state.timer.remainingSec) {
        setState((prev) => ({
          ...prev,
          timer: { ...prev.timer, remainingSec: rem },
        }));
      }
    };

    const interval = window.setInterval(syncTimer, 250);
    const onVis = () => {
      if (document.visibilityState === 'visible') syncTimer();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state.timer.running, state.timer.endMs, state.timer.audioEnabled, state.timer.hapticsEnabled, state.timer.remainingSec, state.lang, showToast]);

  const startRestTimer = useCallback((seconds: number) => {
    const dur = Math.max(15, Math.min(600, Math.round(seconds)));
    setState((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        durationSec: dur,
        remainingSec: dur,
        endMs: Date.now() + dur * 1000,
        running: true,
      },
    }));
  }, []);

  const toggleRestTimer = () => {
    setState((prev) => {
      if (prev.timer.running) {
        const rem = prev.timer.endMs ? Math.max(0, Math.ceil((prev.timer.endMs - Date.now()) / 1000)) : prev.timer.remainingSec;
        return {
          ...prev,
          timer: { ...prev.timer, running: false, endMs: null, remainingSec: rem },
        };
      }
      const rem = prev.timer.remainingSec > 0 ? prev.timer.remainingSec : prev.timer.durationSec;
      return {
        ...prev,
        timer: { ...prev.timer, running: true, endMs: Date.now() + rem * 1000, remainingSec: rem },
      };
    });
  };

  const resetRestTimer = () => {
    setState((prev) => ({
      ...prev,
      timer: {
        ...prev.timer,
        running: false,
        endMs: null,
        remainingSec: prev.timer.durationSec,
      },
    }));
  };

  const volumeMap = useMemo(() => computeWeeklyVolume(state, EXERCISES_DB), [state]);

  const setSchedulePreset = (preset: DaySchedulePreset) => {
    const labels: Record<WorkoutDayKey, string> =
      preset === 'mwf'
        ? { A: 'Mon / الإثنين', B: 'Wed / الأربعاء', C: 'Fri / الجمعة', D: 'Optional / اختياري' }
        : preset === 'tts'
        ? { A: 'Tue / الثلاثاء', B: 'Thu / الخميس', C: 'Sat / السبت', D: 'Optional / اختياري' }
        : { ...state.trainingDaysLabels };

    setState((prev) => ({
      ...prev,
      schedulePreset: preset,
      trainingDaysLabels: labels,
    }));
  };

  const handleToggleFavorite = (exId: string) => {
    setState((prev) => {
      const exists = prev.favoriteExercises.includes(exId);
      return {
        ...prev,
        favoriteExercises: exists
          ? prev.favoriteExercises.filter((id) => id !== exId)
          : [...prev.favoriteExercises, exId],
      };
    });
  };

  const handleSwapExercise = (oldId: string, newId: string) => {
    setState((prev) => {
      const mode = prev.programMode;
      const days = prev.customDayExercises[mode];
      const updatedDays = {
        A: days.A.map((id) => (id === oldId ? newId : id)),
        B: days.B.map((id) => (id === oldId ? newId : id)),
        C: days.C.map((id) => (id === oldId ? newId : id)),
        D: days.D.map((id) => (id === oldId ? newId : id)),
      };
      return {
        ...prev,
        customDayExercises: {
          ...prev.customDayExercises,
          [mode]: updatedDays,
        },
      };
    });
    showToast(tr(state.lang, 'تم استبدال التمرين في برنامجك.', 'Exercice remplacé dans votre programme.', 'Exercise swapped in your active split.'));
  };

  const handleApplyCoachAction = (actionType: NonNullable<CoachRecommendation['actionType']>) => {
    if (actionType === 'deload_15') {
      setState((prev) => {
        const nextLogs = { ...prev.workoutLogs };
        for (const [k, log] of Object.entries(nextLogs)) {
          nextLogs[k] = {
            ...log,
            weight: Math.max(0, Number((log.weight * 0.85).toFixed(1))),
            done: false,
          };
        }
        return {
          ...prev,
          workoutLogs: nextLogs,
        };
      });
      showToast(tr(state.lang, 'تم تطبيق تخفيف 15% على الأحمال المسجلة بناءً على موافقتك.', 'Allègement de 15% appliqué sur vos charges.', 'Approved 15% load reduction applied to logged weights.'));
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const navItems: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: tr(state.lang, 'حصتي', 'Séance', 'Workout'), icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'exercises', label: tr(state.lang, 'التمارين', 'Exercices', 'Exercises'), icon: <Activity className="w-4 h-4" /> },
    { id: 'nutrition', label: tr(state.lang, 'التغذية', 'Nutrition', 'Nutrition'), icon: <Utensils className="w-4 h-4" /> },
    { id: 'progress', label: tr(state.lang, 'تقدمي', 'Progrès', 'Progress'), icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const detailEx = detailExId ? EXERCISES_DB.find((e) => e.id === detailExId) || null : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      {/* Compact Sticky Top Bar (< 64px to stay comfortably below mobile sticky chrome cap) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-xs sm:text-sm font-extrabold truncate">
                <span className="sm:hidden">{tr(state.lang, 'بناء العضلات', 'Hypertrophie', 'Hypertrophy')}</span>
                <span className="hidden sm:inline">{tr(state.lang, 'نظام البناء وصحة المفاصل', 'Hypertrophie & Articulations', 'Hypertrophy & Joint OS')}</span>
              </h1>
              <span className="hidden sm:block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {tr(state.lang, 'بناء عضلي مبني على الأدلة · A/B/C', 'Basé sur la science · Split A/B/C', 'Evidence-Based · 3-Day Core Split')}
              </span>
            </div>
          </div>

          {/* Desktop 4-Tab Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800" aria-label="Main Navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mainTab: item.id }))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  state.mainTab === item.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Compact Utility Cluster: Rest Timer + Lang + Theme + Install */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Rest Timer Pill */}
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <Timer className={`w-3.5 h-3.5 ${state.timer.running ? 'text-emerald-500' : 'text-slate-500'}`} />
              <span className="font-mono font-extrabold tabular-nums w-10 text-center">
                {formatSec(state.timer.remainingSec)}
              </span>
              <button
                type="button"
                onClick={toggleRestTimer}
                aria-label={state.timer.running ? 'Pause Rest Timer' : 'Start Rest Timer'}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
              >
                {state.timer.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={resetRestTimer}
                aria-label="Reset Rest Timer"
                className="hidden sm:inline-flex p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    timer: { ...prev.timer, audioEnabled: !prev.timer.audioEnabled },
                  }))
                }
                aria-label={state.timer.audioEnabled ? 'Mute Timer' : 'Unmute Timer'}
                className="hidden sm:inline-flex p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500"
              >
                {state.timer.audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>
            </div>

            {/* Language Cycle / Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 text-[11px] font-extrabold">
              {(['ar', 'fr', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, lang: l }))}
                  className={`px-1.5 sm:px-2 py-1 rounded-lg uppercase transition ${
                    state.lang === l
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
              }
              aria-label={state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition"
            >
              {state.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => void install()}
                aria-label="Install PWA"
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{tr(state.lang, 'تثبيت', 'Installer', 'Install')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 no-print">
          <WifiOff className="w-3.5 h-3.5" />
          <span>
            {tr(
              state.lang,
              'أنت تعمل الآن دون إنترنت — بياناتك محفوظة محلياً بأمان.',
              'Mode hors ligne actif — vos données sont sauvegardées localement.',
              'Offline mode active — your workout & nutrition data stays saved locally.'
            )}
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {state.mainTab === 'home' && (
          <WorkoutView
            state={state}
            exercises={EXERCISES_DB}
            onStartDay={(day) => setState((prev) => ({ ...prev, activeWorkoutDay: day }))}
            onExitWorkout={() => setState((prev) => ({ ...prev, activeWorkoutDay: null }))}
            onSetProgramMode={(mode) => setState((prev) => ({ ...prev, programMode: mode }))}
            onSetSchedulePreset={setSchedulePreset}
            onUpdateDayLabel={(day, label) =>
              setState((prev) => ({
                ...prev,
                trainingDaysLabels: { ...prev.trainingDaysLabels, [day]: label },
              }))
            }
            onUpdateProfile={(patch) =>
              setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))
            }
            onToggleOptionalDayD={(enabled) =>
              setState((prev) => ({
                ...prev,
                volumeSettings: { ...prev.volumeSettings, includeOptionalDayD: enabled },
              }))
            }
            onUpdateSetLog={(key, log) =>
              setState((prev) => ({
                ...prev,
                workoutLogs: { ...prev.workoutLogs, [key]: log },
              }))
            }
            onStartRestTimer={startRestTimer}
            onFinishSession={(payload) => {
              const today = new Date().toISOString().slice(0, 10);
              setState((prev) => {
                const nextE1rm = { ...prev.e1rmHistory };
                for (const [exId, val] of Object.entries(payload.e1rmUpdates)) {
                  const arr = nextE1rm[exId] ? [...nextE1rm[exId]] : [];
                  arr.push({ date: today, value: val });
                  nextE1rm[exId] = arr;
                }
                return {
                  ...prev,
                  activeWorkoutDay: null,
                  sessionHistory: [
                    ...prev.sessionHistory,
                    {
                      id: `SES_${Date.now()}`,
                      date: today,
                      day: payload.day,
                      totalWorkingSets: payload.totalWorkingSets,
                      totalVolumeKg: payload.totalVolumeKg,
                      preJointDiscomfort: payload.preJointDiscomfort,
                      postJointDiscomfort: payload.postJointDiscomfort,
                      sessionNotes: payload.sessionNotes,
                    },
                  ],
                  jointResponseLogs: [
                    ...prev.jointResponseLogs,
                    {
                      date: today,
                      preDiscomfort: payload.preJointDiscomfort,
                      postDiscomfort: payload.postJointDiscomfort,
                      nextDayDiscomfort: payload.postJointDiscomfort,
                      performanceQuality: 4,
                      functionalNote: payload.sessionNotes || `Workout Day ${payload.day}`,
                    },
                  ],
                  e1rmHistory: nextE1rm,
                };
              });
              showToast(
                tr(
                  state.lang,
                  `تم حفظ الحصة ${payload.day}: ${payload.totalWorkingSets} مجموعات عمل (${payload.totalVolumeKg} كغ)!`,
                  `Séance ${payload.day} enregistrée : ${payload.totalWorkingSets} séries (${payload.totalVolumeKg} kg) !`,
                  `Saved Workout ${payload.day}: ${payload.totalWorkingSets} working sets (${payload.totalVolumeKg} kg)!`
                )
              );
            }}
            onOpenExercise={(exId) => setDetailExId(exId)}
            onOpenSwap={(exId) => setSwapSourceExId(exId)}
          />
        )}

        {state.mainTab === 'exercises' && (
          <ExercisesView
            state={state}
            exercises={EXERCISES_DB}
            volumeMap={volumeMap}
            onSetExSubTab={(tab) => setState((prev) => ({ ...prev, exSubTab: tab }))}
            onSetSearch={(q) => setState((prev) => ({ ...prev, searchQuery: q }))}
            onSetMuscleFilter={(m) => setState((prev) => ({ ...prev, muscleFilter: m }))}
            onSetEquipmentFilter={(eq) => setState((prev) => ({ ...prev, equipmentFilter: eq }))}
            onSetDifficultyFilter={(diff) => setState((prev) => ({ ...prev, difficultyFilter: diff }))}
            onToggleFavoritesOnly={() =>
              setState((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))
            }
            onToggleFavorite={handleToggleFavorite}
            onSelectMuscle={(key) => setState((prev) => ({ ...prev, selectedMuscleKey: key }))}
            onUpdateVolumeSettings={(patch) =>
              setState((prev) => ({
                ...prev,
                volumeSettings: { ...prev.volumeSettings, ...patch },
              }))
            }
            onSetCompareIds={(ids) => setState((prev) => ({ ...prev, compareIds: ids }))}
            onOpenExercise={(exId) => setDetailExId(exId)}
            onOpenLightbox={(exId) => setLightboxExId(exId)}
          />
        )}

        {state.mainTab === 'nutrition' && (
          <NutritionView
            state={state}
            onSetNutriSubTab={(tab) => setState((prev) => ({ ...prev, nutriSubTab: tab }))}
            onUpdateProfile={(patch) =>
              setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))
            }
            onSetMealPreset={(preset) => setState((prev) => ({ ...prev, activeMealPreset: preset }))}
            onUpdateMeals={(preset, meals) =>
              setState((prev) => ({
                ...prev,
                customMeals: { ...prev.customMeals, [preset]: meals },
              }))
            }
          />
        )}

        {state.mainTab === 'progress' && (
          <ProgressView
            state={state}
            exercises={EXERCISES_DB}
            volumeMap={volumeMap}
            onSetProgSubTab={(tab) => setState((prev) => ({ ...prev, progSubTab: tab }))}
            onAddMeasurement={(m) =>
              setState((prev) => ({
                ...prev,
                measurements: [...prev.measurements, m],
                profile: { ...prev.profile, weightKg: m.weight },
              }))
            }
            onAddJointLog={(j) =>
              setState((prev) => ({
                ...prev,
                jointResponseLogs: [...prev.jointResponseLogs, j],
              }))
            }
            onApplyCoachAction={handleApplyCoachAction}
            onImportState={(nextState) => setState(nextState)}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom 4-Tab Bar (compact ~56px, one-thumb reachability) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 no-print"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const active = state.mainTab === item.id;
          return (
            <button
              key={`MOB_${item.id}`}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, mainTab: item.id }))}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <ExerciseDetailModal
        exercise={detailEx}
        lang={state.lang}
        isFavorite={detailEx ? state.favoriteExercises.includes(detailEx.id) : false}
        onClose={() => setDetailExId(null)}
        onToggleFavorite={handleToggleFavorite}
        onOpenLightbox={(exId) => setLightboxExId(exId)}
        onOpenSwap={(exId) => {
          setDetailExId(null);
          setSwapSourceExId(exId);
        }}
      />

      <PhotoLightboxModal
        exercises={EXERCISES_DB}
        currentExerciseId={lightboxExId}
        lang={state.lang}
        onSelectExerciseId={(id) => setLightboxExId(id)}
        onClose={() => setLightboxExId(null)}
      />

      <SubstitutionModal
        sourceExerciseId={swapSourceExId}
        exercises={EXERCISES_DB}
        lang={state.lang}
        onSwap={handleSwapExercise}
        onClose={() => setSwapSourceExId(null)}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-extrabold shadow-xl border border-slate-700 dark:border-emerald-500 max-w-[90vw] text-center"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
