import { CORE_ABC_PROGRAM } from '../data/exercises';
import { PRESET_MEAL_PLANS } from '../data/nutrition';
import {
  AppState,
  GoalMode,
  MealBlock,
  SetLog,
  WorkoutDayKey,
  WorkoutSessionRecord,
} from '../types/app';

export const STORAGE_KEY = 'HYPERTROPHY_OS_STATE_V1';
export const CURRENT_SCHEMA_VERSION = 5;

export const SEQUENCE_ORDER: WorkoutDayKey[] = ['A', 'B', 'C', 'D'];

export function getNextSequenceDay(completedDay: WorkoutDayKey): WorkoutDayKey {
  const idx = SEQUENCE_ORDER.indexOf(completedDay);
  if (idx === -1) return 'A';
  return SEQUENCE_ORDER[(idx + 1) % SEQUENCE_ORDER.length];
}

function getIsoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export interface SessionStreakAndDelaySummary {
  totalSessions: number;
  totalVolumeAllTimeKg: number;
  totalWorkingSetsAllTime: number;
  lastSession: WorkoutSessionRecord | null;
  lastSessionDate: string | null;
  daysSinceLastWorkout: number | null;
  isDelayed: boolean; // True when > 3 days have elapsed since the last saved session
  activeStreakCount: number;
  nextDayInSequence: WorkoutDayKey;
}

