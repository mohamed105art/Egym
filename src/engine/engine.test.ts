import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES_DB } from '../data/exercises';
import { MOROCCAN_FOOD_DB } from '../data/nutrition';
import { MUSCLE_ZONE_ORDER } from '../data/muscles';
import {
  computeSessionStreakAndDelay,
  createDefaultAppState,
  getNextSequenceDay,
  migrateState,
  validateAndImportBackup,
} from './storage';
import { computeWeeklyVolume, estimateE1RM, evaluateDoubleProgression } from './volume';
import { buildWeeklyGroceryList, calculateBiometrics, calculateMealsTotals } from './nutrition';
import { generateCoachInsights } from './coach';

test('EXERCISES_DB has 32 unique IDs, verified media metadata, and valid primary muscles', () => {
  assert.equal(EXERCISES_DB.length, 32);
  const ids = new Set<string>();
  for (const ex of EXERCISES_DB) {
    assert.ok(!ids.has(ex.id), `Duplicate exercise ID: ${ex.id}`);
    ids.add(ex.id);
    assert.ok(MUSCLE_ZONE_ORDER.includes(ex.primaryMuscle), `Invalid muscle: ${ex.primaryMuscle}`);
    assert.equal(ex.media.exerciseId, ex.id);
    assert.equal(ex.media.verificationStatus, 'verified');
    assert.ok(ex.media.startingFrame.startsWith('https://'));
    assert.ok(ex.media.endingFrame.startsWith('https://'));
    assert.ok(ex.name.ar.length > 0 && ex.name.fr.length > 0 && ex.name.en.length > 0);
  }
});

test('v4 state migration preserves existing profile, workout logs, measurements, and maps goalMode', () => {
  const legacyV4 = {
    lang: 'fr',
    programMode: 'benchmark',
    profile: { age: 40, heightCm: 180, weightKg: 82.5, goalMode: 'recomp_train', kneePain: 4 },
    workoutLogs: { EX01_S1: { weight: 30, reps: 10, done: true } },
    measurements: [{ date: '2026-10-01', weight: 83.0, waist: 91, arm: 38 }],
    e1rmHistory: { EX01: [28, 30, 32] },
  };
  const migrated = migrateState(legacyV4);
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.lang, 'fr');
  assert.equal(migrated.programMode, 'benchmark');
  assert.equal(migrated.profile.weightKg, 82.5);
  assert.equal(migrated.profile.goalMode, 'recomp');
  assert.equal(migrated.profile.kneeSensitivity, 4);
  assert.equal(migrated.workoutLogs.EX01_S1.weight, 30);
  assert.equal(migrated.workoutLogs.EX01_S1.isWarmup, false);
  assert.equal(migrated.e1rmHistory.EX01.length, 3);
  assert.equal(migrated.e1rmHistory.EX01[2].value, 32);
});

test('validateAndImportBackup rejects corrupt or unrelated JSON without throwing', () => {
  const badSyntax = validateAndImportBackup('{invalid');
  assert.equal(badSyntax.ok, false);

  const unrelated = validateAndImportBackup('{"hello":"world"}');
  assert.equal(unrelated.ok, false);

  const outOfBounds = validateAndImportBackup('{"profile":{"weightKg":999}}');
  assert.equal(outOfBounds.ok, false);

  const valid = validateAndImportBackup('{"profile":{"weightKg":84},"workoutLogs":{}}');
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.state.profile.weightKg, 84);
  }
});

test('volume engine separates 3-day A/B/C from optional Day D and respects indirect coefficient & warmups', () => {
  const state = createDefaultAppState();
  state.volumeSettings.includeOptionalDayD = false;
  state.volumeSettings.indirectCoefficient = 0.5;
  const vol3Day = computeWeeklyVolume(state, EXERCISES_DB);

  state.volumeSettings.includeOptionalDayD = true;
  const vol4Day = computeWeeklyVolume(state, EXERCISES_DB);

  // Day D includes Barbell Hip Thrust (EX27) for glutes and Shrugs (EX30) for traps
  assert.ok(vol4Day.traps.plannedDirectSets > vol3Day.traps.plannedDirectSets);

  // Warmup sets should NOT count in loggedWorkingSets
  state.workoutLogs.EX01_S1 = { weight: 15, reps: 10, rir: 4, isWarmup: true, done: true };
  state.workoutLogs.EX01_S2 = { weight: 26, reps: 9, rir: 2, isWarmup: false, done: true };
  const volWithLogs = computeWeeklyVolume(state, EXERCISES_DB);
  assert.equal(volWithLogs.chest.loggedWorkingSets, 1);

  // Indirect coefficient = 0 eliminates indirect volume
  state.volumeSettings.indirectCoefficient = 0;
  const volZeroIndirect = computeWeeklyVolume(state, EXERCISES_DB);
  assert.equal(volZeroIndirect.front_delts.plannedIndirectSets, 0);
});

test('estimateE1RM and Double Progression evaluate overload accurately', () => {
  assert.equal(estimateE1RM(100, 1), 100);
  assert.equal(estimateE1RM(60, 10), 80);

  const ex01 = EXERCISES_DB.find((e) => e.id === 'EX01')!;
  const readyLogs = {
    EX01_S1: { weight: 26, reps: 10, rir: 2, isWarmup: false, done: true },
    EX01_S2: { weight: 26, reps: 10, rir: 1, isWarmup: false, done: true },
    EX01_S3: { weight: 26, reps: 10, rir: 1, isWarmup: false, done: true },
  };
  const dpReady = evaluateDoubleProgression(ex01, readyLogs);
  assert.equal(dpReady.readyToIncrease, true);
  assert.equal(dpReady.suggestedWeightKg, 27.25);

  const notReadyLogs = {
    EX01_S1: { weight: 26, reps: 10, rir: 2, isWarmup: false, done: true },
    EX01_S2: { weight: 26, reps: 8, rir: 2, isWarmup: false, done: true },
    EX01_S3: { weight: 26, reps: 8, rir: 1, isWarmup: false, done: true },
  };
  const dpHold = evaluateDoubleProgression(ex01, notReadyLogs);
  assert.equal(dpHold.readyToIncrease, false);
  assert.equal(dpHold.suggestedWeightKg, 26);
});

