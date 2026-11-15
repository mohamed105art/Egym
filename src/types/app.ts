export type Lang = 'ar' | 'fr' | 'en';
export type MainTab = 'home' | 'exercises' | 'nutrition' | 'progress';
export type ExSubTab = 'library' | 'science_pick' | 'map' | 'quality' | 'compare';
export type NutriSubTab = 'calc' | 'meals' | 'foods' | 'supps';
export type ProgSubTab = 'metrics' | 'coach' | 'refs';
export type ProgramMode = 'joint_safe' | 'benchmark';
export type WorkoutDayKey = 'A' | 'B' | 'C' | 'D';
export type EvidenceGrade = 'strong' | 'moderate' | 'limited' | 'preliminary';
export type GoalMode = 'recomp' | 'lean_bulk' | 'fat_loss';
export type DaySchedulePreset = 'sequence' | 'mwf' | 'tts' | 'custom';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type MuscleZoneKey =
  | 'chest'
  | 'lats_back'
  | 'traps'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export type EquipmentType = 'Dumbbell' | 'Machine' | 'Cable' | 'Barbell' | 'Bodyweight';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type RigMovementType =
  | 'incline_press'
  | 'flat_press'
  | 'pec_deck'
  | 'chest_row'
  | 'cable_row'
  | 'lat_pulldown'
  | 'leg_press'
  | 'hack_squat'
  | 'leg_extension'
  | 'seated_leg_curl'
  | 'lying_leg_curl'
  | 'rdl'
  | 'split_squat'
  | 'hip_thrust'
  | 'lateral_raise'
  | 'shoulder_press'
  | 'face_pull'
  | 'reverse_fly'
  | 'incline_curl'
  | 'standing_curl'
  | 'preacher_curl'
  | 'overhead_triceps'
  | 'rope_pushdown'
  | 'standing_calf'
  | 'seated_calf'
  | 'cable_crunch'
  | 'shrug'
  | 'back_extension';

export interface TrilingualText {
  ar: string;
  fr: string;
  en: string;
}

export interface ExerciseMedia {
  exerciseId: string;
  mediaType: 'photo_sequence' | 'kinematic_rig';
  source: string;
  license: string;
  attribution: string;
  folderId: string;
  altFolderId: string;
  startingFrame: string;
  endingFrame: string;
  intermediateFrames: string[];
  thumbnail: string;
  verificationStatus: 'verified' | 'needs_review';
  lastVerifiedAt: string;
  youtubeUrl: string;
  youtubeAuthor: string;
}

export interface Exercise {
  id: string;
  defaultDay: WorkoutDayKey | 'BENCHMARK';
  equipment: EquipmentType;
  difficulty: DifficultyLevel;
  movementPattern: TrilingualText;
  jointAction: TrilingualText;
  primaryMuscle: MuscleZoneKey;
  secondaryMuscles: MuscleZoneKey[];
  synergistMultiplier: number; // Default 0.5, customizable per user/model
  sets: number;
  repMin: number;
  repMax: number;
  repsLabel: string;
  restSec: number;
  targetRir: number;
  rirLabel: string;
  defaultWeightKg: number;
  romType: 'lengthened_bias' | 'full_rom' | 'shortened_bias' | 'isometric_safe';
  evidenceGrade: EvidenceGrade;
  studyRefIds: string[];
  rigType: RigMovementType;
  name: TrilingualText;
  muscleLabel: TrilingualText;
  startCue: TrilingualText;
  steps: TrilingualText;
  commonErrors: TrilingualText;
  jointSafety: TrilingualText;
  scienceNote: TrilingualText;
  alternatives: string[];
  media: ExerciseMedia;
}

export interface MuscleZoneInfo {
  key: MuscleZoneKey;
  name: TrilingualText;
  functionLabel: TrilingualText;
  recoveryHours: number;
  minEffectiveSets: number;
  optimalRange: [number, number];
  highThreshold: number;
  side: 'front' | 'back' | 'both';
}

export interface SetLog {
  weight: number;
  reps: number;
  rir: number; // 0, 1, 2, 3 (legacy/effective fallback)
  actualRir?: number; // Recorded actual Reps In Reserve achieved (0-10)
  isWarmup: boolean;
  done: boolean;
  timestamp?: string;
}

export interface WorkoutSessionRecord {
  id: string;
  date: string;
  day: WorkoutDayKey;
  totalWorkingSets: number;
  totalVolumeKg: number;
  preJointDiscomfort: number;
  postJointDiscomfort: number;
  sessionNotes?: string;
}

