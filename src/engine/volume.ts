import { MUSCLE_ZONE_ORDER, MUSCLE_ZONES } from '../data/muscles';
import {
  AppState,
  EvidenceGrade,
  Exercise,
  MuscleZoneInfo,
  MuscleZoneKey,
  RigMovementType,
  ScientificStudy,
  SetLog,
  TrilingualText,
  WorkoutDayKey,
} from '../types/app';

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

export interface KinematicRigDetails {
  rigType: RigMovementType;
  archetypeName: TrilingualText;
  forceVector: TrilingualText;
  resistanceProfile: TrilingualText;
  jointAngles: TrilingualText;
  romTypeLabel: TrilingualText;
  movementPattern: TrilingualText;
  jointAction: TrilingualText;
  startCue: TrilingualText;
  steps: TrilingualText;
  jointSafety: TrilingualText;
  commonErrors: TrilingualText;
}

export interface ExerciseComparisonProfile {
  exercise: Exercise;
  primaryMuscle: MuscleZoneInfo;
  secondaryMuscles: MuscleZoneInfo[];
  evidenceGrade: EvidenceGrade;
  evidenceGradeLabel: TrilingualText;
  linkedStudies: ScientificStudy[];
  kinematicRig: KinematicRigDetails;
}

export function getEvidenceGradeLabel(grade: EvidenceGrade): TrilingualText {
  switch (grade) {
    case 'strong':
      return {
        ar: 'درجة A — دليل علمي قوي (Strong)',
        fr: 'Grade A — Preuve Scientifique Forte',
        en: 'Grade A — Strong Evidence',
      };
    case 'moderate':
      return {
        ar: 'درجة B — دليل علمي متوسط (Moderate)',
        fr: 'Grade B — Preuve Modérée',
        en: 'Grade B — Moderate Evidence',
      };
    case 'limited':
      return {
        ar: 'درجة C — دليل محدود (Limited)',
        fr: 'Grade C — Preuve Limitée',
        en: 'Grade C — Limited Evidence',
      };
    default:
      return {
        ar: 'درجة C — دليل أولي (Preliminary)',
        fr: 'Grade C — Preuve Préliminaire',
        en: 'Grade C — Preliminary Evidence',
      };
  }
}

export function getRomTypeLabel(romType: Exercise['romType']): TrilingualText {
  switch (romType) {
    case 'lengthened_bias':
      return {
        ar: 'انحياز للإطالة القصوى (Lengthened Bias)',
        fr: 'Biais d’étirement (Lengthened Bias)',
        en: 'Lengthened-State Tension Bias',
      };
    case 'shortened_bias':
      return {
        ar: 'انحياز للانقباض الأقصى (Shortened Bias)',
        fr: 'Biais de contraction (Shortened Bias)',
        en: 'Shortened-Peak Tension Bias',
      };
    case 'isometric_safe':
      return {
        ar: 'ثبات محوري آمن (Isometric / Controlled)',
        fr: 'Contrôle isométrique sécurisé',
        en: 'Controlled / Isometric Joint-Safe',
      };
    default:
      return {
        ar: 'مدى حركي كامل متوازن (Full ROM)',
        fr: 'Amplitude complète (Full ROM)',
        en: 'Full Range of Motion (Full ROM)',
      };
  }
}