test('nutrition biometrics, meal totals, and 7-day raw grocery conversions are accurate', () => {
  const state = createDefaultAppState();
  const bio = calculateBiometrics(state.profile);
  assert.ok(bio.bmr > 1600 && bio.bmr < 1900);
  assert.equal(bio.proteinG, Math.round(85 * 1.8));

  const mealTotals = calculateMealsTotals(state.customMeals.training, MOROCCAN_FOOD_DB);
  assert.ok(mealTotals.kcal > 2000 && mealTotals.protein > 130);

  const grocery = buildWeeklyGroceryList(state.customMeals, MOROCCAN_FOOD_DB, 3);
  const riceItem = grocery.find((g) => g.food.id === 'F12');
  assert.ok(riceItem);
  // Basmati rice is cooked (rawFactor 0.35), so raw grocery weight < cooked weight
  assert.ok(riceItem!.weeklyRawGroceryGrams < riceItem!.weeklyLoggedGrams);
});

test('explainable AI coach returns transparent insights and deload suggestions on high fatigue', () => {
  const state = createDefaultAppState();
  state.profile.fatigueLevel = 8;
  state.profile.sleepHrs = 5.5;
  const vol = computeWeeklyVolume(state, EXERCISES_DB);
  const insights = generateCoachInsights(state, EXERCISES_DB, vol);
  assert.ok(insights.some((i) => i.type === 'deload'));
  assert.ok(insights.every((i) => i.observed.en.length > 0 && i.dataBasis.en.length > 0 && i.rationale.en.length > 0));
});

test('actualRir persists across migration and calibrates effective volume & intensity overload', () => {
  const migrated = migrateState({
    workoutLogs: {
      EX01_S1: { weight: 26, reps: 8, rir: 2, actualRir: 5, isWarmup: false, done: true },
    },
  });
  assert.equal(migrated.workoutLogs.EX01_S1.actualRir, 5);

  // Set with actualRir=5 exceeds minProximityRir=3 -> not counted as effective working set
  migrated.volumeSettings.minProximityRir = 3;
  const vol = computeWeeklyVolume(migrated, EXERCISES_DB);
  assert.equal(vol.chest.loggedWorkingSets, 0);

  // When actualRir across completed working sets is >= targetRir + 2, progression advises calibrating load/reps up
  const ex01 = EXERCISES_DB.find((e) => e.id === 'EX01')!;
  const lightLogs = {
    EX01_S1: { weight: 26, reps: 8, rir: 4, actualRir: 4, isWarmup: false, done: true },
    EX01_S2: { weight: 26, reps: 8, rir: 4.5, actualRir: 4.5, isWarmup: false, done: true },
    EX01_S3: { weight: 26, reps: 8, rir: 4, actualRir: 4, isWarmup: false, done: true },
  };
  const dp = evaluateDoubleProgression(ex01, lightLogs);
  assert.equal(dp.readyToIncrease, true);
  assert.equal(dp.suggestedWeightKg, 27.25);
});

test('dynamic sequence rotation (A->B->C->D->A) and >3-day delay warning work accurately', () => {
  assert.equal(getNextSequenceDay('A'), 'B');
  assert.equal(getNextSequenceDay('B'), 'C');
  assert.equal(getNextSequenceDay('C'), 'D');
  assert.equal(getNextSequenceDay('D'), 'A');

  const delayedHistory = [
    {
      id: 'S1',
      date: '2026-11-05',
      day: 'A' as const,
      totalWorkingSets: 18,
      totalVolumeKg: 6500,
      preJointDiscomfort: 1,
      postJointDiscomfort: 1,
    },
    {
      id: 'S2',
      date: '2026-11-09',
      day: 'B' as const,
      totalWorkingSets: 18,
      totalVolumeKg: 7100,
      preJointDiscomfort: 1,
      postJointDiscomfort: 1,
    },
  ];

  // 5 days elapsed (2026-11-09 -> 2026-11-14) > 3 days -> isDelayed = true, next in sequence = C
  const checkDelayed = computeSessionStreakAndDelay(delayedHistory, undefined, '2026-11-14');
  assert.equal(checkDelayed.totalSessions, 2);
  assert.equal(checkDelayed.daysSinceLastWorkout, 5);
  assert.equal(checkDelayed.isDelayed, true);
  assert.equal(checkDelayed.nextDayInSequence, 'C');

  // After finishing Session C on 2026-11-14 -> isDelayed = false, totalSessions = 3, next in sequence = D
  const updatedHistory = [
    ...delayedHistory,
    {
      id: 'S3',
      date: '2026-11-14',
      day: 'C' as const,
      totalWorkingSets: 18,
      totalVolumeKg: 7400,
      preJointDiscomfort: 1,
      postJointDiscomfort: 1,
    },
  ];
  const checkActive = computeSessionStreakAndDelay(updatedHistory, undefined, '2026-11-14');
  assert.equal(checkActive.totalSessions, 3);
  assert.equal(checkActive.daysSinceLastWorkout, 0);
  assert.equal(checkActive.isDelayed, false);
  assert.equal(checkActive.nextDayInSequence, 'D');
});