export function computeSessionStreakAndDelay(
  sessionHistory: WorkoutSessionRecord[],
  explicitNextDay?: WorkoutDayKey,
  referenceDateStr?: string
): SessionStreakAndDelaySummary {
  const totalSessions = sessionHistory.length;
  const totalVolumeAllTimeKg = sessionHistory.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);
  const totalWorkingSetsAllTime = sessionHistory.reduce((acc, s) => acc + (s.totalWorkingSets || 0), 0);

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      totalVolumeAllTimeKg: 0,
      totalWorkingSetsAllTime: 0,
      lastSession: null,
      lastSessionDate: null,
      daysSinceLastWorkout: null,
      isDelayed: false,
      activeStreakCount: 0,
      nextDayInSequence: explicitNextDay || 'A',
    };
  }

  // Last recorded session in chronological/append order
  const lastSession = sessionHistory[sessionHistory.length - 1];
  const lastSessionDate = lastSession.date;
  const nextDayInSequence = explicitNextDay || getNextSequenceDay(lastSession.day);

  const todayIso = referenceDateStr || new Date().toISOString().slice(0, 10);
  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  const lastMs = Date.parse(`${lastSessionDate}T00:00:00Z`);

  let daysSinceLastWorkout: number | null = null;
  if (!Number.isNaN(todayMs) && !Number.isNaN(lastMs)) {
    daysSinceLastWorkout = Math.max(0, Math.round((todayMs - lastMs) / 86400000));
  }

  const isDelayed = daysSinceLastWorkout !== null && daysSinceLastWorkout > 3;

  // Calculate active streak (consecutive sessions separated by <= 3 days, and not currently delayed)
  let activeStreakCount = 0;
  if (!isDelayed) {
    activeStreakCount = 1;
    for (let i = sessionHistory.length - 1; i > 0; i--) {
      const curMs = Date.parse(`${sessionHistory[i].date}T00:00:00Z`);
      const prevMs = Date.parse(`${sessionHistory[i - 1].date}T00:00:00Z`);
      if (!Number.isNaN(curMs) && !Number.isNaN(prevMs)) {
        const diffDays = Math.max(0, Math.round((curMs - prevMs) / 86400000));
        if (diffDays <= 4) {
          activeStreakCount += 1;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalSessions,
    totalVolumeAllTimeKg,
    totalWorkingSetsAllTime,
    lastSession,
    lastSessionDate,
    daysSinceLastWorkout,
    isDelayed,
    activeStreakCount,
    nextDayInSequence,
  };
}

export interface ThirtyDayAnalyticsPoint {
  date: string;
  shortDate: string;
  dayTag: string;
  volumeKg: number;
  workingSets: number;
  e1rmKg: number | null;
}

export interface ThirtyDayAnalyticsSummary {
  sessionPoints: ThirtyDayAnalyticsPoint[];
  dailyPoints: ThirtyDayAnalyticsPoint[];
  sessionsIn30d: number;
  totalVolume30dKg: number;
  avgVolumePerSessionKg: number;
  latestE1rmKg: number;
  startE1rmKg: number;
  e1rmGainKg: number;
}

export function buildLast30DaysAnalytics(
  state: AppState,
  selectedExId: string,
  referenceDateStr?: string
): ThirtyDayAnalyticsSummary {
  const todayIso = referenceDateStr || new Date().toISOString().slice(0, 10);
  const todayMs = Date.parse(`${todayIso}T12:00:00Z`);
  const cutoffMs = todayMs - 30 * 86400000;

  const exSeries = state.e1rmHistory[selectedExId] || [];

  // Map date -> aggregated session volume & working sets within the 30-day window
  const volumeByDate = new Map<string, { volumeKg: number; workingSets: number; dayTag: string }>();
  for (const ses of state.sessionHistory) {
    const ms = Date.parse(`${ses.date}T12:00:00Z`);
    if (!Number.isNaN(ms) && ms >= cutoffMs && ms <= todayMs + 86400000) {
      const prev = volumeByDate.get(ses.date);
      volumeByDate.set(ses.date, {
        volumeKg: (prev?.volumeKg || 0) + (ses.totalVolumeKg || 0),
        workingSets: (prev?.workingSets || 0) + (ses.totalWorkingSets || 0),
        dayTag: ses.day,
      });
    }
  }

  // Map date -> e1RM for selected exercise
  const e1rmByDate = new Map<string, number>();
  let latestKnownE1rm: number | null = null;
  for (const pt of exSeries) {
    e1rmByDate.set(pt.date, pt.value);
    const ms = Date.parse(`${pt.date}T12:00:00Z`);
    if (!Number.isNaN(ms) && ms < cutoffMs) {
      latestKnownE1rm = pt.value;
    }
  }
  if (latestKnownE1rm === null && exSeries.length > 0) {
    latestKnownE1rm = exSeries[0].value;
  }

  const dailyPoints: ThirtyDayAnalyticsPoint[] = [];
  let runningE1rm = latestKnownE1rm;

  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(todayMs - offset * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const shortDate = iso.slice(5);
    const volEntry = volumeByDate.get(iso);
    if (e1rmByDate.has(iso)) {
      runningE1rm = e1rmByDate.get(iso)!;
    }
    dailyPoints.push({
      date: iso,
      shortDate,
      dayTag: volEntry?.dayTag || '-',
      volumeKg: volEntry?.volumeKg || 0,
      workingSets: volEntry?.workingSets || 0,
      e1rmKg: runningE1rm,
    });
  }

  // Active workout dates in the last 30 days (where either a session or an e1RM update occurred)
  const sessionPoints = dailyPoints.filter((p) => p.volumeKg > 0 || e1rmByDate.has(p.date));
  const effectiveSessionPoints = sessionPoints.length > 0 ? sessionPoints : dailyPoints.slice(-7);

  const sessionsWithVol = dailyPoints.filter((p) => p.volumeKg > 0);
  const sessionsIn30d = sessionsWithVol.length;
  const totalVolume30dKg = sessionsWithVol.reduce((acc, p) => acc + p.volumeKg, 0);
  const avgVolumePerSessionKg = sessionsIn30d > 0 ? Math.round(totalVolume30dKg / sessionsIn30d) : 0;

  const validE1rms = effectiveSessionPoints
    .map((p) => p.e1rmKg)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const startE1rmKg = validE1rms.length > 0 ? validE1rms[0] : 0;
  const latestE1rmKg = validE1rms.length > 0 ? validE1rms[validE1rms.length - 1] : 0;
  const e1rmGainKg = Number((latestE1rmKg - startE1rmKg).toFixed(1));

  return {
    sessionPoints: effectiveSessionPoints,
    dailyPoints,
    sessionsIn30d,
    totalVolume30dKg,
    avgVolumePerSessionKg,
    latestE1rmKg,
    startE1rmKg,
    e1rmGainKg,
  };
}

export function createDefaultAppState(): AppState {
  const date28DaysAgo = getIsoDateDaysAgo(28);
  const date24DaysAgo = getIsoDateDaysAgo(24);
  const date19DaysAgo = getIsoDateDaysAgo(19);
  const date14DaysAgo = getIsoDateDaysAgo(14);
  const date9DaysAgo = getIsoDateDaysAgo(9);
  const date5DaysAgo = getIsoDateDaysAgo(5);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lang: 'ar',
    theme: 'dark',
    mainTab: 'home',
    exSubTab: 'library',
    nutriSubTab: 'calc',
    progSubTab: 'metrics',
    programMode: 'joint_safe',
    schedulePreset: 'sequence',
    trainingDaysLabels: {
      A: 'الدور 1 · Sequence 1',
      B: 'الدور 2 · Sequence 2',
      C: 'الدور 3 · Sequence 3',
      D: 'الدور 4 · Sequence 4',
    },
    nextSequenceDay: 'B',
    activeWorkoutDay: null,
    activeMealPreset: 'training',
    muscleFilter: 'ALL',
    equipmentFilter: 'ALL',
    difficultyFilter: 'ALL',
    favoritesOnly: false,
    favoriteExercises: ['EX01', 'EX03', 'EX04', 'EX07'],
    searchQuery: '',
    selectedMuscleKey: 'chest',
    compareIds: ['EX04', 'EX21'],
    profile: {
      age: 42,
      heightCm: 185,
      weightKg: 85.0,
      sex: 'male',
      activityFactor: 1.5,
      goalMode: 'recomp',
      caloricDelta: 0,
      proteinPerKg: 1.8,
      experienceLevel: 'intermediate',
      sleepHrs: 7.5,
      fatigueLevel: 3,
      kneeSensitivity: 1,
      wristSensitivity: 1,
      shoulderSensitivity: 0,
    },
    volumeSettings: {
      indirectCoefficient: 0.5,
      minProximityRir: 3,
      includeOptionalDayD: true,
    },
    customDayExercises: {
      joint_safe: { ...CORE_ABC_PROGRAM.joint_safe },
      benchmark: { ...CORE_ABC_PROGRAM.benchmark },
    },
    workoutLogs: {},
    sessionHistory: [
      {
        id: 'SES_INIT_1',
        date: date28DaysAgo,
        day: 'A',
        totalWorkingSets: 17,
        totalVolumeKg: 6120,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
      {
        id: 'SES_INIT_2',
        date: date24DaysAgo,
        day: 'B',
        totalWorkingSets: 18,
        totalVolumeKg: 6390,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
      {
        id: 'SES_INIT_3',
        date: date19DaysAgo,
        day: 'C',
        totalWorkingSets: 18,
        totalVolumeKg: 6580,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
      {
        id: 'SES_INIT_4',
        date: date14DaysAgo,
        day: 'D',
        totalWorkingSets: 16,
        totalVolumeKg: 5920,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
      {
        id: 'SES_INIT_5',
        date: date9DaysAgo,
        day: 'C',
        totalWorkingSets: 18,
        totalVolumeKg: 6840,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
      {
        id: 'SES_INIT_6',
        date: date5DaysAgo,
        day: 'A',
        totalWorkingSets: 18,
        totalVolumeKg: 7150,
        preJointDiscomfort: 1,
        postJointDiscomfort: 1,
      },
    ],
    jointResponseLogs: [
      {
        date: date5DaysAgo,
        preDiscomfort: 1,
        postDiscomfort: 1,
        nextDayDiscomfort: 1,
        performanceQuality: 4,
        functionalNote: 'Normal stability on leg press and seated curl.',
      },
    ],
    measurements: [
      { date: date24DaysAgo, weight: 85.6, waist: 91.0, arm: 38.1 },
      { date: date5DaysAgo, weight: 85.0, waist: 90.0, arm: 38.5 },
    ],
    e1rmHistory: {
      EX01: [
        { date: date28DaysAgo, value: 30.5 },
        { date: date19DaysAgo, value: 32.0 },
        { date: date9DaysAgo, value: 33.5 },
        { date: date5DaysAgo, value: 34.7 },
      ],
      EX03: [
        { date: date28DaysAgo, value: 165.0 },
        { date: date19DaysAgo, value: 175.0 },
        { date: date9DaysAgo, value: 184.0 },
        { date: date5DaysAgo, value: 191.3 },
      ],
      EX07: [
        { date: date24DaysAgo, value: 36.0 },
        { date: date14DaysAgo, value: 38.5 },
        { date: date9DaysAgo, value: 40.0 },
        { date: date5DaysAgo, value: 42.0 },
      ],
    },
    customMeals: JSON.parse(JSON.stringify(PRESET_MEAL_PLANS)) as { training: MealBlock[]; rest: MealBlock[] },
    timer: {
      durationSec: 90,
      remainingSec: 90,
      endMs: null,
      running: false,
      audioEnabled: true,
      hapticsEnabled: true,
    },
  };
}

function mapLegacyGoalMode(rawGoal: unknown): GoalMode {
  if (rawGoal === 'lean_bulk') return 'lean_bulk';
  if (rawGoal === 'fat_loss') return 'fat_loss';
  return 'recomp';
}

function sanitizeMeals(rawMeals: unknown, fallback: MealBlock[]): MealBlock[] {
  if (!Array.isArray(rawMeals) || rawMeals.length === 0) {
    return JSON.parse(JSON.stringify(fallback)) as MealBlock[];
  }
  return rawMeals.map((m: Record<string, unknown>, idx: number) => {
    const fb = fallback[idx] || fallback[0];
    let title = fb.title;
    if (m.title && typeof m.title === 'object' && 'ar' in (m.title as object)) {
      title = m.title as MealBlock['title'];
    } else if (typeof m.titleAr === 'string') {
      title = {
        ar: m.titleAr,
        fr: (typeof m.titleFr === 'string' && m.titleFr) || fb.title.fr,
        en: (typeof m.titleEn === 'string' && m.titleEn) || fb.title.en,
      };
    }
    const items = Array.isArray(m.items)
      ? m.items
          .filter((it): it is { foodId: string; grams: number } => Boolean(it && typeof it.foodId === 'string' && typeof it.grams === 'number'))
          .map((it) => ({ foodId: it.foodId, grams: Math.max(0, Math.min(2000, it.grams)) }))
      : fb.items;
    return { title, items };
  });
}

export function migrateState(raw: unknown): AppState {
  const base = createDefaultAppState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;

  if (r.lang === 'ar' || r.lang === 'fr' || r.lang === 'en') base.lang = r.lang;
  if (r.theme === 'dark' || r.theme === 'light') base.theme = r.theme;
  if (r.mainTab === 'home' || r.mainTab === 'exercises' || r.mainTab === 'nutrition' || r.mainTab === 'progress') {
    base.mainTab = r.mainTab;
  }
  if (r.exSubTab === 'library' || r.exSubTab === 'map' || r.exSubTab === 'compare' || r.exSubTab === 'quality' || r.exSubTab === 'science_pick') {
    base.exSubTab = r.exSubTab;
  }
  if (r.nutriSubTab === 'calc' || r.nutriSubTab === 'meals' || r.nutriSubTab === 'foods' || r.nutriSubTab === 'supps') {
    base.nutriSubTab = r.nutriSubTab;
  }
  if (r.progSubTab === 'metrics' || r.progSubTab === 'coach' || r.progSubTab === 'refs') {
    base.progSubTab = r.progSubTab;
  }
  if (r.programMode === 'joint_safe' || r.programMode === 'benchmark') base.programMode = r.programMode;
  if (r.activeWorkoutDay === 'A' || r.activeWorkoutDay === 'B' || r.activeWorkoutDay === 'C' || r.activeWorkoutDay === 'D') {
    base.activeWorkoutDay = r.activeWorkoutDay;
  }
  if (r.activeMealPreset === 'training' || r.activeMealPreset === 'rest') base.activeMealPreset = r.activeMealPreset;

  if (r.schedulePreset === 'sequence' || r.schedulePreset === 'mwf' || r.schedulePreset === 'tts' || r.schedulePreset === 'custom') {
    base.schedulePreset = r.schedulePreset;
  }

  if (r.profile && typeof r.profile === 'object') {
    const p = r.profile as Record<string, unknown>;
    if (typeof p.age === 'number' && p.age >= 14 && p.age <= 99) base.profile.age = p.age;
    if (typeof p.heightCm === 'number' && p.heightCm >= 120 && p.heightCm <= 230) base.profile.heightCm = p.heightCm;
    if (typeof p.weightKg === 'number' && p.weightKg >= 35 && p.weightKg <= 250) base.profile.weightKg = p.weightKg;
    if (p.sex === 'male' || p.sex === 'female') base.profile.sex = p.sex;
    if (typeof p.activityFactor === 'number' && p.activityFactor >= 1.1 && p.activityFactor <= 2.3) {
      base.profile.activityFactor = p.activityFactor;
    }
    base.profile.goalMode = mapLegacyGoalMode(p.goalMode);
    if (typeof p.caloricDelta === 'number') base.profile.caloricDelta = p.caloricDelta;
    if (typeof p.proteinPerKg === 'number' && p.proteinPerKg >= 1.2 && p.proteinPerKg <= 2.6) {
      base.profile.proteinPerKg = p.proteinPerKg;
    }
    if (p.experienceLevel === 'beginner' || p.experienceLevel === 'intermediate' || p.experienceLevel === 'advanced') {
      base.profile.experienceLevel = p.experienceLevel;
    }
    if (typeof p.sleepHrs === 'number') base.profile.sleepHrs = Math.max(3, Math.min(12, p.sleepHrs));
    if (typeof p.fatigueLevel === 'number') base.profile.fatigueLevel = Math.max(1, Math.min(10, p.fatigueLevel));
    if (typeof p.kneeSensitivity === 'number') {
      base.profile.kneeSensitivity = Math.max(0, Math.min(10, p.kneeSensitivity));
    } else if (typeof p.kneePain === 'number') {
      base.profile.kneeSensitivity = Math.max(0, Math.min(10, p.kneePain));
    }
    if (typeof p.wristSensitivity === 'number') base.profile.wristSensitivity = Math.max(0, Math.min(10, p.wristSensitivity));
    if (typeof p.shoulderSensitivity === 'number') base.profile.shoulderSensitivity = Math.max(0, Math.min(10, p.shoulderSensitivity));
  }

  if (r.volumeSettings && typeof r.volumeSettings === 'object') {
    const vs = r.volumeSettings as Record<string, unknown>;
    if (typeof vs.indirectCoefficient === 'number') base.volumeSettings.indirectCoefficient = vs.indirectCoefficient;
    if (typeof vs.minProximityRir === 'number') base.volumeSettings.minProximityRir = vs.minProximityRir;
    if (typeof vs.includeOptionalDayD === 'boolean') base.volumeSettings.includeOptionalDayD = vs.includeOptionalDayD;
  }

  if (r.customDayExercises && typeof r.customDayExercises === 'object') {
    const cde = r.customDayExercises as Record<string, unknown>;
    (['joint_safe', 'benchmark'] as const).forEach((mode) => {
      const m = cde[mode];
      if (m && typeof m === 'object') {
        (['A', 'B', 'C', 'D'] as WorkoutDayKey[]).forEach((day) => {
          const list = (m as Record<string, unknown>)[day];
          if (Array.isArray(list) && list.every((id) => typeof id === 'string')) {
            base.customDayExercises[mode][day] = list;
          }
        });
      }
    });
  }

  if (r.workoutLogs && typeof r.workoutLogs === 'object') {
    const logs = r.workoutLogs as Record<string, unknown>;
    const cleanLogs: Record<string, SetLog> = {};
    for (const [k, val] of Object.entries(logs)) {
      if (val && typeof val === 'object') {
        const entry = val as Record<string, unknown>;
        cleanLogs[k] = {
          weight: typeof entry.weight === 'number' ? Math.max(0, entry.weight) : 0,
          reps: typeof entry.reps === 'number' ? Math.max(0, entry.reps) : 10,
          rir: typeof entry.rir === 'number' ? Math.max(0, Math.min(10, entry.rir)) : 2,
          actualRir:
            typeof entry.actualRir === 'number' && !Number.isNaN(entry.actualRir)
              ? Math.max(0, Math.min(10, entry.actualRir))
              : undefined,
          isWarmup: Boolean(entry.isWarmup),
          done: Boolean(entry.done),
          timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined,
        };
      }
    }
    base.workoutLogs = cleanLogs;
  }

  if (Array.isArray(r.sessionHistory) && r.sessionHistory.length > 0) {
    base.sessionHistory = r.sessionHistory
      .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object' && typeof s.date === 'string'))
      .map((s, idx) => ({
        id: typeof s.id === 'string' ? s.id : `SES_${idx}_${s.date}`,
        date: String(s.date),
        day: (s.day === 'A' || s.day === 'B' || s.day === 'C' || s.day === 'D') ? s.day : 'A',
        totalWorkingSets: typeof s.totalWorkingSets === 'number' ? s.totalWorkingSets : (typeof s.totalSets === 'number' ? s.totalSets : 0),
        totalVolumeKg: typeof s.totalVolumeKg === 'number' ? s.totalVolumeKg : 0,
        preJointDiscomfort: typeof s.preJointDiscomfort === 'number' ? s.preJointDiscomfort : 1,
        postJointDiscomfort: typeof s.postJointDiscomfort === 'number' ? s.postJointDiscomfort : 1,
        sessionNotes: typeof s.sessionNotes === 'string' ? s.sessionNotes : undefined,
      }));
  }

  if (r.nextSequenceDay === 'A' || r.nextSequenceDay === 'B' || r.nextSequenceDay === 'C' || r.nextSequenceDay === 'D') {
    base.nextSequenceDay = r.nextSequenceDay;
  } else if (base.sessionHistory.length > 0) {
    const lastDay = base.sessionHistory[base.sessionHistory.length - 1].day;
    base.nextSequenceDay = getNextSequenceDay(lastDay);
  }

  if (Array.isArray(r.jointResponseLogs)) {
    base.jointResponseLogs = r.jointResponseLogs.filter(
      (j): j is AppState['jointResponseLogs'][number] => Boolean(j && typeof j === 'object' && typeof j.date === 'string')
    );
  }

  if (Array.isArray(r.measurements) && r.measurements.length > 0) {
    base.measurements = r.measurements.filter(
      (m): m is AppState['measurements'][number] =>
        Boolean(m && typeof m === 'object' && typeof m.date === 'string' && typeof m.weight === 'number')
    );
  }

  if (r.e1rmHistory && typeof r.e1rmHistory === 'object') {
    const rawHist = r.e1rmHistory as Record<string, unknown>;
    const migratedHist: AppState['e1rmHistory'] = {};
    for (const [exId, arr] of Object.entries(rawHist)) {
      if (Array.isArray(arr)) {
        migratedHist[exId] = arr
          .map((item, idx) => {
            if (typeof item === 'number') {
              return { date: `W${idx + 1}`, value: item };
            }
            if (item && typeof item === 'object' && 'value' in item && typeof (item as { value: unknown }).value === 'number') {
              return {
                date: typeof (item as { date?: unknown }).date === 'string' ? String((item as { date: string }).date) : `W${idx + 1}`,
                value: (item as { value: number }).value,
              };
            }
            return null;
          })
          .filter((x): x is { date: string; value: number } => x !== null);
      }
    }
    if (Object.keys(migratedHist).length > 0) {
      base.e1rmHistory = { ...base.e1rmHistory, ...migratedHist };
    }
  }

  if (r.customMeals && typeof r.customMeals === 'object') {
    const cm = r.customMeals as Record<string, unknown>;
    base.customMeals = {
      training: sanitizeMeals(cm.training, PRESET_MEAL_PLANS.training),
      rest: sanitizeMeals(cm.rest, PRESET_MEAL_PLANS.rest),
    };
  }

  if (Array.isArray(r.favoriteExercises)) {
    base.favoriteExercises = r.favoriteExercises.filter((id): id is string => typeof id === 'string');
  }

  if (r.timer && typeof r.timer === 'object') {
    const t = r.timer as Record<string, unknown>;
    base.timer = {
      durationSec: typeof t.durationSec === 'number' ? t.durationSec : 90,
      remainingSec: typeof t.remainingSec === 'number' ? t.remainingSec : 90,
      endMs: typeof t.endMs === 'number' ? t.endMs : null,
      running: Boolean(t.running),
      audioEnabled: t.audioEnabled !== false,
      hapticsEnabled: t.hapticsEnabled !== false,
    };
  }

  base.schemaVersion = CURRENT_SCHEMA_VERSION;
  return base;
}

export function loadSavedState(): AppState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return createDefaultAppState();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultAppState();
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return createDefaultAppState();
  }
}

export function saveAppState(state: AppState): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function validateAndImportBackup(
  jsonText: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Backup root must be a JSON object.' };
    }
    const obj = parsed as Record<string, unknown>;
    const payload = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj;

    const hasRecognizedFields =
      'profile' in payload ||
      'workoutLogs' in payload ||
      'customDayExercises' in payload ||
      'measurements' in payload;
    if (!hasRecognizedFields) {
      return { ok: false, error: 'Missing required Hypertrophy OS fields (profile, workoutLogs, or measurements).' };
    }
    if (payload.profile && typeof payload.profile === 'object') {
      const p = payload.profile as Record<string, unknown>;
      if (typeof p.weightKg === 'number' && (p.weightKg < 30 || p.weightKg > 300)) {
        return { ok: false, error: 'Invalid profile weightKg out of bounds (30–300 kg).' };
      }
    }
    const migrated = migrateState(payload);
    return { ok: true, state: migrated };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON syntax.' };
  }
}

export function createBackupExportPayload(state: AppState): string {
  return JSON.stringify(
    {
      app: 'Hypertrophy & Joint Longevity OS',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      storageKey: STORAGE_KEY,
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
}
