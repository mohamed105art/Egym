import { MUSCLE_ZONE_ORDER, MUSCLE_ZONES } from '../data/muscles';
import { AppState, Exercise, MuscleZoneKey, SetLog, WorkoutDayKey } from '../types/app';

export interface MuscleVolumeSummary {
  key: MuscleZoneKey;
  plannedDirectSets: number;
  plannedIndirectSets: number;
  effectivePlannedSets: number;
  loggedWorkingSets: number;
  weeklyFrequency: number;
  exercises: { id: string; name: Exercise['name']; day: WorkoutDayKey; sets: number; role: 'direct' | 'indirect' }[];
  status: 'below_min' | 'optimal' | 'high_diminishing';
}

export function estimateE1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Number(weightKg.toFixed(1));
  const cappedReps = Math.min(20, reps);
  return Number((weightKg * (1 + cappedReps / 30)).toFixed(1));
}

export function isEffectiveWorkingSet(log: SetLog | undefined, minProximityRir: number): boolean {
  if (!log || !log.done || log.isWarmup) return false;
  const effectiveRir = log.actualRir ?? log.rir;
  return effectiveRir <= minProximityRir;
}

export function computeWeeklyVolume(
  state: AppState,
  exercisesDb: Exercise[]
): Record<MuscleZoneKey, MuscleVolumeSummary> {
  const byId = new Map(exercisesDb.map((e) => [e.id, e]));
  const activeDays: WorkoutDayKey[] = state.volumeSettings.includeOptionalDayD
    ? ['A', 'B', 'C', 'D']
    : ['A', 'B', 'C'];

  const dayMap = state.customDayExercises[state.programMode];
  const indirectMult = state.volumeSettings.indirectCoefficient;
  const maxRir = state.volumeSettings.minProximityRir;

  const result = {} as Record<MuscleZoneKey, MuscleVolumeSummary>;
  for (const key of MUSCLE_ZONE_ORDER) {
    result[key] = {
      key,
      plannedDirectSets: 0,
      plannedIndirectSets: 0,
      effectivePlannedSets: 0,
      loggedWorkingSets: 0,
      weeklyFrequency: 0,
      exercises: [],
      status: 'optimal',
    };
  }

  const daysHitPerMuscle = new Map<MuscleZoneKey, Set<WorkoutDayKey>>();
  MUSCLE_ZONE_ORDER.forEach((k) => daysHitPerMuscle.set(k, new Set()));

  for (const day of activeDays) {
    const exIds = dayMap[day] || [];
    for (const exId of exIds) {
      const ex = byId.get(exId);
      if (!ex) continue;

      let loggedSetsForEx = 0;
      for (let s = 1; s <= ex.sets; s++) {
        const log = state.workoutLogs[`${ex.id}_S${s}`];
        if (isEffectiveWorkingSet(log, maxRir)) {
          loggedSetsForEx += 1;
        }
      }

      const primary = result[ex.primaryMuscle];
      if (primary) {
        primary.plannedDirectSets += ex.sets;
        primary.effectivePlannedSets += ex.sets;
        primary.loggedWorkingSets += loggedSetsForEx;
        primary.exercises.push({ id: ex.id, name: ex.name, day, sets: ex.sets, role: 'direct' });
        daysHitPerMuscle.get(ex.primaryMuscle)?.add(day);
      }

      for (const sec of ex.secondaryMuscles) {
        const secEntry = result[sec];
        if (secEntry) {
          const appliedFactor = indirectMult === 0.5 ? ex.synergistMultiplier : indirectMult;
          const contrib = Number((ex.sets * appliedFactor).toFixed(2));
          secEntry.plannedIndirectSets = Number((secEntry.plannedIndirectSets + contrib).toFixed(2));
          secEntry.effectivePlannedSets = Number((secEntry.effectivePlannedSets + contrib).toFixed(2));
          if (contrib > 0) {
            secEntry.exercises.push({ id: ex.id, name: ex.name, day, sets: contrib, role: 'indirect' });
            daysHitPerMuscle.get(sec)?.add(day);
          }
        }
      }
    }
  }

  for (const key of MUSCLE_ZONE_ORDER) {
    const entry = result[key];
    const zone = MUSCLE_ZONES[key];
    entry.weeklyFrequency = daysHitPerMuscle.get(key)?.size || 0;
    const minEff = state.profile.experienceLevel === 'beginner' ? Math.max(3, zone.minEffectiveSets - 2) : zone.minEffectiveSets;
    if (entry.effectivePlannedSets < minEff) {
      entry.status = 'below_min';
    } else if (entry.effectivePlannedSets > zone.highThreshold) {
      entry.status = 'high_diminishing';
    } else {
      entry.status = 'optimal';
    }
  }

  return result;
}

