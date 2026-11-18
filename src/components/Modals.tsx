import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { SCIENTIFIC_STUDIES } from '../data/studies';
import { tr, trText } from '../engine/i18n';
import { SEQUENCE_ORDER } from '../engine/storage';
import {
  AppState,
  DaySchedulePreset,
  EquipmentType,
  Exercise,
  Lang,
  ProgramMode,
  WorkoutDayKey,
} from '../types/app';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/85 p-2.5 sm:p-5 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={trText(lang, exercise.name)}
      onClick={onClose}
    >
      <div
        className="app-card animate-modal-sheet modal-sheet-dvh w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header with Large Prominent ✕ Close Button */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827]">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-300">
              <span className="mono-num">{exercise.id}</span>
              <span>·</span>
              <span>{exercise.equipment}</span>
              <span>·</span>
              <span>{trText(lang, exercise.muscleLabel)}</span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold mt-0.5 text-slate-900 dark:text-white leading-snug break-words">
              {trText(lang, exercise.name)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(exercise.id)}
              aria-label={tr(lang, 'إضافة للمفضلة', 'Favori', 'Toggle Favorite')}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                isFavorite
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-100 dark:bg-[#0b0f19] text-slate-400 border-slate-200 dark:border-[#1e293b]'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0b0f19] hover:bg-rose-600 hover:text-white text-slate-800 dark:text-white border border-slate-200 dark:border-[#1e293b] flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Verified Reference Photos (Start & Peak Side-by-Side + Interactive Controls) */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {tr(lang, 'الصور المرجعية الموثقة (البداية والذروة)', 'Photos de référence (Départ & Pic)', 'Verified Reference Photos (Start & Peak)')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoFlip((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    autoFlip
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b]'
                  }`}
                >
                  {autoFlip ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{tr(lang, 'عرض متتابع', 'Animation', 'Auto-Flip')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLightbox(exercise.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition shadow-xs cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{tr(lang, 'تكبير', 'Plein écran', 'Zoom')}</span>
                </button>
              </div>
            </div>

            {autoFlip ? (
              <div className="relative h-60 sm:h-72 rounded-2xl overflow-hidden bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b]">
                <ExerciseImage
                  exercise={exercise}
                  frameIdx={activeFrame}
                  alt={trText(lang, exercise.name)}
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2.5 start-2.5 px-3 py-1 rounded-xl bg-[#0b0f19]/90 text-white text-xs font-bold">
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
                    className="group relative h-48 sm:h-60 rounded-2xl overflow-hidden bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] hover:border-teal-500 transition text-start cursor-pointer"
                  >
                    <ExerciseImage
                      exercise={exercise}
                      frameIdx={frame}
                      alt={`${trText(lang, exercise.name)} - ${frame + 1}`}
                      className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                    />
                    <div
                      className={`absolute bottom-2 start-2 px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-white shadow ${
                        frame === 0 ? 'bg-teal-600' : 'bg-sky-600'
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

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-300">
              <span>{tr(lang, 'اضغط على أي صورة للتكبير والتبديل الحر', 'Touchez une photo pour zoomer', 'Tap any photo to zoom full-screen')}</span>
              <span>{exercise.media.source} · {exercise.media.license}</span>
            </div>
          </div>

          {/* Prescription Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3">
              <span className="text-teal-600 dark:text-teal-300 font-bold block">{tr(lang, 'المجموعات والتكرار', 'Séries & Reps', 'Sets & Reps')}</span>
              <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.sets} × {exercise.repsLabel}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3">
              <span className="text-indigo-600 dark:text-indigo-300 font-bold block">{tr(lang, 'الجهد المستهدف', 'Effort RIR', 'Target Effort')}</span>
              <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.rirLabel}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3">
              <span className="text-sky-600 dark:text-sky-300 font-bold block">{tr(lang, 'وقت الراحة', 'Temps de repos', 'Rest Time')}</span>
              <strong className="mono-num text-sm text-slate-900 dark:text-white">{exercise.restSec}s</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] p-3">
              <span className="text-amber-600 dark:text-amber-300 font-bold block">{tr(lang, 'النمط الحركي', 'Schéma', 'Pattern')}</span>
              <strong className="text-slate-900 dark:text-white block">{trText(lang, exercise.movementPattern)}</strong>
            </div>
          </div>

          {/* Concise Execution & Joint Comfort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-3.5 space-y-1.5">
              <div className="font-extrabold text-teal-600 dark:text-teal-300">
                {tr(lang, 'نقاط الأداء السريعة', 'Points clés d’exécution', 'Quick Setup & Cues')}
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{trText(lang, exercise.startCue)}</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.steps)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-3.5 space-y-1.5">
              <div className="font-extrabold text-sky-600 dark:text-sky-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {tr(lang, 'راحة وحماية المفاصل', 'Confort articulaire', 'Joint Comfort Tip')}
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{trText(lang, exercise.jointSafety)}</p>
              <div className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {tr(lang, 'تجنّب هذا الخطأ', 'Erreur à éviter', 'Avoid This Mistake')}
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{trText(lang, exercise.commonErrors)}</p>
            </div>
          </div>

          {/* Science Note & References */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-3.5 space-y-2 text-xs">
            <div className="font-extrabold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              {tr(lang, 'لماذا اخترنا هذا التمرين علمياً؟', 'Pourquoi cet exercice ?', 'Why This Exercise Works')}
            </div>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{trText(lang, exercise.scienceNote)}</p>
            {linkedStudies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {linkedStudies.map((st) => (
                  <a
                    key={st.id}
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#1e293b]">
            <a
              href={exercise.media.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-extrabold hover:bg-sky-500 transition shadow-xs"
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-500 transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{tr(lang, 'استبدال بتمرين بديل', 'Remplacer l’exercice', 'Swap Exercise')}</span>
              </button>
            )}
          </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/90 p-2.5 sm:p-5 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={trText(lang, exercise.name)}
      onClick={onClose}
    >
      <div
        className="app-card animate-modal-sheet modal-sheet-dvh w-full max-w-3xl rounded-3xl border border-[#1e293b] bg-[#111827] text-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-b border-[#1e293b] bg-[#111827]">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-teal-300 mono-num">
              {exercise.id} · {idx + 1}/{exercises.length}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold leading-snug break-words">
              {trText(lang, exercise.name)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
            className="w-10 h-10 rounded-xl bg-[#0b0f19] hover:bg-rose-600 text-white border border-[#1e293b] flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-center overflow-auto">
            <div
              className="transition-transform duration-200 max-w-2xl w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0b0f19] border border-[#1e293b]"
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1e293b] text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0b0f19] hover:bg-[#1e293b] border border-[#1e293b] font-bold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{tr(lang, 'السابق', 'Précédent', 'Prev')}</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0b0f19] hover:bg-[#1e293b] border border-[#1e293b] font-bold cursor-pointer"
              >
                <span>{tr(lang, 'التالي', 'Suivant', 'Next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFrameIdx(frameIdx === 0 ? 1 : 0)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
              >
                {frameIdx === 0
                  ? tr(lang, '1/2 البداية', '1/2 Départ', '1/2 Start')
                  : tr(lang, '2/2 الذروة', '2/2 Pic', '2/2 Peak')}
              </button>
              <button
                type="button"
                onClick={() => setAutoPlay((p) => !p)}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl font-bold cursor-pointer ${
                  autoPlay ? 'bg-teal-600 text-white' : 'bg-[#0b0f19] border border-[#1e293b] text-slate-200'
                }`}
              >
                {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{tr(lang, 'تلقائي', 'Auto', 'Auto')}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <ZoomIn className="w-4 h-4 text-slate-400 me-1" />
              {([1, 1.5, 2] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold mono-num cursor-pointer ${
                    zoom === z ? 'bg-teal-600 text-white' : 'bg-[#0b0f19] border border-[#1e293b] text-slate-300'
                  }`}
                >
                  {z.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/85 p-2.5 sm:p-5 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={tr(lang, 'استبدال التمرين', 'Remplacer l’exercice', 'Smart Exercise Swap')}
      onClick={onClose}
    >
      <div
        className="app-card animate-modal-sheet modal-sheet-dvh w-full max-w-xl rounded-3xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-2 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827]">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-teal-600 dark:text-teal-300">
              {tr(lang, 'استبدال التمرين ببديل مناسب', 'Substitution d’exercice', 'Smart Exercise Swap')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 break-words">
              {tr(lang, 'التمرين الحالي:', 'Actuel :', 'Current:')}{' '}
              <strong className="text-slate-900 dark:text-white">{trText(lang, source.name)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr(lang, 'إغلاق', 'Fermer', 'Close')}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0b0f19] hover:bg-rose-600 hover:text-white border border-slate-200 dark:border-[#1e293b] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(['ALL', 'Dumbbell', 'Machine', 'Cable', 'Barbell', 'Bodyweight'] as const).map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => setEquipFilter(eq)}
                className={`px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                  equipFilter === eq
                    ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#0b0f19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b]'
                }`}
              >
                {eq === 'ALL' ? tr(lang, 'كل المعدات', 'Tout', 'All') : eq}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {candidates.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-300">
                {tr(lang, 'لا توجد بدائل مطابقة لهذا الفلتر.', 'Aucun substitut pour ce filtre.', 'No alternatives match this filter.')}
              </div>
            ) : (
              candidates.map((cand) => {
                const isSuggested = source.alternatives.includes(cand.id);
                return (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] hover:border-teal-500 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] shrink-0">
                        <ExerciseImage exercise={cand} frameIdx={0} alt={trText(lang, cand.name)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white break-words">
                            {trText(lang, cand.name)}
                          </span>
                          {isSuggested && (
                            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-300">
                              ★ {tr(lang, 'مقترح', 'Suggéré', 'Best Match')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
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
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-extrabold hover:bg-teal-500 transition shadow-xs cursor-pointer"
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
    </div>
  );
};

interface SettingsModalProps {
  open: boolean;
  state: AppState;
  isInstallable: boolean;
  isInstalled: boolean;
  onClose: () => void;
  onSetProgramMode: (mode: ProgramMode) => void;
  onSetSchedulePreset: (preset: DaySchedulePreset) => void;
  onUpdateDayLabel: (day: WorkoutDayKey, label: string) => void;
  onUpdateVolumeSettings: (patch: Partial<AppState['volumeSettings']>) => void;
  onExportBackup: () => void;
  onTriggerImportBackup: () => void;
  onPurgeCache: () => void;
  onInstallPwa: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  state,
  isInstallable,
  isInstalled,
  onClose,
  onSetProgramMode,
  onSetSchedulePreset,
  onUpdateDayLabel,
  onUpdateVolumeSettings,
  onExportBackup,
  onTriggerImportBackup,
  onPurgeCache,
  onInstallPwa,
}) => {
  if (!open) return null;
  const { lang, programMode, schedulePreset, volumeSettings } = state;

  const glossaryTerms = [
    {
      code: 'RIR',
      title: tr(lang, 'تكرارات في الاحتياط', 'Répétitions en Réserve', 'Reps In Reserve'),
      desc: tr(
        lang,
        'عدد التكرارات النظيفة المتبقية قبل الفشل العضلي (مثال: 2 RIR يعني تبقّى تكراران).',
        'Nombre de répétitions propres restantes avant l’échec musculaire.',
        'Clean reps left in the tank before technical failure (e.g. 2 RIR = 2 reps left).'
      ),
    },
    {
      code: 'e1RM',
      title: tr(lang, 'أقصى وزن تقديري لرفعة واحدة', '1RM Estimé', 'Estimated 1-Rep Max'),
      desc: tr(
        lang,
        'مؤشر القوة القصوى المحسوب تلقائياً من الوزن والتكرارات لمتابعة تطور قوتك بأمان.',
        'Force maximale théorique calculée à partir du poids et des répétitions.',
        'Calculated maximum strength from your working weight and reps without maxing out.'
      ),
    },
    {
      code: 'Sn ← Sn-1',
      title: tr(lang, 'التوريث المتسلسل للمجموعات', 'Auto-Copie en Cascade', 'Cascading Set Auto-Fill'),
      desc: tr(
        lang,
        'كل مجموعة ترث الوزن والتكرار من المجموعة التي تسبقها مباشرة (S2 ترث S1، وS3 ترث S2).',
        'Chaque série hérite de la série précédente (S2 de S1, S3 de S2).',
        'Each set inherits weight and reps from the immediately preceding set (S2 from S1, S3 from S2).'
      ),
    },
    {
      code: 'PR 🏆',
      title: tr(lang, 'رقم قياسي شخصي', 'Record Personnel', 'Personal Record'),
      desc: tr(
        lang,
        'وسام يظهر تلقائياً عندما تتجاوز أفضل وزن أو أعلى قوة تقديرية (e1RM) سابقة لك.',
        'Badge célébrant un nouveau record de charge ou de force e1RM.',
        'Badge awarded when a set beats your historical best weight or e1RM.'
      ),
    },
    {
      code: 'A → B → C → D',
      title: tr(lang, 'التدوير المرن للحصص', 'Rotation Flexible', 'Flexible Sequence'),
      desc: tr(
        lang,
        'يتقدم دور الحصة تلقائياً بعد كل حصة تحفظها دون التقيد بأيام أسبوع ثابتة.',
        'Le programme avance automatiquement à la séance suivante après chaque sauvegarde.',
        'Advances automatically to the next workout session without fixed weekday locks.'
      ),
    },
    {
      code: 'TDEE',
      title: tr(lang, 'إجمالي الطاقة اليومية', 'Dépense Énergétique', 'Total Daily Energy'),
      desc: tr(
        lang,
        'مجموع السعرات اليومية الموزعة على البروتين والكاربوهيدرات والدهون حسب هدفك.',
        'Total calorique quotidien réparti en protéines, glucides et lipides.',
        'Daily calorie target split into Protein, Carbs, and Fats for your goal.'
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/85 p-2.5 sm:p-5 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={tr(lang, 'الإعدادات ودليل المصطلحات', 'Paramètres & Lexique', 'Settings & Glossary')}
      onClick={onClose}
    >
      <div
        className="app-card animate-modal-sheet modal-sheet-dvh w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {tr(lang, 'الإعدادات ودليل المصطلحات', 'Paramètres & Lexique', 'Settings & Glossary')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-tight">
                {tr(lang, 'تدوير الحصص، معادلات الحجم، النسخ الاحتياطي، والمصطلحات', 'Rotation, volume, sauvegarde JSON et lexique', 'Rotation, volume calibration, JSON backup & glossary')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr(lang, 'إغلاق الإعدادات', 'Fermer', 'Close Settings')}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0b0f19] hover:bg-rose-600 hover:text-white text-slate-800 dark:text-white border border-slate-200 dark:border-[#1e293b] flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 text-xs">
          {/* 1. Program Mode & Schedule Rotation Settings */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-4 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-sm text-teal-600 dark:text-teal-300">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{tr(lang, '1. نمط البرنامج وجدولة تدوير الحصص', '1. Mode Programme & Rotation', '1. Program Mode & Session Rotation')}</span>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300 block">
                {tr(lang, 'نمط التمارين الافتراضي:', 'Mode d’entraînement :', 'Exercise Selection Mode:')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetProgramMode('joint_safe')}
                  className={`h-10 px-3 rounded-xl font-extrabold border whitespace-nowrap transition cursor-pointer ${
                    programMode === 'joint_safe'
                      ? 'bg-teal-600 text-white border-teal-500'
                      : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b]'
                  }`}
                >
                  {tr(lang, 'آمن للمفاصل', 'Joint-Safe', 'Joint-Safe')}
                </button>
                <button
                  type="button"
                  onClick={() => onSetProgramMode('benchmark')}
                  className={`h-10 px-3 rounded-xl font-extrabold border whitespace-nowrap transition cursor-pointer ${
                    programMode === 'benchmark'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1e293b]'
                  }`}
                >
                  {tr(lang, 'كلاسيكي', 'Classique', 'Classic')}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-600 dark:text-slate-300 block">
                {tr(lang, 'نظام تسمية وتدوير الحصص (A → B → C → D):', 'Système de rotation des séances :', 'Session Rotation & Schedule Labels:')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'sequence', label: tr(lang, 'تدوير مرن', 'Séquence', 'Sequence') },
                    { id: 'mwf', label: tr(lang, 'إثنين/أربعاء/جمعة', 'Lun/Mer/Ven', 'Mon/Wed/Fri') },
                    { id: 'tts', label: tr(lang, 'ثلاثاء/خميس/سبت', 'Mar/Jeu/Sam', 'Tue/Thu/Sat') },
                    { id: 'custom', label: tr(lang, 'تسمية مخصصة', 'Personnalisé', 'Custom') },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSetSchedulePreset(p.id)}
                    className={`h-9 px-2.5 rounded-xl font-bold border whitespace-nowrap transition cursor-pointer ${
                      schedulePreset === p.id
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1e293b]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {schedulePreset === 'custom' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {SEQUENCE_ORDER.map((day) => (
                  <div key={day} className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      {tr(lang, `تسمية الحصة ${day}`, `Séance ${day}`, `Session ${day}`)}
                    </label>
                    <input
                      type="text"
                      value={state.trainingDaysLabels[day]}
                      onChange={(e) => onUpdateDayLabel(day, e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#111827] text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Weekly Muscle Volume Calibration Settings */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm text-sky-600 dark:text-sky-300">
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>{tr(lang, '2. إعدادات احتساب الحجم العضلي الأسبوعي', '2. Paramètres du Volume Hebdomadaire', '2. Weekly Muscle Volume Calibration')}</span>
              </div>
              <label className="inline-flex items-center gap-2 font-bold cursor-pointer select-none text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={volumeSettings.includeOptionalDayD}
                  onChange={(e) => onUpdateVolumeSettings({ includeOptionalDayD: e.target.checked })}
                  className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                />
                <span>{tr(lang, 'احتساب الحصة التكميلية D', 'Inclure Séance D', 'Include Session D')}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-300 block">
                  {tr(lang, 'معامل العضلات المساعدة (Synergist):', 'Pondération synergistes :', 'Synergist Set Multiplier:')}
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 0.25, 0.5, 1.0].map((coeff) => (
                    <button
                      key={coeff}
                      type="button"
                      onClick={() => onUpdateVolumeSettings({ indirectCoefficient: coeff })}
                      className={`h-9 px-2 rounded-xl font-extrabold mono-num border transition cursor-pointer ${
                        volumeSettings.indirectCoefficient === coeff
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1e293b]'
                      }`}
                    >
                      {coeff}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-300 block">
                  {tr(lang, 'عتبة القرب من الفشل (RIR ≤):', 'Seuil d’effort (RIR ≤) :', 'Effective Proximity (RIR ≤):')}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[2, 3, 4].map((rirMax) => (
                    <button
                      key={rirMax}
                      type="button"
                      onClick={() => onUpdateVolumeSettings({ minProximityRir: rirMax })}
                      className={`h-9 px-2 rounded-xl font-extrabold mono-num border transition cursor-pointer ${
                        volumeSettings.minProximityRir === rirMax
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1e293b]'
                      }`}
                    >
                      ≤ {rirMax} RIR
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Data Backup (JSON) & Cache / PWA Management */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-4 space-y-3">
            <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <Download className="w-4 h-4 shrink-0" />
              <span>{tr(lang, '3. النسخ الاحتياطي وإدارة التطبيق', '3. Sauvegarde JSON & Application', '3. JSON Backup & App Management')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'تصدير نسخة JSON', 'Exporter JSON', 'Export JSON')}</span>
              </button>

              <button
                type="button"
                onClick={onTriggerImportBackup}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white dark:bg-[#111827] text-sky-600 dark:text-sky-300 border border-slate-200 dark:border-[#1e293b] hover:border-sky-500 font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'استعادة نسخة JSON', 'Importer JSON', 'Restore JSON')}</span>
              </button>

              <button
                type="button"
                onClick={onPurgeCache}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] hover:border-teal-500 font-extrabold whitespace-nowrap transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(lang, 'تحديث الكاش', 'Actualiser le cache', 'Refresh Cache')}</span>
              </button>

              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold whitespace-nowrap transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{tr(lang, 'تثبيت التطبيق', 'Installer PWA', 'Install App')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Technical Terms & Abbreviations Glossary */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f19] p-4 space-y-3">
            <div className="font-extrabold text-sm text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{tr(lang, '4. دليل المصطلحات والاختصارات التقنية', '4. Lexique des Abréviations & Termes', '4. Technical Terms & Abbreviations Glossary')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {glossaryTerms.map((term) => (
                <div
                  key={term.code}
                  className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-300 font-mono text-[11px] font-extrabold whitespace-nowrap shrink-0">
                      {term.code}
                    </span>
                    <strong className="font-extrabold text-slate-900 dark:text-white">
                      {term.title}
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {term.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
