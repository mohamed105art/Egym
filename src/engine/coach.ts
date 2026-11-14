import { MUSCLE_ZONES } from '../data/muscles';
import { AppState, CoachRecommendation, Exercise } from '../types/app';
import { MuscleVolumeSummary } from './volume';

export function generateCoachInsights(
  state: AppState,
  exercises: Exercise[],
  volumeMap: Record<string, MuscleVolumeSummary>
): CoachRecommendation[] {
  const recs: CoachRecommendation[] = [];

  // 1. Strength progression check on tracked exercises
  for (const [exId, points] of Object.entries(state.e1rmHistory)) {
    if (points.length >= 2) {
      const first = points[0].value;
      const latest = points[points.length - 1].value;
      const prev = points[points.length - 2].value;
      const ex = exercises.find((e) => e.id === exId);
      const exName = ex?.name.en || exId;

      if (latest > prev) {
        const gainPct = (((latest - first) / Math.max(1, first)) * 100).toFixed(1);
        recs.push({
          id: `STRENGTH_${exId}`,
          type: 'strength_up',
          severity: 'positive',
          confidence: 'high',
          title: {
            ar: `تطور مستمر في القوة (${ex?.name.ar || exId})`,
            fr: `Progression de force (${ex?.name.fr || exId})`,
            en: `Steady Strength Gain (${exName})`,
          },
          observed: {
            ar: `ارتفعت القوة التقديرية e1RM من ${first} كغ إلى ${latest} كغ (+${gainPct}%).`,
            fr: `Votre 1RM estimé est passé de ${first} kg à ${latest} kg (+${gainPct}%).`,
            en: `Estimated 1RM progressed from ${first} kg to ${latest} kg (+${gainPct}%).`,
          },
          dataBasis: {
            ar: `استناداً إلى ${points.length} نقاط قياس مسجلة في سجل الأداء.`,
            fr: `Basé sur ${points.length} séances enregistrées.`,
            en: `Based on ${points.length} logged e1RM entries.`,
          },
          rationale: {
            ar: 'التدرج الإيجابي يدل على كفاية الحجم الحالي والاستشفاء؛ لا حاجة لزيادة المجموعات عشوائياً.',
            fr: 'La progression confirme que le volume et la récupération actuels fonctionnent.',
            en: 'Upward strength progression confirms current volume and recovery are effective; no extra sets needed.',
          },
          expectedChange: {
            ar: 'استمر بنظام Double Progression وحافظ على جودة الأداء.',
            fr: 'Poursuivez la double progression avec la même rigueur technique.',
            en: 'Continue Double Progression while keeping technique strict.',
          },
          limitationsNote: {
            ar: 'تقدير e1RM يعتمد على معادلة Epley وقد يختلف في التكرارات العالية (>12).',
            fr: 'L’e1RM reste une estimation mathématique (formule d’Epley).',
            en: 'e1RM is an Epley approximation and is less precise above 12 reps.',
          },
        });
        break;
      } else if (points.length >= 3 && latest <= prev && prev <= points[points.length - 3].value) {
        recs.push({
          id: `PLATEAU_${exId}`,
          type: 'plateau',
          severity: 'warning',
          confidence: 'moderate',
          title: {
            ar: `ملاحظة ثبات أداء (${ex?.name.ar || exId})`,
            fr: `Plateau détecté (${ex?.name.fr || exId})`,
            en: `Performance Plateau (${exName})`,
          },
          observed: {
            ar: `استقر e1RM حول ${latest} كغ خلال آخر 3 قراءات.`,
            fr: `L’e1RM stagne autour de ${latest} kg sur les 3 dernières mesures.`,
            en: `e1RM remained flat around ${latest} kg across the last 3 checks.`,
          },
          dataBasis: {
            ar: `سجل e1RM، وساعات النوم (${state.profile.sleepHrs}h)، ومستوى التعب (${state.profile.fatigueLevel}/10).`,
            fr: `Historique e1RM, sommeil (${state.profile.sleepHrs}h) et fatigue (${state.profile.fatigueLevel}/10).`,
            en: `e1RM trend, sleep (${state.profile.sleepHrs}h), and fatigue (${state.profile.fatigueLevel}/10).`,
          },
          rationale: {
            ar: 'ثبات الأداء لا يعني دائماً الحاجة لإضافة مجموعات؛ راجع النوم، انتظام الحصص، البروتين، والتقنية قبل تعديل الحجم.',
            fr: 'Un plateau ne justifie pas d’ajouter des séries d’emblée ; vérifiez sommeil, assiduité et apport protéique.',
            en: 'A plateau does not automatically mean adding sets; audit sleep, nutrition, adherence, and technique first.',
          },
          expectedChange: {
            ar: 'تحسن جودة النوم أو تثبيت التدرج الأسبوعي قد يكسر الثبات دون إرهاق إضافي.',
            fr: 'Optimiser la récupération ou micro-charger débloque souvent la progression.',
            en: 'Addressing recovery or micro-loading often restores progress without adding fatigue.',
          },
          limitationsNote: {
            ar: 'تعتمد الثقة على دقة تسجيل RIR والتكرارات في الجلسات السابقة.',
            fr: 'La fiabilité dépend de la régularité de saisie des séances.',
            en: 'Confidence depends on consistent set and RIR logging.',
          },
        });
        break;
      }
    }
  }

  // 2. Fatigue & sleep deload suggestion (requires user approval!)
  const recentJointHigh =
    state.jointResponseLogs.length > 0 &&
    state.jointResponseLogs[state.jointResponseLogs.length - 1].nextDayDiscomfort >= 5;

  if (state.profile.fatigueLevel >= 7 || state.profile.sleepHrs < 6 || recentJointHigh) {
    recs.push({
      id: 'FATIGUE_DELOAD',
      type: 'deload',
      severity: 'warning',
      confidence: 'high',
      title: {
        ar: 'مؤشر إجهاد أو انزعاج مفصلي مرتفع — اقتراح تخفيف اختياري',
        fr: 'Fatigue ou sensibilité élevée — Allègement suggéré',
        en: 'Elevated Fatigue / Joint Sensitivity — Optional Deload',
      },
      observed: {
        ar: `النوم ${state.profile.sleepHrs} ساعات، التعب ${state.profile.fatigueLevel}/10، وحساسية الركبة ${state.profile.kneeSensitivity}/10.`,
        fr: `Sommeil ${state.profile.sleepHrs}h, fatigue ${state.profile.fatigueLevel}/10, sensibilité genou ${state.profile.kneeSensitivity}/10.`,
        en: `Sleep ${state.profile.sleepHrs}h, fatigue ${state.profile.fatigueLevel}/10, knee sensitivity ${state.profile.kneeSensitivity}/10.`,
      },
      dataBasis: {
        ar: 'مؤشرات الجاهزية والاستجابة المفصلية المسجلة اليوم.',
        fr: 'Données de préparation et d’inconfort articulaire saisies.',
        en: 'Logged sleep, systemic fatigue, and joint response tracking.',
      },
      rationale: {
        ar: 'بدلاً من الإلغاء أو فرض أسبوع تخفيف ثابت، يساعد تقليل الحجم أو الشدة مؤقتاً (10–15%) في استعادة الأداء وتهدئة المفصل. (توجيه رياضي، وليس تشخيصاً طبياً؛ توقف وراجع مختصاً إذا ظهر ألم حاد).',
        fr: 'Réduire temporairement la charge de 10–15% favorise la récupération. Ceci est un conseil sportif, non médical ; consultez en cas de douleur aiguë.',
        en: 'A temporary 10–15% load reduction helps dissipate fatigue without forcing a fixed schedule. Athletic guidance only—stop and seek medical care for acute pain.',
      },
      expectedChange: {
        ar: 'استعادة الجاهزية الحركية دون فقدان الكتلة العضلية.',
        fr: 'Restauration de la fraîcheur sans perte musculaire.',
        en: 'Restored performance readiness while preserving muscle mass.',
      },
      limitationsNote: {
        ar: 'لن يتم تعديل أي وزن في برنامجك إلا بعد موافقتك الصريحة.',
        fr: 'Aucune modification automatique sans votre validation explicite.',
        en: 'No changes are applied unless you explicitly approve below.',
      },
      actionLabel: {
        ar: 'اعتماد تخفيف الأحمال 15% مؤقتاً',
        fr: 'Approuver l’allègement de 15%',
        en: 'Approve 15% Load Reduction',
      },
      actionType: 'deload_15',
    });
  }

  // 3. Weekly body weight average trend
  if (state.measurements.length >= 2) {
    const prevM = state.measurements[state.measurements.length - 2];
    const lastM = state.measurements[state.measurements.length - 1];
    const diff = Number((lastM.weight - prevM.weight).toFixed(1));
    recs.push({
      id: 'WEIGHT_TREND',
      type: 'weight_trend',
      severity: 'info',
      confidence: state.measurements.length >= 4 ? 'high' : 'moderate',
      title: {
        ar: 'تحليل اتجاه الوزن والقياسات',
        fr: 'Tendance du poids et des mensurations',
        en: 'Body Weight & Measurement Trend',
      },
      observed: {
        ar: `الوزن انتقل من ${prevM.weight} كغ إلى ${lastM.weight} كغ (${diff >= 0 ? '+' : ''}${diff} كغ)، والخصر ${lastM.waist} سم.`,
        fr: `Poids passé de ${prevM.weight} kg à ${lastM.weight} kg (${diff >= 0 ? '+' : ''}${diff} kg), tour de taille ${lastM.waist} cm.`,
        en: `Weight shifted from ${prevM.weight} kg to ${lastM.weight} kg (${diff >= 0 ? '+' : ''}${diff} kg); waist ${lastM.waist} cm.`,
      },
      dataBasis: {
        ar: `مقارنة آخر قياسين مسجلين (${prevM.date} مقابل ${lastM.date}).`,
        fr: `Comparaison des deux dernières mesures (${prevM.date} vs ${lastM.date}).`,
        en: `Comparison of latest entries (${prevM.date} vs ${lastM.date}).`,
      },
      rationale: {
        ar: 'يُعتمد متوسط تغيّر الوزن الأسبوعي بدلاً من قراءة يوم واحد لأن احتباس السوائل يسبب تذبذباً طبيعياً.',
        fr: 'L’évaluation se base sur la tendance sur plusieurs jours plutôt qu’une pesée isolée.',
        en: 'Weekly trends filter out daily hydration fluctuations before adjusting calories.',
      },
      expectedChange: {
        ar: 'ثبات الخصر أو نقصانه مع تحسن الأوزان يشير إلى إعادة تركيب جسم فعالة.',
        fr: 'Une taille stable ou en baisse avec force montante indique une recomposition efficace.',
        en: 'Stable/decreasing waist alongside rising lifts indicates effective recomposition.',
      },
      limitationsNote: {
        ar: 'سجّل 3–4 قراءات صباحية على الريق أسبوعياً لدقة أعلى.',
        fr: 'Prenez 3–4 pesées matinales à jeun pour affiner la moyenne.',
        en: 'Log 3–4 morning fasted weigh-ins per week for highest confidence.',
      },
    });
  }

  // 4. Low coverage muscle check
  const lowMuscles = Object.values(volumeMap).filter((v) => v.status === 'below_min');
  if (lowMuscles.length > 0) {
    const sampleNames = lowMuscles
      .slice(0, 3)
      .map((m) => MUSCLE_ZONES[m.key]?.name.en || m.key)
      .join(', ');
    recs.push({
      id: 'LOW_COVERAGE',
      type: 'low_volume',
      severity: 'info',
      confidence: 'moderate',
      title: {
        ar: `عضلات بحاجة لمراجعة التغطية الأسبوعية (${lowMuscles.length})`,
        fr: `Groupes à faible volume hebdomadaire (${lowMuscles.length})`,
        en: `Muscles Below Minimum Target (${lowMuscles.length})`,
      },
      observed: {
        ar: `المناطق التالية دون الحد الأدنى التقديري في البرنامج الأساسي الحالي: ${lowMuscles.slice(0, 3).map((m) => MUSCLE_ZONES[m.key].name.ar).join('، ')}.`,
        fr: `Zones sous le seuil minimal dans le plan actif : ${lowMuscles.slice(0, 3).map((m) => MUSCLE_ZONES[m.key].name.fr).join(', ')}.`,
        en: `Zones below estimated floor in current active days: ${sampleNames}.`,
      },
      dataBasis: {
        ar: `إعداد معامل المجموعات غير المباشرة (${state.volumeSettings.indirectCoefficient}x) وتفعيل اليوم D (${state.volumeSettings.includeOptionalDayD ? 'نعم' : 'لا'}).`,
        fr: `Coefficient indirect (${state.volumeSettings.indirectCoefficient}x) et Jour D (${state.volumeSettings.includeOptionalDayD ? 'actif' : 'inactif'}).`,
        en: `Indirect weighting (${state.volumeSettings.indirectCoefficient}x) and Optional Day D (${state.volumeSettings.includeOptionalDayD ? 'on' : 'off'}).`,
      },
      rationale: {
        ar: 'إذا كنت تتدرب 3 أيام A/B/C فقط، فبعض العضلات الصغيرة كالأرداف المباشرة أو الترابيس تتلقى تحفيزاً أقل؛ يمكنك استبدال تمرين أو تفعيل اليوم التكميلي D اختيارياً.',
        fr: 'Sur 3 séances A/B/C, certains groupes secondaires reçoivent moins de séries ; vous pouvez ajuster un exercice ou activer le Jour D.',
        en: 'On a 3-day A/B/C split, some specialized zones get lower direct volume; swap an exercise or optionally enable Bonus Day D.',
      },
      expectedChange: {
        ar: 'توزيع متوازن دون رفع الإجهاد الكلي للجلسة الواحدة.',
        fr: 'Meilleure répartition hebdomadaire sans surcharger une séance.',
        en: 'Balanced weekly coverage without bloating single-session duration.',
      },
      limitationsNote: {
        ar: 'حسب Pelland et al. (2026)، حتى 4–6 مجموعات عالية الجودة قد تكفي للتطور المستمر.',
        fr: 'Selon Pelland et al. (2026), 4–6 séries intenses suffisent déjà à stimuler l’hypertrophie.',
        en: 'Per Pelland et al. (2026), even 4–6 high-effort sets/week stimulate solid hypertrophy.',
      },
    });
  }

  return recs;
}
