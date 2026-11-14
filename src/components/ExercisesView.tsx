import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GitCompare,
  Maximize2,
  Search,
  ShieldCheck,
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
import { KinematicRigViewer } from './KinematicRigViewer';
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
  const { lang, exSubTab, searchQuery, muscleFilter, equipmentFilter, difficultyFilter, favoritesOnly, favoriteExercises } = state;

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

  const subTabs: { id: ExSubTab; label: string }[] = [
    { id: 'library', label: tr(lang, `المكتبة (${exercises.length})`, `Bibliothèque (${exercises.length})`, `Library (${exercises.length})`) },
    { id: 'map', label: tr(lang, 'خريطة العضلات (14)', 'Carte Muscles (14)', 'Muscle Map (14)') },
    { id: 'compare', label: tr(lang, 'مقارنة تمرينين', 'Comparer', 'Compare') },
    { id: 'quality', label: tr(lang, 'تدقيق الوسائط', 'Audit Qualité', 'Quality Center') },
    { id: 'science_pick', label: tr(lang, 'أسس الاختيار العلمي', 'Sélection Scientifique', 'Science Guide') },
  ];

  const exA = exercises.find((e) => e.id === state.compareIds[0]) || exercises[0];
  const exB = exercises.find((e) => e.id === state.compareIds[1]) || exercises[1];

  return (
    <div className="space-y-4">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSetExSubTab(t.id)}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition ${
              exSubTab === t.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. LIBRARY (32 EXERCISES) */}
      {exSubTab === 'library' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSetSearch(e.target.value)}
                  placeholder={tr(lang, 'ابحث بالاسم أو العضلة أو الجهاز...', 'Rechercher exercice, muscle...', 'Search exercise, muscle, equipment...')}
                  className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  aria-label={tr(lang, 'فلتر العضلة', 'Filtre muscle', 'Muscle Filter')}
                  value={muscleFilter}
                  onChange={(e) => onSetMuscleFilter(e.target.value as MuscleZoneKey | 'ALL')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
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
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200"
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
                  className={`p-2 rounded-xl border shrink-0 transition ${
                    favoritesOnly
                      ? 'bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredExercises.map((ex) => {
              const isFav = favoriteExercises.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenExercise(ex.id)}
                        className="w-full h-full block"
                        aria-label={trText(lang, ex.name)}
                      >
                        <ExerciseImage exercise={ex} frameIdx={0} alt={trText(lang, ex.name)} className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(ex.id)}
                        aria-label={tr(lang, 'مفضلة', 'Favori', 'Toggle Favorite')}
                        className={`absolute top-2 start-2 p-1.5 rounded-lg backdrop-blur-sm border ${
                          isFav
                            ? 'bg-amber-500/90 text-white border-amber-400'
                            : 'bg-slate-900/65 text-white border-slate-700'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(ex.id)}
                        aria-label={tr(lang, 'تكبير الصورة', 'Zoom image', 'Zoom Photo')}
                        className="absolute top-2 end-2 p-1.5 rounded-lg bg-slate-900/65 text-white border border-slate-700 hover:bg-slate-900"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <span className="mono-num">{ex.id} · {ex.equipment}</span>
                        <span className="mono-num">{ex.sets}×{ex.repsLabel}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                        {trText(lang, ex.name)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {trText(lang, ex.muscleLabel)}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {trText(lang, ex.jointSafety)}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => onOpenExercise(ex.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition text-center"
                    >
                      {tr(lang, 'الدليل والنموذج 5F', 'Guide & Cinématique', 'Guide & 5-Frame Rig')}
                    </button>
                    <a
                      href={ex.media.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:text-rose-500"
                      aria-label={`YouTube ${trText(lang, ex.name)}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>YT</span>
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

      {/* 3. SIDE-BY-SIDE COMPARE */}
      {exSubTab === 'compare' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {tr(lang, 'مقارنة بيوميكانيكية مباشرة بين تمرينين', 'Comparaison Biomécanique Côte à Côte', 'Side-by-Side Biomechanical Comparison')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <select
                aria-label="Compare Exercise A"
                value={exA.id}
                onChange={(e) => onSetCompareIds([e.target.value, exB.id])}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>{e.id} — {trText(lang, e.name)}</option>
                ))}
              </select>
              <select
                aria-label="Compare Exercise B"
                value={exB.id}
                onChange={(e) => onSetCompareIds([exA.id, e.target.value])}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>{e.id} — {trText(lang, e.name)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[exA, exB].map((ex) => (
              <div
                key={`CMP_${ex.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs"
              >
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mono-num">{ex.id} · {ex.equipment}</span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{trText(lang, ex.name)}</h4>
                </div>
                <KinematicRigViewer rigType={ex.rigType} lang={lang} compact />
                <div className="space-y-1.5">
                  <div><strong>{tr(lang, 'العضلة الرئيسية:', 'Muscle principal :', 'Primary Muscle:')}</strong> {trText(lang, MUSCLE_ZONES[ex.primaryMuscle].name)}</div>
                  <div><strong>{tr(lang, 'نمط المقاومة:', 'Profil ROM :', 'ROM Bias:')}</strong> <span className="uppercase font-mono">{ex.romType}</span></div>
                  <div><strong>{tr(lang, 'حماية المفصل:', 'Sécurité :', 'Joint Safety:')}</strong> {trText(lang, ex.jointSafety)}</div>
                  <div><strong>{tr(lang, 'الأساس العلمي:', 'Science :', 'Science Note:')}</strong> {trText(lang, ex.scienceNote)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MEDIA & DATA QUALITY CENTER */}
      {exSubTab === 'quality' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {tr(lang, 'مركز جودة البيانات والوسائط (32/32 موثق)', 'Centre de Qualité Média & Données (32/32)', 'Media & Attribution Quality Center (32/32 Audited)')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr(
                  lang,
                  'جميع الصور مرتبطة بقاعدة free-exercise-db ذات رخصة الملكية العامة (Unlicense)، مع نموذج حركي 5 إطارات وروابط فيديو مراجعة.',
                  'Toutes les photos proviennent de free-exercise-db (Domaine public / Unlicense), accompagnées du rig cinématique 5 images.',
                  'All 32 entries map 1:1 to audited free-exercise-db (Unlicense Public Domain) photographs plus an interactive 5-frame kinematic rig.'
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
                    <td className="py-2 px-2 font-mono font-bold">{ex.id}</td>
                    <td className="py-2 px-2 font-semibold">
                      <button type="button" onClick={() => onOpenExercise(ex.id)} className="hover:underline text-start">
                        {trText(lang, ex.name)}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">{ex.media.folderId}</td>
                    <td className="py-2 px-2 text-[11px]">{ex.media.license}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
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
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {st.id} · {st.year} · {st.journal}
                </span>
                <a
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold hover:underline"
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
