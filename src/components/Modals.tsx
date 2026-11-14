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
  const [activeFrame, setActiveFrame] = useState<0 | 1>(0);
  const [autoFlip, setAutoFlip] = useState(false);

  useEffect(() => {
    setActiveFrame(0);
    setAutoFlip(false);
  }, [exercise?.id]);

  useEffect(() => {
    if (!autoFlip || !exercise) return;
    const timer = window.setInterval(() => {
      setActiveFrame((prev) => (prev === 0 ? 1 : 0));
    }, 950);
    return () => window.clearInterval(timer);
  }, [autoFlip, exercise]);

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
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] text-slate-900 dark:text-slate-100 shadow-2xl p-4 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-orange-500">
              <span>{exercise.id}</span>
              <span>·</span>
              <span>{exercise.equipment}</span>
              <span>·</span>
              <span>{trText(lang, exercise.muscleLabel)}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold mt-0.5 text-slate-900 dark:text-white">
              {trText(lang, exercise.name)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(exercise.id)}
              aria-label={tr(lang, 'إضافة للمفضلة', 'Favori', 'Toggle Favorite')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isFavorite
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-slate-100 dark:bg-[#0f1423] text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#0f1423] hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verified Reference Photos (Start & Peak Side-by-Side + Interactive Controls) — Solid Dark Canvas */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f1423] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {tr(lang, 'الصور المرجعية الموثقة للتمرين (البداية والذروة)', 'Photos de référence (Départ & Pic)', 'Verified Reference Photos (Start & Peak)')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoFlip((v) => !v)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  autoFlip
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#13182b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {autoFlip ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{tr(lang, 'عرض متتابع', 'Animation', 'Auto-Flip')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenLightbox(exercise.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition shadow-xs cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{tr(lang, 'تكبير الشاشة', 'Plein écran', 'Full Zoom')}</span>
              </button>
            </div>
          </div>

          {autoFlip ? (
            <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-white dark:bg-[#13182b] border border-slate-200 dark:border-slate-800">
              <ExerciseImage
                exercise={exercise}
                frameIdx={activeFrame}
                alt={trText(lang, exercise.name)}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2.5 start-2.5 px-3 py-1 rounded-xl bg-slate-900/90 text-white text-xs font-bold">
                {activeFrame === 0
                  ? tr(lang, '1. وضعية البداية', '1. Position de départ', '1. Starting Position')
                  : tr(lang, '2. وضعية الذروة والانقباض', '2. Position de pic', '2. Peak Contraction')}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([0, 1] as const).map((frame) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => onOpenLightbox(exercise.id)}
                  className="group relative h-52 sm:h-60 rounded-2xl overflow-hidden bg-white dark:bg-[#13182b] border border-slate-200 dark:border-slate-800 hover:border-orange-500 transition text-start cursor-pointer"
                >
                  <ExerciseImage
                    exercise={exercise}
                    frameIdx={frame}
                    alt={`${trText(lang, exercise.name)} - ${frame + 1}`}
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                  />
                  <div
                    className={`absolute bottom-2 start-2 px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-white shadow ${
                      frame === 0 ? 'bg-slate-900/90' : 'bg-orange-500'
                    }`}
                  >
                    {frame === 0
                      ? tr(lang, '1. وضعية البداية', '1. Départ', '1. Start Position')
                      : tr(lang, '2. وضعية الذروة', '2. Pic', '2. Peak Position')}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{tr(lang, 'اضغط على أي صورة للتكبير والتبديل الحر', 'Cliquez sur une photo pour zoomer', 'Click any photo to zoom full-screen')}</span>
            <span>{exercise.media.source} · {exercise.media.license}</span>
          </div>
        </div>

        {/* Prescription Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="rounded-2xl bg-orange-50/80 dark:bg-orange-950/25 border border-orange-200/80 dark:border-orange-900/50 p-3">
            <span className="text-orange-700 dark:text-orange-300 font-semibold block">{tr(lang, 'المجموعات والتكرار', 'Séries & Reps', 'Sets & Reps')}</span>
            <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.sets} × {exercise.repsLabel}</strong>
          </div>
          <div className="rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-900/50 p-3">
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold block">{tr(lang, 'الجهد المستهدف', 'Effort RIR', 'Target Effort')}</span>
            <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.rirLabel}</strong>
          </div>
          <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/25 border border-sky-200/80 dark:border-sky-900/50 p-3">
            <span className="text-sky-700 dark:text-sky-300 font-semibold block">{tr(lang, 'وقت الراحة', 'Temps de repos', 'Rest Time')}</span>
            <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.restSec}s</strong>
          </div>
          <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 p-3">
            <span className="text-amber-700 dark:text-amber-300 font-semibold block">{tr(lang, 'النمط الحركي', 'Schéma', 'Pattern')}</span>
            <strong className="text-slate-900 dark:text-white truncate block">{trText(lang, exercise.movementPattern)}</strong>
          </div>
        </div>

        {/* Concise Execution & Joint Comfort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
            <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
              {tr(lang, 'نقاط الأداء السريعة', 'Points clés d’exécution', 'Quick Setup & Cues')}
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.startCue)}</p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{trText(lang, exercise.steps)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
            <div className="font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {tr(lang, 'راحة وحماية المفاصل', 'Confort articulaire', 'Joint Comfort Tip')}
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.jointSafety)}</p>
            <div className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-4 h-4" />
              {tr(lang, 'تجنّب هذا الخطأ', 'Erreur à éviter', 'Avoid This Mistake')}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{trText(lang, exercise.commonErrors)}</p>
          </div>
        </div>

        {/* Science Note & References */}
        <div className="rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/20 p-3.5 space-y-2 text-xs">
          <div className="font-extrabold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            {tr(lang, 'لماذا اخترنا هذا التمرين علمياً؟', 'Pourquoi cet exercice ?', 'Why This Exercise Works')}
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#13182b] border border-violet-200 dark:border-slate-700 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:underline"
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-500 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              {tr(lang, 'مشاهدة الفيديو التوضيحي', 'Voir la vidéo', 'Watch Video')} ({exercise.media.youtubeAuthor})
            </span>
          </a>

          {onOpenSwap && (
            <button
              type="button"
              onClick={() => onOpenSwap(exercise.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-500 transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{tr(lang, 'استبدال بتمرين بديل', 'Remplacer l’exercice', 'Swap Exercise')}</span>
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
          <div className="text-xs font-bold text-orange-400 mono-num">
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
          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition"
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
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            {frameIdx === 0
              ? tr(lang, '1/2 وضعية البداية', '1/2 Départ', '1/2 Start')
              : tr(lang, '2/2 وضعية الذروة', '2/2 Pic', '2/2 Peak')}
          </button>
          <button
            type="button"
            onClick={() => setAutoPlay((p) => !p)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl font-bold ${
              autoPlay ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-200'
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
                zoom === z ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
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
        className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-[#13182b] text-slate-900 dark:text-slate-100 shadow-2xl p-4 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
              {tr(lang, 'استبدال التمرين ببديل مناسب', 'Substitution d’exercice', 'Smart Exercise Swap')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(lang, 'التمرين الحالي:', 'Actuel :', 'Current:')} <strong className="text-slate-900 dark:text-white">{trText(lang, source.name)}</strong>
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

        <div className="flex flex-wrap gap-1.5 text-xs">
          {(['ALL', 'Dumbbell', 'Machine', 'Cable', 'Barbell', 'Bodyweight'] as const).map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => setEquipFilter(eq)}
              className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                equipFilter === eq
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-300 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13182b] shrink-0">
                      <ExerciseImage exercise={cand} frameIdx={0} alt={trText(lang, cand.name)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {trText(lang, cand.name)}
                        </span>
                        {isSuggested && (
                          <span className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400">
                            ★ {tr(lang, 'مقترح', 'Suggéré', 'Best Match')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {cand.equipment} · {trText(lang, cand.movementPattern)} · {cand.sets}×{cand.repsLabel}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSwap(source.id, cand.id);
                      onClose();
                    }}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-extrabold hover:bg-orange-600 transition shadow-sm"
                  >
                    {tr(lang, 'اختيار', 'Choisir', 'Select')}
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