export interface DoubleProgressionResult {
  readyToIncrease: boolean;
  suggestedWeightKg: number;
  reason: { ar: string; fr: string; en: string };
}

export function evaluateDoubleProgression(
  exercise: Exercise,
  workoutLogs: Record<string, SetLog>
): DoubleProgressionResult {
  const workingSets: SetLog[] = [];
  for (let s = 1; s <= exercise.sets; s++) {
    const log = workoutLogs[`${exercise.id}_S${s}`];
    if (log && log.done && !log.isWarmup) {
      workingSets.push(log);
    }
  }

  if (workingSets.length < exercise.sets) {
    return {
      readyToIncrease: false,
      suggestedWeightKg: workingSets[0]?.weight ?? exercise.defaultWeightKg,
      reason: {
        ar: `أكمل ${exercise.sets} مجموعات عمل أولاً ضمن نطاق ${exercise.repsLabel} تكرار.`,
        fr: `Complétez d’abord ${exercise.sets} séries de travail dans la plage ${exercise.repsLabel}.`,
        en: `Complete all ${exercise.sets} working sets within ${exercise.repsLabel} reps first.`,
      },
    };
  }

  const allHitTopReps = workingSets.every((s) => s.reps >= exercise.repMax);
  const allGoodEffort = workingSets.every((s) => (s.actualRir ?? s.rir) <= exercise.targetRir + 1);
  const recordedActual = workingSets.filter((s) => typeof s.actualRir === 'number');
  const avgActualRir =
    recordedActual.length > 0
      ? recordedActual.reduce((acc, s) => acc + (s.actualRir as number), 0) / recordedActual.length
      : null;
  const currentWeight = workingSets[0].weight;

  if (allHitTopReps && allGoodEffort) {
    const step = currentWeight >= 60 ? 2.5 : 1.25;
    return {
      readyToIncrease: true,
      suggestedWeightKg: Number((currentWeight + step).toFixed(2)),
      reason: {
        ar: `حققت ${exercise.repMax} تكراراً في جميع المجموعات مع RIR مناسب — زِد الوزن بمقدار +${step} كغ مع الحفاظ على التقنية.`,
        fr: `Vous avez atteint ${exercise.repMax} reps sur toutes les séries avec un RIR maîtrisé — augmentez de +${step} kg.`,
        en: `Hit ${exercise.repMax} reps across all sets at target RIR — add +${step} kg next session if form stays clean.`,
      },
    };
  }

  if (avgActualRir !== null && avgActualRir >= exercise.targetRir + 2) {
    const step = currentWeight >= 60 ? 2.5 : 1.25;
    return {
      readyToIncrease: true,
      suggestedWeightKg: Number((currentWeight + step).toFixed(2)),
      reason: {
        ar: `متوسط RIR الفعلي (${avgActualRir.toFixed(1)}) أعلى من الهدف (${exercise.targetRir}) — يمكنك زيادة التكرارات أو رفع الوزن +${step} كغ في الحصة القادمة.`,
        fr: `RIR réel moyen (${avgActualRir.toFixed(1)}) supérieur à la cible (${exercise.targetRir}) — ajoutez des reps ou +${step} kg la prochaine séance.`,
        en: `Recorded actual RIR (${avgActualRir.toFixed(1)}) was well above target (${exercise.targetRir}) — push reps or add +${step} kg next session to calibrate intensity.`,
      },
    };
  }

  return {
    readyToIncrease: false,
    suggestedWeightKg: currentWeight,
    reason: {
      ar: `استمر بالوزن الحالي (${currentWeight} كغ) واستهدف رفع التكرارات تدريجياً نحو ${exercise.repMax}.`,
      fr: `Conservez ${currentWeight} kg et progressez vers ${exercise.repMax} répétitions avec une technique propre.`,
      en: `Stay at ${currentWeight} kg and build reps cleanly toward ${exercise.repMax} across all sets.`,
    },
  };
}

export function computeTrainingReadiness(state: AppState): {
  score: number;
  band: 'high' | 'moderate' | 'caution';
} {
  const sleepScore = Math.min(35, Math.max(10, (state.profile.sleepHrs / 8) * 35));
  const fatiguePenalty = (state.profile.fatigueLevel - 1) * 3.5;
  const maxJoint = Math.max(
    state.profile.kneeSensitivity,
    state.profile.wristSensitivity,
    state.profile.shoulderSensitivity
  );
  const jointPenalty = maxJoint * 2.5;
  const adherenceBonus = Math.min(15, state.sessionHistory.length * 3);

  const rawScore = Math.round(50 + sleepScore + adherenceBonus - fatiguePenalty - jointPenalty);
  const score = Math.max(20, Math.min(100, rawScore));
  const band = score >= 75 ? 'high' : score >= 52 ? 'moderate' : 'caution';
  return { score, band };
}
