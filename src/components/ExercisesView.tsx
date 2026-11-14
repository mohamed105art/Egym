import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GitCompare,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { MUSCLE_ZONE_ORDER, MUSCLE_ZONES } from '../data/muscles';
import { SCIENTIFIC_STUDIES } from '../data/studies';
import { tr, trText } from '../engine/i18n';
import { MuscleVolumeSummary } from '../engine/volume';
import {
  AppState,
  DifficultyLevel,
  EquipmentType,
  Exercise,
  ExSubTab,
  MuscleZoneKey,
} from '../types/app';
import { ExerciseImage } from './ExerciseImage';
import { MuscleMap14 } from './MuscleMap14';

interface ExercisesViewProps {
  state: AppState;
  exercises: Exercise[];
  volumeMap: Record<MuscleZoneKey, MuscleVolumeSummary>;
  onSetExSubTab: (tab: ExSubTab) => void;
  onSetSearch: (q: string) => void;
  onSetMuscleFilter: (m: MuscleZoneKey | 'ALL') => void;
  onSetEquipmentFilter: (eq: EquipmentType | 'ALL') => void;
  onSetDifficultyFilter: (diff: DifficultyLevel | 'ALL') => void;
  onToggleFavoritesOnly: () => void;
  onToggleFavorite: (id: string) => void;
  onSelectMuscle: (key: MuscleZoneKey) => void;
  onUpdateVolumeSettings: (patch: Partial<AppState['volumeSettings']>) => void;
  onSetCompareIds: (ids: [string, string]) => void;
  onOpenExercise: (exId: string) => void;
  onOpenLightbox: (exId: string) => void;
}