export interface JointResponseLog {
  date: string;
  preDiscomfort: number; // 0-10
  postDiscomfort: number; // 0-10
  nextDayDiscomfort: number; // 0-10
  performanceQuality: number; // 1-5
  functionalNote: string;
}

export interface BodyMeasurement {
  date: string;
  weight: number;
  waist: number;
  arm: number;
}

export type WeightState = 'raw' | 'cooked' | 'drained' | 'net';

export interface FoodItem {
  id: string;
  category: 'protein' | 'carb' | 'fat' | 'dairy_legume' | 'fruit';
  weightState: WeightState;
  rawFactor: number; // Multiplier to convert logged portion weight to raw grocery weight
  sourceDb: 'USDA FDC' | 'ANSES-CIQUAL 2025';
  kcal: number;
  p: number;
  c: number;
  f: number;
  name: TrilingualText;
  stateLabel: TrilingualText;
}

export interface MealEntry {
  foodId: string;
  grams: number;
}

export interface MealBlock {
  title: TrilingualText;
  items: MealEntry[];
}

export interface UserProfile {
  age: number;
  heightCm: number;
  weightKg: number;
  sex: 'male' | 'female';
  activityFactor: number;
  goalMode: GoalMode;
  caloricDelta: number; // user adjustable surplus/deficit
  proteinPerKg: number; // 1.4 - 2.2 g/kg
  experienceLevel: ExperienceLevel;
  sleepHrs: number;
  fatigueLevel: number; // 1-10
  kneeSensitivity: number; // 0-10
  wristSensitivity: number; // 0-10
  shoulderSensitivity: number; // 0-10
}

export interface VolumeSettings {
  indirectCoefficient: number; // 0, 0.25, 0.5, 1.0
  minProximityRir: number; // sets with RIR <= minProximityRir count as effective (e.g. 3 or 4)
  includeOptionalDayD: boolean;
}

export interface TimerPersistState {
  durationSec: number;
  remainingSec: number;
  endMs: number | null;
  running: boolean;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface ScientificStudy {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  url: string;
  studyType: TrilingualText;
  evidenceGrade: EvidenceGrade;
  lastReviewedAt: string;
  summary: TrilingualText;
  limitations: TrilingualText;
  generalizability: TrilingualText;
  conflictingNote?: TrilingualText;
}

export interface CoachRecommendation {
  id: string;
  type: 'strength_up' | 'plateau' | 'high_fatigue' | 'weight_trend' | 'low_volume' | 'joint_alert' | 'deload';
  severity: 'positive' | 'info' | 'warning';
  confidence: 'high' | 'moderate' | 'low';
  title: TrilingualText;
  observed: TrilingualText;
  dataBasis: TrilingualText;
  rationale: TrilingualText;
  expectedChange: TrilingualText;
  limitationsNote: TrilingualText;
  actionLabel?: TrilingualText;
  actionType?: 'deload_15' | 'swap_knee_safe' | 'add_recovery_day' | 'increase_kcal_150';
}

export interface PersonalRecordEntry {
  bestWeightKg: number;
  bestReps: number;
  bestE1rm: number;
  achievedAt: string;
}

export interface AppState {
  schemaVersion: number;
  lang: Lang;
  theme: 'dark' | 'light';
  mainTab: MainTab;
  exSubTab: ExSubTab;
  nutriSubTab: NutriSubTab;
  progSubTab: ProgSubTab;
  programMode: ProgramMode;
  schedulePreset: DaySchedulePreset;
  trainingDaysLabels: Record<WorkoutDayKey, string>;
  nextSequenceDay: WorkoutDayKey;
  activeWorkoutDay: WorkoutDayKey | null;
  activeMealPreset: 'training' | 'rest';
  muscleFilter: MuscleZoneKey | 'ALL';
  equipmentFilter: EquipmentType | 'ALL';
  difficultyFilter: DifficultyLevel | 'ALL';
  favoritesOnly: boolean;
  favoriteExercises: string[];
  searchQuery: string;
  selectedMuscleKey: MuscleZoneKey;
  compareIds: [string, string];
  profile: UserProfile;
  volumeSettings: VolumeSettings;
  customDayExercises: Record<ProgramMode, Record<WorkoutDayKey, string[]>>;
  workoutLogs: Record<string, SetLog>;
  exerciseCompletionCounts?: Record<string, number>;
  prRecords?: Record<string, PersonalRecordEntry>;
  sessionHistory: WorkoutSessionRecord[];
  jointResponseLogs: JointResponseLog[];
  measurements: BodyMeasurement[];
  e1rmHistory: Record<string, { date: string; value: number }[]>;
  customMeals: {
    training: MealBlock[];
    rest: MealBlock[];
  };
  timer: TimerPersistState;
}
