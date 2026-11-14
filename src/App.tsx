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

  const navItems: {
    id: MainTab;
    step: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    activeGrad: string;
    mobileText: string;
    softCard: string;
  }[] = [
    {
      id: 'home',
      step: '1',
      label: tr(state.lang, 'حصتي التدريبية', 'Ma Séance', 'My Workout'),
      subtitle: tr(state.lang, 'الأيام A / B / C وتسجيل المجموعات', 'Séances A/B/C & suivi', 'Sessions A/B/C & Set Logger'),
      icon: <Dumbbell className="w-4 h-4" />,
      activeGrad: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25',
      mobileText: 'text-orange-600 dark:text-orange-400',
      softCard: 'border-orange-200/80 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200',
    },
    {
      id: 'exercises',
      step: '2',
      label: tr(state.lang, 'التمارين بالصور', 'Photos & Exercices', 'Exercise Photos'),
      subtitle: tr(state.lang, '32 تمريناً بالصور وخريطة العضلات', '32 exercices illustrés & carte', '32 Photo Guides & Muscle Map'),
      icon: <Activity className="w-4 h-4" />,
      activeGrad: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25',
      mobileText: 'text-indigo-600 dark:text-indigo-400',
      softCard: 'border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200',
    },
    {
      id: 'nutrition',
      step: '3',
      label: tr(state.lang, 'التغذية والوجبات', 'Nutrition & Repas', 'Meals & Macros'),
      subtitle: tr(state.lang, 'حاسبة السعرات والوجبات والتسوق', 'Calories, repas & courses', 'Calculator, Meals & Grocery'),
      icon: <Utensils className="w-4 h-4" />,
      activeGrad: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
      mobileText: 'text-amber-600 dark:text-amber-400',
      softCard: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
    },
    {
      id: 'progress',
      step: '4',
      label: tr(state.lang, 'تقدمي والمدرب', 'Progrès & Coach', 'Progress & Coach'),
      subtitle: tr(state.lang, 'تطور القوة والقياسات والنسخ الاحتياطي', 'Force e1RM, coach & sauvegarde', 'Strength Curve, Coach & Backup'),
      icon: <TrendingUp className="w-4 h-4" />,
      activeGrad: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25',
      mobileText: 'text-sky-600 dark:text-sky-400',
      softCard: 'border-sky-200/80 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200',
    },
  ];

  const detailEx = detailExId ? EXERCISES_DB.find((e) => e.id === detailExId) || null : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 via-slate-50 to-indigo-50/30 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors">
      {/* Compact Sticky Top Bar (< 64px to stay comfortably below mobile sticky chrome cap) */}
      <header className="sticky top-0 z-40 border-b border-indigo-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-xs sm:text-sm font-extrabold truncate text-slate-900 dark:text-white">
                <span className="sm:hidden">{tr(state.lang, 'بناء العضلات', 'Hypertrophie', 'Hypertrophy')}</span>
                <span className="hidden sm:inline">{tr(state.lang, 'منظومة البناء العضلي والتغذية', 'Hypertrophie & Nutrition', 'Hypertrophy & Nutrition OS')}</span>
              </h1>
            </div>
          </div>

          {/* Desktop 4-Tab Nav */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800" aria-label="Main Navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mainTab: item.id }))}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 ${
                  state.mainTab === item.id
                    ? item.activeGrad
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
            {/* Rest Timer Control */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50/90 dark:bg-slate-950 border border-indigo-200/80 dark:border-slate-800 text-xs">
              <Timer className={`w-3.5 h-3.5 ${state.timer.running ? 'text-orange-500' : 'text-indigo-500'}`} />
              <span className="font-mono font-extrabold tabular-nums w-10 text-center text-slate-900 dark:text-white">
                {formatSec(state.timer.remainingSec)}
              </span>
              <button
                type="button"
                onClick={toggleRestTimer}
                aria-label={state.timer.running ? 'Pause Rest Timer' : 'Start Rest Timer'}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-orange-600 dark:text-orange-400"
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

            {/* Language Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 text-[11px] font-extrabold">
              {(['ar', 'fr', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, lang: l }))}
                  className={`px-1.5 sm:px-2 py-1 rounded-lg uppercase transition ${
                    state.lang === l
                      ? 'bg-indigo-600 text-white shadow-xs'
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
              className="p-2 rounded-xl bg-amber-50 dark:bg-slate-950 border border-amber-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:border-orange-500 transition"
            >
              {state.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => void install()}
                aria-label="Install PWA"
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:from-indigo-500 hover:to-violet-500 transition shadow-sm"
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
      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-4 space-y-4">
        {/* Clear 4-Section Quick Switcher Cards (Makes navigation obvious & effortless on all devices) */}
        <section
          aria-label={tr(state.lang, 'أقسام التطبيق الرئيسية', 'Sections principales', 'Main Sections')}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 no-print"
        >
          {navItems.map((item) => {
            const isActive = state.mainTab === item.id;
            return (
              <button
                key={`HERO_NAV_${item.id}`}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mainTab: item.id }))}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-start transition active:scale-[0.99] ${
                  isActive
                    ? `${item.activeGrad} border-transparent`
                    : `bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 shadow-xs`
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : `${item.softCard}`
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs sm:text-sm font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {item.step}. {item.label}
                  </div>
                  <div className={`text-[11px] truncate ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

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
                  `أحسنت! تم حفظ الحصة ${payload.day}: ${payload.totalWorkingSets} مجموعات (${payload.totalVolumeKg} كغ)!`,
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-indigo-100 dark:border-slate-800 grid grid-cols-4 no-print"
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
                  ? item.mobileText
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-[90%]">{item.label}</span>
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
          className="fixed bottom-16 md:bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-extrabold shadow-xl max-w-[90vw] text-center"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