export function getKinematicRigSpec(rigType: RigMovementType): {
  archetypeName: TrilingualText;
  forceVector: TrilingualText;
  resistanceProfile: TrilingualText;
  jointAngles: TrilingualText;
} {
  if (rigType === 'incline_press' || rigType === 'flat_press' || rigType === 'shoulder_press') {
    return {
      archetypeName: {
        ar: `نموذج الدفع متعدد المفاصل (${rigType})`,
        fr: `Modèle de poussée polyarticulaire (${rigType})`,
        en: `Multi-Joint Pressing Rig (${rigType})`,
      },
      forceVector: {
        ar: 'متجه دفع محوري في المستوى الكتفي الآمن (30°–45°)',
        fr: 'Vecteur de poussée dans le plan scapulaire (30°–45°)',
        en: 'Scapular-plane pressing vector (30°–45° humeral path)',
      },
      resistanceProfile: {
        ar: 'ذروة العزم الميكانيكي في الثلث السفلي (وضعية الإطالة)',
        fr: 'Couple maximal en bas du mouvement (étirement)',
        en: 'Peak mechanical torque in bottom lengthened third',
      },
      jointAngles: {
        ar: 'زاوية العضد 45°–60° عن الجذع · معصم محايد تماماً',
        fr: 'Angle huméral 45°–60° · Poignet neutre aligné',
        en: '45°–60° humeral abduction · stacked neutral wrist',
      },
    };
  }

  if (
    rigType === 'chest_row' ||
    rigType === 'cable_row' ||
    rigType === 'lat_pulldown' ||
    rigType === 'face_pull' ||
    rigType === 'reverse_fly'
  ) {
    return {
      archetypeName: {
        ar: `نموذج السحب الظهري والمفصلي (${rigType})`,
        fr: `Modèle de tirage scapulo-huméral (${rigType})`,
        en: `Scapulo-Humeral Pulling Rig (${rigType})`,
      },
      forceVector: {
        ar: 'سحب محوري مع مسار إطالة أمامي/علوي كامل للوح الكتف',
        fr: 'Traction axiale avec protraction/rétraction scapulaire',
        en: 'Axial pull with controlled scapular protraction-retraction',
      },
      resistanceProfile: {
        ar: 'توتر مستمر متوازن عبر كامل المسار الحركي',
        fr: 'Tension continue équilibrée sur toute l’amplitude',
        en: 'Smooth continuous tension curve across full excursion',
      },
      jointAngles: {
        ar: 'مسار المرفق بمحاذاة الألياف المستهدفة (30°–75°)',
        fr: 'Trajectoire du coude alignée aux fibres (30°–75°)',
        en: 'Elbow path aligned to target fibers (30°–75°)',
      },
    };
  }

  if (
    rigType === 'leg_press' ||
    rigType === 'hack_squat' ||
    rigType === 'split_squat' ||
    rigType === 'leg_extension'
  ) {
    return {
      archetypeName: {
        ar: `نموذج الدفع السفلي وثبات الركبة (${rigType})`,
        fr: `Modèle membre inférieur dominante genou (${rigType})`,
        en: `Knee-Dominant Lower-Body Rig (${rigType})`,
      },
      forceVector: {
        ar: 'توجيه الحمل عبر منتصف القدم مع ثبات الحوض والعمود الفقري',
        fr: 'Charge dirigée au milieu du pied avec bassin stabilisé',
        en: 'Mid-foot axial loading with externally stabilized pelvis',
      },
      resistanceProfile: {
        ar: 'أقصى تحفيز للعضلة الرباعية عند ثني الركبة العميق والمتحكم به',
        fr: 'Tension maximale sur le quadriceps en flexion contrôlée',
        en: 'High quadriceps tension in controlled knee flexion',
      },
      jointAngles: {
        ar: 'ثني الركبة 90°–115° بمحاذاة مشط القدم دون تقوس داخلي',
        fr: 'Flexion genou 90°–115° alignée aux orteils sans valgus',
        en: '90°–115° knee flexion tracking cleanly over toes',
      },
    };
  }

  if (
    rigType === 'seated_leg_curl' ||
    rigType === 'lying_leg_curl' ||
    rigType === 'rdl' ||
    rigType === 'hip_thrust' ||
    rigType === 'back_extension'
  ) {
    return {
      archetypeName: {
        ar: `نموذج السلسلة الخلفية ومفصل الورك (${rigType})`,
        fr: `Modèle chaîne postérieure & hanche (${rigType})`,
        en: `Posterior-Chain & Hip-Hinge Rig (${rigType})`,
      },
      forceVector: {
        ar: 'عزم دوران محوري على مفصل الورك/الركبة مع إطالة الأوتار الخلفية',
        fr: 'Couple ciblé sur hanche/genou avec étirement des ischios',
        en: 'Hip/knee hinge torque emphasizing biarticular hamstring stretch',
      },
      resistanceProfile: {
        ar: 'تحفيز عالٍ في وضعية الإطالة (ثني الورك في الجلوس أو الانحناء)',
        fr: 'Stimulus supérieur en position étirée (hanche fléchie)',
        en: 'Elevated tension in hip-flexed lengthened position',
      },
      jointAngles: {
        ar: 'ثبات العمود الفقري المحايد · حركة من الورك أو الركبة حصراً',
        fr: 'Rachis neutre verrouillé · Mouvement pur hanche/genou',
        en: 'Neutral spine lock · pure hip/knee articulation',
      },
    };
  }

  return {
    archetypeName: {
      ar: `نموذج العزل الميكانيكي الدقيق (${rigType})`,
      fr: `Modèle d’isolation mono-articulaire (${rigType})`,
      en: `Single-Joint Isolation Rig (${rigType})`,
    },
    forceVector: {
      ar: 'مسار دائري معزول حول محور مفصل واحد دون أرجحة الجذع',
      fr: 'Arc mono-articulaire strict sans élan du buste',
      en: 'Strict rotary arc around a single joint axis without momentum',
    },
    resistanceProfile: {
      ar: 'توتر مباشر ومستمر على العضلة المستهدفة بأقل إجهاد مفصلي',
      fr: 'Tension ciblée directe avec stress articulaire minimal',
      en: 'Direct isolated tension with minimal systemic joint stress',
    },
    jointAngles: {
      ar: 'تثبيت المفصل المجاور بالكامل وعزل الحركة في المفصل العامل',
      fr: 'Articulation proximale fixe · Isolation pure',
      en: 'Proximal joint locked · pure distal joint excursion',
    },
  };
}

export function buildExerciseComparisonProfile(
  exercise: Exercise,
  studiesDb: ScientificStudy[]
): ExerciseComparisonProfile {
  const primaryMuscle = MUSCLE_ZONES[exercise.primaryMuscle];
  const secondaryMuscles = exercise.secondaryMuscles
    .map((mKey) => MUSCLE_ZONES[mKey])
    .filter((m): m is MuscleZoneInfo => Boolean(m));
  const linkedStudies = studiesDb.filter((st) => exercise.studyRefIds.includes(st.id));
  const spec = getKinematicRigSpec(exercise.rigType);

  return {
    exercise,
    primaryMuscle,
    secondaryMuscles,
    evidenceGrade: exercise.evidenceGrade,
    evidenceGradeLabel: getEvidenceGradeLabel(exercise.evidenceGrade),
    linkedStudies,
    kinematicRig: {
      rigType: exercise.rigType,
      archetypeName: spec.archetypeName,
      forceVector: spec.forceVector,
      resistanceProfile: spec.resistanceProfile,
      jointAngles: spec.jointAngles,
      romTypeLabel: getRomTypeLabel(exercise.romType),
      movementPattern: exercise.movementPattern,
      jointAction: exercise.jointAction,
      startCue: exercise.startCue,
      steps: exercise.steps,
      jointSafety: exercise.jointSafety,
      commonErrors: exercise.commonErrors,
    },
  };
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
