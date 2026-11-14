import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  ZoomIn,
} from 'lucide-react';
import { SCIENTIFIC_STUDIES } from '../data/studies';
import { tr, trText } from '../engine/i18n';
import { EquipmentType, Exercise, Lang } from '../types/app';
import { ExerciseImage } from './ExerciseImage';
import { KinematicRigViewer } from './KinematicRigViewer';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  lang: Lang;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onOpenLightbox: (exId: string) => void;
  onOpenSwap?: (exId: string) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  lang,
  isFavorite,
  onClose,
  onToggleFavorite,
  onOpenLightbox,
  onOpenSwap,
}) => {
  const [visualMode, setVisualMode] = useState<'rig' | 'photos'>('rig');
  const [photoFrame, setPhotoFrame] = useState<0 | 1>(0);

  useEffect(() => {
    setVisualMode('rig');
    setPhotoFrame(0);
  }, [exercise?.id]);

  if (!exercise) return null;

  const linkedStudies = SCIENTIFIC_STUDIES.filter((s) => exercise.studyRefIds.includes(s.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={trText(lang, exercise.name)}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl p-4 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span>{exercise.id}</span>
              <span>·</span>
              <span>{exercise.equipment}</span>
              <span>·</span>
              <span>{trText(lang, exercise.muscleLabel)}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
              {trText(lang, exercise.name)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(exercise.id)}
              aria-label={tr(lang, 'إضافة للمفضلة', 'Favori', 'Toggle Favorite')}
              className={`p-2 rounded-xl border transition ${
                isFavorite
                  ? 'bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Mode Switcher */}
        <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setVisualMode('rig')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition ${
                visualMode === 'rig'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              {tr(lang, 'النموذج الحركي 5 إطارات', 'Cinématique 5 Images', '5-Frame Kinematic Rig')}
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('photos')}
              className={`py-2 px-3 rounded-xl text-xs font-extrabold transition ${
                visualMode === 'photos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              {tr(lang, 'الصور المرجعية الموثقة', 'Photos Références', 'Verified Reference Photos')}
            </button>
          </div>
        </div>

        {/* Visual Display */}
        {visualMode === 'rig' ? (
          <KinematicRigViewer rigType={exercise.rigType} lang={lang} />
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2.5">
            <div className="relative h-60 sm:h-72 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <ExerciseImage
                exercise={exercise}
                frameIdx={photoFrame}
                alt={trText(lang, exercise.name)}
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => onOpenLightbox(exercise.id)}
                className="absolute top-2 end-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 text-white text-xs font-bold hover:bg-slate-900 transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{tr(lang, 'تكبير', 'Agrandir', 'Zoom')}</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPhotoFrame(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    photoFrame === 0
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {tr(lang, '1. البداية', '1. Départ', '1. Start')}
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFrame(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    photoFrame === 1
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {tr(lang, '2. الذروة', '2. Pic', '2. Peak')}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {exercise.media.source} · {exercise.media.license}
              </span>
            </div>
          </div>
        )}

        {/* Biomechanics & Prescription Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block">{tr(lang, 'النمط الحركي', 'Schéma', 'Pattern')}</span>
            <strong className="text-slate-900 dark:text-slate-100">{trText(lang, exercise.movementPattern)}</strong>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block">{tr(lang, 'الوصفة القياسية', 'Prescription', 'Prescription')}</span>
            <strong className="mono-num text-slate-900 dark:text-slate-100">{exercise.sets}×{exercise.repsLabel} · {exercise.rirLabel}</strong>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block">{tr(lang, 'الراحة', 'Repos', 'Rest')}</span>
            <strong className="mono-num text-slate-900 dark:text-slate-100">{exercise.restSec}s</strong>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block">{tr(lang, 'قوة الدليل', 'Niveau preuve', 'Evidence')}</span>
            <strong className="uppercase text-emerald-700 dark:text-emerald-400">{exercise.evidenceGrade}</strong>
          </div>
        </div>

        {/* Form Cues & Joint Safety */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
            <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
              {tr(lang, 'وضعية البداية والتنفيذ', 'Mise en place & Exécution', 'Setup & Execution')}
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.startCue)}</p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{trText(lang, exercise.steps)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
            <div className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {tr(lang, 'أخطاء شائعة', 'Erreurs fréquentes', 'Common Errors')}
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.commonErrors)}</p>
            <div className="font-extrabold text-sky-700 dark:text-sky-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {tr(lang, 'حماية المفاصل', 'Sécurité articulaire', 'Joint Longevity')}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{trText(lang, exercise.jointSafety)}</p>
          </div>
        </div>

        {/* Science Note & References */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 space-y-2 text-xs">
          <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {tr(lang, 'الأساس العلمي والتنبيه الحيادي', 'Note scientifique', 'Scientific Note')}
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.scienceNote)}</p>
          {linkedStudies.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {linkedStudies.map((st) => (
                <a
                  key={st.id}
                  href={st.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:underline"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>{st.id} ({st.year})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <a
            href={exercise.media.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              {tr(lang, 'فيديو الشرح العملي', 'Vidéo technique', 'Technique Video')} ({exercise.media.youtubeAuthor})
            </span>
          </a>

          {onOpenSwap && (
            <button
              type="button"
              onClick={() => onOpenSwap(exercise.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-emerald-500 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{tr(lang, 'تبديل ببديل مناسب', 'Remplacer', 'Smart Swap')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface PhotoLightboxModalProps {
  exercises: Exercise[];
  currentExerciseId: string | null;
  lang: Lang;
  onSelectExerciseId: (id: string) => void;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  exercises,
  currentExerciseId,
  lang,
  onSelectExerciseId,
  onClose,
}) => {
  const [frameIdx, setFrameIdx] = useState<0 | 1>(0);
  const [zoom, setZoom] = useState<1 | 1.5 | 2>(1);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay || !currentExerciseId) return;
    const id = setInterval(() => {
      setFrameIdx((prev) => (prev === 0 ? 1 : 0));
    }, 900);
    return () => clearInterval(id);
  }, [autoPlay, currentExerciseId]);

  if (!currentExerciseId) return null;
  const idx = exercises.findIndex((e) => e.id === currentExerciseId);
  const exercise = idx >= 0 ? exercises[idx] : exercises[0];
  if (!exercise) return null;

  const goPrev = () => {
    const prevIdx = (idx - 1 + exercises.length) % exercises.length;
    onSelectExerciseId(exercises[prevIdx].id);
    setFrameIdx(0);
  };
  const goNext = () => {
    const nextIdx = (idx + 1) % exercises.length;
    onSelectExerciseId(exercises[nextIdx].id);
    setFrameIdx(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-white p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={trText(lang, exercise.name)}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="min-w-0">
          <div className="text-xs font-bold text-emerald-400 mono-num">
            {exercise.id} · {idx + 1}/{exercises.length}
          </div>
          <h3 className="text-sm sm:text-base font-extrabold truncate">
            {trText(lang, exercise.name)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto my-3">
        <div
          className="transition-transform duration-200 max-w-2xl w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <ExerciseImage
            exercise={exercise}
            frameIdx={frameIdx}
            alt={trText(lang, exercise.name)}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{tr(lang, 'السابق', 'Précédent', 'Prev')}</span>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
          >
            <span>{tr(lang, 'التالي', 'Suivant', 'Next')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFrameIdx(frameIdx === 0 ? 1 : 0)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
          >
            {frameIdx === 0
              ? tr(lang, '1/2 البداية', '1/2 Départ', '1/2 Start')
              : tr(lang, '2/2 الذروة', '2/2 Pic', '2/2 Peak')}
          </button>
          <button
            type="button"
            onClick={() => setAutoPlay((p) => !p)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl font-bold ${
              autoPlay ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{tr(lang, 'تبديل تلقائي', 'Auto', 'Auto-Play')}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <ZoomIn className="w-4 h-4 text-slate-400 me-1" />
          {([1, 1.5, 2] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1.5 rounded-lg font-bold mono-num ${
                zoom === z ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {z.toFixed(1)}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SubstitutionModalProps {
  sourceExerciseId: string | null;
  exercises: Exercise[];
  lang: Lang;
  onSwap: (oldId: string, newId: string) => void;
  onClose: () => void;
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  sourceExerciseId,
  exercises,
  lang,
  onSwap,
  onClose,
}) => {
  const [equipFilter, setEquipFilter] = useState<EquipmentType | 'ALL'>('ALL');
  if (!sourceExerciseId) return null;

  const source = exercises.find((e) => e.id === sourceExerciseId);
  if (!source) return null;

  const candidates = exercises.filter((ex) => {
    if (ex.id === source.id) return false;
    const sameMuscle =
      ex.primaryMuscle === source.primaryMuscle ||
      source.alternatives.includes(ex.id) ||
      ex.secondaryMuscles.includes(source.primaryMuscle);
    const matchEquip = equipFilter === 'ALL' || ex.equipment === equipFilter;
    return sameMuscle && matchEquip;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={tr(lang, 'استبدال التمرين', 'Remplacer l’exercice', 'Smart Exercise Swap')}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl p-4 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">
              {tr(lang, 'استبدال التمرين ببديل مناسب', 'Substitution d’exercice', 'Biomechanically Similar Swap')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(lang, 'التمرين الحالي:', 'Actuel :', 'Current:')} <strong>{trText(lang, source.name)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 text-amber-900 dark:text-amber-200">
          {tr(
            lang,
            'ملاحظة علمية: التمارين البديلة تستهدف نفس المجموعة العضلية لكنها قد تختلف قليلاً في منحنى المقاومة وزاوية المفصل — اضبط الوزن المبدئي بتدرج آمن.',
            'Note : Les variantes ciblent le même groupe musculaire mais avec un profil de résistance différent ; ajustez la charge prudemment.',
            'Note: Substitutions target similar muscle groups with slightly different resistance curves—calibrate your starting load conservatively.'
          )}
        </p>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(['ALL', 'Dumbbell', 'Machine', 'Cable', 'Barbell', 'Bodyweight'] as const).map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => setEquipFilter(eq)}
              className={`px-2.5 py-1.5 rounded-xl font-bold border ${
                equipFilter === eq
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              {eq === 'ALL' ? tr(lang, 'كل المعدات', 'Tout', 'All') : eq}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pe-1">
          {candidates.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
              {tr(lang, 'لا توجد بدائل مطابقة لهذا الفلتر.', 'Aucun substitut pour ce filtre.', 'No alternatives match this filter.')}
            </div>
          ) : (
            candidates.map((cand) => {
              const isSuggested = source.alternatives.includes(cand.id);
              return (
                <div
                  key={cand.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {trText(lang, cand.name)}
                      </span>
                      {isSuggested && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          {tr(lang, 'مقترح', 'Suggéré', 'Match')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cand.equipment} · {trText(lang, cand.movementPattern)} · {cand.sets}×{cand.repsLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSwap(source.id, cand.id);
                      onClose();
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition"
                  >
                    {tr(lang, 'اعتماد', 'Choisir', 'Select')}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