export const ExercisesView: React.FC<ExercisesViewProps> = ({
  state,
  exercises,
  volumeMap,
  onSetExSubTab,
  onSetSearch,
  onSetMuscleFilter,
  onSetEquipmentFilter,
  onSetDifficultyFilter,
  onToggleFavoritesOnly,
  onToggleFavorite,
  onSelectMuscle,
  onUpdateVolumeSettings,
  onSetCompareIds,
  onOpenExercise,
  onOpenLightbox,
}) => {
  const {
    lang,
    exSubTab,
    searchQuery,
    muscleFilter,
    equipmentFilter,
    difficultyFilter,
    favoritesOnly,
    favoriteExercises,
  } = state;

  const [cardFrameMap, setCardFrameMap] = useState<Record<string, 0 | 1>>({});

  const filteredExercises = exercises.filter((ex) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ex.id.toLowerCase().includes(q) ||
      ex.name.ar.toLowerCase().includes(q) ||
      ex.name.fr.toLowerCase().includes(q) ||
      ex.name.en.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q) ||
      ex.muscleLabel.ar.toLowerCase().includes(q) ||
      ex.muscleLabel.en.toLowerCase().includes(q);
    const matchesMuscle =
      muscleFilter === 'ALL' ||
      ex.primaryMuscle === muscleFilter ||
      ex.secondaryMuscles.includes(muscleFilter);
    const matchesEquip = equipmentFilter === 'ALL' || ex.equipment === equipmentFilter;
    const matchesDiff = difficultyFilter === 'ALL' || ex.difficulty === difficultyFilter;
    const matchesFav = !favoritesOnly || favoriteExercises.includes(ex.id);
    return matchesSearch && matchesMuscle && matchesEquip && matchesDiff && matchesFav;
  });

  const subTabs: { id: ExSubTab; label: string; icon: React.ReactNode; activeClass: string }[] = [
    {
      id: 'library',
      label: tr(lang, `المكتبة المصورة (${exercises.length})`, `Photos & Exercices (${exercises.length})`, `Photo Library (${exercises.length})`),
      icon: <ImageIcon className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20',
    },
    {
      id: 'map',
      label: tr(lang, 'خريطة العضلات (14)', 'Carte Muscles (14)', '14-Muscle Map'),
      icon: <Layers className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20',
    },
    {
      id: 'compare',
      label: tr(lang, 'مقارنة تمرينين بالصور', 'Comparer 2 Exercices', 'Photo Compare'),
      icon: <GitCompare className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20',
    },
    {
      id: 'science_pick',
      label: tr(lang, 'ملخص الأبحاث', 'Science & Études', 'Science Summary'),
      icon: <Sparkles className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20',
    },
    {
      id: 'quality',
      label: tr(lang, 'توثيق الصور', 'Sources Photos', 'Photo Sources'),
      icon: <ShieldCheck className="w-4 h-4" />,
      activeClass: 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20',
    },
  ];

  const quickMuscleGroups: { key: MuscleZoneKey | 'ALL'; label: string }[] = [
    { key: 'ALL', label: tr(lang, 'الكل (32)', 'Tous (32)', 'All (32)') },
    { key: 'chest', label: tr(lang, 'الصدر', 'Pectoraux', 'Chest') },
    { key: 'lats_back', label: tr(lang, 'الظهر', 'Dos', 'Back') },
    { key: 'side_delts', label: tr(lang, 'الأكتاف', 'Épaules', 'Shoulders') },
    { key: 'quads', label: tr(lang, 'الأفخاذ الأمامية', 'Quadriceps', 'Quads') },
    { key: 'hamstrings', label: tr(lang, 'الخلفية والأرداف', 'Ischios', 'Hamstrings') },
    { key: 'biceps', label: tr(lang, 'البايسبس', 'Biceps', 'Biceps') },
    { key: 'triceps', label: tr(lang, 'الترايسبس', 'Triceps', 'Triceps') },
  ];

  const exA = exercises.find((e) => e.id === state.compareIds[0]) || exercises[0];
  const exB = exercises.find((e) => e.id === state.compareIds[1]) || exercises[1];

  return (
    <div className="space-y-4">
      {/* Clear Sub-Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-indigo-100 dark:border-slate-800 shadow-sm">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetExSubTab(t.id)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
              exSubTab === t.id
                ? t.activeClass
                : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. PHOTO LIBRARY (32 EXERCISES) */}
      {exSubTab === 'library' && (
        <div className="space-y-4">
          {/* Quick Search + One-Tap Muscle Filter Bar */}
          <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-indigo-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSetSearch(e.target.value)}
                  placeholder={tr(lang, 'ابحث باسم التمرين أو العضلة أو الأداة...', 'Rechercher exercice, muscle...', 'Search exercise, muscle, equipment...')}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  aria-label={tr(lang, 'فلتر العضلة', 'Filtre muscle', 'Muscle Filter')}
                  value={muscleFilter}
                  onChange={(e) => onSetMuscleFilter(e.target.value as MuscleZoneKey | 'ALL')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">{tr(lang, 'جميع العضلات (14)', 'Tous les muscles (14)', 'All 14 Muscle Zones')}</option>
                  {MUSCLE_ZONE_ORDER.map((mKey) => (
                    <option key={mKey} value={mKey}>
                      {trText(lang, MUSCLE_ZONES[mKey].name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <select
                  aria-label={tr(lang, 'المعدات', 'Équipement', 'Equipment')}
                  value={equipmentFilter}
                  onChange={(e) => onSetEquipmentFilter(e.target.value as EquipmentType | 'ALL')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">{tr(lang, 'كل المعدات', 'Tout équipement', 'All Equipment')}</option>
                  {(['Dumbbell', 'Machine', 'Cable', 'Barbell', 'Bodyweight'] as const).map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-1.5">
                <select
                  aria-label={tr(lang, 'المستوى', 'Niveau', 'Difficulty')}
                  value={difficultyFilter}
                  onChange={(e) => onSetDifficultyFilter(e.target.value as DifficultyLevel | 'ALL')}
                  className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">{tr(lang, 'المستوى', 'Niveau', 'Level')}</option>
                  <option value="beginner">{tr(lang, 'مبتدئ', 'Débutant', 'Beginner')}</option>
                  <option value="intermediate">{tr(lang, 'متوسط', 'Intermédiaire', 'Intermediate')}</option>
                  <option value="advanced">{tr(lang, 'متقدم', 'Avancé', 'Advanced')}</option>
                </select>
                <button
                  type="button"
                  onClick={onToggleFavoritesOnly}
                  aria-label={tr(lang, 'المفضلة فقط', 'Favoris uniquement', 'Favorites Only')}
                  className={`p-2.5 rounded-xl border shrink-0 transition ${
                    favoritesOnly
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* One-Tap Quick Muscle Group Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll">
              {quickMuscleGroups.map((mg) => {
                const active = muscleFilter === mg.key;
                return (
                  <button
                    key={mg.key}
                    type="button"
                    onClick={() => onSetMuscleFilter(mg.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50/70 dark:bg-slate-800 text-indigo-900 dark:text-slate-300 hover:bg-indigo-100'
                    }`}
                  >
                    {mg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercise Cards Grid with Direct Reference Photos (Start & Peak Switcher) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((ex) => {
              const isFav = favoriteExercises.includes(ex.id);
              const frame = cardFrameMap[ex.id] ?? 0;
              return (
                <div
                  key={ex.id}
                  className="rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div>
                    <div className="relative h-52 bg-slate-100 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="w-full h-full block"
                        aria-label={trText(lang, ex.name)}
                      >
                        <ExerciseImage
                          exercise={ex}
                          frameIdx={frame}
                          alt={trText(lang, ex.name)}
                          className="w-full h-full object-cover"
                        />
                      </button>

                      {/* Favorite Star */}
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(ex.id)}
                        aria-label={tr(lang, 'مفضلة', 'Favori', 'Toggle Favorite')}
                        className={`absolute top-2.5 start-2.5 p-2 rounded-xl backdrop-blur-md border transition ${
                          isFav
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                            : 'bg-slate-900/65 text-white border-white/15 hover:bg-slate-900'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Full-Screen Zoom */}
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(ex.id)}
                        aria-label={tr(lang, 'تكبير الصورة', 'Zoom image', 'Zoom Photo')}
                        className="absolute top-2.5 end-2.5 p-2 rounded-xl bg-slate-900/65 text-white border border-white/15 hover:bg-indigo-600 transition"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Direct 1. Start / 2. Peak Photo Toggle on Card */}
                      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between gap-2">
                        <div className="inline-flex rounded-xl bg-slate-950/80 backdrop-blur-md p-0.5 border border-white/15 text-[11px] font-extrabold text-white">
                          <button
                            type="button"
                            onClick={() => setCardFrameMap((prev) => ({ ...prev, [ex.id]: 0 }))}
                            className={`px-2.5 py-1 rounded-lg transition ${
                              frame === 0 ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(lang, '1. البداية', '1. Départ', '1. Start')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardFrameMap((prev) => ({ ...prev, [ex.id]: 1 }))}
                            className={`px-2.5 py-1 rounded-lg transition ${
                              frame === 1 ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(lang, '2. الذروة', '2. Pic', '2. Peak')}
                          </button>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-slate-950/75 text-white text-[11px] font-extrabold mono-num">
                          {ex.sets}×{ex.repsLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span>{trText(lang, ex.muscleLabel)}</span>
                        <span className="mono-num text-slate-500 dark:text-slate-400">{ex.equipment}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                        {trText(lang, ex.name)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {trText(lang, ex.jointSafety)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold hover:from-indigo-500 hover:to-violet-500 transition text-center shadow-sm"
                    >
                      {tr(lang, 'عرض الصور والنصائح', 'Photos & Conseils', 'Photos & Tips')}
                    </button>
                    <a
                      href={ex.media.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-extrabold hover:bg-rose-600 hover:text-white transition"
                      aria-label={`YouTube ${trText(lang, ex.name)}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'فيديو', 'Vidéo', 'Video')}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 14-ZONE MUSCLE MAP */}
      {exSubTab === 'map' && (
        <MuscleMap14
          state={state}
          exercises={exercises}
          volumeMap={volumeMap}
          onSelectMuscle={onSelectMuscle}
          onUpdateVolumeSettings={onUpdateVolumeSettings}
          onOpenExercise={onOpenExercise}
        />
      )}

      {/* 3. SIDE-BY-SIDE PHOTO COMPARE */}
      {exSubTab === 'compare' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'مقارنة مصورة مباشرة بين تمرينين', 'Comparaison Photo Côte à Côte', 'Side-by-Side Exercise Photo Comparison')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <select
                aria-label="Compare Exercise A"
                value={exA.id}
                onChange={(e) => onSetCompareIds([e.target.value, exB.id])}
                className="w-full p-2.5 rounded-xl border border-indigo-200 dark:border-slate-700 bg-indigo-50/40 dark:bg-slate-950 font-bold"
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>{e.id} — {trText(lang, e.name)}</option>
                ))}
              </select>
              <select
                aria-label="Compare Exercise B"
                value={exB.id}
                onChange={(e) => onSetCompareIds([exA.id, e.target.value])}
                className="w-full p-2.5 rounded-xl border border-orange-200 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-950 font-bold"
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>{e.id} — {trText(lang, e.name)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[exA, exB].map((ex, i) => (
              <div
                key={`CMP_${ex.id}`}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[11px] font-extrabold mono-num ${i === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {ex.id} · {ex.equipment}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{trText(lang, ex.name)}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(ex.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition"
                    aria-label={tr(lang, 'تكبير الصور', 'Zoomer', 'Zoom photos')}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Start & Peak Reference Photos Side-by-Side */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <ExerciseImage exercise={ex} frameIdx={0} alt={`${trText(lang, ex.name)} 1`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold">
                      {tr(lang, '1. البداية', '1. Départ', '1. Start')}
                    </span>
                  </div>
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <ExerciseImage exercise={ex} frameIdx={1} alt={`${trText(lang, ex.name)} 2`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 rounded-md bg-orange-500/90 text-white text-[10px] font-bold">
                      {tr(lang, '2. الذروة', '2. Pic', '2. Peak')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div><strong>{tr(lang, 'العضلة الرئيسية:', 'Muscle principal :', 'Primary Muscle:')}</strong> {trText(lang, MUSCLE_ZONES[ex.primaryMuscle].name)}</div>
                  <div><strong>{tr(lang, 'المجموعات والتكرار:', 'Prescription :', 'Sets & Reps:')}</strong> <span className="mono-num font-bold">{ex.sets}×{ex.repsLabel} ({ex.rirLabel})</span></div>
                  <div><strong>{tr(lang, 'حماية المفصل:', 'Sécurité :', 'Joint Comfort:')}</strong> {trText(lang, ex.jointSafety)}</div>
                  <div><strong>{tr(lang, 'الخلاصة العلمية:', 'Science :', 'Science Note:')}</strong> {trText(lang, ex.scienceNote)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MEDIA & DATA QUALITY CENTER */}
      {exSubTab === 'quality' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                {tr(lang, 'سجل الصور المرجعية الموثقة (32/32 تمريناً)', 'Registre des Photos Références (32/32)', 'Verified Reference Photo Registry (32/32)')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr(
                  lang,
                  'جميع التمارين مرتبطة بصور البداية والذروة من قاعدة free-exercise-db (رخصة عامة Unlicense) مع روابط فيديو يوتيوب.',
                  'Toutes les entrées incluent les photos départ/pic de free-exercise-db (Unlicense) et un lien vidéo.',
                  'All 32 exercises include verified start and peak reference photos from free-exercise-db (Unlicense).'
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-2 text-start">ID</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'التمرين', 'Exercice', 'Exercise')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'المجلد الموثق', 'Dossier Image', 'Photo Folder')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'الرخصة', 'Licence', 'License')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'الحالة', 'Statut', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={`QA_${ex.id}`} className="border-b border-slate-100 dark:border-slate-800/70">
                    <td className="py-2 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{ex.id}</td>
                    <td className="py-2 px-2 font-semibold">
                      <button type="button" onClick={() => onOpenExercise(ex.id)} className="hover:underline text-start">
                        {trText(lang, ex.name)}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">{ex.media.folderId}</td>
                    <td className="py-2 px-2 text-[11px]">{ex.media.license}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {ex.media.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SCIENTIFIC EXERCISE SELECTION */}
      {exSubTab === 'science_pick' && (
        <div className="space-y-3">
          {SCIENTIFIC_STUDIES.slice(0, 4).map((st) => (
            <div
              key={st.id}
              className="rounded-2xl border border-amber-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {st.id} · {st.year} · {st.journal}
                </span>
                <a
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  <span>DOI: {st.doi}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{st.title}</h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, st.summary)}</p>
              <p className="text-slate-500 dark:text-slate-400">
                <strong>{tr(lang, 'القيود والحدود:', 'Limites :', 'Limitations:')}</strong> {trText(lang, st.limitations)}
              </p>
              {st.conflictingNote && (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 text-amber-900 dark:text-amber-200">
                  <strong>{tr(lang, 'تباين الأدلة:', 'Nuance scientifique :', 'Conflicting Evidence:')}</strong> {trText(lang, st.conflictingNote)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
