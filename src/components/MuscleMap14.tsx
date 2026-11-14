import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react';
import { MUSCLE_ZONE_ORDER, MUSCLE_ZONES } from '../data/muscles';
import { tr, trText } from '../engine/i18n';
import { MuscleVolumeSummary } from '../engine/volume';
import { AppState, Exercise, MuscleZoneKey } from '../types/app';

interface MuscleMap14Props {
  state: AppState;
  exercises: Exercise[];
  volumeMap: Record<MuscleZoneKey, MuscleVolumeSummary>;
  onSelectMuscle: (key: MuscleZoneKey) => void;
  onUpdateVolumeSettings: (patch: Partial<AppState['volumeSettings']>) => void;
  onOpenExercise: (exId: string) => void;
}

export const MuscleMap14: React.FC<MuscleMap14Props> = ({
  state,
  exercises,
  volumeMap,
  onSelectMuscle,
  onUpdateVolumeSettings,
  onOpenExercise,
}) => {
  const { lang, selectedMuscleKey, volumeSettings } = state;
  const selectedZone = MUSCLE_ZONES[selectedMuscleKey] || MUSCLE_ZONES.chest;
  const selectedSummary = volumeMap[selectedZone.key];

  const getStatusColors = (status: MuscleVolumeSummary['status'], selected: boolean) => {
    if (selected) {
      return {
        fill: '#7c3aed',
        stroke: '#a78bfa',
        opacity: 0.94,
      };
    }
    if (status === 'below_min') {
      return {
        fill: '#f59e0b',
        stroke: '#fbbf24',
        opacity: 0.6,
      };
    }
    if (status === 'high_diminishing') {
      return {
        fill: '#f43f5e',
        stroke: '#fb7185',
        opacity: 0.68,
      };
    }
    return {
      fill: '#0ea5e9',
      stroke: '#38bdf8',
      opacity: 0.65,
    };
  };

  const renderZonePath = (key: MuscleZoneKey, d: string, label: string) => {
    const summary = volumeMap[key];
    const isSel = selectedMuscleKey === key;
    const c = getStatusColors(summary?.status || 'optimal', isSel);
    return (
      <path
        key={`${key}_${label}`}
        d={d}
        fill={c.fill}
        fillOpacity={c.opacity}
        stroke={c.stroke}
        strokeWidth={isSel ? 2.2 : 1.1}
        className="cursor-pointer transition-all hover:fill-opacity-90 focus:outline-none"
        role="button"
        tabIndex={0}
        aria-label={`${trText(lang, MUSCLE_ZONES[key].name)}: ${summary?.effectivePlannedSets || 0} sets`}
        onClick={() => onSelectMuscle(key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectMuscle(key);
          }
        }}
      />
    );
  };

  const statusBadge = (status: MuscleVolumeSummary['status']) => {
    if (status === 'below_min') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          {tr(lang, 'أقل من الحد الأدنى', 'Sous le seuil', 'Below Min')}
        </span>
      );
    }
    if (status === 'high_diminishing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <Activity className="w-3.5 h-3.5" />
          {tr(lang, 'حجم مرتفع (عائد متناقص)', 'Volume élevé', 'High / Diminishing')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {tr(lang, 'النطاق الأمثل', 'Zone optimale', 'Optimal Range')}
      </span>
    );
  };

  const matchingExercises = exercises.filter(
    (ex) => ex.primaryMuscle === selectedZone.key || ex.secondaryMuscles.includes(selectedZone.key)
  );

  return (
    <div className="space-y-4">
      {/* Volume Calibration Controls */}
      <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {tr(lang, 'إعدادات احتساب الحجم العضلي الأسبوعي', 'Paramètres de Calcul du Volume', 'Weekly Volume Calibration')}
            </h3>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={volumeSettings.includeOptionalDayD}
              onChange={(e) => onUpdateVolumeSettings({ includeOptionalDayD: e.target.checked })}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            <span>
              {tr(lang, 'تضمين اليوم التكميلي الاختياري D', 'Inclure Jour D optionnel', 'Include Optional Bonus Day D')}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <span className="font-bold text-slate-600 dark:text-slate-400 block">
              {tr(lang, 'معامل المجموعات غير المباشرة (Synergist):', 'Pondération des séries indirectes :', 'Indirect / Synergist Set Weighting:')}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 0.25, 0.5, 1.0].map((coeff) => (
                <button
                  key={coeff}
                  type="button"
                  onClick={() => onUpdateVolumeSettings({ indirectCoefficient: coeff })}
                  className={`py-1.5 px-2 rounded-xl font-bold mono-num border transition ${
                    volumeSettings.indirectCoefficient === coeff
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  {coeff}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-slate-600 dark:text-slate-400 block">
              {tr(lang, 'عتبة القرب من الفشل لاحتساب المجموعة (RIR ≤):', 'Seuil d’effort RIR ≤ :', 'Effective Set Proximity (RIR ≤):')}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[2, 3, 4].map((rirMax) => (
                <button
                  key={rirMax}
                  type="button"
                  onClick={() => onUpdateVolumeSettings({ minProximityRir: rirMax })}
                  className={`py-1.5 px-2 rounded-xl font-bold mono-num border transition ${
                    volumeSettings.minProximityRir === rirMax
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-400'
                  }`}
                >
                  ≤ {rirMax} RIR
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Front/Back Anatomical SVG + Selected Muscle Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {tr(lang, 'خريطة العضلات التفاعلية (14 منطقة تشريحية)', 'Carte Anatomique Interactive (14 Zones)', 'Interactive 14-Zone Anatomical Map')}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> {tr(lang, 'منخفض', 'Bas', 'Low')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> {tr(lang, 'أمثل', 'Optimal', 'Optimal')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> {tr(lang, 'مرتفع', 'Élevé', 'High')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-600" /> {tr(lang, 'محدد', 'Sélection', 'Selected')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-950 dark:to-slate-950 rounded-2xl p-3 border border-indigo-100 dark:border-slate-800">
            {/* FRONT ANATOMY SVG */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 mb-1">
                {tr(lang, 'الجهة الأمامية', 'Vue Antérieure', 'Front View')}
              </span>
              <svg viewBox="0 0 180 320" className="w-full max-w-[200px] h-auto" role="img" aria-label="Anterior anatomical muscle map">
                <circle cx="90" cy="26" r="16" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.8" />
                <path d="M78 42 L102 42 L130 56 L146 118 L138 168 L124 166 L122 100 L118 168 L124 235 L118 302 L98 302 L95 232 L90 190 L85 232 L82 302 L62 302 L56 235 L62 168 L58 100 L56 166 L42 168 L34 118 L50 56 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />

                {renderZonePath('front_delts', 'M52 58 Q42 64 43 78 L57 82 L64 62 Z', 'fd_l')}
                {renderZonePath('front_delts', 'M128 58 Q138 64 137 78 L123 82 L116 62 Z', 'fd_r')}

                {renderZonePath('side_delts', 'M43 60 Q33 68 35 84 L44 84 L45 70 Z', 'sd_l')}
                {renderZonePath('side_delts', 'M137 60 Q147 68 145 84 L136 84 L135 70 Z', 'sd_r')}

                {renderZonePath('chest', 'M62 63 L88 67 L88 94 Q68 96 59 84 Z', 'ch_l')}
                {renderZonePath('chest', 'M118 63 L92 67 L92 94 Q112 96 121 84 Z', 'ch_r')}

                {renderZonePath('biceps', 'M40 86 L55 86 L53 122 L38 120 Z', 'bi_l')}
                {renderZonePath('biceps', 'M140 86 L125 86 L127 122 L142 120 Z', 'bi_r')}

                {renderZonePath('forearms', 'M37 125 L52 126 L46 165 L35 162 Z', 'fa_l')}
                {renderZonePath('forearms', 'M143 125 L128 126 L134 165 L145 162 Z', 'fa_r')}

                {renderZonePath('abs', 'M72 96 L108 96 L105 160 L75 160 Z', 'abs')}

                {renderZonePath('quads', 'M62 170 L87 174 L84 236 L60 232 Z', 'q_l')}
                {renderZonePath('quads', 'M118 170 L93 174 L96 236 L120 232 Z', 'q_r')}
              </svg>
            </div>

            {/* BACK ANATOMY SVG */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 mb-1">
                {tr(lang, 'الجهة الخلفية', 'Vue Postérieure', 'Back View')}
              </span>
              <svg viewBox="0 0 180 320" className="w-full max-w-[200px] h-auto" role="img" aria-label="Posterior anatomical muscle map">
                <circle cx="90" cy="26" r="16" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.8" />
                <path d="M78 42 L102 42 L130 56 L146 118 L138 168 L124 166 L122 100 L118 168 L124 235 L118 302 L98 302 L95 232 L90 190 L85 232 L82 302 L62 302 L56 235 L62 168 L58 100 L56 166 L42 168 L34 118 L50 56 Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />

                {renderZonePath('traps', 'M76 44 L104 44 L118 62 L90 88 L62 62 Z', 'traps')}

                {renderZonePath('rear_delts', 'M46 58 L62 64 L57 83 L42 79 Z', 'rd_l')}
                {renderZonePath('rear_delts', 'M134 58 L118 64 L123 83 L138 79 Z', 'rd_r')}

                {renderZonePath('lats_back', 'M61 84 L88 90 L88 134 L67 128 Z', 'lat_l')}
                {renderZonePath('lats_back', 'M119 84 L92 90 L92 134 L113 128 Z', 'lat_r')}

                {renderZonePath('triceps', 'M39 86 L55 86 L53 122 L38 120 Z', 'tri_l')}
                {renderZonePath('triceps', 'M141 86 L125 86 L127 122 L142 120 Z', 'tri_r')}

                {renderZonePath('glutes', 'M63 144 Q90 140 117 144 L121 178 Q90 184 59 178 Z', 'glutes')}

                {renderZonePath('hamstrings', 'M60 182 L86 184 L83 236 L59 232 Z', 'ham_l')}
                {renderZonePath('hamstrings', 'M120 182 L94 184 L97 236 L121 232 Z', 'ham_r')}

                {renderZonePath('calves', 'M61 242 L83 242 L79 288 L63 288 Z', 'cal_l')}
                {renderZonePath('calves', 'M119 242 L97 242 L101 288 L117 288 Z', 'cal_r')}
              </svg>
            </div>
          </div>

          {/* Accessible 14-Zone Quick Button Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
            {MUSCLE_ZONE_ORDER.map((key) => {
              const z = MUSCLE_ZONES[key];
              const vol = volumeMap[key];
              const isSel = selectedMuscleKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectMuscle(key)}
                  className={`p-2.5 rounded-xl border text-start transition ${
                    isSel
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{trText(lang, z.name)}</div>
                  <div className={`text-[10px] mono-num mt-0.5 ${isSel ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {vol?.effectivePlannedSets ?? 0} {tr(lang, 'مجموعة', 'séries', 'sets')} · {vol?.weeklyFrequency ?? 0}x/{tr(lang, 'أسبوع', 'sem', 'wk')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Zone Detailed Panel */}
        <div className="lg:col-span-5 rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {trText(lang, selectedZone.name)}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {trText(lang, selectedZone.functionLabel)}
              </p>
            </div>
            {statusBadge(selectedSummary?.status || 'optimal')}
          </div>

          {/* Quantitative Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 p-2.5">
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block">
                {tr(lang, 'المجموعات المباشرة', 'Séries directes', 'Direct Sets')}
              </span>
              <span className="text-lg font-extrabold mono-num text-slate-900 dark:text-slate-100">
                {selectedSummary?.plannedDirectSets ?? 0}
              </span>
            </div>
            <div className="rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50 p-2.5">
              <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold block">
                {tr(lang, `غير المباشرة (${volumeSettings.indirectCoefficient}x)`, `Indirectes (${volumeSettings.indirectCoefficient}x)`, `Indirect (${volumeSettings.indirectCoefficient}x)`)}
              </span>
              <span className="text-lg font-extrabold mono-num text-sky-600 dark:text-sky-400">
                +{selectedSummary?.plannedIndirectSets ?? 0}
              </span>
            </div>
            <div className="rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50 p-2.5">
              <span className="text-[11px] text-orange-700 dark:text-orange-300 font-semibold block">
                {tr(lang, 'الإجمالي الفعال / الأسبوع', 'Total effectif / sem.', 'Effective Weekly Total')}
              </span>
              <span className="text-lg font-extrabold mono-num text-orange-600 dark:text-orange-400">
                {selectedSummary?.effectivePlannedSets ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mono-num">
                {tr(lang, 'الهدف العام:', 'Cible:', 'Ref:')} {selectedZone.optimalRange[0]}–{selectedZone.optimalRange[1]}
              </span>
            </div>
            <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 p-2.5">
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">
                {tr(lang, 'التكرار والاستشفاء', 'Fréquence & Récup.', 'Frequency & Recovery')}
              </span>
              <span className="text-lg font-extrabold mono-num text-slate-900 dark:text-slate-100">
                {selectedSummary?.weeklyFrequency ?? 0}x / ~{selectedZone.recoveryHours}h
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 p-3 flex items-start gap-2 text-xs text-sky-900 dark:text-sky-200">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
            <p>
              {tr(
                lang,
                `تم احتساب هذا التوزيع بناءً على الأيام النشطة حالياً (${volumeSettings.includeOptionalDayD ? 'A/B/C/D' : 'A/B/C فقط'}) ومعامل التحفيز غير المباشر (${volumeSettings.indirectCoefficient}x). وفق Pelland et al. (2026)، حتى 4–6 مجموعات قريبة من الفشل تحقق بناءً ممتازاً.`,
                `Calcul basé sur les séances actives (${volumeSettings.includeOptionalDayD ? 'A/B/C/D' : 'A/B/C'}) et le coefficient (${volumeSettings.indirectCoefficient}x). Selon Pelland et al. (2026), 4–6 séries intenses stimulent déjà l’hypertrophie.`,
                `Calculated from active days (${volumeSettings.includeOptionalDayD ? 'A/B/C/D' : 'A/B/C only'}) at ${volumeSettings.indirectCoefficient}x indirect weighting. Per Pelland et al. (2026), even 4–6 high-effort sets/week drive solid hypertrophy.`
              )}
            </p>
          </div>

          {/* Matching Exercises */}
          <div className="space-y-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr(lang, `التمارين المستهدفة لهذه المنطقة (${matchingExercises.length})`, `Exercices ciblant cette zone (${matchingExercises.length})`, `Matching Exercises (${matchingExercises.length})`)}
            </h5>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pe-1">
              {matchingExercises.map((ex) => {
                const isPrimary = ex.primaryMuscle === selectedZone.key;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => onOpenExercise(ex.id)}
                    className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-400 text-start transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {trText(lang, ex.name)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ex.equipment} · {ex.sets}×{ex.repsLabel}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isPrimary
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isPrimary ? tr(lang, 'أساسي', 'Direct', 'Direct') : tr(lang, 'مساعد', 'Synergiste', 'Synergist')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
