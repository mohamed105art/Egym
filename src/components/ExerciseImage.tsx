import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { Exercise } from '../types/app';

interface ExerciseImageProps {
  exercise: Exercise;
  frameIdx: 0 | 1;
  alt: string;
  className?: string;
}

export const ExerciseImage: React.FC<ExerciseImageProps> = ({
  exercise,
  frameIdx,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const [stage, setStage] = useState<'primary' | 'alt' | 'fallback'>('primary');
  const cdnBase = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

  const src =
    stage === 'primary'
      ? `${cdnBase}${exercise.media.folderId}/${frameIdx}.jpg`
      : `${cdnBase}${exercise.media.altFolderId}/${frameIdx}.jpg`;

  if (stage === 'fallback') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 p-2 text-center">
        <Dumbbell className="w-6 h-6 text-emerald-500 mb-1" />
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setStage((s) => (s === 'primary' ? 'alt' : 'fallback'))}
      className={className}
    />
  );
};
