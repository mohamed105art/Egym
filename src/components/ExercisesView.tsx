import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
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
import {
  buildExerciseComparisonProfile,
  MuscleVolumeSummary,
} from '../engine/volume';
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
  const [compareSourceScope, setCompareSourceScope] = useState<'favorites' | 'all'>('favorites');
  const [activeSlotToAssign, setActiveSlotToAssign] = useState<0 | 1>(0);

  const favoriteExerciseObjects = useMemo(
    () => exercises.filter((ex) => favoriteExercises.includes(ex.id)),
    [exercises, favoriteExercises]
  );

  // Pool of exercises shown in comparison selectors (defaults to user's favorites when >= 2 favorites exist)
  const selectablePool =
    compareSourceScope === 'favorites' && favoriteExerciseObjects.length >= 2
      ? favoriteExerciseObjects
      : exercises;

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

  const subTabs: { id: ExSubTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'library',
      label: tr(
        lang,
        `المكتبة (${exercises.length})`,
        `Photos (${exercises.length})`,
        `Library (${exercises.length})`
      ),
      icon: <ImageIcon className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'map',
      label: tr(lang, 'العضلات (14)', 'Muscles (14)', 'Map (14)'),
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'compare',
      label: tr(
        lang,
        `مقارنة (${favoriteExercises.length})`,
        `Comparer (${favoriteExercises.length})`,
        `Compare (${favoriteExercises.length})`
      ),
      icon: <GitCompare className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'science_pick',
      label: tr(lang, 'الأبحاث', 'Science', 'Science'),
      icon: <Sparkles className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'quality',
      label: tr(lang, 'التوثيق', 'Sources', 'Sources'),
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
    },
  ];

  const quickMuscleGroups: { key: MuscleZoneKey | 'ALL'; label: string }[] = [
    { key: 'ALL', label: tr(lang, 'الكل (32)', 'Tous (32)', 'All (32)') },
    { key: 'chest', label: tr(lang, 'الصدر', 'Pectoraux', 'Chest') },
    { key: 'lats_back', label: tr(lang, 'الظهر', 'Dos', 'Back') },
    { key: 'side_delts', label: tr(lang, 'الأكتاف', 'Épaules', 'Shoulders') },
    { key: 'quads', label: tr(lang, 'الأفخاذ', 'Quadriceps', 'Quads') },
    { key: 'hamstrings', label: tr(lang, 'الخلفية', 'Ischios', 'Hamstrings') },
    { key: 'biceps', label: tr(lang, 'البايسبس', 'Biceps', 'Biceps') },
    { key: 'triceps', label: tr(lang, 'الترايسبس', 'Triceps', 'Triceps') },
  ];

  // Ensure exA and exB resolve cleanly, preferring favorite exercises when available
  const fallbackFirst = favoriteExerciseObjects[0] || exercises[0];
  const fallbackSecond =
    favoriteExerciseObjects.find((e) => e.id !== fallbackFirst.id) ||
    exercises.find((e) => e.id !== fallbackFirst.id) ||
    exercises[1];

  const exA = exercises.find((e) => e.id === state.compareIds[0]) || fallbackFirst;
  const exB = exercises.find((e) => e.id === state.compareIds[1]) || fallbackSecond;

  const profileA = useMemo(
    () => buildExerciseComparisonProfile(exA, SCIENTIFIC_STUDIES),
    [exA]
  );
  const profileB = useMemo(
    () => buildExerciseComparisonProfile(exB, SCIENTIFIC_STUDIES),
    [exB]
  );

  const handleQuickCompareFromCard = (exId: string) => {
    if (!favoriteExercises.includes(exId)) {
      onToggleFavorite(exId);
    }
    if (state.compareIds[0] === exId || state.compareIds[1] === exId) {
      onSetExSubTab('compare');
      return;
    }
    onSetCompareIds([state.compareIds[0], exId]);
    onSetExSubTab('compare');
  };

  const assignFavoriteToSlot = (exId: string) => {
    if (activeSlotToAssign === 0) {
      const other = exB.id === exId ? exA.id : exB.id;
      onSetCompareIds([exId, other]);
      setActiveSlotToAssign(1);
    } else {
      const other = exA.id === exId ? exB.id : exA.id;
      onSetCompareIds([other, exId]);
      setActiveSlotToAssign(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Clear Sub-Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 app-card p-1.5 sm:p-2">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetExSubTab(t.id)}
            className={`flex items-center justify-center gap-1.5 h-10 px-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap overflow-hidden cursor-pointer ${
              exSubTab === t.id
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e293b]'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. PHOTO LIBRARY (32 EXERCISES) */}
      {exSubTab === 'library' && (
        <div key="ex-library" className="space-y-4 animate-view-in">
          {/* Quick Search + One-Tap Muscle Filter Bar */}
          <div className="app-card p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-teal-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSetSearch(e.target.value)}
                  placeholder={tr(
                    lang,
                    'ابحث باسم التمرين أو العضلة أو الأداة...',
                    'Rechercher exercice, muscle...',
                    'Search exercise, muscle, equipment...'
                  )}
                  className="w-full h-10 ps-9 pe-3 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-xs font-semibold text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  aria-label={tr(lang, 'فلتر العضلة', 'Filtre muscle', 'Muscle Filter')}
                  value={muscleFilter}
                  onChange={(e) => onSetMuscleFilter(e.target.value as MuscleZoneKey | 'ALL')}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                >
                  <option value="ALL">
                    {tr(lang, 'جميع العضلات (14)', 'Tous les muscles (14)', 'All 14 Muscle Zones')}
                  </option>
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
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                >
                  <option value="ALL">
                    {tr(lang, 'كل المعدات', 'Tout équipement', 'All Equipment')}
                  </option>
                  {(['Dumbbell', 'Machine', 'Cable', 'Barbell', 'Bodyweight'] as const).map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-1.5">
                <select
                  aria-label={tr(lang, 'المستوى', 'Niveau', 'Difficulty')}
                  value={difficultyFilter}
                  onChange={(e) => onSetDifficultyFilter(e.target.value as DifficultyLevel | 'ALL')}
                  className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                >
                  <option value="ALL">{tr(lang, 'المستوى', 'Niveau', 'Level')}</option>
                  <option value="beginner">{tr(lang, 'مبتدئ', 'Débutant', 'Beginner')}</option>
                  <option value="intermediate">
                    {tr(lang, 'متوسط', 'Intermédiaire', 'Intermediate')}
                  </option>
                  <option value="advanced">{tr(lang, 'متقدم', 'Avancé', 'Advanced')}</option>
                </select>
                <button
                  type="button"
                  onClick={onToggleFavoritesOnly}
                  aria-label={tr(lang, 'المفضلة فقط', 'Favoris uniquement', 'Favorites Only')}
                  className={`w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center transition cursor-pointer ${
                    favoritesOnly
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#0b0f19] text-slate-500 dark:text-slate-300 border-slate-200 dark:border-[#1e293b]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* One-Tap Quick Muscle Group Selector + Favorites Compare Shortcut */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll max-w-full">
                {quickMuscleGroups.map((mg) => {
                  const active = muscleFilter === mg.key;
                  return (
                    <button
                      key={mg.key}
                      type="button"
                      onClick={() => onSetMuscleFilter(mg.key)}
                      className={`h-8 px-3 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer ${
                        active
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] hover:border-teal-500'
                      }`}
                    >
                      {mg.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onSetExSubTab('compare')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold whitespace-nowrap transition shadow-xs cursor-pointer"
              >
                <GitCompare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {tr(
                    lang,
                    `مقارنة المفضلة (${favoriteExercises.length})`,
                    `Comparer (${favoriteExercises.length})`,
                    `Compare (${favoriteExercises.length})`
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Exercise Cards Grid with Direct Reference Photos (Start & Peak Switcher) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((ex) => {
              const isFav = favoriteExercises.includes(ex.id);
              const isInCompare = state.compareIds.includes(ex.id);
              const frame = cardFrameMap[ex.id] ?? 0;
              return (
                <div
                  key={ex.id}
                  className="app-card flex flex-col justify-between hover:border-teal-500/60 transition"
                >
                  <div>
                    <div className="relative h-52 bg-slate-100 dark:bg-[#0b0f19] border-b border-slate-100 dark:border-[#1e293b]">
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="w-full h-full block cursor-pointer"
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
                        className={`absolute top-2.5 start-2.5 w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                          isFav
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                            : 'bg-[#0b0f19]/85 text-white border-white/15 hover:bg-[#111827]'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Full-Screen Zoom */}
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(ex.id)}
                        aria-label={tr(lang, 'تكبير الصورة', 'Zoom image', 'Zoom Photo')}
                        className="absolute top-2.5 end-2.5 w-9 h-9 rounded-xl bg-[#0b0f19]/85 text-white border border-white/15 hover:bg-teal-600 flex items-center justify-center transition cursor-pointer"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      {/* Direct 1. Start / 2. Peak Photo Toggle on Card */}
                      <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between gap-2">
                        <div className="grid grid-cols-2 rounded-xl bg-[#0b0f19]/90 p-0.5 border border-white/15 text-[11px] font-extrabold text-white">
                          <button
                            type="button"
                            onClick={() => setCardFrameMap((prev) => ({ ...prev, [ex.id]: 0 }))}
                            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer ${
                              frame === 0 ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(lang, '1. البداية', '1. Départ', '1. Start')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardFrameMap((prev) => ({ ...prev, [ex.id]: 1 }))}
                            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition cursor-pointer ${
                              frame === 1 ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {tr(lang, '2. الذروة', '2. Pic', '2. Peak')}
                          </button>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-[#0b0f19]/90 text-teal-300 border border-teal-500/30 text-[11px] font-extrabold mono-num whitespace-nowrap shrink-0">
                          {ex.sets}×{ex.repsLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-teal-600 dark:text-teal-300 min-w-0">
                        <span className="truncate">{trText(lang, ex.muscleLabel)}</span>
                        <span className="mono-num text-sky-600 dark:text-sky-300 shrink-0 whitespace-nowrap">
                          {ex.id} · {ex.equipment}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {trText(lang, ex.name)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {trText(lang, ex.jointSafety)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 grid grid-cols-3 items-center gap-1.5 border-t border-slate-100 dark:border-[#1e293b] text-xs">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold whitespace-nowrap overflow-hidden transition shadow-xs cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tr(lang, 'التفاصيل', 'Détails', 'Details')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCompareFromCard(ex.id)}
                      className={`inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl border font-extrabold whitespace-nowrap overflow-hidden transition cursor-pointer ${
                        isInCompare
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-100 dark:bg-[#0b0f19] text-indigo-600 dark:text-indigo-300 border-slate-200 dark:border-[#1e293b] hover:border-indigo-400'
                      }`}
                      title={tr(lang, 'مقارنة مع تمرين آخر', 'Comparer cet exercice', 'Compare exercise')}
                    >
                      <GitCompare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tr(lang, 'قارن', 'Comparer', 'Compare')}</span>
                    </button>
                    <a
                      href={ex.media.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] font-extrabold whitespace-nowrap overflow-hidden hover:border-sky-400 transition"
                      aria-label={`YouTube ${trText(lang, ex.name)}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tr(lang, 'فيديو', 'Vidéo', 'Video')}</span>
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
        <div key="ex-map" className="animate-view-in">
          <MuscleMap14
            state={state}
            exercises={exercises}
            volumeMap={volumeMap}
            onSelectMuscle={onSelectMuscle}
            onUpdateVolumeSettings={onUpdateVolumeSettings}
            onOpenExercise={onOpenExercise}
          />
        </div>
      )}

      {/* 3. SIDE-BY-SIDE FAVORITES COMPARISON VIEW (2-COLUMN BIOMECHANICAL & EVIDENCE MATRIX) */}
      {exSubTab === 'compare' && (
        <div key="ex-compare" className="space-y-4 animate-view-in">
          {/* Favorites Selector & Control Header */}
          <div className="app-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {tr(
                      lang,
                      'المقارنة الثنائية لتمارينك المفضلة (عمودان)',
                      'Comparaison Côte à Côte (2 Colonnes)',
                      'Side-by-Side Favorites Comparison'
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                    {tr(
                      lang,
                      'مقارنة العضلات الأساسية والمساعدة، درجة الدليل العلمي، والنموذج الحركي.',
                      'Muscles primaires/secondaires, grade de preuve et modèle cinématique.',
                      'Compare target muscles, evidence grade, and kinematic rig.'
                    )}
                  </p>
                </div>
              </div>

              {/* Filter Pool Toggle: Favorites Only vs All 32 Exercises */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-[#0b0f19] p-1 rounded-xl border border-slate-200 dark:border-[#1e293b] text-xs">
                <button
                  type="button"
                  onClick={() => setCompareSourceScope('favorites')}
                  className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg font-extrabold whitespace-nowrap transition cursor-pointer ${
                    compareSourceScope === 'favorites'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">
                    {tr(
                      lang,
                      `المفضلة (${favoriteExerciseObjects.length})`,
                      `Favoris (${favoriteExerciseObjects.length})`,
                      `Favorites (${favoriteExerciseObjects.length})`
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompareSourceScope('all')}
                  className={`h-8 px-3 rounded-lg font-extrabold whitespace-nowrap transition cursor-pointer ${
                    compareSourceScope === 'all'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tr(lang, 'الكل (32)', 'Tous (32)', 'All (32)')}
                </button>
              </div>
            </div>

            {/* Interactive Favorites Bar: One-Tap Assignment to Column 1 or Column 2 */}
            <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-amber-600 dark:text-amber-300 flex items-center gap-1.5 min-w-0">
                  <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">
                    {tr(
                      lang,
                      'اختيار سريع من المفضلة:',
                      'Sélection rapide favoris :',
                      'Quick-Pick from Favorites:'
                    )}
                  </span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSlotToAssign(0)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                      activeSlotToAssign === 0
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tr(lang, 'العمود 1', 'Colonne 1', 'Slot 1')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlotToAssign(1)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                      activeSlotToAssign === 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tr(lang, 'العمود 2', 'Colonne 2', 'Slot 2')}
                  </button>
                </div>
              </div>

              {favoriteExerciseObjects.length < 2 ? (
                <div className="text-xs text-amber-600 dark:text-amber-300 font-semibold">
                  {tr(
                    lang,
                    'أضف تمرينين على الأقل إلى المفضلة (نجمة ★) في المكتبة لتخصيص قائمتك، أو اختر مباشرة من القوائم أدناه.',
                    'Ajoutez au moins 2 exercices en favoris (★) ou utilisez les menus ci-dessous.',
                    'Star at least 2 exercises in the Library to populate your custom favorites bar, or pick from the dropdowns below.'
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {favoriteExerciseObjects.map((favEx) => {
                    const isSlot1 = exA.id === favEx.id;
                    const isSlot2 = exB.id === favEx.id;
                    return (
                      <button
                        key={`FAV_CHIP_${favEx.id}`}
                        type="button"
                        onClick={() => assignFavoriteToSlot(favEx.id)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                          isSlot1
                            ? 'bg-teal-600 text-white border-teal-400 shadow-xs'
                            : isSlot2
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                            : 'bg-white dark:bg-[#131C31] text-slate-800 dark:text-slate-100 border-slate-200 dark:border-[#24324F] hover:border-amber-400'
                        }`}
                      >
                        <Star className="w-3 h-3 fill-current text-amber-400 shrink-0" />
                        <span className="mono-num">{favEx.id}</span>
                        <span className="truncate max-w-[160px]">{trText(lang, favEx.name)}</span>
                        {isSlot1 && (
                          <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] mono-num">
                            #1
                          </span>
                        )}
                        {isSlot2 && (
                          <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] mono-num">
                            #2
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Two-Column Exercise Selector Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label
                  htmlFor="compare-select-a"
                  className="font-extrabold text-teal-600 dark:text-teal-300 flex items-center justify-between"
                >
                  <span>
                    {tr(
                      lang,
                      'العمود الأول — التمرين المفضل (1):',
                      'Colonne 1 — Exercice Favori (1) :',
                      'Column 1 — Favorite Exercise (A):'
                    )}
                  </span>
                  <span className="mono-num text-[11px]">{exA.id}</span>
                </label>
                <select
                  id="compare-select-a"
                  aria-label="Compare Exercise A"
                  value={exA.id}
                  onChange={(e) => onSetCompareIds([e.target.value, exB.id])}
                  className="w-full h-10 px-3 rounded-xl border border-teal-500/40 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-extrabold focus:border-teal-400 focus:outline-none"
                >
                  {selectablePool.map((e) => (
                    <option key={e.id} value={e.id}>
                      {favoriteExercises.includes(e.id) ? '★ ' : ''}
                      {e.id} — {trText(lang, e.name)} ({e.equipment})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="compare-select-b"
                  className="font-extrabold text-indigo-600 dark:text-indigo-300 flex items-center justify-between"
                >
                  <span>
                    {tr(
                      lang,
                      'العمود الثاني — التمرين المفضل (2):',
                      'Colonne 2 — Exercice Favori (2) :',
                      'Column 2 — Favorite Exercise (B):'
                    )}
                  </span>
                  <span className="mono-num text-[11px]">{exB.id}</span>
                </label>
                <select
                  id="compare-select-b"
                  aria-label="Compare Exercise B"
                  value={exB.id}
                  onChange={(e) => onSetCompareIds([exA.id, e.target.value])}
                  className="w-full h-10 px-3 rounded-xl border border-indigo-500/40 bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white font-extrabold focus:border-indigo-400 focus:outline-none"
                >
                  {selectablePool.map((e) => (
                    <option key={e.id} value={e.id}>
                      {favoriteExercises.includes(e.id) ? '★ ' : ''}
                      {e.id} — {trText(lang, e.name)} ({e.equipment})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN SIDE-BY-SIDE COMPARISON GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([profileA, profileB] as const).map((prof, colIdx) => {
              const ex = prof.exercise;
              const isFav = favoriteExercises.includes(ex.id);
              const isCol1 = colIdx === 0;
              const accentBadgeCls = isCol1
                ? 'bg-teal-600 text-white'
                : 'bg-indigo-600 text-white';
              const accentTextCls = isCol1
                ? 'text-teal-600 dark:text-teal-300'
                : 'text-indigo-600 dark:text-indigo-300';
              const evidenceBadgeCls =
                prof.evidenceGrade === 'strong'
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/40'
                  : prof.evidenceGrade === 'moderate'
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/40'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40';

              return (
                <article
                  key={`CMP_COL_${colIdx}_${ex.id}`}
                  aria-label={`${trText(lang, ex.name)} Comparison Column`}
                  className="rounded-2xl border border-slate-200 dark:border-[#24324F] bg-white dark:bg-[#131C31] p-4 sm:p-5 space-y-4 text-xs shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Column Header: ID, Equipment, Title, Favorite Star & Zoom */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#24324F]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold mono-num ${accentBadgeCls}`}>
                            #{colIdx + 1} · {ex.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2642] text-sky-600 dark:text-sky-300 font-bold mono-num text-[11px]">
                            {ex.equipment}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2642] text-slate-700 dark:text-slate-200 font-bold mono-num text-[11px]">
                            {ex.sets}×{ex.repsLabel} ({ex.rirLabel})
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">
                          {trText(lang, ex.name)}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(ex.id)}
                          aria-label={tr(lang, 'تبديل المفضلة', 'Favori', 'Toggle Favorite')}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                            isFav
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-100 dark:bg-[#0B1120] text-slate-400 border-slate-200 dark:border-[#24324F]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(ex.id)}
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0B1120] hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24324F] flex items-center justify-center transition cursor-pointer"
                          aria-label={tr(lang, 'تكبير الصور', 'Zoomer', 'Zoom photos')}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Reference Photos (1. Start & 2. Peak Side-by-Side) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F]">
                        <ExerciseImage
                          exercise={ex}
                          frameIdx={0}
                          alt={`${trText(lang, ex.name)} Start`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 rounded-md bg-[#0B1120]/90 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold">
                          {tr(lang, '1. البداية', '1. Départ', '1. Start')}
                        </span>
                      </div>
                      <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F]">
                        <ExerciseImage
                          exercise={ex}
                          frameIdx={1}
                          alt={`${trText(lang, ex.name)} Peak`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 rounded-md bg-[#0B1120]/90 text-sky-300 border border-sky-500/30 text-[10px] font-extrabold">
                          {tr(lang, '2. الذروة', '2. Pic', '2. Peak')}
                        </span>
                      </div>
                    </div>

                    {/* SECTION 1: PRIMARY & SECONDARY MUSCLES */}
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-extrabold flex items-center gap-1.5 ${accentTextCls}`}>
                          <Layers className="w-4 h-4 shrink-0" />
                          <span>
                            {tr(
                              lang,
                              '1. العضلات المستهدفة (الأساسية والمساعدة)',
                              '1. Muscles Ciblés (Primaires & Secondaires)',
                              '1. Target Muscles (Primary & Secondary)'
                            )}
                          </span>
                        </span>
                        <span className="mono-num text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          ~{prof.primaryMuscle.recoveryHours}h {tr(lang, 'استشفاء', 'récup.', 'recovery')}
                        </span>
                      </div>

                      {/* Primary Muscle */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {tr(lang, 'العضلة الأساسية (Direct 1.0x):', 'Muscle Primaire (1.0x) :', 'Primary Muscle (1.0x):')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300 font-extrabold text-[10px] mono-num">
                            {prof.primaryMuscle.optimalRange[0]}–{prof.primaryMuscle.optimalRange[1]} {tr(lang, 'مجموعة/أسبوع', 'séries/sem', 'sets/wk')}
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {trText(lang, prof.primaryMuscle.name)}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {trText(lang, prof.primaryMuscle.functionLabel)}
                        </div>
                      </div>

                      {/* Secondary / Synergist Muscles */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          {tr(
                            lang,
                            `العضلات المساعدة / التآزرية (Synergists ${ex.synergistMultiplier}x):`,
                            `Muscles Secondaires / Synergistes (${ex.synergistMultiplier}x) :`,
                            `Secondary / Synergist Muscles (${ex.synergistMultiplier}x):`
                          )}
                        </span>
                        {prof.secondaryMuscles.length === 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] text-slate-500 dark:text-slate-300 font-semibold text-[11px]">
                            {tr(
                              lang,
                              'تمرين عزل مباشر — لا توجد عضلات مساعدة رئيسية',
                              'Isolation directe — aucun synergiste majeur',
                              'Pure isolation — no major synergist muscles'
                            )}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {prof.secondaryMuscles.map((sec) => (
                              <span
                                key={sec.key}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] text-sky-700 dark:text-sky-300 font-bold text-[11px]"
                              >
                                <span>{trText(lang, sec.name)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: EVIDENCE GRADE & SCIENTIFIC STUDIES */}
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                          <Award className="w-4 h-4 shrink-0" />
                          <span>
                            {tr(
                              lang,
                              '2. درجة الدليل العلمي (Evidence Grade)',
                              '2. Niveau de Preuve Scientifique',
                              '2. Scientific Evidence Grade'
                            )}
                          </span>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg border font-extrabold text-[11px] ${evidenceBadgeCls}`}>
                          {trText(lang, prof.evidenceGradeLabel)}
                        </span>
                      </div>

                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {trText(lang, ex.scienceNote)}
                      </p>

                      {prof.linkedStudies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {prof.linkedStudies.map((st) => (
                            <a
                              key={st.id}
                              href={st.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:border-indigo-400 transition"
                            >
                              <BookOpen className="w-3 h-3 shrink-0" />
                              <span>
                                {st.authors} ({st.year})
                              </span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: KINEMATIC RIG & BIOMECHANICAL DETAILS */}
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#24324F] p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-sky-600 dark:text-sky-300 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 shrink-0" />
                          <span>
                            {tr(
                              lang,
                              '3. تفاصيل النموذج الحركي (Kinematic Rig)',
                              '3. Modèle Cinématique & Biomécanique',
                              '3. Kinematic Rig & Biomechanics'
                            )}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 font-extrabold mono-num text-[10px]">
                          rig: {prof.kinematicRig.rigType}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F]">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr(lang, 'النمط الحركي والمفصلي:', 'Schéma & Action :', 'Pattern & Joint Action:')}
                          </span>
                          <strong className="text-slate-900 dark:text-white block mt-0.5">
                            {trText(lang, prof.kinematicRig.movementPattern)}
                          </strong>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 block">
                            {trText(lang, prof.kinematicRig.jointAction)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F]">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr(lang, 'انحياز المدى الحركي (ROM):', 'Profil d’amplitude (ROM) :', 'ROM Tension Profile:')}
                          </span>
                          <strong className="text-teal-600 dark:text-teal-300 block mt-0.5">
                            {trText(lang, prof.kinematicRig.romTypeLabel)}
                          </strong>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 block">
                            {trText(lang, prof.kinematicRig.archetypeName)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#24324F] rounded-lg p-2.5">
                        <div>
                          <strong className="text-sky-600 dark:text-sky-300">
                            {tr(lang, 'متجه القوة (Force Vector): ', 'Vecteur de force : ', 'Force Vector: ')}
                          </strong>
                          <span className="text-slate-700 dark:text-slate-200">
                            {trText(lang, prof.kinematicRig.forceVector)}
                          </span>
                        </div>
                        <div>
                          <strong className="text-indigo-600 dark:text-indigo-300">
                            {tr(lang, 'منحنى المقاومة: ', 'Courbe de résistance : ', 'Resistance Profile: ')}
                          </strong>
                          <span className="text-slate-700 dark:text-slate-200">
                            {trText(lang, prof.kinematicRig.resistanceProfile)}
                          </span>
                        </div>
                        <div>
                          <strong className="text-teal-600 dark:text-teal-300">
                            {tr(lang, 'زوايا المفاصل (Joint Angles): ', 'Angles articulaires : ', 'Joint Angles: ')}
                          </strong>
                          <span className="text-slate-700 dark:text-slate-200">
                            {trText(lang, prof.kinematicRig.jointAngles)}
                          </span>
                        </div>
                        <div>
                          <strong className="text-amber-600 dark:text-amber-300">
                            {tr(lang, 'سلامة المفاصل: ', 'Sécurité articulaire : ', 'Joint Longevity: ')}
                          </strong>
                          <span className="text-slate-700 dark:text-slate-200">
                            {trText(lang, prof.kinematicRig.jointSafety)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-slate-100 dark:border-[#24324F] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className={`flex-1 h-9 px-3 rounded-xl font-extrabold text-xs transition cursor-pointer ${accentBadgeCls}`}
                    >
                      {tr(lang, 'فتح الدليل الكامل للتمرين', 'Ouvrir la fiche complète', 'Open Full Exercise Guide')}
                    </button>
                    <a
                      href={ex.media.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl bg-slate-100 dark:bg-[#0B1120] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24324F] font-extrabold hover:border-teal-500 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{tr(lang, 'فيديو', 'Vidéo', 'Video')}</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MEDIA & DATA QUALITY CENTER */}
      {exSubTab === 'quality' && (
        <div key="ex-quality" className="app-card rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-4 space-y-3 shadow-xs animate-view-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                {tr(
                  lang,
                  'سجل الصور المرجعية الموثقة (32/32 تمريناً)',
                  'Registre des Photos Références (32/32)',
                  'Verified Reference Photo Registry (32/32)'
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
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
                <tr className="border-b border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-300">
                  <th className="py-2 px-2 text-start">ID</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'التمرين', 'Exercice', 'Exercise')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'النموذج الحركي', 'Rig Cinématique', 'Kinematic Rig')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'المجلد الموثق', 'Dossier Image', 'Photo Folder')}</th>
                  <th className="py-2 px-2 text-start">{tr(lang, 'الحالة', 'Statut', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={`QA_${ex.id}`} className="border-b border-slate-100 dark:border-[#1e293b]/70">
                    <td className="py-2 px-2 font-mono font-bold text-teal-600 dark:text-teal-300">{ex.id}</td>
                    <td className="py-2 px-2 font-semibold text-slate-900 dark:text-white">
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="hover:underline text-start cursor-pointer"
                      >
                        {trText(lang, ex.name)}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-sky-600 dark:text-sky-300">
                      {ex.rigType}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-500 dark:text-slate-300">
                      {ex.media.folderId}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-300 font-bold">
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
        <div key="ex-science" className="space-y-3 animate-view-in">
          {SCIENTIFIC_STUDIES.slice(0, 4).map((st) => (
            <div
              key={st.id}
              className="app-card rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] p-4 space-y-2 text-xs shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-teal-600 dark:text-teal-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {st.id} · {st.year} · {st.journal}
                </span>
                <a
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-300 font-bold hover:underline"
                >
                  <span>DOI: {st.doi}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{st.title}</h4>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{trText(lang, st.summary)}</p>
              <p className="text-slate-500 dark:text-slate-300">
                <strong>{tr(lang, 'القيود والحدود:', 'Limites :', 'Limitations:')}</strong>{' '}
                {trText(lang, st.limitations)}
              </p>
              {st.conflictingNote && (
                <p className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-amber-800 dark:text-amber-200">
                  <strong className="inline-flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    {tr(lang, 'تباين الأدلة:', 'Nuance scientifique :', 'Conflicting Evidence:')}
                  </strong>{' '}
                  {trText(lang, st.conflictingNote)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
